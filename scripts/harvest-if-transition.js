#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const candidateConfig = require("./if-transition-candidate-config");
const servedPdfPageCounts = require("./if-transition-page-counts");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "348937136";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const metadataCacheDir = process.env.NARA_METADATA_CACHE_DIR || "";
const auditedPdfPageTotal = 3612;
const documentedDateOverrides = new Map([
  ["470760855", { start: "1988-11-09", end: "1988-11-09", basis: "Dated covering memorandum", label: "November 9, 1988" }],
  ["470760856", { start: "1989-09-01", end: "1989-09-30", basis: "Manual month", label: "September 1989" }],
  ["470760857", { start: "1988-11-01", end: "1988-11-30", basis: "Briefing-book cover month", label: "November 1988" }],
  ["470760858", { start: "1988-12-01", end: "1989-09-14", basis: "Compilation cover month through dated Bush letter", label: "December 1988-September 14, 1989" }],
  ["470760859", { start: "1988-11-01", end: "1988-11-30", basis: "Briefing-book cover month", label: "November 1988" }],
  ["470760860", { start: "1988-12-09", end: "1988-12-09", basis: "Dated covering memorandum", label: "December 9, 1988" }],
  ["470760861", { start: "1986-01-01", end: "1986-12-31", basis: "Staff-manual cover year", label: "1986" }],
  ["470760862", { start: "1989-01-01", end: "1989-01-31", basis: "Manual cover month", label: "January 1989" }],
  ["470760863", { start: "1989-01-01", end: "1989-01-31", basis: "Companion manual cover month", label: "January 1989" }],
  ["470760873", { start: "1988-10-17", end: "1988-10-17", basis: "Dated covering memorandum", label: "October 17, 1988" }],
  ["470760874", { start: "1988-10-17", end: "1988-10-17", basis: "Companion folder to dated transition-planning memorandum", label: "October 17, 1988" }],
]);
const handwrittenFolderIdCorrections = new Map();
const catalogFolderIdMismatches = new Map();

// Curated after the complete title and OCR sweep. These are file-level leads,
// not claims that every document in a folder belongs in Volume XXX.
const directReviewNaids = new Set([
  "470760857",
  "470760859",
]);
const boundaryReviewNaids = new Set([
  "470760855",
  "470760866",
]);
const tradePolicyNaids = new Set(["470760859"]);
const monetaryPolicyNaids = new Set([]);
const summitNaids = new Set(["470760857"]);
const transitionEconomyNaids = new Set([
  "470760855",
  "470760866",
]);
const strategicTradeNaids = new Set([]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load NSC IF Transition series ${seriesNaId}`);
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
    throw new Error("IF Transition served-PDF page audit does not cover every Catalog file unit");
  }
  if (auditedPageTotal !== auditedPdfPageTotal) {
    throw new Error(
      `IF Transition served-PDF page total changed: expected ${auditedPdfPageTotal}; received ${auditedPageTotal}`,
    );
  }
  if (rows.some((row) => row.hasOnlinePdf !== (row.pdfPages > 0))) {
    throw new Error("IF Transition online-PDF status and served-PDF page audit disagree");
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
      row.reviewTopics = candidate.topics;
      row.reviewFocus = candidate.focus;
      row.reviewKeyExtent = candidate.keyExtent;
      const date = candidate.date || row.workingStartDate;
      return {
        naid: candidate.naid,
        date,
        sortDate: candidate.sortDate || date,
        datePrecision: candidate.datePrecision || "day",
        displayDateLabel: candidate.displayDateLabel || "",
        pageCount: candidate.pageCount,
        extentLabel: candidate.keyExtent
          ? `${candidate.pageCount} PDF pages; ${candidate.keyExtent}`
          : `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
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
    throw new Error("Curated routing sets and IF Transition candidate configuration do not match");
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
      shortTitle: "NSC IF Transition Files",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: rows.length,
      onlinePdfCount,
      catalogOnlyCount: rows.length - onlinePdfCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "H-Files",
      subseries: "IF Transition Files",
      markerVerified,
      markerCorrectedCount,
      markerMismatchCount,
      markerExceptionCount: rows.length - markerVerified,
      totalPdfBytes,
      totalPdfPages: auditedPdfPageTotal,
      methodology:
        "Every file unit was enumerated from the complete NARA Catalog series hierarchy. Working chronology uses dated covering memoranda, compilation cover dates, folder-title months, and an explicit Winter 1989 label; normalized first-of-month values are sorting aids, not invented day dates. NARA extracted text supplies high-level and economic-policy review signals for every online PDF. Routing reflects manual review of every title, full OCR transcript, opening provenance marker, withdrawal-sheet description, and duplicate transition-book copy. Marker status requires the opening OCR segment to name the record group, office, series, subseries, and folder.",
    },
    fileUnits: rows,
    generatedAt,
  };
  const candidateOutput = {
    auditScope: "Complete NSC Institutional Files Transition series inventory with economic-policy, provenance, withdrawal, and duplicate-copy screening",
    auditedFolders: candidateDocuments.map((candidate) => rowByNaid.get(candidate.naid).localId),
    methodology:
      "All 30 file units were enumerated from the complete official NARA Catalog hierarchy. Every official PDF, opening provenance marker, full NARA OCR transcript, and withdrawal-sheet description was screened across 3,612 served-PDF pages. The four entries below retain two direct Volume XXX review files and two boundary or compiler-context files. Overlapping copies in the Transition Background Materials and procedural manuals remain in the full ledger but are not promoted as separate candidates. Page counts were read from the served official PDFs with Poppler pdfinfo; they are file-unit extents, not document extents. Item extents and current release status are stated only where the source images and withdrawal sheets support them. These file-level records remain archival locators until each proposed document heading, dateline, terminal marking, and release status is checked in the source images.",
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
  fs.writeFileSync(path.join(dataDir, "if-transition-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "if-transition-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "if-transition-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} IF Transition file units; ${onlinePdfCount} online PDFs and ${markerVerified} opening provenance markers verified.`,
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
    throw new Error(`Expected ${expectedCount} IF Transition file units; received ${hits.length}`);
  }
  return hits;
}

async function fetchJson(url) {
  const cachePath = metadataCachePath(url);
  if (cachePath && fs.existsSync(cachePath)) return JSON.parse(fs.readFileSync(cachePath, "utf8"));
  let lastError;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const value = await response.json();
      if (cachePath) {
        fs.mkdirSync(metadataCacheDir, { recursive: true });
        fs.writeFileSync(cachePath, `${JSON.stringify(value)}\n`);
      }
      return value;
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`NARA request failed for ${url}: ${lastError}`);
}

function metadataCachePath(url) {
  if (!metadataCacheDir || !url.includes("/proxy/records/search?")) return "";
  const parsed = new URL(url);
  const directNaid = parsed.searchParams.get("naId");
  if (directNaid) return path.join(metadataCacheDir, `naid-${directNaid}.json`);
  const ancestorNaid = parsed.searchParams.get("ancestorNaId");
  const page = parsed.searchParams.get("page") || "1";
  return ancestorNaid ? path.join(metadataCacheDir, `ancestor-${ancestorNaid}-page-${page}.json`) : "";
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
    pdfPages: servedPdfPageCounts.get(naid) || 0,
    catalogCoverageStart: record.coverageStartDate?.logicalDate || "",
    catalogCoverageEnd: record.coverageEndDate?.logicalDate || "",
    accessStatus: record.accessRestriction?.status || "Not stated",
  };
}

function deriveReviewFields(row, extractedText) {
  const openingText = extractedText.slice(0, 2_500);
  const markerFolderId = openingText.match(/Folder ID Number:\s*([0-9]{5}-[0-9]{3})/i)?.[1] || "";
  const markerChecks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /george\s+h\.?\s*w\.?\s+bush\s+presidential\s+records/i.test(openingText),
    office: /national\s+security\s+council/i.test(openingText),
    series: /series:\s*H-Files/i.test(openingText),
    subseries: /subseries:\s*IF\s+Transition\s+Files/i.test(openingText),
    folderId: markerFolderId === row.localId,
    markerFolderId,
    catalogFolderId: row.localId,
  };
  const coreMarkerChecks = [
    markerChecks.marker,
    markerChecks.recordGroup,
    markerChecks.office,
    markerChecks.series,
    markerChecks.subseries,
  ];
  const handwrittenCorrection = handwrittenFolderIdCorrections.get(row.naid);
  const catalogMismatch = catalogFolderIdMismatches.get(row.naid);
  let markerStatus = "not present";
  if (coreMarkerChecks.every(Boolean) && markerChecks.folderId) {
    markerStatus = "verified";
  } else if (
    coreMarkerChecks.every(Boolean) &&
    handwrittenCorrection?.markerFolderId === markerFolderId &&
    handwrittenCorrection.correctedFolderId === row.localId
  ) {
    markerStatus = "verified with handwritten correction";
    markerChecks.handwrittenCorrection = `${markerFolderId} to ${row.localId}`;
  } else if (
    coreMarkerChecks.every(Boolean) &&
    catalogMismatch?.markerFolderId === markerFolderId &&
    catalogMismatch.catalogFolderId === row.localId
  ) {
    markerStatus = "verified with catalog ID mismatch";
    markerChecks.catalogMismatch = `${markerFolderId} on the marker; ${row.localId} in the Catalog and digital-object path`;
  }
  const dates = deriveWorkingDates(row);
  const chapter = inferChapter(row.naid);
  const routing = inferRouting(row.naid);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, IF Transition Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`;

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
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  return {
    chapter: inferChapter(row.naid),
    routing: inferRouting(row.naid),
    ...deriveWorkingDates(row),
    markerStatus: "not online",
    markerChecks: {},
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, IF Transition Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`,
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
      workingStartDate: documented.start,
      workingEndDate: documented.end,
      dateBasis: documented.basis,
      workingDateLabel: documented.label,
    };
  }
  if (row.catalogCoverageStart) {
    const monthLabel = catalogMonthLabel(row.catalogCoverageStart, row.catalogCoverageEnd);
    return {
      workingStartDate: row.catalogCoverageStart,
      workingEndDate: row.catalogCoverageEnd || row.catalogCoverageStart,
      dateBasis: monthLabel ? "Catalog coverage month" : "Catalog coverage dates",
      workingDateLabel: monthLabel,
    };
  }
  if (/January 1989/i.test(row.title)) {
    return {
      workingStartDate: "1989-01-01",
      workingEndDate: "1989-01-31",
      dateBasis: "Folder title month",
      workingDateLabel: "January 1989",
    };
  }
  if (/NSC Procedural Manual/i.test(row.title)) {
    return {
      workingStartDate: "1989-01-01",
      workingEndDate: "1989-01-01",
      dateBasis: "Winter 1989 compilation; January 1 is a sorting key only",
      workingDateLabel: "Winter 1989",
    };
  }
  const parsed = parseTitleDate(row.title);
  return {
    workingStartDate: parsed || "9999-12-31",
    workingEndDate: parsed || "9999-12-31",
    dateBasis: parsed ? "Folder title date" : "Date not established",
    workingDateLabel: "",
  };
}

function catalogMonthLabel(start, end) {
  if (!/^\d{4}-\d{2}-01$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end || "")) return "";
  const startDate = new Date(`${start}T12:00:00Z`);
  const endDate = new Date(`${end}T12:00:00Z`);
  if (
    startDate.getUTCFullYear() !== endDate.getUTCFullYear() ||
    startDate.getUTCMonth() !== endDate.getUTCMonth() ||
    endDate.getUTCDate() !== new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, 0)).getUTCDate()
  ) {
    return "";
  }
  return startDate.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
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
