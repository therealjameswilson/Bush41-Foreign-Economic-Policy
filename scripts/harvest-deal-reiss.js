#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const candidateConfig = require("./deal-reiss-candidate-config");
const servedPdfPageCounts = require("./deal-reiss-page-counts");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "2554819";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const metadataCacheDir = process.env.NARA_METADATA_CACHE_DIR || "";
const auditedPdfPageTotal = 1683;
const expectedWithdrawalItemTotal = 142;
const expectedWithdrawalPageTotal = 540;
const expectedReleasedInPartTotal = 8;

const candidateByNaid = new Map(candidateConfig.map((candidate) => [candidate.naid, candidate]));
const combinedCommaNaids = new Set(["452050387", "452050388", "452050389"]);
const combinedNoCommaNaids = new Set(["452050400", "452050401"]);
const catalogFolderIdMismatches = new Map([
  ["452050409", { markerFolderId: "CF00186-020", catalogFolderId: "CF00186-023" }],
  ["452050410", { markerFolderId: "CF00186-021", catalogFolderId: "CF00186-024" }],
  ["452050411", { markerFolderId: "CF00186-022", catalogFolderId: "CF00186-025" }],
]);

const workingDates = new Map([
  ["452050387", yearDate("1989", "1989 (mixed internal dates)")],
  ["452050388", yearDate("1989", "1989 (mixed internal dates)")],
  ["452050389", yearDate("1989", "1989 (mixed internal dates)")],
  ["452050400", monthDate("1989-05", "May 1989")],
  ["452050401", monthDate("1989-05", "May 1989")],
  ["452050396", monthDate("1989-07", "July 1989")],
  ["452050397", monthDate("1989-07", "July 1989")],
  ["452050398", monthDate("1989-07", "July 1989")],
  ["452050402", monthDate("1989-07", "July 1989")],
  ["452050403", monthDate("1989-07", "July 1989")],
  ["452050404", monthDate("1989-07", "July 1989")],
  ["452050405", monthDate("1989-07", "July 1989")],
  ["452050406", monthDate("1989-07", "July 1989")],
  ["452050407", monthDate("1989-07", "July 1989")],
  ["452050408", monthDate("1989-07", "July 1989")],
  ["452050409", monthDate("1989-07", "July 1989")],
  ["452050410", monthDate("1989-07", "July 1989")],
  ["452050411", monthDate("1989-07", "July 1989")],
  ["452050390", rangeDate("1989-07-09", "1989-07-18", "July 9-18, 1989", "Folder-title trip dates")],
  ["452050392", rangeDate("1989-07-09", "1989-07-18", "July 9-18, 1989", "Folder-title trip dates")],
  ["452050393", rangeDate("1989-07-09", "1989-07-18", "July 9-18, 1989", "Folder-title trip dates")],
  ["452050399", rangeDate("1989-07-11", "1989-07-11", "July 11, 1989", "Folder-title and withdrawal-sheet date")],
  ["452050394", rangeDate("1989-07-13", "1989-07-17", "July 13-17, 1989", "Folder-title event dates")],
  ["452050395", rangeDate("1989-07-14", "1989-07-16", "July 14-16, 1989", "Briefing-book title dates")],
  ["452050391", rangeDate("1989-07-17", "1989-07-18", "July 17-18, 1989", "Folder-title event dates")],
]);

const expectedWithdrawalStats = new Map([
  ["452050387", [8, 31, 0]],
  ["452050388", [13, 40, 1]],
  ["452050389", [5, 193, 0]],
  ["452050390", [16, 18, 3]],
  ["452050391", [11, 17, 0]],
  ["452050392", [14, 16, 0]],
  ["452050393", [30, 49, 0]],
  ["452050394", [12, 22, 0]],
  ["452050395", [8, 21, 0]],
  ["452050396", [10, 51, 1]],
  ["452050397", [0, 0, 0]],
  ["452050398", [4, 8, 2]],
  ["452050399", [1, 12, 0]],
  ["452050400", [0, 0, 0]],
  ["452050401", [3, 39, 1]],
  ["452050402", [0, 0, 0]],
  ["452050403", [0, 0, 0]],
  ["452050404", [1, 2, 0]],
  ["452050405", [2, 9, 0]],
  ["452050406", [1, 2, 0]],
  ["452050407", [1, 2, 0]],
  ["452050408", [0, 0, 0]],
  ["452050409", [1, 6, 0]],
  ["452050410", [1, 2, 0]],
  ["452050411", [0, 0, 0]],
]);

const withdrawalMetadataNotes = new Map([
  ["452050387", "The opening marker names both Deal and Reiss files and the combined Summit Briefing Books Files / Economic Summit Files subseries. Later withdrawal sheets abbreviate the series and omit the subseries. The opening marker controls the file-level locator."],
  ["452050388", "The opening marker names both Deal and Reiss files and the combined Summit Briefing Books Files / Economic Summit Files subseries. Later sheets vary among abbreviated combined-series forms, and one identifies Reiss Chron Files. The opening marker controls the file-level locator."],
  ["452050389", "The opening marker names both Deal and Reiss files and the combined Summit Briefing Books Files / Economic Summit Files subseries. Later withdrawal sheets abbreviate the series and do not consistently preserve the subseries. The opening marker controls the file-level locator."],
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load Deal-Reiss Economic Summit Files series ${seriesNaId}`);
  }

  const hits = await fetchAllChildren();
  const rows = hits.map(toBaseRow);
  await runPool(rows, 8, async (row) => {
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

  rows.sort(
    (a, b) =>
      a.workingStartDate.localeCompare(b.workingStartDate) ||
      a.workingEndDate.localeCompare(b.workingEndDate) ||
      a.localId.localeCompare(b.localId),
  );
  validateRows(rows);

  const rowByNaid = new Map(rows.map((row) => [row.naid, row]));
  const candidateDocuments = candidateConfig
    .map((candidate) => {
      const row = rowByNaid.get(candidate.naid);
      if (!row) throw new Error(`Candidate ${candidate.naid} is absent from the series inventory`);
      if (candidate.chapter !== row.chapter || candidate.pageCount !== row.pdfPages) {
        throw new Error(`Candidate annotation mismatch for ${candidate.naid}`);
      }
      row.reviewTopics = candidate.topics;
      row.reviewFocus = candidate.focus;
      row.reviewKeyExtent = candidate.keyExtent;
      const sheetExtent = row.withdrawalSheetItemCount
        ? `${row.withdrawalSheetItemCount} withdrawal/redaction sheet ${plural(row.withdrawalSheetItemCount, "description")} totaling ${row.withdrawalSheetPages} pages; ${row.releasedInPartSheetCount} indicate a released-in-part copy follows and ${row.noCopyIndicatedSheetCount} do not`
        : "no withdrawal/redaction sheets identified";
      const selectionLead = {
        Core: "Direct Volume XXX review.",
        Consider: "Selective Volume XXX review.",
        Boundary: "Boundary or cross-volume review.",
      }[candidate.selection];
      return {
        naid: candidate.naid,
        date: candidate.date,
        sortDate: candidate.sortDate,
        displayDateLabel: candidate.displayDateLabel,
        datePrecision: candidate.datePrecision,
        pageCount: candidate.pageCount,
        withdrawalSheetItemCount: row.withdrawalSheetItemCount,
        withdrawalSheetPages: row.withdrawalSheetPages,
        releasedInPartSheetCount: row.releasedInPartSheetCount,
        withdrawalItems: row.withdrawalItems,
        extentLabel: `${candidate.pageCount} served-PDF pages; ${sheetExtent}; ${candidate.keyExtent}`,
        selection: candidate.selection,
        chapter: candidate.chapter,
        topics: candidate.topics,
        notes: `${selectionLead} ${candidate.focus} This is a file-level lead, not a document-level inclusion claim. Compare controlling copies against the Deal Subject Files, Presidential Memcon Files, relevant regional files, and neighboring folders before promotion.`,
      };
    })
    .sort(
      (a, b) =>
        a.sortDate.localeCompare(b.sortDate) ||
        rowByNaid.get(a.naid).localId.localeCompare(rowByNaid.get(b.naid).localId),
    );

  const generatedAt = new Date().toISOString();
  const markerVerified = rows.filter((row) => row.markerStatus.startsWith("verified")).length;
  const markerMismatchCount = rows.filter((row) => row.markerStatus === "verified with catalog ID mismatch").length;
  const onlinePdfCount = rows.filter((row) => row.hasOnlinePdf).length;
  const totalPdfBytes = rows.reduce((total, row) => total + row.pdfBytes, 0);
  const totalCatalogPdfBytes = rows.reduce((total, row) => total + row.catalogPdfBytes, 0);
  const totalWithdrawalSheetItems = rows.reduce((total, row) => total + row.withdrawalSheetItemCount, 0);
  const totalWithdrawalSheetPages = rows.reduce((total, row) => total + row.withdrawalSheetPages, 0);
  const releasedInPartSheetCount = rows.reduce((total, row) => total + row.releasedInPartSheetCount, 0);
  const openingMarkerSeriesSummary = summarize(rows, "markerSeries");
  const openingMarkerSubseriesSummary = summarize(rows, "markerSubseries", "No subseries supplied");
  const output = {
    collection: {
      naid: seriesNaId,
      title: seriesRecord.title,
      shortTitle: "Deal-Reiss Economic Summit Files",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: rows.length,
      onlinePdfCount,
      catalogOnlyCount: rows.length - onlinePdfCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "Timothy E. Deal and Mitchell B. Reiss Files",
      subseries: "Economic Summit Files",
      openingMarkerSeriesSummary,
      openingMarkerSubseriesSummary,
      markerVerified,
      markerMismatchCount,
      markerExceptionCount: rows.length - markerVerified,
      withdrawalMetadataMismatchCount: rows.filter((row) => row.withdrawalMetadataNote).length,
      totalPdfBytes,
      totalCatalogPdfBytes,
      totalPdfPages: auditedPdfPageTotal,
      totalWithdrawalSheetItems,
      totalWithdrawalSheetPages,
      releasedInPartSheetCount,
      noCopyIndicatedSheetCount: totalWithdrawalSheetItems - releasedInPartSheetCount,
      totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
      methodology:
        "Every file unit was enumerated from the complete NARA Catalog series hierarchy. All 25 official PDFs and 1,683 served-PDF pages were checked, and every opening provenance marker and full NARA OCR transcript was screened. Working chronology preserves year- and month-level dates when the folder supplies no day. The ledger extracts every individual withdrawal/redaction sheet and distinguishes sheets that explicitly say a released-in-part copy follows from sheets that do not; a sheet description alone is not treated as proof of current nonrelease. Opening-marker wording controls the file-level locator, with three marker-to-Catalog Folder ID mismatches disclosed. All entries remain file-level locators until individual headings, datelines, terminal markings, release status, and controlling copies are verified in the source images.",
    },
    fileUnits: rows,
    generatedAt,
  };
  const candidateOutput = {
    auditScope:
      "Complete Timothy E. Deal and Mitchell B. Reiss Economic Summit Files inventory with chronology, provenance, release-disposition, withdrawal, and cross-collection duplicate screening",
    auditedFolders: rows.map((row) => row.localId),
    methodology:
      "All 25 file units and all 1,683 served-PDF pages were reviewed from the official NARA series. Six files are Core, nine are Consider, and ten are Boundary leads. The audit extracts 142 withdrawal/redaction sheet descriptions totaling 540 pages and records that eight explicitly mark a released-in-part copy as following in the same PDF. The First Plenary sheet in CF00186-010 is matched to the released canonical candidate already in the workbench rather than promoted as a duplicate. Miscellaneous arms-control material, NATO files, bilateral papers, speech cards, and regional trip files remain visible but carry explicit routing and controlling-copy warnings. These file-level entries are archival locators, not finished FRUS Source Notes.",
    documents: candidateDocuments,
  };
  const report = {
    generatedAt,
    seriesNaId,
    expectedFileUnits: 25,
    harvestedFileUnits: rows.length,
    onlinePdfCount,
    catalogOnlyCount: rows.length - onlinePdfCount,
    coreCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Core").length,
    considerCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Consider").length,
    boundaryCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Boundary").length,
    totalPdfBytes,
    totalCatalogPdfBytes,
    totalPdfPages: auditedPdfPageTotal,
    totalWithdrawalSheetItems,
    totalWithdrawalSheetPages,
    releasedInPartSheetCount,
    noCopyIndicatedSheetCount: totalWithdrawalSheetItems - releasedInPartSheetCount,
    markerVerified,
    markerMismatchCount,
    openingMarkerSeriesSummary,
    openingMarkerSubseriesSummary,
    markerCatalogMismatches: rows
      .filter((row) => row.markerStatus === "verified with catalog ID mismatch")
      .map(({ naid, localId, markerChecks }) => ({ naid, localId, markerChecks })),
    markerExceptions: rows
      .filter((row) => !row.markerStatus.startsWith("verified"))
      .map(({ naid, localId, markerStatus, markerChecks }) => ({ naid, localId, markerStatus, markerChecks })),
    withdrawalMetadataMismatches: rows
      .filter((row) => row.withdrawalMetadataNote)
      .map(({ naid, localId, withdrawalMetadataNote }) => ({ naid, localId, withdrawalMetadataNote })),
    canonicalReleasedMatches: rows.flatMap((row) =>
      row.withdrawalItems
        .filter((item) => item.canonicalMatch)
        .map((item) => ({ naid: row.naid, localId: row.localId, itemNumber: item.itemNumber, canonicalMatch: item.canonicalMatch })),
    ),
    pdfSizeMetadataMismatches: rows
      .filter((row) => row.catalogPdfBytes !== row.pdfBytes)
      .map(({ naid, catalogPdfBytes, pdfBytes }) => ({ naid, catalogPdfBytes, servedPdfBytes: pdfBytes })),
    perFileWithdrawalStats: rows.map(
      ({ naid, localId, withdrawalSheetItemCount, withdrawalSheetPages, releasedInPartSheetCount }) => ({
        naid,
        localId,
        withdrawalSheetItemCount,
        withdrawalSheetPages,
        releasedInPartSheetCount,
      }),
    ),
    totalOcrCharacters: output.collection.totalOcrCharacters,
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "deal-reiss-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "deal-reiss-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "deal-reiss-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} Deal-Reiss files and ${auditedPdfPageTotal} pages; verified ${markerVerified} opening markers and extracted ${totalWithdrawalSheetItems} sheet descriptions totaling ${totalWithdrawalSheetPages} pages.`,
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
  if (hits.length !== expectedCount || expectedCount !== 25) {
    throw new Error(`Expected 25 Deal-Reiss file units; received ${hits.length} of ${expectedCount}`);
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
  const openingText = extractedText.slice(0, 3_000);
  const markerSeries = normalizeSpace(openingText.match(/Series:\s*([\s\S]*?)Subseries:/i)?.[1] || "");
  const markerSubseries = normalizeSpace(openingText.match(/Subseries:\s*([\s\S]*?)OA\/ID Number:/i)?.[1] || "");
  const markerFolderId = openingText.match(/Folder ID Number:\s*([A-Z]{2}\d{5}-\d{3})/i)?.[1] || "";
  const expectedSeries = expectedMarkerSeries(row.naid);
  const expectedSubseries = expectedMarkerSubseries(row.naid);
  const markerChecks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /george\s+h\.?\s*w\.?\s+bush\s+presidential\s+records/i.test(openingText),
    office: /national\s+security\s+council/i.test(openingText),
    series: markerSeries === expectedSeries,
    subseries: markerSubseries === expectedSubseries,
    folderId: markerFolderId === row.localId,
    markerSeries,
    expectedSeries,
    markerSubseries,
    expectedSubseries,
    markerFolderId,
    catalogFolderId: row.localId,
  };
  const coreChecks = [markerChecks.marker, markerChecks.recordGroup, markerChecks.office, markerChecks.series, markerChecks.subseries];
  const catalogMismatch = catalogFolderIdMismatches.get(row.naid);
  let markerStatus = "exception";
  if (coreChecks.every(Boolean) && markerChecks.folderId) {
    markerStatus = "verified";
  } else if (
    coreChecks.every(Boolean) &&
    catalogMismatch?.markerFolderId === markerFolderId &&
    catalogMismatch.catalogFolderId === row.localId
  ) {
    markerStatus = "verified with catalog ID mismatch";
    markerChecks.catalogMismatch = `${markerFolderId} on the opening marker; ${row.localId} in the Catalog and digital-object path`;
  }
  const candidate = candidateByNaid.get(row.naid);
  const dates = workingDates.get(row.naid);
  if (!candidate || !dates) throw new Error(`Missing candidate annotation or working date for ${row.naid}`);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  const citationSeries = combinedCommaNaids.has(row.naid) || combinedNoCommaNaids.has(row.naid)
    ? "Timothy E. Deal and Mitchell B. Reiss Files"
    : "Timothy E. Deal Files";
  const citationSubseries = markerSubseries ? `, ${markerSubseries}` : "";
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, ${citationSeries}${citationSubseries}, OA/ID ${displayLocalId}, ${normalizedTitle}.`;
  const withdrawalItems = parseWithdrawalItems(row.naid, extractedText);
  const releasedInPartSheetCount = withdrawalItems.filter((item) => item.sheetDisposition.startsWith("Released in part")).length;
  return {
    chapter: candidate.chapter,
    routing: routingForSelection(candidate.selection),
    ...dates,
    markerStatus,
    markerChecks,
    markerSeries,
    markerSubseries,
    archivalLocator: folderCitation,
    provenanceStem: markerStatus.startsWith("verified") ? `Source: ${folderCitation}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals: reviewSignalCounts(extractedText),
    economicSignals: economicSignalCounts(extractedText),
    withdrawalItems,
    withdrawalSheetItemCount: withdrawalItems.length,
    withdrawalSheetPages: withdrawalItems.reduce((total, item) => total + item.pages, 0),
    releasedInPartSheetCount,
    noCopyIndicatedSheetCount: withdrawalItems.length - releasedInPartSheetCount,
    withdrawalMetadataNote: withdrawalMetadataNotes.get(row.naid) || "",
  };
}

function parseWithdrawalItems(naid, extractedText) {
  const segments = [...extractedText.matchAll(/Withdrawal\/Redaction Sheet[\s\S]*?(?=RESTRICTION CODES)/gi)].map(
    (match) => match[0],
  );
  return segments.map((segment, index) => {
    const lines = segment.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    const itemIndex = lines.findIndex((line) => /^\d+[a-z]?\.\s+/i.test(line));
    if (itemIndex < 0) throw new Error(`Could not parse withdrawal item ${index + 1} in ${naid}`);
    const itemMatch = lines[itemIndex].match(/^(\d+[a-z]?)\.\s+(.+)$/i);
    const itemNumber = itemMatch[1];
    let type = itemMatch[2];
    const collectionIndex = lines.findIndex((line, lineIndex) => lineIndex > itemIndex && /^Collection:$/i.test(line));
    const body = lines.slice(itemIndex + 1, collectionIndex);
    const dateIndex = body.findIndex((line) =>
      /^(?:n\.d\.|\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})|\d{1,2}\/\d{2}|\d{4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4})$/i.test(line),
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
    const pagesMatch = documentBody.match(/\((\d+)\s+pp?\.\)/i);
    if (!pagesMatch) throw new Error(`Could not parse withdrawal extent for ${naid} item ${itemNumber}`);
    let title = documentBody
      .replace(/\bPage\s+\d+(?:\s+of\s+\d+)?\b/gi, "")
      .replace(/\[(?:double-sided|redaction)\]/gi, "")
      .replace(/\(\d+\s+pp?\.\)/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    if (/^Table of$/i.test(type) && /\bContents\.?$/i.test(title)) {
      type = "Table of contents";
      title = title.replace(/\s+Contents\.?$/i, "").trim();
    }
    if (/^Talking$/i.test(type)) type = "Talking points";
    title = title
      .replace(/Middle East Peace Points Process/gi, "Middle East Peace Process")
      .replace(/July 14 Working Points Dinner/gi, "July 14 Working Dinner");
    const sheetDisposition = /Document Partially Declassified/i.test(segment) && /Copy of Document Follows/i.test(segment)
      ? "Released in part; copy follows in this PDF"
      : "No released copy indicated on the sheet";
    const item = {
      itemNumber,
      type,
      title,
      date: dateIndex >= 0 ? body[dateIndex] : "Not stated",
      restriction: restrictionIndexes.map((bodyIndex) => body[bodyIndex]).join(" ") || "Not stated",
      classification: classificationLabel(markingIndex >= 0 ? body[markingIndex].toUpperCase() : ""),
      pages: Number(pagesMatch[1]),
      sheetDisposition,
    };
    if (naid === "452050396" && itemNumber === "01") {
      item.canonicalMatch = "Released First Plenary memcon already represented by presidential-428080101 (NARA NAID 428080101)";
    }
    return item;
  });
}

function validateRows(rows) {
  if (rows.length !== 25 || servedPdfPageCounts.size !== 25 || candidateConfig.length !== 25) {
    throw new Error("Deal-Reiss inventory must contain 25 files and 25 candidate annotations");
  }
  if (rows.some((row) => !row.hasOnlinePdf || !row.pdfUrl || !row.objectId)) {
    throw new Error("Every Deal-Reiss file must have an official PDF");
  }
  if (rows.some((row) => !servedPdfPageCounts.has(row.naid))) throw new Error("Deal-Reiss page audit is incomplete");
  const pageTotal = rows.reduce((total, row) => total + row.pdfPages, 0);
  if (pageTotal !== auditedPdfPageTotal) throw new Error(`Deal-Reiss page total changed: ${pageTotal}`);
  if (rows.some((row) => !row.markerStatus.startsWith("verified"))) {
    throw new Error("One or more Deal-Reiss opening markers failed verification");
  }
  rows.forEach((row) => {
    const expected = expectedWithdrawalStats.get(row.naid);
    if (!expected) throw new Error(`No expected withdrawal audit for ${row.naid}`);
    if (
      row.withdrawalSheetItemCount !== expected[0] ||
      row.withdrawalSheetPages !== expected[1] ||
      row.releasedInPartSheetCount !== expected[2]
    ) {
      throw new Error(
        `Withdrawal audit changed for ${row.naid}: expected ${expected.join("/")}, received ${row.withdrawalSheetItemCount}/${row.withdrawalSheetPages}/${row.releasedInPartSheetCount}`,
      );
    }
  });
  const itemTotal = rows.reduce((total, row) => total + row.withdrawalSheetItemCount, 0);
  const sheetPageTotal = rows.reduce((total, row) => total + row.withdrawalSheetPages, 0);
  const releasedInPartTotal = rows.reduce((total, row) => total + row.releasedInPartSheetCount, 0);
  if (
    itemTotal !== expectedWithdrawalItemTotal ||
    sheetPageTotal !== expectedWithdrawalPageTotal ||
    releasedInPartTotal !== expectedReleasedInPartTotal
  ) {
    throw new Error(`Deal-Reiss sheet totals changed: ${itemTotal} items/${sheetPageTotal} pages/${releasedInPartTotal} partial copies`);
  }
  if (duplicates(rows.map((row) => row.naid)).length || duplicates(rows.map((row) => row.localId)).length) {
    throw new Error("Duplicate Deal-Reiss identifiers detected");
  }
}

function expectedMarkerSeries(naid) {
  if (combinedCommaNaids.has(naid)) return "Deal, Timothy E., Files, and Reiss, Mitchell B., Files";
  if (combinedNoCommaNaids.has(naid)) return "Deal, Timothy E., Files and Reiss, Mitchell B., Files";
  return "Deal, Timothy E., Files";
}

function expectedMarkerSubseries(naid) {
  if (combinedCommaNaids.has(naid)) return "Summit Briefing Books Files / Economic Summit Files";
  if (combinedNoCommaNaids.has(naid)) return "";
  return "Summit Briefing Books Files";
}

function routingForSelection(selection) {
  return { Core: "Volume XXX review", Consider: "Selective review", Boundary: "Boundary review" }[selection];
}

function reviewSignalCounts(text) {
  return {
    memosToPresident: count(text, /MEMORANDUM\s+(?:FOR|TO)\s+(?:THE\s+)?PRESIDENT/gi),
    memosToScowcroft: count(text, /MEMORANDUM\s+(?:FOR|TO)[\s\S]{0,80}?SCOWCROFT/gi),
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
  return { ...groups, total: Object.values(groups).reduce((sum, value) => sum + value, 0) };
}

function classificationLabel(marking) {
  return { C: "Confidential", S: "Secret", U: "Unclassified", TS: "Top Secret" }[marking] || "Not stated";
}

function yearDate(year, label) {
  return {
    workingStartDate: `${year}-01-01`,
    workingEndDate: `${year}-12-31`,
    workingDateLabel: label,
    dateBasis: "Folder-title year; January 1 is a sorting key only",
  };
}

function monthDate(month, label) {
  const [year, monthNumber] = month.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  return {
    workingStartDate: `${month}-01`,
    workingEndDate: `${month}-${String(lastDay).padStart(2, "0")}`,
    workingDateLabel: label,
    dateBasis: "Folder-title month; first-of-month value is a sorting key only",
  };
}

function rangeDate(start, end, label, basis) {
  return { workingStartDate: start, workingEndDate: end, workingDateLabel: label, dateBasis: basis };
}

function summarize(rows, field, emptyLabel = "") {
  const counts = new Map();
  rows.forEach((row) => {
    const value = row[field] || emptyLabel;
    counts.set(value, (counts.get(value) || 0) + 1);
  });
  return [...counts.entries()].map(([name, fileUnitCount]) => ({ name, fileUnitCount }));
}

function plural(value, word) {
  return value === 1 ? word : `${word}s`;
}

function count(text, expression) {
  return text.match(expression)?.length || 0;
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
