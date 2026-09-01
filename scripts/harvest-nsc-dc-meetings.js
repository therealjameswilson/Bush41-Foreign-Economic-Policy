#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const candidateConfig = require("./nsc-dc-candidate-config");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "312294079";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const correctedMarkerNaids = new Set(["470761226", "470761228"]);

// Curated after the complete title and OCR sweep. These are file-level leads,
// not claims that every document in a folder belongs in Volume XXX.
const directReviewNaids = new Set([
  "470760982",
  "470760984",
  "470760988",
  "470760989",
  "470761020",
  "470761024",
  "470761033",
  "470761034",
  "470761035",
  "470761044",
  "470761085",
  "470761087",
  "470761097",
  "470761106",
  "470761107",
  "470761111",
  "470761125",
  "470761151",
  "470761209",
  "470761214",
  "470761216",
  "470761217",
  "470761219",
  "470761222",
  "470761224",
  "470761236",
  "470761267",
  "470761268",
  "352356450",
  "470761303",
  "470761329",
  "470761336",
  "470761340",
  "470761347",
  "470761355",
  "470761356",
  "470761359",
  "470761363",
  "470761367",
  "470761369",
  "470761371",
  "470761372",
  "470761377",
  "470761383",
  "470761423",
  "470761424",
  "470761425",
]);
const boundaryReviewNaids = new Set([
  "470760976",
  "470760981",
  "470760991",
  "470760994",
  "470761017",
  "470761031",
  "470761050",
  "470761053",
  "470761067",
  "470761080",
  "470761086",
  "470761112",
  "470761208",
  "470761265",
  "470761277",
  "470761278",
  "470761279",
  "470761280",
  "470761281",
  "470761339",
  "470761346",
  "470761348",
  "470761353",
  "470761360",
  "470761362",
  "470761366",
  "470761376",
  "470761381",
  "470761411",
  "470761415",
  "470761420",
  "470761427",
]);
const tradePolicyNaids = new Set(["470760984", "470761347", "470761367"]);
const monetaryPolicyNaids = new Set([
  "352356450",
  "470760991",
  "470760994",
  "470761050",
  "470761067",
  "470761080",
  "470761086",
  "470761112",
  "470761208",
  "470761265",
  "470761277",
  "470761278",
  "470761279",
  "470761280",
  "470761281",
  "470761360",
  "470761362",
  "470761420",
]);
const summitNaids = new Set([]);
const transitionEconomyNaids = new Set([
  "470760982",
  "470760988",
  "470760989",
  "470761020",
  "470761024",
  "470761034",
  "470761035",
  "470761151",
  "470761329",
  "470761336",
  "470761377",
  "470761425",
]);
const strategicTradeNaids = new Set([
  "470760976",
  "470760981",
  "470761017",
  "470761031",
  "470761033",
  "470761044",
  "470761053",
  "470761085",
  "470761087",
  "470761097",
  "470761106",
  "470761107",
  "470761111",
  "470761125",
  "470761209",
  "470761214",
  "470761216",
  "470761217",
  "470761219",
  "470761222",
  "470761224",
  "470761236",
  "470761267",
  "470761268",
  "470761303",
  "470761339",
  "470761340",
  "470761346",
  "470761348",
  "470761353",
  "470761355",
  "470761356",
  "470761359",
  "470761363",
  "470761366",
  "470761369",
  "470761371",
  "470761372",
  "470761376",
  "470761381",
  "470761383",
  "470761411",
  "470761415",
  "470761423",
  "470761424",
  "470761427",
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load NSC/Deputies Committee series ${seriesNaId}`);
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
      return {
        naid: candidate.naid,
        date: row.workingStartDate,
        pageCount: candidate.pageCount,
        extentLabel: `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
        selection: candidate.selection,
        topics: candidate.topics,
        notes: `${candidate.selection === "Core" ? "Direct Volume XXX review." : "Boundary review."} ${candidate.focus} Promote individual documents only after the heading, dateline, terminal marking, and release or withdrawal status are checked in the source images.`,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.naid.localeCompare(b.naid));
  const routedNaids = new Set(rows.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const configuredNaids = new Set(candidateDocuments.map((candidate) => candidate.naid));
  if (routedNaids.size !== configuredNaids.size || [...routedNaids].some((naid) => !configuredNaids.has(naid))) {
    throw new Error("Curated routing sets and NSC/DC candidate configuration do not match");
  }

  const generatedAt = new Date().toISOString();
  const markerVerified = rows.filter((row) => row.markerStatus.startsWith("verified")).length;
  const markerCorrectedCount = rows.filter((row) => row.markerStatus === "verified with handwritten correction").length;
  const onlinePdfCount = rows.filter((row) => row.hasOnlinePdf).length;
  const totalPdfBytes = rows.reduce((total, row) => total + row.pdfBytes, 0);
  const output = {
    collection: {
      naid: seriesNaId,
      title: seriesRecord.title,
      shortTitle: "NSC/DC Meeting Files",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: rows.length,
      onlinePdfCount,
      catalogOnlyCount: rows.length - onlinePdfCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "H-Files",
      subseries: "NSC/DC Meetings Files",
      markerVerified,
      markerCorrectedCount,
      markerExceptionCount: rows.length - markerVerified,
      totalPdfBytes,
      methodology:
        "Every file unit was enumerated from all pages of the NARA Catalog series hierarchy. Catalog coverage dates control the working chronology; a date parsed from the folder title is used only when catalog coverage dates are absent. NARA extracted text supplies high-level and economic-policy review signals for every online PDF. Routing reflects manual review of the title and OCR evidence. Marker status requires the opening OCR segment to name the record group, office, series, subseries, and folder ID. Catalog-only file units remain visible and are not assigned a provenance marker.",
    },
    fileUnits: rows,
    generatedAt,
  };
  const candidateOutput = {
    auditScope: "Complete series inventory with economic-policy screening",
    auditedFolders: candidateDocuments.map((candidate) => rowByNaid.get(candidate.naid).localId),
    methodology:
      "All 492 file units were enumerated from the complete official NARA Catalog hierarchy. NARA provides 479 online PDFs; every online opening provenance sheet and every full NARA OCR transcript were checked. The 79 entries below were selected after title review and a full-series sweep for trade, finance, debt, assistance, sanctions, energy, technology transfer, export controls, Treasury, and related economic-policy evidence. Page counts were read from the served official PDFs with Poppler pdfinfo; they are file-unit extents, not document extents. These records remain archival locators until individual document headings, datelines, terminal markings, and release or withdrawal status are checked in the source images.",
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
    markerCorrections: rows
      .filter((row) => row.markerStatus === "verified with handwritten correction")
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
    pdfSizeMetadataMismatches: rows
      .filter((row) => row.catalogPdfBytes && row.pdfBytes && row.catalogPdfBytes !== row.pdfBytes)
      .map(({ naid, catalogPdfBytes, pdfBytes }) => ({ naid, catalogPdfBytes, servedPdfBytes: pdfBytes })),
    totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
    titleDateFallbackNaids: rows.filter((row) => row.dateBasis === "Folder title date").map((row) => row.naid),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "nsc-dc-meetings-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "nsc-dc-meetings-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "nsc-dc-meetings-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} NSC/DC Meeting file units; ${onlinePdfCount} online PDFs and ${markerVerified} opening provenance markers verified.`,
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
    throw new Error(`Expected ${expectedCount} NSC/DC Meeting file units; received ${hits.length}`);
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
  return {
    naid: String(record.naId),
    title: record.title,
    localId: record.localIdentifier,
    catalogUrl: `${catalogBase}/id/${record.naId}`,
    pdfUrl: object?.objectUrl || "",
    catalogPdfBytes: Number(object?.objectFileSize) || 0,
    pdfBytes: Number(object?.objectFileSize) || 0,
    pdfByteBasis: object ? "Catalog objectFileSize" : "No online PDF",
    objectId: object?.objectId ? String(object.objectId) : "",
    hasOnlinePdf: Boolean(object?.objectUrl && object?.objectId),
    catalogCoverageStart: record.coverageStartDate?.logicalDate || "",
    catalogCoverageEnd: record.coverageEndDate?.logicalDate || "",
    accessStatus: record.accessRestriction?.status || "Not stated",
  };
}

function deriveReviewFields(row, extractedText) {
  const openingText = extractedText.slice(0, 2_500);
  const markerChecks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /george\s+h\.?\s*w\.?\s+bush\s+presidential\s+records/i.test(openingText),
    office: /national\s+security\s+council/i.test(openingText),
    series: /series:\s*H-Files/i.test(openingText),
    subseries: /subseries:\s*NSC\s*\/\s*DC\s+Meetings\s+Files/i.test(openingText),
    folderId: compact(openingText).includes(compact(row.localId)),
  };
  const markerStatus = Object.values(markerChecks).every(Boolean)
    ? "verified"
    : correctedMarkerNaids.has(row.naid) && Object.entries(markerChecks).every(([key, value]) => key === "folderId" || value)
      ? "verified with handwritten correction"
      : "not present";
  if (markerStatus === "verified with handwritten correction") markerChecks.folderIdCorrection = true;
  const dates = deriveWorkingDates(row);
  const chapter = inferChapter(row.naid);
  const routing = inferRouting(row.naid);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSC/DC Meetings Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`;

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
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSC/DC Meetings Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`,
    provenanceStem: "",
    ocrCharacterCount: 0,
    reviewSignals: reviewSignalCounts(""),
    economicSignals: economicSignalCounts(""),
  };
}

function deriveWorkingDates(row) {
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
