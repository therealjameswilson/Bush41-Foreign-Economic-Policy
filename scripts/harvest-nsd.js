#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const candidateConfig = require("./nsd-candidate-config");
const servedPdfPageCounts = require("./nsd-page-counts");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "313189290";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const auditedPdfPageTotal = 5243;
const documentedDateOverrides = new Map([
  ["446396823", { date: "1989-05-24", basis: "Withdrawal sheet date for signed NSD" }],
  ["446396826", { date: "1989-06-07", basis: "Withdrawal sheet date for signed annex" }],
  ["446396835", { date: "1989-08-24", basis: "Withdrawal sheet date for signed annex" }],
  ["446396842", { date: "1989-09-22", basis: "Action profile date for signed NSD annex" }],
  ["446396903", { date: "1992-06-02", basis: "Withdrawal sheet date for signed NSD" }],
  ["446396915", { date: "1993-01-19", basis: "Withdrawal sheet date for signed NSD" }],
  ["446396917", { date: "1993-01-19", basis: "Withdrawal sheet date for signed NSD" }],
]);
const candidateSortTimes = new Map();
const handwrittenFolderIdCorrections = new Map([
  ["446396821", { markerFolderId: "90003-011", correctedFolderId: "90003-012" }],
  ["446396822", { markerFolderId: "90003-012", correctedFolderId: "90003-013" }],
  ["446396825", { correctedFolderId: "90003-016" }],
  ["446396826", { correctedFolderId: "90003-017" }],
  ["446396827", { correctedFolderId: "90003-018" }],
  ["446396829", { correctedFolderId: "90003-020" }],
  ["446396833", { correctedFolderId: "90003-024" }],
  ["446396835", { correctedFolderId: "90003-026" }],
  ["446396836", { correctedFolderId: "90003-027" }],
  ["446396838", { correctedFolderId: "90003-029" }],
  ["446396839", { correctedFolderId: "90003-030" }],
  ["446396840", { correctedFolderId: "90003-031" }],
  ["446396882", { markerFolderId: "90004-026", correctedFolderId: "90004-036" }],
]);
const catalogFolderIdMismatches = new Map([
  ["446396830", { markerFolderId: "90003-019", catalogFolderId: "90003-021" }],
  ["446396834", { markerFolderId: "90003-023", catalogFolderId: "90003-025" }],
  ["446396837", { markerFolderId: "90003-026", catalogFolderId: "90003-028" }],
  ["446396841", { markerFolderId: "90003-030", catalogFolderId: "90003-032" }],
  ["446396842", { markerFolderId: "90003-031", catalogFolderId: "90003-033" }],
  ["446396843", { markerFolderId: "90003-032", catalogFolderId: "90003-034" }],
  ["446396852", { markerFolderId: "90004-004", catalogFolderId: "90004-006" }],
  ["446396853", { markerFolderId: "90004-005", catalogFolderId: "90004-007" }],
  ["446396854", { markerFolderId: "90004-006", catalogFolderId: "90004-008" }],
]);
const visuallyVerifiedFolderIds = new Map([
  ["446396823", "90003-014"],
  ["446396832", "90003-023"],
]);

// Curated after the complete title and OCR sweep. These are file-level leads,
// not claims that every document in a folder belongs in Volume XXX.
const directReviewNaids = new Set([
  "446396821",
  "446396824",
  "446396839",
  "446396844",
  "446396855",
  "446396859",
  "446396867",
  "446396878",
  "446396879",
  "446396880",
  "446396881",
]);
const boundaryReviewNaids = new Set([
  "446396813",
  "446396815",
  "446396818",
  "446396819",
  "446396820",
  "446396832",
  "446396833",
  "446396836",
  "446396843",
  "446396845",
  "446396847",
  "446396848",
  "446396849",
  "446396850",
  "446396852",
  "446396853",
  "446396854",
  "446396866",
  "446396882",
  "446396904",
  "446396909",
  "446396910",
]);
const tradePolicyNaids = new Set([
  "446396818",
  "446396819",
  "446396820",
  "446396836",
  "446396843",
  "446396845",
  "446396852",
  "446396866",
  "446396882",
]);
const monetaryPolicyNaids = new Set([
  "446396832",
  "446396833",
  "446396853",
  "446396854",
  "446396909",
  "446396910",
]);
const summitNaids = new Set([]);
const transitionEconomyNaids = new Set([
  "446396813",
  "446396815",
  "446396821",
  "446396839",
  "446396855",
]);
const strategicTradeNaids = new Set([
  "446396824",
  "446396844",
  "446396847",
  "446396848",
  "446396849",
  "446396850",
  "446396859",
  "446396867",
  "446396878",
  "446396879",
  "446396880",
  "446396881",
  "446396904",
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load National Security Directives series ${seriesNaId}`);
  }

  const hits = await fetchAllChildren();
  const rows = hits.map(toBaseRow);
  await runPool(rows.filter((row) => row.hasOnlinePdf), 8, async (row) => {
    const [extractedText, servedPdfBytes] = await Promise.all([
      fetchExtractedText(row),
      fetchContentLength(row.pdfUrl),
    ]);
    if (servedPdfBytes) {
      row.pdfBytes = servedPdfBytes;
      row.pdfByteBasis = "HTTP Content-Length";
    }
    Object.assign(row, deriveReviewFields(row, extractedText));
  });
  rows
    .filter((row) => !row.hasOnlinePdf)
    .forEach((row) => Object.assign(row, deriveUnavailableFields(row)));

  rows.sort((a, b) => {
    return (
      a.workingStartDate.localeCompare(b.workingStartDate) ||
      a.workingEndDate.localeCompare(b.workingEndDate) ||
      a.localId.localeCompare(b.localId)
    );
  });

  const auditedPageTotal = rows.reduce((total, row) => total + row.pdfPages, 0);
  if (servedPdfPageCounts.size !== rows.length || rows.some((row) => !servedPdfPageCounts.has(row.naid))) {
    throw new Error("NSD served-PDF page audit does not cover every Catalog file unit");
  }
  if (auditedPageTotal !== auditedPdfPageTotal) {
    throw new Error(`NSD served-PDF page total changed: expected ${auditedPdfPageTotal}; received ${auditedPageTotal}`);
  }
  if (rows.some((row) => row.hasOnlinePdf !== (row.pdfPages > 0))) {
    throw new Error("NSD online-PDF status and served-PDF page audit disagree");
  }

  const rowByNaid = new Map(rows.map((row) => [row.naid, row]));
  const candidateDocuments = candidateConfig
    .map((candidate) => {
      const row = rowByNaid.get(candidate.naid);
      if (!row) throw new Error(`Candidate ${candidate.naid} is absent from the series inventory`);
      const expectedSelection = row.routing === "Volume XXX review" ? "Core" : "Boundary";
      if (row.routing === "Series context" || candidate.selection !== expectedSelection) {
        throw new Error(`Candidate routing mismatch for ${candidate.naid}`);
      }
      if (candidate.chapter !== row.chapter) throw new Error(`Candidate chapter mismatch for ${candidate.naid}`);
      if (candidate.pageCount !== row.pdfPages) throw new Error(`Candidate page-count mismatch for ${candidate.naid}`);
      return {
        naid: candidate.naid,
        date: row.workingStartDate,
        sortDate: candidateSortTimes.has(candidate.naid)
          ? `${row.workingStartDate}T${candidateSortTimes.get(candidate.naid)}:00`
          : row.workingStartDate,
        pageCount: candidate.pageCount,
        extentLabel: row.hasOnlinePdf
          ? candidate.keyExtent
            ? `${candidate.pageCount} PDF pages; ${candidate.keyExtent}`
            : `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`
          : candidate.keyExtent || "Catalog-only file unit; no online PDF or served page extent is available",
        selection: candidate.selection,
        topics: candidate.topics,
        notes: `${candidate.selection === "Core" ? "Direct Volume XXX review." : "Boundary review."} ${candidate.focus} Promote individual documents only after the heading, dateline, terminal marking, and release or withdrawal status are checked in the source images.`,
      };
    })
    .sort(
      (a, b) =>
        a.sortDate.localeCompare(b.sortDate) ||
        rowByNaid.get(a.naid).title.localeCompare(rowByNaid.get(b.naid).title),
    );
  const routedNaids = new Set(rows.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const configuredNaids = new Set(candidateDocuments.map((candidate) => candidate.naid));
  if (routedNaids.size !== configuredNaids.size || [...routedNaids].some((naid) => !configuredNaids.has(naid))) {
    throw new Error("Curated routing sets and NSD candidate configuration do not match");
  }

  const generatedAt = new Date().toISOString();
  const markerVerified = rows.filter((row) => row.markerStatus.startsWith("verified")).length;
  const markerCorrectedCount = rows.filter((row) => row.markerStatus === "verified with handwritten correction").length;
  const markerMismatchCount = rows.filter((row) => row.markerStatus === "verified with catalog ID mismatch").length;
  const onlinePdfCount = rows.filter((row) => row.hasOnlinePdf).length;
  const totalPdfBytes = rows.reduce((total, row) => total + row.pdfBytes, 0);
  const output = {
    collection: {
      naid: seriesNaId,
      title: seriesRecord.title,
      shortTitle: "National Security Directive Files",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: rows.length,
      onlinePdfCount,
      catalogOnlyCount: rows.length - onlinePdfCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "H-Files",
      subseries: "NSD Files",
      markerVerified,
      markerCorrectedCount,
      markerMismatchCount,
      markerExceptionCount: rows.length - markerVerified,
      totalPdfBytes,
      totalPdfPages: auditedPdfPageTotal,
      methodology:
        "Every file unit was enumerated from the complete NARA Catalog series hierarchy. Catalog coverage dates normally control the working chronology; seven signed directives or annexes without usable Catalog dates use dates documented on withdrawal sheets or an action profile. NARA extracted text supplies high-level and economic-policy review signals for every online PDF. Routing reflects manual review of every title, full OCR transcript, opening provenance marker, and withdrawal-sheet description. Marker status requires the opening OCR segment to name the record group, office, series, subseries, and folder. Thirteen handwritten Folder ID corrections, nine opening-marker-to-Catalog ID mismatches, and two file units without online PDFs are retained explicitly.",
    },
    fileUnits: rows,
    generatedAt,
  };
  const candidateOutput = {
    auditScope: "Complete National Security Directives series inventory with economic-policy and withdrawal-sheet screening",
    auditedFolders: candidateDocuments.map((candidate) => rowByNaid.get(candidate.naid).localId),
    methodology:
      "All 108 file units were enumerated from the complete official NARA Catalog hierarchy. All 106 online PDFs, opening provenance markers, full NARA OCR transcripts, and withdrawal-sheet descriptions were screened; two Catalog file units have no online PDF. The 33 entries below were selected for direct Volume XXX review or cross-volume adjudication because the folder exposes trade, finance, assistance, sanctions, energy, technology-transfer, export-control, investment, or related economic-policy evidence. Page counts were read from the served official PDFs with Poppler pdfinfo; they are file-unit extents, not document extents, and the Catalog-only NSD-30a folder carries no asserted page count. Where a withdrawal sheet states the extent of unavailable directives, memoranda, studies, or reports, that evidence is reported separately. These records remain archival locators until individual document headings, datelines, terminal markings, and release or withdrawal status are checked in the source images.",
    documents: candidateDocuments,
  };

  const report = {
    generatedAt,
    seriesNaId,
    expectedFileUnits: rows.length,
    harvestedFileUnits: rows.length,
    onlinePdfCount,
    catalogOnlyCount: rows.length - onlinePdfCount,
    volumeReviewFileUnits: rows.filter((row) => row.routing === "Volume XXX review").length,
    boundaryReviewFileUnits: rows.filter((row) => row.routing === "Boundary review").length,
    volumeReviewNaids: rows.filter((row) => row.routing === "Volume XXX review").map((row) => row.naid),
    boundaryReviewNaids: rows.filter((row) => row.routing === "Boundary review").map((row) => row.naid),
    candidatePdfPages: candidateDocuments.reduce((total, candidate) => total + candidate.pageCount, 0),
    volumeReviewPdfPages: candidateDocuments
      .filter((candidate) => candidate.selection === "Core")
      .reduce((total, candidate) => total + candidate.pageCount, 0),
    boundaryReviewPdfPages: candidateDocuments
      .filter((candidate) => candidate.selection === "Boundary")
      .reduce((total, candidate) => total + candidate.pageCount, 0),
    economicSignalThreshold: 20,
    economicSignalFileUnits: rows.filter((row) => row.economicSignals.total >= 20).length,
    markerVerified,
    markerCorrectedCount,
    markerMismatchCount,
    markerCorrections: rows
      .filter((row) => row.markerStatus === "verified with handwritten correction")
      .map(({ naid, localId, title, markerChecks }) => ({ naid, localId, title, markerChecks })),
    markerCatalogMismatches: rows
      .filter((row) => row.markerStatus === "verified with catalog ID mismatch")
      .map(({ naid, localId, title, markerChecks }) => ({ naid, localId, title, markerChecks })),
    markerExceptions: rows
      .filter((row) => !row.markerStatus.startsWith("verified"))
      .map(({ naid, localId, title, hasOnlinePdf, markerStatus, markerChecks }) => ({
        naid,
        localId,
        title,
        hasOnlinePdf,
        markerStatus,
        markerChecks,
      })),
    totalPdfBytes,
    totalPdfPages: auditedPdfPageTotal,
    auditedPageCountRows: rows.filter((row) => row.hasOnlinePdf && row.pdfPages > 0).length,
    pdfSizeMetadataMismatches: rows
      .filter((row) => row.catalogPdfBytes && row.pdfBytes && row.catalogPdfBytes !== row.pdfBytes)
      .map(({ naid, catalogPdfBytes, pdfBytes }) => ({ naid, catalogPdfBytes, servedPdfBytes: pdfBytes })),
    totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
    documentedDateOverrideNaids: rows.filter((row) => documentedDateOverrides.has(row.naid)).map((row) => row.naid),
    titleDateFallbackNaids: rows.filter((row) => row.dateBasis === "Folder title date").map((row) => row.naid),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "nsd-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "nsd-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "nsd-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} NSD file units; ${onlinePdfCount} online PDFs and ${markerVerified} opening provenance markers verified.`,
  );
}

async function fetchAllChildren() {
  const hits = [];
  let expectedCount = null;
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({
      ancestorNaId: seriesNaId,
      controlGroup,
      sort: "naId:asc",
      limit: "100",
      page: String(page),
      datesAgg: "true",
    });
    const response = await fetchJson(`${catalogBase}/proxy/records/search?${query}`);
    const pageHits = response.body.hits.hits;
    expectedCount ??= response.body.hits.total.value;
    hits.push(...pageHits);
    if (hits.length >= expectedCount) break;
    if (!pageHits.length) throw new Error(`NARA pagination ended at ${hits.length} of ${expectedCount} file units`);
  }
  if (hits.length !== expectedCount) {
    throw new Error(`Expected ${expectedCount} NSD file units; received ${hits.length}`);
  }
  return hits;
}

async function fetchJson(url) {
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.json();
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`NARA request failed for ${url}: ${lastError}`);
}

async function fetchExtractedText(row) {
  const cachePath = ocrCacheDir ? path.join(ocrCacheDir, `${row.naid}.txt`) : "";
  if (cachePath && fs.existsSync(cachePath)) return fs.readFileSync(cachePath, "utf8");
  const response = await fetchJson(`${catalogBase}/proxy/extractedText/${row.naid}?objectId=${row.objectId}`);
  const extractedText = response.digitalObjects?.[0]?.extractedText || "";
  if (cachePath) {
    fs.mkdirSync(ocrCacheDir, { recursive: true });
    fs.writeFileSync(cachePath, extractedText);
  }
  return extractedText;
}

async function fetchContentLength(url) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const value = Number(response.headers.get("content-length"));
      return Number.isFinite(value) && value > 0 ? value : 0;
    } catch {
      if (attempt === 4) return 0;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  return 0;
}

async function runPool(values, size, worker) {
  let next = 0;
  await Promise.all(
    Array.from({ length: size }, async () => {
      while (next < values.length) {
        const index = next;
        next += 1;
        await worker(values[index]);
      }
    }),
  );
}

function toBaseRow(hit) {
  const record = hit._source.record;
  const object = record.digitalObjects?.[0];
  const naid = String(record.naId);
  return {
    naid,
    title: record.title,
    localId: record.localIdentifier,
    catalogUrl: `${catalogBase}/id/${record.naId}`,
    pdfUrl: object?.objectUrl || "",
    catalogPdfBytes: Number(object?.objectFileSize) || 0,
    pdfBytes: Number(object?.objectFileSize) || 0,
    pdfByteBasis: object ? "Catalog objectFileSize" : "No online PDF",
    objectId: object?.objectId ? String(object.objectId) : "",
    hasOnlinePdf: Boolean(object?.objectUrl && object?.objectId),
    pdfPages: servedPdfPageCounts.get(naid) ?? 0,
    catalogCoverageStart: record.coverageStartDate?.logicalDate || "",
    catalogCoverageEnd: record.coverageEndDate?.logicalDate || "",
    accessStatus: record.accessRestriction?.status || "Not stated",
  };
}

function deriveReviewFields(row, extractedText) {
  const openingText = extractedText.slice(0, 2_500);
  const markerField = openingText.match(/Folder ID Number:\s*([\s\S]{0,100}?)Folder Title:/i)?.[1] || "";
  const markerFolderIds = [...markerField.matchAll(/\b(\d{5})\s*-\s*(\d{1,3})\b/g)].map(
    (match) => `${match[1]}-${match[2].padStart(3, "0")}`,
  );
  const handwrittenCorrection = handwrittenFolderIdCorrections.get(row.naid);
  const catalogMismatch = catalogFolderIdMismatches.get(row.naid);
  const visuallyVerifiedFolderId = visuallyVerifiedFolderIds.get(row.naid);
  const markerFolderId =
    catalogMismatch?.markerFolderId ||
    handwrittenCorrection?.markerFolderId ||
    visuallyVerifiedFolderId ||
    markerFolderIds.find((value) => value === row.localId) ||
    markerFolderIds[0] ||
    "";
  const markerChecks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /george\s+h\.?\s*w\.?\s+bush\s+presidential\s+records/i.test(openingText),
    office: /national\s+security\s+council/i.test(openingText),
    series: /series:\s*H-Files/i.test(openingText),
    subseries: /subseries:\s*NSD\s+Files/i.test(openingText),
    folderId: markerFolderIds.includes(row.localId) || visuallyVerifiedFolderId === row.localId,
    markerFolderId,
    markerFolderIds,
    catalogFolderId: row.localId,
  };
  if (visuallyVerifiedFolderId) {
    markerChecks.visualFolderIdCheck = `Source image shows ${visuallyVerifiedFolderId}; NARA OCR omitted the Folder ID`;
  }
  const coreMarkerChecks = [
    markerChecks.marker,
    markerChecks.recordGroup,
    markerChecks.office,
    markerChecks.series,
    markerChecks.subseries,
  ];
  let markerStatus = "not present";
  if (coreMarkerChecks.every(Boolean) && handwrittenCorrection?.correctedFolderId === row.localId) {
    markerStatus = "verified with handwritten correction";
    markerChecks.handwrittenCorrection = handwrittenCorrection.markerFolderId
      ? `${handwrittenCorrection.markerFolderId} crossed out; corrected by hand to ${row.localId}`
      : `Folder ID corrected by hand to ${row.localId}`;
  } else if (
    coreMarkerChecks.every(Boolean) &&
    catalogMismatch?.markerFolderId === markerFolderId &&
    catalogMismatch.catalogFolderId === row.localId
  ) {
    markerStatus = "verified with catalog ID mismatch";
    markerChecks.catalogMismatch = `${markerFolderId} on the marker; ${row.localId} in the Catalog and digital-object path`;
  } else if (coreMarkerChecks.every(Boolean) && markerChecks.folderId) {
    markerStatus = "verified";
  }
  const dates = deriveWorkingDates(row);
  const chapter = inferChapter(row.naid);
  const routing = inferRouting(row.naid);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = normalizeFolderTitle(row.title);
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSD Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`;

  return {
    chapter,
    routing,
    ...dates,
    markerStatus,
    markerChecks,
    archivalLocator: folderCitation,
    provenanceStem: markerStatus.startsWith("verified") ? `Source: ${folderCitation}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals: reviewSignalCounts(extractedText),
    economicSignals: economicSignalCounts(extractedText),
  };
}

function deriveUnavailableFields(row) {
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = normalizeFolderTitle(row.title);
  return {
    chapter: inferChapter(row.naid),
    routing: inferRouting(row.naid),
    ...deriveWorkingDates(row),
    markerStatus: "not online",
    markerChecks: {},
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSD Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`,
    provenanceStem: "",
    ocrCharacterCount: 0,
    reviewSignals: reviewSignalCounts(""),
    economicSignals: economicSignalCounts(""),
  };
}

function deriveWorkingDates(row) {
  const documented = documentedDateOverrides.get(row.naid);
  if (documented) {
    return {
      workingStartDate: documented.date,
      workingEndDate: documented.date,
      dateBasis: documented.basis,
    };
  }
  if (row.catalogCoverageStart) {
    return {
      workingStartDate: row.catalogCoverageStart,
      workingEndDate: row.catalogCoverageEnd || row.catalogCoverageStart,
      dateBasis: "Catalog coverage dates",
    };
  }
  const parsed = parseTitleDate(row.title);
  return {
    workingStartDate: parsed || "9999-12-31",
    workingEndDate: parsed || "9999-12-31",
    dateBasis: parsed ? "Folder title date" : "Date not established",
  };
}

function parseTitleDate(title) {
  const match = title.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(19\d{2})\b/i);
  if (!match) return "";
  const month = [
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ].indexOf(match[1].toLowerCase()) + 1;
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(match[2]).padStart(2, "0")}`;
}

function normalizeFolderTitle(title) {
  return title
    .replace(/\bNSD-(\d+[a-z]?)/gi, "NSD–$1")
    .replaceAll(" - ", "—")
    .replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+0(\d),/gi,
      "$1 $2,",
    );
}

function reviewSignalCounts(text) {
  return {
    memosToPresident: count(text, /MEMORANDUM\s+(?:FOR|TO)\s+(?:THE\s+)?PRESIDENT/gi),
    memosToScowcroft: count(
      text,
      /MEMORANDUM\s+(?:FOR|TO)\s+(?:BRENT|GENERAL|THE HONORABLE BRENT)[\s\S]{0,80}?SCOWCROFT/gi,
    ),
    memorandaOfConversation: count(text, /MEMORANDUM OF CONVERSATION/gi),
    meetingRecords: count(
      text,
      /\b(?:SUMMARY OF CONCLUSIONS|MINUTES OF (?:THE )?(?:NATIONAL SECURITY COUNCIL |NSC DEPUTIES COMMITTEE )?MEETING|MEETING OF THE (?:NATIONAL SECURITY COUNCIL|NSC DEPUTIES COMMITTEE)|RECORD OF MEETING)\b/gi,
    ),
    withdrawalSheets: count(text, /Withdrawal\/Redaction Sheet/gi),
  };
}

function economicSignalCounts(text) {
  const searchableText = text
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/release would disclose trade secrets|confidential commercial or financial information|financial institutions\s*\[|freedom of information|foia marker/i.test(
          line,
        ),
    )
    .join("\n");
  const groups = {
    economy: count(searchableText, /\b(?:economic|economics|economy|economies)\b/gi),
    finance: count(
      searchableText,
      /\b(?:debt|finance|financial|monetary|currency|exchange rates?|international monetary fund|world bank|imf)\b/gi,
    ),
    trade: count(
      searchableText,
      /\b(?:trade|exports?|imports?|cocom|tariffs?|investment|gatt|uruguay round|technology transfer|export controls?)\b/gi,
    ),
    assistanceSanctions: count(
      searchableText,
      /\b(?:economic assistance|foreign assistance|aid package|credits?|sanctions?)\b/gi,
    ),
    energy: count(searchableText, /\b(?:oil|energy|petroleum|opec|strategic petroleum reserve)\b/gi),
    agriculture: count(searchableText, /\b(?:agriculture|agricultural|food aid|food security|commodit(?:y|ies))\b/gi),
    treasury: count(searchableText, /\b(?:treasury|nicholas brady|secretary brady)\b/gi),
  };
  return {
    ...groups,
    total: Object.values(groups).reduce((sum, value) => sum + value, 0),
  };
}

function inferChapter(naid) {
  if (tradePolicyNaids.has(naid)) return "Trade Policy and Market Access";
  if (monetaryPolicyNaids.has(naid)) return "Monetary Policy, Debt, and International Institutions";
  if (summitNaids.has(naid)) return "Economic Summits and Industrialized-Country Cooperation";
  if (transitionEconomyNaids.has(naid)) return "Transition Economies and International Economic Strategy";
  if (strategicTradeNaids.has(naid)) return "Strategic Trade, Technology, and Investment Controls";
  return "Series context and cross-volume routing";
}

function inferRouting(naid) {
  if (directReviewNaids.has(naid)) return "Volume XXX review";
  if (boundaryReviewNaids.has(naid)) return "Boundary review";
  return "Series context";
}

function count(text, expression) {
  return text.match(expression)?.length || 0;
}

function compact(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function duplicates(values) {
  const seen = new Set();
  const duplicateValues = new Set();
  values.forEach((value) => {
    if (seen.has(value)) duplicateValues.add(value);
    seen.add(value);
  });
  return [...duplicateValues];
}
