#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const servedPdfPageCounts = require("./deal-chron-page-counts");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "2554807";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const metadataCacheDir = process.env.NARA_METADATA_CACHE_DIR || "";
const sizeCacheFile = process.env.NARA_SIZE_CACHE_FILE || "";
const sizeCache = sizeCacheFile && fs.existsSync(sizeCacheFile) ? JSON.parse(fs.readFileSync(sizeCacheFile, "utf8")) : {};

const expectedFileUnitCount = 96;
const expectedPdfPageTotal = 9093;
const expectedCatalogPdfBytes = 4149236610;
const expectedOcrCharacters = 12917675;
const expectedRawWithdrawalHeaders = 813;
const expectedWithdrawalItems = 697;
const expectedWithdrawalPages = 2121;
const expectedReleasedInPart = 0;
const expectedEconomicSubjectLeads = 708;
const expectedRelevantWithdrawalLeads = 275;
const expectedCoreCandidates = 76;
const expectedConsiderCandidates = 20;
const expectedDuplicateGroups = 69;
const expectedDuplicateEntries = 152;
const expectedCrossCollectionMatches = 7;

const expectedWithdrawalStats = new Map([
  ["452050412", [10, 28, 0, 11]],
  ["452050413", [6, 21, 0, 7]],
  ["452050414", [7, 9, 0, 8]],
  ["452050415", [10, 15, 0, 12]],
  ["452050416", [4, 14, 0, 5]],
  ["452050417", [0, 0, 0, 0]],
  ["452050418", [8, 23, 0, 9]],
  ["452050419", [7, 13, 0, 8]],
  ["452050420", [4, 12, 0, 5]],
  ["452050421", [9, 16, 0, 10]],
  ["452050422", [5, 11, 0, 6]],
  ["452050423", [3, 6, 0, 4]],
  ["452050424", [1, 1, 0, 2]],
  ["452050425", [8, 22, 0, 9]],
  ["452050426", [3, 25, 0, 4]],
  ["452050427", [3, 7, 0, 4]],
  ["452050428", [0, 0, 0, 0]],
  ["452050429", [17, 49, 0, 19]],
  ["452050430", [3, 8, 0, 4]],
  ["452050431", [1, 3, 0, 2]],
  ["452050432", [4, 8, 0, 5]],
  ["452050433", [9, 23, 0, 10]],
  ["452050434", [7, 16, 0, 8]],
  ["452050435", [4, 13, 0, 5]],
  ["452050436", [7, 18, 0, 8]],
  ["452050437", [5, 9, 0, 6]],
  ["452050438", [0, 0, 0, 0]],
  ["452050439", [2, 3, 0, 3]],
  ["452050440", [0, 0, 0, 0]],
  ["452050441", [6, 9, 0, 7]],
  ["452050442", [7, 45, 0, 8]],
  ["452050443", [14, 45, 0, 16]],
  ["452050444", [8, 28, 0, 9]],
  ["452050445", [9, 28, 0, 10]],
  ["452050446", [3, 13, 0, 4]],
  ["452050447", [13, 69, 0, 15]],
  ["452050448", [5, 9, 0, 6]],
  ["452050449", [3, 10, 0, 4]],
  ["452050450", [1, 9, 0, 2]],
  ["452050451", [12, 36, 0, 14]],
  ["452050452", [33, 64, 0, 37]],
  ["452050453", [15, 40, 0, 17]],
  ["452050454", [13, 54, 0, 15]],
  ["452050455", [19, 38, 0, 21]],
  ["452050456", [10, 13, 0, 12]],
  ["452050457", [1, 7, 0, 2]],
  ["452050458", [25, 65, 0, 28]],
  ["452050459", [13, 110, 0, 15]],
  ["452050460", [5, 57, 0, 6]],
  ["452050461", [4, 12, 0, 5]],
  ["452050462", [8, 24, 0, 9]],
  ["452050463", [9, 20, 0, 10]],
  ["452050464", [10, 22, 0, 11]],
  ["452050465", [8, 25, 0, 9]],
  ["452050466", [1, 4, 0, 2]],
  ["452050467", [23, 39, 0, 26]],
  ["452050468", [7, 20, 0, 8]],
  ["452050469", [14, 30, 0, 16]],
  ["452050470", [11, 16, 0, 13]],
  ["452050471", [4, 5, 0, 5]],
  ["452050472", [1, 7, 0, 2]],
  ["452050473", [11, 27, 0, 13]],
  ["452050474", [13, 38, 0, 15]],
  ["452050475", [3, 11, 0, 4]],
  ["452050476", [7, 17, 0, 8]],
  ["452050477", [3, 32, 0, 4]],
  ["452050478", [8, 67, 0, 9]],
  ["452050479", [11, 60, 0, 13]],
  ["452050480", [3, 15, 0, 4]],
  ["452050481", [14, 66, 0, 16]],
  ["452050482", [12, 28, 0, 14]],
  ["452050483", [1, 2, 0, 2]],
  ["452050484", [10, 28, 0, 12]],
  ["452050485", [14, 30, 0, 16]],
  ["452050486", [8, 23, 0, 9]],
  ["452050487", [9, 33, 0, 10]],
  ["452050488", [6, 23, 0, 7]],
  ["452050489", [11, 32, 0, 12]],
  ["452050490", [9, 27, 0, 10]],
  ["452050491", [9, 28, 0, 10]],
  ["452050492", [7, 20, 0, 8]],
  ["452050493", [1, 1, 0, 2]],
  ["452050494", [0, 0, 0, 0]],
  ["452050495", [0, 0, 0, 0]],
  ["452050496", [1, 1, 0, 2]],
  ["452050497", [0, 0, 0, 0]],
  ["452050498", [5, 8, 0, 6]],
  ["452050499", [2, 7, 0, 3]],
  ["452050500", [0, 0, 0, 0]],
  ["452050501", [9, 26, 0, 10]],
  ["452050502", [12, 43, 0, 14]],
  ["452050503", [9, 26, 0, 10]],
  ["452050504", [1, 1, 0, 2]],
  ["452050505", [7, 14, 0, 8]],
  ["452050506", [9, 25, 0, 10]],
  ["452050507", [10, 16, 0, 12]],
]);

const economicLeadExpression = /\b(?:econom|trade|debt|financ|monetary|currency|exchange rate|world bank|imf|export|import|cocom|tariff|investment|gatt|uruguay round|cfius|assistance|aid|credit|sanction|energy|oil|petroleum|opec|agricultur|food|commodit|treasury|brady|summit|competitiveness|enterprise fund|ebrd|poland|hungary|eastern europe|soviet econom|economic policy council)/i;

const categoryRules = [
  {
    chapter: "Strategic Trade, Technology, and Investment Controls",
    topic: "Strategic trade and technology",
    expression: /\b(?:cocom|export controls?|export licenses?|technology transfer|cfius|strategic trade|nonproliferation|chemical weapons?|missile technology|dual-use)\b/i,
  },
  {
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    topic: "Economic summits and G-7 coordination",
    expression: /\b(?:economic summit|summit|g-?7|group of seven|sherpa|houston|london summit|munich summit)\b/i,
  },
  {
    chapter: "Transition Economies and International Economic Strategy",
    topic: "Transition economies and economic reform",
    expression: /\b(?:poland|hungary|eastern europe|soviet|ussr|russia|gorbachev|enterprise funds?|ebrd|european bank for reconstruction|economic reform|central europe|czechoslovak|romania|bulgaria|yugoslavia)\b/i,
  },
  {
    chapter: "Monetary Policy, Debt, and International Institutions",
    topic: "Debt, finance, and international institutions",
    expression: /\b(?:debt|financ(?:e|ial|ing)?|monetary|currenc(?:y|ies)|exchange rates?|world bank|imf|treasury|brady|banking|capital markets?|fiscal)\b/i,
  },
  {
    chapter: "Trade Policy and Market Access",
    topic: "Trade and market access",
    expression: /\b(?:trade|gatt|uruguay round|exports?|imports?|tariffs?|market access|competitiveness|agricultur(?:e|al)|commodit(?:y|ies)|steel|textiles?|semiconductors?|investment|ustr|industrial policy|energy|oil|petroleum|opec|economic report)\b/i,
  },
];

const crossCollectionMatches = new Map([
  ["452050434:07", "Possible title match to Deal-Reiss CF00186–010 item 03a; compare source images before selecting a controlling copy."],
  ["452050478:05", "Possible title match to Deal Summit CF00960–011 item 01; dates differ or are incomplete, so compare source images."],
  ["452050480:02", "Possible title match to Deal Summit CF00960–015 item 01; compare source images before selecting a controlling copy."],
  ["452050480:03", "Possible title match to Deal Summit CF00960–011 item 01; dates differ or are incomplete, so compare source images."],
  ["452050485:05", "Possible title match to Deal Summit CF00960–010 and CF00960–011; generic letter description requires source-image comparison."],
  ["452050485:09", "Possible title match to Deal Summit CF00960–010 and CF00960–011; generic letter description requires source-image comparison."],
  ["452050498:01", "Possible title match to Deal Summit CF00960–010 and CF00960–011; generic letter description requires source-image comparison."],
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load Timothy E. Deal Chronological Files series ${seriesNaId}`);
  }

  const hits = await fetchAllChildren();
  const rows = hits.map(toBaseRow);
  await runPool(rows, 8, async (row) => {
    const [extractedText, servedPdfBytes] = await Promise.all([
      fetchExtractedText(row),
      fetchContentLength(row),
    ]);
    if (servedPdfBytes) {
      row.pdfBytes = servedPdfBytes;
      row.pdfByteBasis = "HTTP Content-Length";
    } else {
      row.pdfByteBasis = "Catalog objectFileSize; HTTP Content-Length unavailable";
    }
    Object.assign(row, deriveReviewFields(row, extractedText));
  });

  rows.sort(
    (a, b) =>
      a.workingStartDate.localeCompare(b.workingStartDate) ||
      a.workingEndDate.localeCompare(b.workingEndDate) ||
      a.localId.localeCompare(b.localId),
  );
  const duplicateGroups = annotateProbableDuplicates(rows);
  const crossCollectionMatchItems = annotateCrossCollectionMatches(rows);
  validateRows(rows, duplicateGroups, crossCollectionMatchItems);

  const candidateDocuments = rows.map((row) => ({
    naid: row.naid,
    date: row.workingStartDate,
    sortDate: row.workingStartDate,
    displayDateLabel: `${row.workingDateLabel} (folder-level chronology)`,
    datePrecision: "month",
    pageCount: row.pdfPages,
    withdrawalSheetItemCount: row.withdrawalSheetItemCount,
    withdrawalSheetPages: row.withdrawalSheetPages,
    releasedInPartSheetCount: row.releasedInPartSheetCount,
    withdrawalItems: row.withdrawalItems,
    economicSubjectLeadCount: row.economicSubjectLeads.length,
    relevantWithdrawalSheetCount: row.relevantWithdrawalSheetCount,
    extentLabel: row.reviewKeyExtent,
    selection: row.selection,
    chapter: row.chapter,
    topics: row.reviewTopics,
    notes: `${row.selection === "Core" ? "Direct Volume XXX review." : "Selective Volume XXX review."} ${row.reviewFocus} This is a month-level file lead, not a document-level inclusion claim. Split documents, verify terminal markings and current release status, and compare duplicate or parallel copies before promotion.`,
  }));

  const generatedAt = new Date().toISOString();
  const onlinePdfCount = rows.filter((row) => row.hasOnlinePdf).length;
  const totalCatalogPdfBytes = rows.reduce((total, row) => total + row.catalogPdfBytes, 0);
  const measuredRows = rows.filter((row) => row.pdfByteBasis === "HTTP Content-Length");
  const totalMeasuredServedPdfBytes = measuredRows.reduce((total, row) => total + row.pdfBytes, 0);
  const totalRawWithdrawalSheetHeaders = rows.reduce((total, row) => total + row.rawWithdrawalSheetHeaderCount, 0);
  const totalWithdrawalSheetItems = rows.reduce((total, row) => total + row.withdrawalSheetItemCount, 0);
  const totalWithdrawalSheetPages = rows.reduce((total, row) => total + row.withdrawalSheetPages, 0);
  const releasedInPartSheetCount = rows.reduce((total, row) => total + row.releasedInPartSheetCount, 0);
  const totalEconomicSubjectLeads = rows.reduce((total, row) => total + row.economicSubjectLeads.length, 0);
  const totalRelevantWithdrawalSheetLeads = rows.reduce((total, row) => total + row.relevantWithdrawalSheetCount, 0);
  const output = {
    collection: {
      naid: seriesNaId,
      title: seriesRecord.title,
      shortTitle: "Timothy E. Deal Chronological Files",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: rows.length,
      onlinePdfCount,
      catalogOnlyCount: rows.length - onlinePdfCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "Timothy E. Deal Files",
      subseries: "Chronological Files",
      markerVerified: rows.filter((row) => row.markerStatus === "verified").length,
      markerMismatchCount: 0,
      markerExceptionCount: rows.filter((row) => row.markerStatus !== "verified").length,
      totalPdfBytes: totalCatalogPdfBytes,
      totalPdfByteBasis: "Catalog objectFileSize",
      totalCatalogPdfBytes,
      totalMeasuredServedPdfBytes,
      servedPdfSizeAvailableCount: measuredRows.length,
      pdfSizeUnavailableCount: rows.length - measuredRows.length,
      pdfSizeMetadataMismatchCount: measuredRows.filter((row) => row.pdfBytes !== row.catalogPdfBytes).length,
      totalPdfPages: expectedPdfPageTotal,
      totalRawWithdrawalSheetHeaders,
      withdrawalInventoryHeaderCount: totalRawWithdrawalSheetHeaders - totalWithdrawalSheetItems,
      totalWithdrawalSheetItems,
      totalWithdrawalSheetPages,
      releasedInPartSheetCount,
      noCopyIndicatedSheetCount: totalWithdrawalSheetItems - releasedInPartSheetCount,
      totalEconomicSubjectLeads,
      totalRelevantWithdrawalSheetLeads,
      totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
      probableDuplicateGroupCount: duplicateGroups.length,
      probableDuplicateSheetEntryCount: duplicateGroups.reduce((total, group) => total + group.locations.length, 0),
      crossCollectionTitleMatchCount: crossCollectionMatchItems.length,
      methodology:
        "Every file unit was enumerated from the complete NARA Catalog series hierarchy. All 96 official PDFs, 9,093 served-PDF pages, opening provenance markers, and full NARA OCR transcripts were screened. Folder months are retained as month-level sorting labels rather than invented document dates. The audit separates 116 inventory-sheet headers from 697 individual withdrawal/redaction sheets describing 2,121 pages; no sheet says that a released-in-part copy follows, and that absence is not treated as proof of current nonrelease. OCR subject lines and economically pertinent sheet descriptions drive file-level routing only. All entries remain archival locators pending document boundaries, terminal markings, current release status, and controlling-copy review.",
    },
    fileUnits: rows,
    generatedAt,
  };
  const candidateOutput = {
    auditScope:
      "Complete Timothy E. Deal Chronological Files inventory with month-level chronology, provenance, disposition-aware withdrawal evidence, economic-policy subject leads, and duplicate screening",
    auditedFolders: rows.map((row) => row.localId),
    methodology:
      "All 96 file units and 9,093 served-PDF pages were reviewed from the official NARA series. Seventy-six files are Core and twenty are Consider leads. The audit preserves 708 economic-policy subject-line leads and 275 economically pertinent descriptions among 697 individual withdrawal/redaction sheets covering 2,121 pages. Sixty-nine same-title/date groups involving 152 sheet entries are flagged as possible duplicate or parallel copies; seven items also carry cross-collection title-match warnings. These month-level entries are archival locators, not finished FRUS Source Notes.",
    documents: candidateDocuments,
  };
  const report = {
    generatedAt,
    seriesNaId,
    expectedFileUnits: expectedFileUnitCount,
    harvestedFileUnits: rows.length,
    onlinePdfCount,
    catalogOnlyCount: rows.length - onlinePdfCount,
    coreCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Core").length,
    considerCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Consider").length,
    chapterCounts: summarize(candidateDocuments, "chapter"),
    totalCatalogPdfBytes,
    totalMeasuredServedPdfBytes,
    servedPdfSizeAvailableCount: measuredRows.length,
    pdfSizeUnavailableCount: rows.length - measuredRows.length,
    pdfSizeMetadataMismatches: measuredRows
      .filter((row) => row.pdfBytes !== row.catalogPdfBytes)
      .map(({ naid, catalogPdfBytes, pdfBytes }) => ({ naid, catalogPdfBytes, servedPdfBytes: pdfBytes })),
    totalPdfPages: expectedPdfPageTotal,
    totalRawWithdrawalSheetHeaders,
    withdrawalInventoryHeaderCount: totalRawWithdrawalSheetHeaders - totalWithdrawalSheetItems,
    totalWithdrawalSheetItems,
    totalWithdrawalSheetPages,
    releasedInPartSheetCount,
    noCopyIndicatedSheetCount: totalWithdrawalSheetItems - releasedInPartSheetCount,
    totalEconomicSubjectLeads,
    totalRelevantWithdrawalSheetLeads,
    totalOcrCharacters: output.collection.totalOcrCharacters,
    markerVerified: output.collection.markerVerified,
    markerExceptions: rows
      .filter((row) => row.markerStatus !== "verified")
      .map(({ naid, localId, markerStatus, markerChecks }) => ({ naid, localId, markerStatus, markerChecks })),
    probableDuplicateGroups: duplicateGroups,
    crossCollectionTitleMatches: crossCollectionMatchItems,
    perFileWithdrawalStats: rows.map((row) => ({
      naid: row.naid,
      localId: row.localId,
      rawWithdrawalSheetHeaderCount: row.rawWithdrawalSheetHeaderCount,
      withdrawalInventoryHeaderCount: row.withdrawalInventoryHeaderCount,
      withdrawalSheetItemCount: row.withdrawalSheetItemCount,
      withdrawalSheetPages: row.withdrawalSheetPages,
      releasedInPartSheetCount: row.releasedInPartSheetCount,
    })),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "deal-chron-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "deal-chron-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "deal-chron-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} Deal chronological files and ${expectedPdfPageTotal} pages; extracted ${totalEconomicSubjectLeads} economic subject leads and ${totalWithdrawalSheetItems} individual sheet descriptions totaling ${totalWithdrawalSheetPages} pages.`,
  );
}

async function fetchAllChildren() {
  const query = new URLSearchParams({
    ancestorNaId: seriesNaId,
    controlGroup,
    sort: "naId:asc",
    limit: "100",
    page: "1",
    datesAgg: "true",
  });
  const response = await fetchJson(`${catalogBase}/proxy/records/search?${query}`);
  const hits = response.body.hits.hits;
  const expectedCount = response.body.hits.total.value;
  if (hits.length !== expectedCount || expectedCount !== expectedFileUnitCount) {
    throw new Error(`Expected ${expectedFileUnitCount} Deal chronological file units; received ${hits.length} of ${expectedCount}`);
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
  return ancestorNaid ? path.join(metadataCacheDir, `ancestor-${ancestorNaid}-page-1.json`) : "";
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

async function fetchContentLength(row) {
  if (Object.hasOwn(sizeCache, row.naid)) return Number(sizeCache[row.naid]) || 0;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await fetch(row.pdfUrl, { method: "HEAD" });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const value = Number(response.headers.get("content-length"));
      if (Number.isFinite(value) && value > 0) return value;
    } catch {
      // Retry below.
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 750));
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
  const openingText = extractedText.slice(0, 3_000);
  const markerSeries = normalizeSpace(openingText.match(/Series:\s*([\s\S]*?)Subseries:/i)?.[1] || "");
  const markerSubseries = normalizeSpace(openingText.match(/Subseries:\s*([\s\S]*?)OA\/ID Number:/i)?.[1] || "");
  const markerFolderId = openingText.match(/Folder ID Number:\s*([A-Z]{2}\d{5}-\d{3})/i)?.[1] || "";
  const markerChecks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /george\s+h\.?\s*w\.?\s+bush\s+presidential\s+records/i.test(openingText),
    office: /national\s+security\s+council/i.test(openingText),
    series: markerSeries === "Deal, Timothy E., Files",
    subseries: markerSubseries === "Chronological Files",
    folderId: markerFolderId === row.localId,
    markerSeries,
    markerSubseries,
    markerFolderId,
    catalogFolderId: row.localId,
  };
  const markerStatus = Object.values(markerChecks).slice(0, 6).every(Boolean) ? "verified" : "exception";
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  const archivalLocator = `George H.W. Bush Library, Bush Presidential Records, National Security Council, Timothy E. Deal Files, Chronological Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`;
  const withdrawalItems = parseWithdrawalItems(row.naid, extractedText);
  const rawWithdrawalSheetHeaderCount = count(extractedText, /Withdrawal\/Redaction Sheet/gi);
  const releasedInPartSheetCount = withdrawalItems.filter((item) => item.sheetDisposition.startsWith("Released in part")).length;
  const economicSubjectLeads = extractEconomicSubjects(extractedText);
  const relevantWithdrawalItems = withdrawalItems.filter((item) => economicLeadExpression.test(item.title));
  const leadText = [...economicSubjectLeads, ...relevantWithdrawalItems.map((item) => item.title)].join(" ");
  const categoryScores = Object.fromEntries(
    categoryRules.map((rule) => [rule.chapter, count(leadText, new RegExp(rule.expression.source, "gi"))]),
  );
  const rankedCategories = categoryRules
    .map((rule, index) => ({ ...rule, index, score: categoryScores[rule.chapter] }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
  const chapter = rankedCategories[0].chapter;
  const reviewTopics = [
    ...rankedCategories.filter((rule) => rule.score > 0).slice(0, 3).map((rule) => rule.topic),
    "Timothy E. Deal chronological files",
  ];
  const directLeadCount = economicSubjectLeads.length + relevantWithdrawalItems.length;
  const selection = directLeadCount >= 6 ? "Core" : "Consider";
  const leadTitles = [...new Set([...economicSubjectLeads, ...relevantWithdrawalItems.map((item) => item.title)])].slice(0, 4);
  const reviewFocus = leadTitles.length
    ? `Begin with ${leadTitles.map((title) => `“${trimLead(title)}”`).join("; ")}.`
    : "Review the month for released economic-policy content and adjacent cross-volume context.";
  const sheetExtent = withdrawalItems.length
    ? `${withdrawalItems.length} individual withdrawal/redaction sheets describe ${sum(withdrawalItems, "pages")} pages; ${relevantWithdrawalItems.length} descriptions match Volume XXX topics, and none says that a released copy follows`
    : "no individual withdrawal/redaction sheets were identified";
  const reviewKeyExtent = `${row.pdfPages} served-PDF pages; ${economicSubjectLeads.length} economic-policy subject-line leads; ${sheetExtent}.`;
  return {
    chapter,
    selection,
    routing: selection === "Core" ? "Volume XXX review" : "Selective review",
    workingStartDate: row.catalogCoverageStart,
    workingEndDate: row.catalogCoverageEnd,
    workingDateLabel: row.title.replace(/^Chron File:\s*/i, ""),
    dateBasis: "Catalog folder coverage dates and title; the first-of-month value is a sorting key only",
    markerStatus,
    markerChecks,
    markerSeries,
    markerSubseries,
    archivalLocator,
    provenanceStem: markerStatus === "verified" ? `Source: ${archivalLocator}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals: reviewSignalCounts(extractedText),
    economicSignals: economicSignalCounts(extractedText),
    economicSubjectLeads,
    relevantWithdrawalSheetCount: relevantWithdrawalItems.length,
    withdrawalItems,
    rawWithdrawalSheetHeaderCount,
    withdrawalInventoryHeaderCount: rawWithdrawalSheetHeaderCount - withdrawalItems.length,
    withdrawalSheetItemCount: withdrawalItems.length,
    withdrawalSheetPages: sum(withdrawalItems, "pages"),
    releasedInPartSheetCount,
    noCopyIndicatedSheetCount: withdrawalItems.length - releasedInPartSheetCount,
    reviewTopics,
    reviewFocus,
    reviewKeyExtent,
  };
}

function parseWithdrawalItems(naid, extractedText) {
  const segments = [...extractedText.matchAll(/Withdrawal\/Redaction Sheet[\s\S]*?(?=RESTRICTION CODES)/gi)].map(
    (match) => match[0],
  );
  return segments.map((rawSegment, index) => {
    const sheetStart = rawSegment.toLowerCase().lastIndexOf("withdrawal/redaction sheet");
    const segment = rawSegment.slice(sheetStart);
    const lines = segment.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const itemIndex = lines.findIndex((line) => /^\d+[a-z]?\.\s+/i.test(line));
    if (itemIndex < 0) throw new Error(`Could not parse withdrawal item ${index + 1} in ${naid}`);
    const itemMatch = lines[itemIndex].match(/^(\d+[a-z]?)\.\s+(.+)$/i);
    const itemNumber = itemMatch[1];
    const type = itemMatch[2];
    const collectionIndex = lines.findIndex((line, lineIndex) => lineIndex > itemIndex && /^Collection:$/i.test(line));
    const body = lines.slice(itemIndex + 1, collectionIndex);
    const dateIndex = body.findIndex((line) =>
      /^(?:n\.?d\.?|\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})|\d{1,2}\/\d{2}|\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})$/i.test(line),
    );
    const markingIndex = body.findIndex((line) => /^(?:TS|C|S|U)$/i.test(line));
    const restrictionIndexes = body
      .map((line, bodyIndex) => (/^(?:P-\d|\(b\))/i.test(line) ? bodyIndex : -1))
      .filter((bodyIndex) => bodyIndex >= 0);
    const ignored = new Set([
      ...(dateIndex >= 0 ? [dateIndex] : []),
      ...(markingIndex >= 0 ? [markingIndex] : []),
      ...restrictionIndexes,
    ]);
    const documentBody = body.filter((line, bodyIndex) => !ignored.has(bodyIndex)).join(" ");
    const pagesMatch = documentBody.match(/\((\d+)\s+pp?\.?\)/i);
    if (!pagesMatch) throw new Error(`Could not parse withdrawal extent for ${naid} item ${itemNumber}`);
    const title = documentBody
      .replace(/\bPage\s+\d+(?:\s+of\s+\d+)?\b/gi, "")
      .replace(/\[(?:double-sided|redaction)\]/gi, "")
      .replace(/\(\d+\s+pp?\.?\)/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return {
      itemNumber,
      type,
      title,
      date: dateIndex >= 0 ? body[dateIndex] : "Not stated",
      restriction: restrictionIndexes.map((bodyIndex) => body[bodyIndex]).join(" ") || "Not stated",
      classification: classificationLabel(markingIndex >= 0 ? body[markingIndex].toUpperCase() : ""),
      pages: Number(pagesMatch[1]),
      sheetDisposition: /Document Partially Declassified/i.test(segment) && /Copy of Document Follows/i.test(segment)
        ? "Released in part; copy follows in this PDF"
        : "No released copy indicated on the sheet",
    };
  });
}

function extractEconomicSubjects(text) {
  const lines = text.split(/\r?\n/);
  const subjects = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!/^\s*SUBJECT\s*:?\s*/i.test(lines[index])) continue;
    const first = lines[index].replace(/^\s*SUBJECT\s*:?\s*/i, "");
    const following = [];
    for (let offset = 1; offset <= 2; offset += 1) {
      const line = lines[index + offset] || "";
      if (/^\s*(?:ACTION|FYI|FROM|TO|DATE|SUBJECT|MEMORANDUM|NSC PROFILE|SYSTEM II)\b/i.test(line)) break;
      following.push(line);
    }
    const subject = normalizeSpace([first, ...following].join(" "))
      .replace(/\b(?:ACTION|FYI)(?:\s+(?:ACTION|FYI))*\s*$/i, "")
      .trim();
    if (subject && economicLeadExpression.test(subject)) subjects.push(subject.slice(0, 260));
  }
  return [...new Set(subjects)];
}

function annotateProbableDuplicates(rows) {
  const groups = new Map();
  rows.forEach((row) => row.withdrawalItems.forEach((item) => {
    const normalizedTitle = normalizeDuplicateTitle(item.title);
    if (normalizedTitle.length < 20) return;
    const key = `${normalizedTitle}|${item.date.toLowerCase()}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ row, item });
  }));
  return [...groups.entries()]
    .filter(([, locations]) => locations.length > 1)
    .map(([key, locations]) => {
      locations.forEach(({ row, item }) => {
        const others = locations
          .filter((location) => location.item !== item)
          .map((location) => `${location.row.localId.replace(/-(?=\d{3}$)/, "–")} item ${location.item.itemNumber}`);
        item.possibleDuplicateMatch = `Possible duplicate or parallel copy: ${others.slice(0, 4).join(", ")}${others.length > 4 ? `, plus ${others.length - 4} more` : ""}.`;
      });
      return {
        key,
        title: locations[0].item.title,
        date: locations[0].item.date,
        locations: locations.map(({ row, item }) => ({ naid: row.naid, localId: row.localId, itemNumber: item.itemNumber })),
      };
    })
    .sort((a, b) => b.locations.length - a.locations.length || a.key.localeCompare(b.key));
}

function annotateCrossCollectionMatches(rows) {
  const matches = [];
  rows.forEach((row) => row.withdrawalItems.forEach((item) => {
    const match = crossCollectionMatches.get(`${row.naid}:${item.itemNumber}`);
    if (!match) return;
    item.crossCollectionMatch = match;
    matches.push({ naid: row.naid, localId: row.localId, itemNumber: item.itemNumber, title: item.title, match });
  }));
  return matches;
}

function validateRows(rows, duplicateGroups, crossCollectionMatchItems) {
  if (rows.length !== expectedFileUnitCount || servedPdfPageCounts.size !== expectedFileUnitCount) {
    throw new Error(`Deal chronological inventory must contain ${expectedFileUnitCount} files`);
  }
  if (rows.some((row) => !row.hasOnlinePdf || !row.pdfUrl || !row.objectId)) throw new Error("Every Deal chronological file must have an official PDF");
  if (sum(rows, "pdfPages") !== expectedPdfPageTotal) throw new Error("Deal chronological page total changed");
  if (sum(rows, "catalogPdfBytes") !== expectedCatalogPdfBytes) throw new Error("Deal chronological Catalog byte total changed");
  if (sum(rows, "ocrCharacterCount") !== expectedOcrCharacters) throw new Error("Deal chronological OCR character total changed");
  if (rows.some((row) => row.markerStatus !== "verified" || row.markerSeries !== "Deal, Timothy E., Files" || row.markerSubseries !== "Chronological Files")) {
    throw new Error("One or more Deal chronological opening markers failed verification");
  }
  rows.forEach((row) => {
    const expected = expectedWithdrawalStats.get(row.naid);
    const actual = [row.withdrawalSheetItemCount, row.withdrawalSheetPages, row.releasedInPartSheetCount, row.rawWithdrawalSheetHeaderCount];
    if (!expected || expected.some((value, index) => value !== actual[index])) {
      throw new Error(`Withdrawal audit changed for ${row.naid}: expected ${expected?.join("/")}, received ${actual.join("/")}`);
    }
  });
  if (sum(rows, "rawWithdrawalSheetHeaderCount") !== expectedRawWithdrawalHeaders || sum(rows, "withdrawalSheetItemCount") !== expectedWithdrawalItems || sum(rows, "withdrawalSheetPages") !== expectedWithdrawalPages || sum(rows, "releasedInPartSheetCount") !== expectedReleasedInPart) {
    throw new Error("Deal chronological withdrawal/redaction totals changed");
  }
  if (rows.reduce((total, row) => total + row.economicSubjectLeads.length, 0) !== expectedEconomicSubjectLeads || sum(rows, "relevantWithdrawalSheetCount") !== expectedRelevantWithdrawalLeads) {
    throw new Error("Deal chronological economic-policy lead totals changed");
  }
  if (rows.filter((row) => row.selection === "Core").length !== expectedCoreCandidates || rows.filter((row) => row.selection === "Consider").length !== expectedConsiderCandidates) {
    throw new Error("Deal chronological candidate routing counts changed");
  }
  const expectedChapterCounts = {
    "Monetary Policy, Debt, and International Institutions": 28,
    "Trade Policy and Market Access": 36,
    "Transition Economies and International Economic Strategy": 15,
    "Strategic Trade, Technology, and Investment Controls": 4,
    "Economic Summits and Industrialized-Country Cooperation": 13,
  };
  const actualChapterCounts = Object.fromEntries(summarize(rows, "chapter").map((entry) => [entry.name, entry.fileUnitCount]));
  if (Object.entries(expectedChapterCounts).some(([chapter, countValue]) => actualChapterCounts[chapter] !== countValue)) {
    throw new Error("Deal chronological chapter-routing counts changed");
  }
  if (duplicateGroups.length !== expectedDuplicateGroups || duplicateGroups.reduce((total, group) => total + group.locations.length, 0) !== expectedDuplicateEntries) {
    throw new Error("Deal chronological probable-duplicate accounting changed");
  }
  if (crossCollectionMatchItems.length !== expectedCrossCollectionMatches) throw new Error("Deal chronological cross-collection match count changed");
  if (duplicates(rows.map((row) => row.naid)).length || duplicates(rows.map((row) => row.localId)).length) throw new Error("Duplicate Deal chronological identifiers detected");
  const sortedRows = [...rows].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.localId.localeCompare(b.localId));
  if (sortedRows.some((row, index) => row.naid !== rows[index].naid)) throw new Error("Deal chronological files are not stored in month order");
}

function reviewSignalCounts(text) {
  return {
    memosToPresident: count(text, /MEMORANDUM\s+(?:FOR|TO)\s+(?:THE\s+)?PRESIDENT/gi),
    memosToScowcroft: count(text, /MEMORANDUM\s+(?:FOR|TO)[\s\S]{0,100}?SCOWCROFT/gi),
    memorandaOfConversation: count(text, /MEMORANDUM OF CONVERSATION/gi),
    meetingRecords: count(text, /\b(?:SUMMARY OF CONCLUSIONS|MINUTES OF (?:THE )?.*?MEETING|RECORD OF MEETING)\b/gi),
    withdrawalSheets: count(text, /Withdrawal\/Redaction Sheet/gi),
  };
}

function economicSignalCounts(text) {
  const groups = {
    economy: count(text, /\b(?:economic|economics|economy|economies)\b/gi),
    finance: count(text, /\b(?:debt|finance|financial|monetary|currency|exchange rates?|world bank|imf)\b/gi),
    trade: count(text, /\b(?:trade|exports?|imports?|cocom|tariffs?|investment|gatt|uruguay round|export controls?|cfius)\b/gi),
    assistanceSanctions: count(text, /\b(?:economic assistance|foreign assistance|aid package|credits?|sanctions?)\b/gi),
    energy: count(text, /\b(?:oil|energy|petroleum|opec|strategic petroleum reserve)\b/gi),
    agriculture: count(text, /\b(?:agriculture|agricultural|food aid|food security|commodit(?:y|ies))\b/gi),
    treasury: count(text, /\b(?:treasury|nicholas brady|secretary brady)\b/gi),
  };
  return { ...groups, total: Object.values(groups).reduce((total, value) => total + value, 0) };
}

function classificationLabel(marking) {
  return { C: "Confidential", S: "Secret", U: "Unclassified", TS: "Top Secret" }[marking] || "Not stated";
}

function summarize(rows, field) {
  const counts = new Map();
  rows.forEach((row) => counts.set(row[field], (counts.get(row[field]) || 0) + 1));
  return [...counts.entries()].map(([name, fileUnitCount]) => ({ name, fileUnitCount }));
}

function trimLead(value) {
  return value.length > 180 ? `${value.slice(0, 177).trim()}...` : value;
}

function normalizeDuplicateTitle(value) {
  return value
    .toLowerCase()
    .replace(/^\s*re\s*:\s*/, "")
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function count(text, expression) {
  return text.match(expression)?.length || 0;
}

function sum(rows, field) {
  return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0);
}

function normalizeSpace(value) {
  return value.replace(/\s+/g, " ").trim();
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
