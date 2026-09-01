#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const candidateConfig = require("./deal-summit-candidate-config");
const servedPdfPageCounts = require("./deal-summit-page-counts");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "2554817";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const metadataCacheDir = process.env.NARA_METADATA_CACHE_DIR || "";
const auditedPdfPageTotal = 1248;
const expectedWithdrawalItemTotal = 104;
const expectedWithdrawalPageTotal = 324;
const chapter = "Economic Summits and Industrialized-Country Cooperation";

const eventDates = new Map([
  ["452050637", dateRange("1990-01-05", "1990-01-07", "January 5-7, 1990")],
  ["452050638", dateRange("1990-01-05", "1990-01-07", "January 5-7, 1990")],
  ["452050639", dateRange("1990-03-22", "1990-03-25", "March 22-25, 1990")],
  ["452050640", dateRange("1990-03-22", "1990-03-25", "March 22-25, 1990")],
  ["452050641", dateRange("1990-06-15", "1990-06-17", "June 15-17, 1990")],
  ["452050642", dateRange("1990-06-15", "1990-06-17", "June 15-17, 1990")],
  ["452050643", dateRange("1990-07-09", "1990-07-11", "July 9-11, 1990")],
  ["452050644", dateRange("1991-06-07", "1991-06-09", "June 7-9, 1991")],
  ["452050645", dateRange("1991-06-07", "1991-06-09", "June 7-9, 1991")],
  ["452050646", dateRange("1991-06-07", "1991-06-09", "June 7-9, 1991")],
  ["452050647", dateRange("1991-07-05", "1991-07-07", "July 5-7, 1991")],
  ["452050648", dateRange("1991-07-05", "1991-07-07", "July 5-7, 1991")],
  ["452050649", dateRange("1991-07-05", "1991-07-07", "July 5-7, 1991")],
  ["452050650", dateRange("1991-07-14", "1991-07-17", "July 14-17, 1991")],
  ["452050651", dateRange("1991-07-14", "1991-07-17", "July 14-17, 1991")],
  ["452050652", dateRange("1991-07-14", "1991-07-17", "July 14-17, 1991")],
  ["452050653", dateRange("1991-07-14", "1991-07-17", "July 14-17, 1991")],
]);

// London files begin with one or more multi-item inventories. Individual
// withdrawal sheets follow; skipping the inventories prevents double counts.
const masterWithdrawalSheetPages = new Map([
  ["452050644", 1],
  ["452050645", 1],
  ["452050646", 1],
  ["452050647", 1],
  ["452050648", 1],
  ["452050649", 1],
  ["452050650", 2],
  ["452050651", 1],
  ["452050652", 3],
  ["452050653", 1],
]);

const expectedWithdrawalStats = new Map([
  ["452050637", [0, 0]],
  ["452050638", [1, 62]],
  ["452050639", [4, 14]],
  ["452050640", [7, 30]],
  ["452050641", [4, 18]],
  ["452050642", [0, 0]],
  ["452050643", [7, 12]],
  ["452050644", [9, 24]],
  ["452050645", [6, 18]],
  ["452050646", [3, 9]],
  ["452050647", [5, 20]],
  ["452050648", [6, 17]],
  ["452050649", [1, 1]],
  ["452050650", [12, 41]],
  ["452050651", [5, 17]],
  ["452050652", [25, 25]],
  ["452050653", [9, 16]],
]);

const withdrawalMetadataNotes = new Map([
  ["452050644", subjectFilesNote()],
  ["452050645", subjectFilesNote()],
  ["452050646", subjectFilesNote()],
  ["452050647", subjectFilesNote()],
  ["452050648", subjectFilesNote()],
  ["452050649", "The opening marker identifies Timothy E. Deal Files, Summit Briefing Books Files. Later withdrawal sheets instead identify Deal, Timothy E., and Reiss, Mitchell B., Files. The opening marker controls this file-level locator."],
  ["452050650", subjectFilesNote()],
  ["452050651", subjectFilesNote()],
  ["452050652", subjectFilesNote()],
  ["452050653", subjectFilesNote()],
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load Timothy E. Deal Summit Briefing Books series ${seriesNaId}`);
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
      if (candidate.chapter !== row.chapter) throw new Error(`Candidate chapter mismatch for ${candidate.naid}`);
      if (candidate.pageCount !== row.pdfPages) throw new Error(`Candidate page-count mismatch for ${candidate.naid}`);
      row.reviewTopics = candidate.topics;
      row.reviewFocus = candidate.focus;
      row.reviewKeyExtent = candidate.keyExtent;
      const withdrawalExtent = row.withheldItemCount
        ? `${row.withheldItemCount} separately described withdrawn ${row.withheldItemCount === 1 ? "item" : "items"} totaling ${row.withheldPages} ${row.withheldPages === 1 ? "page" : "pages"}`
        : "no withdrawal sheets identified";
      return {
        naid: candidate.naid,
        date: candidate.date,
        sortDate: candidate.sortDate,
        datePrecision: candidate.datePrecision,
        displayDateLabel: candidate.displayDateLabel,
        pageCount: candidate.pageCount,
        withheldPages: row.withheldPages,
        withdrawalItems: row.withdrawalItems,
        extentLabel: `${candidate.pageCount} served-PDF pages; ${withdrawalExtent}; ${candidate.keyExtent}`,
        selection: candidate.selection,
        chapter: candidate.chapter,
        topics: candidate.topics,
        notes: `${candidate.selection === "Core" ? "Direct Volume XXX review." : "Selective Volume XXX review."} ${candidate.focus} This is a file-level lead, not a document-level inclusion claim. Compare possible controlling copies against the Deal Subject Files and Deal-Reiss Economic Summit Files before promotion.`,
      };
    })
    .sort(
      (a, b) =>
        a.sortDate.localeCompare(b.sortDate) ||
        rowByNaid.get(a.naid).localId.localeCompare(rowByNaid.get(b.naid).localId),
    );

  const generatedAt = new Date().toISOString();
  const markerVerified = rows.filter((row) => row.markerStatus === "verified").length;
  const onlinePdfCount = rows.filter((row) => row.hasOnlinePdf).length;
  const totalPdfBytes = rows.reduce((total, row) => total + row.pdfBytes, 0);
  const totalCatalogPdfBytes = rows.reduce((total, row) => total + row.catalogPdfBytes, 0);
  const totalWithheldItems = rows.reduce((total, row) => total + row.withheldItemCount, 0);
  const totalWithheldPages = rows.reduce((total, row) => total + row.withheldPages, 0);
  const output = {
    collection: {
      naid: seriesNaId,
      title: seriesRecord.title,
      shortTitle: "Deal Summit Briefing Books",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: rows.length,
      onlinePdfCount,
      catalogOnlyCount: rows.length - onlinePdfCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "Deal, Timothy E., Files",
      subseries: "Summit Briefing Books Files",
      openingMarkerSubseriesSummary: [
        { name: "Summit Briefing Books", fileUnitCount: rows.filter((row) => row.markerSubseries === "Summit Briefing Books").length },
        { name: "Summit Briefing Books Files", fileUnitCount: rows.filter((row) => row.markerSubseries === "Summit Briefing Books Files").length },
      ],
      markerVerified,
      markerExceptionCount: rows.length - markerVerified,
      withdrawalMetadataMismatchCount: rows.filter((row) => row.withdrawalMetadataNote).length,
      totalPdfBytes,
      totalCatalogPdfBytes,
      totalPdfPages: auditedPdfPageTotal,
      totalWithheldItems,
      totalWithheldPages,
      methodology:
        "Every file unit was enumerated from the complete NARA Catalog series hierarchy. Every official PDF was checked page by page with Poppler, and every opening provenance marker and full NARA OCR transcript was screened. The opening marker controls the file-level locator when later withdrawal-sheet metadata differs. Working chronology follows the dated summit briefing-book covers. Withdrawal counts use the individual item sheets after excluding duplicate multi-item inventories. All 17 file units are Volume XXX review leads, but remain archival locators until an individual heading, dateline, terminal marking, and release status are verified in the source images.",
    },
    fileUnits: rows,
    generatedAt,
  };
  const candidateOutput = {
    auditScope:
      "Complete Timothy E. Deal Summit Briefing Books Files inventory with chronological, provenance, withdrawal, and duplicate-copy screening",
    auditedFolders: rows.map((row) => row.localId),
    methodology:
      "All 17 file units and all 1,248 served-PDF pages were reviewed from the official NARA series. The audit verifies every opening provenance marker and extracts 104 uniquely described withdrawal entries totaling 324 pages. Thirteen files are Core and four are Consider leads for the economic-summit chapter. Nine London files have later withdrawal sheets labeled Subject Files, and CF00960-013 has later withdrawal sheets attributed to the Deal-Reiss files; the opening marker controls each file-level locator. These entries remain screening leads, not finished FRUS Source Notes. Individual documents must be compared against the separate Deal Subject Files and Deal-Reiss Economic Summit Files before a controlling copy is selected and document-level provenance is formulated.",
    documents: candidateDocuments,
  };
  const report = {
    generatedAt,
    seriesNaId,
    expectedFileUnits: 17,
    harvestedFileUnits: rows.length,
    onlinePdfCount,
    catalogOnlyCount: rows.length - onlinePdfCount,
    coreCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Core").length,
    considerCandidateCount: candidateDocuments.filter((candidate) => candidate.selection === "Consider").length,
    totalPdfBytes,
    totalCatalogPdfBytes,
    totalPdfPages: auditedPdfPageTotal,
    totalWithheldItems,
    totalWithheldPages,
    markerVerified,
    openingMarkerSubseriesSummary: output.collection.openingMarkerSubseriesSummary,
    markerExceptions: rows
      .filter((row) => row.markerStatus !== "verified")
      .map(({ naid, localId, title, markerStatus, markerChecks }) => ({ naid, localId, title, markerStatus, markerChecks })),
    withdrawalMetadataMismatches: rows
      .filter((row) => row.withdrawalMetadataNote)
      .map(({ naid, localId, withdrawalMetadataNote }) => ({ naid, localId, withdrawalMetadataNote })),
    pdfSizeMetadataMismatches: rows
      .filter((row) => row.catalogPdfBytes !== row.pdfBytes)
      .map(({ naid, catalogPdfBytes, pdfBytes }) => ({ naid, catalogPdfBytes, servedPdfBytes: pdfBytes })),
    perFileWithdrawalStats: rows.map(({ naid, localId, withheldItemCount, withheldPages }) => ({
      naid,
      localId,
      withheldItemCount,
      withheldPages,
    })),
    totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "deal-summit-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "deal-summit-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "deal-summit-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} Deal summit files and ${auditedPdfPageTotal} pages; verified ${markerVerified} opening markers and inventoried ${totalWithheldItems} withdrawals totaling ${totalWithheldPages} pages.`,
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
  if (hits.length !== expectedCount || expectedCount !== 17) {
    throw new Error(`Expected 17 Deal Summit file units; received ${hits.length} of ${expectedCount}`);
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
  const markerFolderId = openingText.match(/Folder ID Number:\s*([A-Z]{2}\d{5}-\d{3})/i)?.[1] || "";
  const markerSeries = "Deal, Timothy E., Files";
  const markerSubseries = /subseries:\s*Summit\s+Briefing\s+Books\s+Files/i.test(openingText)
    ? "Summit Briefing Books Files"
    : /subseries:\s*Summit\s+Briefing\s+Books/i.test(openingText)
      ? "Summit Briefing Books"
      : "";
  const markerChecks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /george\s+h\.?\s*w\.?\s+bush\s+presidential\s+records/i.test(openingText),
    office: /national\s+security\s+council/i.test(openingText),
    series: /series:\s*Deal,\s*Timothy\s+E\.,\s*Files/i.test(openingText),
    subseries: Boolean(markerSubseries),
    folderId: markerFolderId === row.localId,
    markerFolderId,
    catalogFolderId: row.localId,
  };
  const markerStatus = Object.values(markerChecks).every(Boolean) ? "verified" : "exception";
  const dates = eventDates.get(row.naid);
  if (!dates) throw new Error(`No event-cover chronology for ${row.naid}`);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, Timothy E. Deal Files, ${markerSubseries}, OA/ID ${displayLocalId}, ${normalizedTitle}.`;
  const withdrawalItems = parseWithdrawalItems(row.naid, extractedText);
  const withheldPages = withdrawalItems.reduce((total, item) => total + item.pages, 0);
  return {
    chapter,
    routing: "Volume XXX review",
    ...dates,
    markerStatus,
    markerChecks,
    markerSeries,
    markerSubseries,
    archivalLocator: folderCitation,
    provenanceStem: markerStatus === "verified" ? `Source: ${folderCitation}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals: reviewSignalCounts(extractedText),
    economicSignals: economicSignalCounts(extractedText),
    withdrawalItems,
    withheldItemCount: withdrawalItems.length,
    withheldPages,
    withdrawalMetadataNote: withdrawalMetadataNotes.get(row.naid) || "",
  };
}

function parseWithdrawalItems(naid, extractedText) {
  const segments = [...extractedText.matchAll(/Withdrawal\/Redaction Sheet[\s\S]*?Collection:/gi)].map(
    (match) => match[0],
  );
  return segments.slice(masterWithdrawalSheetPages.get(naid) || 0).map((segment, index) => {
    const lines = segment
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);
    const itemIndex = lines.findIndex((line) => /^\d+[a-z]?\.\s+/i.test(line));
    if (itemIndex < 0) throw new Error(`Could not parse withdrawal item ${index + 1} in ${naid}`);
    const itemMatch = lines[itemIndex].match(/^(\d+[a-z]?)\.\s+(.+)$/i);
    const itemNumber = itemMatch[1];
    let type = itemMatch[2];
    if (type === "Talking") type = "Talking points";
    const body = lines.slice(itemIndex + 1, lines.findIndex((line, lineIndex) => lineIndex > itemIndex && /^Collection:$/i.test(line)));
    const dateIndex = body.findIndex((line) => /^(?:n\.d\.|\d{1,2}\/\d{1,2}\/(?:\d{2}|\d{4})|\d{1,2}\/\d{2})$/i.test(line));
    const markingIndex = body.findIndex((line) => /^[CSU]$/.test(line));
    const restrictions = body.filter((line) => /^\(b\)/i.test(line));
    const ignored = new Set([
      ...(dateIndex >= 0 ? [dateIndex] : []),
      ...(markingIndex >= 0 ? [markingIndex] : []),
      ...body.map((line, bodyIndex) => (/^\(b\)/i.test(line) ? bodyIndex : -1)).filter((bodyIndex) => bodyIndex >= 0),
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
    if (type === "Talking points") title = title.replace(/\s+Points$/i, "").trim();
    return {
      itemNumber,
      type,
      title,
      date: dateIndex >= 0 ? body[dateIndex] : "Not stated",
      restriction: restrictions.join(" ") || "Not stated",
      classification: classificationLabel(markingIndex >= 0 ? body[markingIndex] : ""),
      pages: Number(pagesMatch[1]),
    };
  });
}

function validateRows(rows) {
  if (rows.length !== 17 || servedPdfPageCounts.size !== 17) throw new Error("Deal Summit inventory must contain 17 files");
  if (rows.some((row) => !row.hasOnlinePdf || !row.pdfUrl || !row.objectId)) throw new Error("Every Deal Summit file must have an official PDF");
  if (rows.some((row) => !servedPdfPageCounts.has(row.naid))) throw new Error("Deal Summit page audit is incomplete");
  const pageTotal = rows.reduce((total, row) => total + row.pdfPages, 0);
  if (pageTotal !== auditedPdfPageTotal) throw new Error(`Deal Summit page total changed: ${pageTotal}`);
  if (rows.some((row) => row.markerStatus !== "verified")) throw new Error("One or more Deal Summit opening markers failed verification");
  rows.forEach((row) => {
    const expected = expectedWithdrawalStats.get(row.naid);
    if (!expected) throw new Error(`No expected withdrawal audit for ${row.naid}`);
    if (row.withheldItemCount !== expected[0] || row.withheldPages !== expected[1]) {
      throw new Error(
        `Withdrawal audit changed for ${row.naid}: expected ${expected[0]}/${expected[1]}, received ${row.withheldItemCount}/${row.withheldPages}`,
      );
    }
  });
  const itemTotal = rows.reduce((total, row) => total + row.withheldItemCount, 0);
  const withheldPageTotal = rows.reduce((total, row) => total + row.withheldPages, 0);
  if (itemTotal !== expectedWithdrawalItemTotal || withheldPageTotal !== expectedWithdrawalPageTotal) {
    throw new Error(`Deal Summit withdrawal totals changed: ${itemTotal} items/${withheldPageTotal} pages`);
  }
  if (duplicates(rows.map((row) => row.naid)).length || duplicates(rows.map((row) => row.localId)).length) {
    throw new Error("Duplicate Deal Summit identifiers detected");
  }
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
    trade: count(text, /\b(?:trade|exports?|imports?|cocom|tariffs?|investment|gatt|uruguay round|export controls?)\b/gi),
    assistanceSanctions: count(text, /\b(?:economic assistance|foreign assistance|aid package|credits?|sanctions?)\b/gi),
    energy: count(text, /\b(?:oil|energy|petroleum|opec|strategic petroleum reserve)\b/gi),
    agriculture: count(text, /\b(?:agriculture|agricultural|food aid|food security|commodit(?:y|ies))\b/gi),
    treasury: count(text, /\b(?:treasury|nicholas brady|secretary brady)\b/gi),
  };
  return { ...groups, total: Object.values(groups).reduce((sum, value) => sum + value, 0) };
}

function classificationLabel(marking) {
  return { C: "Confidential", S: "Secret", U: "Unclassified" }[marking] || "Not stated";
}

function dateRange(start, end, label) {
  return {
    workingStartDate: start,
    workingEndDate: end,
    dateBasis: "Briefing-book cover event dates",
    workingDateLabel: label,
  };
}

function subjectFilesNote() {
  return "The opening marker identifies Timothy E. Deal Files, Summit Briefing Books Files. Later withdrawal sheets instead label the subseries Subject Files. The opening marker controls this file-level locator.";
}

function count(text, expression) {
  return text.match(expression)?.length || 0;
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
