#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const candidateConfig = require("./scowcroft-candidate-config");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const catalogBase = "https://catalog.archives.gov";
const collectionNaid = "4522156";
const expectedSeriesCount = 20;
const expectedFileUnitCount = 676;
const collectionCacheFile = process.env.NARA_COLLECTION_CACHE_FILE || "";
const descendantCacheFile = process.env.NARA_HITS_CACHE_FILE || "";
const ocrCacheDir = process.env.NARA_OCR_CACHE_DIR || "";
const pdfSizeCacheFile = process.env.NARA_PDF_SIZE_CACHE_FILE || "";
const skipMissingPdfHead = process.env.NARA_SKIP_MISSING_PDF_HEAD === "1";
const candidateByNaid = new Map(candidateConfig.map((entry) => [entry.naid, entry]));

const documentedDateOverrides = new Map([
  [
    "366551922",
    {
      start: "1990-12-17",
      end: "1991-02-08",
      label: "December 17, 1990-February 8, 1991",
      basis: "Opening withdrawal inventory; the Catalog and marker title say February 1990",
    },
  ],
  [
    "366552131",
    {
      start: "1989-02-14",
      end: "1989-07-31",
      label: "February 14-July 31, 1989",
      basis: "Dated items in the opening withdrawal inventory",
    },
  ],
  [
    "366552163",
    {
      start: "1989-04-28",
      end: "1992-06-24",
      label: "April 28, 1989-June 24, 1992",
      basis: "Dated items in the opening withdrawal inventory",
    },
  ],
]);

const markerSeriesAliases = {
  "Presidential Correspondence Files": ["Presidential Correspondence Files"],
  "German Reunification Files": ["German Unification Files", "German Reunification Files"],
  "USSR Collapse Files": ["USSR Collapse Files", "USSR Colfapse Files"],
  "USSR Chronological Files": ["USSR Chronological Files"],
  "Special Separate USSR Notes Files": ["Special Separate USSR Notes Files"],
  "China Chronological Files": ["China Chronological Files"],
  "Special Separate China Notes Files": ["Special Separate China Notes Files"],
  "Latin America Files": ["Latin American Files", "Latin America Files"],
  "Middle East Peace Process Files": ["Middle East Peace Process Files"],
  "Desert Shield and Desert Storm Files": ["Desert Shield/Desert Storm Files", "Desert Shield and Desert Storm Files"],
  "Chronological Files": ["Chronological Files"],
  "Separate Communication Channel Files": ["Special Separate Channel Files", "Separate Communication Channel Files"],
  "Meeting Files": ["Meetings Files", "Meeting Files"],
  "Trip Report Files": ["Trip Report Files"],
  "Robert M. Gates Subject Files": ["Gates, Robert M. Files", "Robert M. Gates Subject Files"],
  "Brent Scowcroft Administrative Files": ["Miscellaneous Files", "Administrative Files"],
  "Brent Scowcroft Media Articles Files": ["Media Articles Files"],
  "Brent Scowcroft Gulf War Article Files": ["Gulf War Articles Files"],
  "Brent Scowcroft Scheduled Calls Files": ["Scheduled Calls Files"],
  "Brent Scowcroft Schedule Files": ["Schedule Files"],
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  validateCandidateConfig();
  const collectionRecord = await loadCollectionRecord();
  const hits = await loadDescendantHits();
  const seriesHits = hits.filter((hit) => hit._source.record.levelOfDescription === "series");
  const fileUnitHits = hits.filter((hit) => hit._source.record.levelOfDescription === "fileUnit");
  if (seriesHits.length !== expectedSeriesCount || fileUnitHits.length !== expectedFileUnitCount) {
    throw new Error(
      `Scowcroft hierarchy changed: expected ${expectedSeriesCount} series and ${expectedFileUnitCount} file units; received ${seriesHits.length} and ${fileUnitHits.length}`,
    );
  }

  const seriesByNaid = new Map(
    seriesHits.map((hit) => {
      const record = hit._source.record;
      return [String(record.naId), record];
    }),
  );
  const pdfSizeCache = loadPdfSizeCache();
  const rows = fileUnitHits.map((hit) => toBaseRow(hit, seriesByNaid));
  await runPool(rows, 12, async (row) => {
    const extractedText = await fetchExtractedText(row);
    const cachedSize = Number(pdfSizeCache[row.naid]?.servedBytes) || 0;
    const servedPdfBytes = cachedSize || (skipMissingPdfHead ? 0 : await fetchContentLength(row.pdfUrl));
    if (servedPdfBytes) {
      row.pdfBytes = servedPdfBytes;
      row.pdfByteBasis = "HTTP Content-Length";
    } else {
      row.pdfBytes = null;
      row.pdfByteBasis = "Served size not measured";
    }
    Object.assign(row, deriveReviewFields(row, extractedText));
  });

  rows.sort(
    (a, b) =>
      a.workingStartDate.localeCompare(b.workingStartDate) ||
      a.workingEndDate.localeCompare(b.workingEndDate) ||
      a.localId.localeCompare(b.localId),
  );

  const rowByNaid = new Map(rows.map((row) => [row.naid, row]));
  const candidateDocuments = candidateConfig
    .map((config) => toCandidate(config, rowByNaid.get(config.naid)))
    .sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.naid.localeCompare(b.naid));
  const routedNaids = new Set(rows.filter((row) => /review$/.test(row.routing)).map((row) => row.naid));
  if (routedNaids.size !== candidateDocuments.length || candidateDocuments.some((candidate) => !routedNaids.has(candidate.naid))) {
    throw new Error("Scowcroft candidate configuration and ledger routing do not match");
  }

  const generatedAt = new Date().toISOString();
  const markerVerified = rows.filter((row) => row.markerStatus.startsWith("verified")).length;
  const markerRecordGroupExceptionCount = rows.filter((row) => row.markerStatus.includes("record-group exception")).length;
  const markerOcrNormalizationCount = rows.filter((row) => row.markerStatus.includes("OCR normalization")).length;
  const measuredPdfRows = rows.filter((row) => Number.isFinite(row.pdfBytes) && row.pdfBytes > 0);
  const totalPdfBytes = measuredPdfRows.reduce((total, row) => total + row.pdfBytes, 0);
  const catalogPdfBytes = rows.reduce((total, row) => total + row.catalogPdfBytes, 0);
  const totalOcrCharacters = rows.reduce((total, row) => total + row.ocrCharacterCount, 0);
  const seriesSummary = [...seriesByNaid.values()]
    .map((series) => ({
      naid: String(series.naId),
      title: series.title,
      fileUnitCount: rows.filter((row) => row.seriesNaid === String(series.naId)).length,
      catalogUrl: `${catalogBase}/id/${series.naId}`,
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  const output = {
    collection: {
      naid: collectionNaid,
      title: collectionRecord.title,
      shortTitle: "Scowcroft Papers",
      localIdentifier: collectionRecord.collectionIdentifier,
      inclusiveDates: `${collectionRecord.inclusiveStartDate.logicalDate}/${collectionRecord.inclusiveEndDate.logicalDate}`,
      seriesCount: seriesHits.length,
      fileUnitCount: rows.length,
      onlinePdfCount: rows.length,
      catalogOnlyCount: 0,
      catalogUrl: `${catalogBase}/id/${collectionNaid}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "Brent Scowcroft Collection",
      series: "20 component series",
      subseries: "Varies by series",
      markerVerified,
      markerCorrectedCount: markerOcrNormalizationCount,
      markerMismatchCount: markerRecordGroupExceptionCount,
      markerRecordGroupExceptionCount,
      markerOcrNormalizationCount,
      markerExceptionCount: rows.length - markerVerified,
      totalPdfBytes,
      pdfSizeMeasuredCount: measuredPdfRows.length,
      pdfSizeUnknownCount: rows.length - measuredPdfRows.length,
      catalogPdfBytes,
      totalOcrCharacters,
      seriesSummary,
      methodology:
        "Every descendant series and file unit was enumerated from the complete NARA Catalog hierarchy. NARA extracted text for every official PDF was screened for presidential conversations, memoranda to the President and Scowcroft, meeting records, withdrawal sheets, and foreign-economic-policy terms. Working dates come from folder titles except for three documented withdrawal-inventory overrides; month, range, and year labels remain explicit sorting aids. Candidate routing is file-level triage, not a claim that every document in a folder belongs in Volume XXX. Opening-marker verification requires the record group or disclosed exception, Brent Scowcroft collection name, recognized series, and exact folder ID. Special-separate copy sets, meeting-file conversation duplicates, schedules, call logs, media clippings, and retrospective chronologies remain visible without being promoted as duplicate candidates.",
    },
    fileUnits: rows,
    generatedAt,
  };

  const candidateOutput = {
    auditScope:
      "Complete Brent Scowcroft Papers hierarchy with 20-series provenance, economic-content, presidential-conversation, cross-volume, and duplicate-copy screening",
    auditedFolders: candidateDocuments.map((candidate) => rowByNaid.get(candidate.naid).localId),
    methodology:
      `All ${rows.length} file units and all ${rows.length} official NARA OCR transcripts were screened. The ${candidateDocuments.length} entries retain ${candidateDocuments.filter((item) => item.selection === "Core").length} direct Volume XXX review folders and ${candidateDocuments.filter((item) => item.selection === "Boundary").length} cross-volume folders. The presidential-conversation lane promotes only economically signaled Scowcroft folders and requires matching each conversation to the Bush Library Memcons and Telcons index before selection. The full ledger preserves all parallel Meeting Files, Gates notes, Special Separate copy sets, schedules, call logs, and media files without silently duplicating them. PDF byte size is measured only where the server returned Content-Length; file-unit page counts were not measured in this collection-wide pass. Opening citation sheets support FRUS-style provenance stems, but all candidates remain archival locators until the individual heading, dateline, terminal classification, release status, and exact document extent are checked in the source images.`,
    documents: candidateDocuments,
  };

  const report = {
    generatedAt,
    collectionNaid,
    expectedSeriesCount,
    harvestedSeriesCount: seriesHits.length,
    expectedFileUnits: expectedFileUnitCount,
    harvestedFileUnits: rows.length,
    onlinePdfCount: rows.length,
    candidateCount: candidateDocuments.length,
    volumeReviewFileUnits: candidateDocuments.filter((candidate) => candidate.selection === "Core").length,
    boundaryReviewFileUnits: candidateDocuments.filter((candidate) => candidate.selection === "Boundary").length,
    candidateNaids: candidateDocuments.map((candidate) => candidate.naid),
    markerVerified,
    markerRecordGroupExceptionCount,
    markerOcrNormalizationCount,
    markerExceptions: rows
      .filter((row) => !row.markerStatus.startsWith("verified"))
      .map(({ naid, localId, title, markerStatus, markerChecks }) => ({ naid, localId, title, markerStatus, markerChecks })),
    markerRecordGroupExceptions: rows
      .filter((row) => row.markerStatus.includes("record-group exception"))
      .map(({ naid, localId, title, markerChecks }) => ({ naid, localId, title, markerChecks })),
    markerOcrNormalizations: rows
      .filter((row) => row.markerStatus.includes("OCR normalization"))
      .map(({ naid, localId, title, markerChecks }) => ({ naid, localId, title, markerChecks })),
    pdfSizeMeasuredCount: measuredPdfRows.length,
    pdfSizeUnknownCount: rows.length - measuredPdfRows.length,
    measuredPdfBytes: totalPdfBytes,
    catalogDeclaredPdfBytes: catalogPdfBytes,
    pdfSizeMetadataMismatchCount: rows.filter(
      (row) => row.pdfBytes && row.catalogPdfBytes && row.pdfBytes !== row.catalogPdfBytes,
    ).length,
    unmeasuredPdfNaids: rows.filter((row) => !row.pdfBytes).map((row) => row.naid),
    totalOcrCharacters,
    workingDateNotEstablishedCount: rows.filter((row) => row.workingStartDate.startsWith("9999")).length,
    documentedDateOverrideNaids: [...documentedDateOverrides.keys()],
    parallelCopyContextCount: rows.filter((row) => row.routing === "Parallel-copy context").length,
    seriesSummary,
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
    sourceStyleReference: "https://history.state.gov/historicaldocuments/frus1989-92v31/d38",
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "scowcroft-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "scowcroft-candidates.json"), `${JSON.stringify(candidateOutput, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "scowcroft-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${seriesHits.length} Scowcroft series and ${rows.length} file units; ${candidateDocuments.length} review folders and ${markerVerified} opening markers verified.`,
  );
}

function validateCandidateConfig() {
  const naids = candidateConfig.map((entry) => entry.naid);
  const duplicateNaids = duplicates(naids);
  if (duplicateNaids.length) throw new Error(`Duplicate Scowcroft candidate NAID: ${duplicateNaids.join(", ")}`);
  if (candidateConfig.length !== 95) throw new Error(`Expected 95 Scowcroft candidates; received ${candidateConfig.length}`);
}

async function loadCollectionRecord() {
  let response;
  if (collectionCacheFile && fs.existsSync(collectionCacheFile)) {
    response = JSON.parse(fs.readFileSync(collectionCacheFile, "utf8"));
  } else {
    response = await fetchJson(`${catalogBase}/proxy/records/search?naId=${collectionNaid}`);
  }
  const record = response.body?.hits?.hits?.[0]?._source?.record;
  if (!record || String(record.naId) !== collectionNaid) throw new Error(`Could not load Scowcroft collection ${collectionNaid}`);
  return record;
}

async function loadDescendantHits() {
  if (descendantCacheFile && fs.existsSync(descendantCacheFile)) {
    const cached = JSON.parse(fs.readFileSync(descendantCacheFile, "utf8"));
    return cached.hits || cached.body?.hits?.hits || [];
  }
  const hits = [];
  let expectedCount = null;
  for (let page = 1; ; page += 1) {
    const query = new URLSearchParams({
      ancestorNaId: collectionNaid,
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
    if (!pageHits.length) throw new Error(`NARA pagination ended at ${hits.length} of ${expectedCount} descendants`);
  }
  if (hits.length !== expectedCount) throw new Error(`Expected ${expectedCount} descendants; received ${hits.length}`);
  return hits;
}

function loadPdfSizeCache() {
  if (!pdfSizeCacheFile || !fs.existsSync(pdfSizeCacheFile)) return {};
  return JSON.parse(fs.readFileSync(pdfSizeCacheFile, "utf8"));
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

function toBaseRow(hit, seriesByNaid) {
  const record = hit._source.record;
  const object = record.digitalObjects?.find((item) => /\.pdf$/i.test(item.objectUrl || ""));
  const seriesAncestor = record.ancestors?.find((ancestor) => ancestor.levelOfDescription === "series");
  const seriesNaid = String(seriesAncestor?.naId || "");
  const series = seriesByNaid.get(seriesNaid);
  if (!object || !series) throw new Error(`Missing official PDF or parent series for Scowcroft file unit ${record.naId}`);
  return {
    naid: String(record.naId),
    title: record.title,
    localId: record.localIdentifier,
    seriesNaid,
    seriesTitle: series.title,
    catalogUrl: `${catalogBase}/id/${record.naId}`,
    pdfUrl: object.objectUrl,
    catalogPdfBytes: Number(object.objectFileSize) || 0,
    pdfBytes: null,
    pdfByteBasis: "Served size not measured",
    objectId: String(object.objectId),
    hasOnlinePdf: true,
    pdfPages: 0,
    accessStatus: record.accessRestriction?.status || "Not stated",
  };
}

function deriveReviewFields(row, extractedText) {
  const marker = parseMarker(row, extractedText);
  const config = candidateByNaid.get(row.naid);
  const dates = deriveWorkingDates(row);
  const routing = config
    ? config.selection === "Core"
      ? "Volume XXX review"
      : "Boundary review"
    : inferContextRouting(row);
  const chapter = config?.chapter || "Series context and cross-volume routing";
  const recordGroup = marker.recordGroup || "George H.W. Bush Presidential Records";
  const locatorParts = [
    "George H.W. Bush Library",
    recordGroup === "Donated Historical Materials" ? recordGroup : "Bush Presidential Records",
    "Brent Scowcroft Collection",
    canonicalSeriesTitle(row.seriesTitle),
    marker.subseries,
    `OA/ID ${displayLocalId(row.localId)}`,
    normalizeTitle(marker.folderTitle || row.title),
  ].filter(Boolean);
  const archivalLocator = `${locatorParts.join(", ")}.`;
  const reviewSignals = reviewSignalCounts(extractedText);
  const economicSignals = economicSignalCounts(extractedText);
  const reviewTopics = config ? unique([...config.topics, ...topicsFromSignals(economicSignals)]) : [];
  const keyExtent = config
    ? "The official file-unit PDF is online. This collection-wide pass did not establish its served-PDF page count or item boundaries; page totals on withdrawal sheets describe individual entries, not the complete file unit."
    : "";

  return {
    chapter,
    routing,
    ...dates,
    markerStatus: marker.status,
    markerChecks: marker.checks,
    markerSeries: marker.series,
    markerSubseries: marker.subseries,
    markerRecordGroup: marker.recordGroup,
    archivalLocator,
    provenanceStem: marker.status.startsWith("verified") ? `Source: ${archivalLocator}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals,
    economicSignals,
    reviewTopics,
    reviewFocus: config ? `${config.focus}${config.dedupe ? ` ${config.dedupe}` : ""}` : "",
    reviewKeyExtent: keyExtent,
  };
}

function parseMarker(row, extractedText) {
  const openingText = extractedText.split(/Withdrawal\/Redaction Sheet/i)[0].slice(0, 4_000).replace(/\s+/g, " ").trim();
  const recordGroup = field(openingText, "Record Group/Collection", "Collection/Office of Origin");
  const office = field(openingText, "Collection/Office of Origin", "Series");
  const series = field(openingText, "Series", "Subseries");
  const subseries = field(openingText, "Subseries", "OA/ID Number");
  const markerFolderId = field(openingText, "Folder ID Number", "Folder Title");
  const folderTitle = field(openingText, "Folder Title", "Stack");
  const acceptedSeries = markerSeriesAliases[row.seriesTitle] || [row.seriesTitle];
  const recognizedSeries = acceptedSeries.some((value) => compact(value) === compact(series));
  const checks = {
    marker: /foia\s*marker/i.test(openingText),
    recordGroup: /George H\.W\. Bush Presidential Records|Donated Historical Materials/i.test(recordGroup),
    office: compact(office) === compact("Scowcroft, Brent, Collection"),
    series: recognizedSeries,
    folderId: markerFolderId === row.localId,
    markerFolderId,
    catalogFolderId: row.localId,
    markerRecordGroup: recordGroup,
    markerOffice: office,
    markerSeries: series,
    markerSubseries: subseries,
    markerFolderTitle: folderTitle,
  };
  const verified = [checks.marker, checks.recordGroup, checks.office, checks.series, checks.folderId].every(Boolean);
  let status = verified ? "verified" : "incomplete or unverified";
  if (verified && recordGroup === "Donated Historical Materials") {
    status = "verified with record-group exception";
    checks.catalogMismatch = "Opening marker says Donated Historical Materials; the other online folders say George H.W. Bush Presidential Records";
  } else if (verified && series === "USSR Colfapse Files") {
    status = "verified with OCR normalization";
    checks.handwrittenCorrection = "NARA OCR reads 'USSR Colfapse Files'; Catalog series and folder title identify USSR Collapse Files";
  }
  return { status, checks, recordGroup, office, series, subseries, folderTitle };
}

function field(text, labelText, nextLabelText) {
  const expression = new RegExp(`${escapeRegExp(labelText)}:\\s*(.*?)\\s*${escapeRegExp(nextLabelText)}:`, "i");
  return text.match(expression)?.[1]?.trim() || "";
}

function deriveWorkingDates(row) {
  const documented = documentedDateOverrides.get(row.naid);
  if (documented) {
    return {
      workingStartDate: documented.start,
      workingEndDate: documented.end,
      workingDateLabel: documented.label,
      dateBasis: documented.basis,
    };
  }
  return parseTitleDates(row.title);
}

function parseTitleDates(input) {
  const title = input.replace(/Novermber/gi, "November");
  const numericRange = title.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s*[-–]\s*(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (numericRange) {
    const start = numericDate(numericRange[1], numericRange[2], numericRange[3]);
    const end = numericDate(numericRange[4], numericRange[5], numericRange[6]);
    return dateResult(start, end, `${formatDate(start)}-${formatDate(end)}`, "Folder title date range");
  }

  const dayRange = title.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(19\d{2}|20\d{2})\s+to\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s*(19\d{2}|20\d{2})/i,
  );
  if (dayRange) {
    const start = isoDate(dayRange[3], dayRange[1], dayRange[2]);
    const end = isoDate(dayRange[6], dayRange[4], dayRange[5]);
    return dateResult(start, end, `${formatDate(start)}-${formatDate(end)}`, "Folder title date range");
  }

  const prepared = title.match(/Prepared\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})/i);
  if (prepared) {
    const start = isoDate(prepared[2], prepared[1], 1);
    return dateResult(start, monthEnd(start), `Prepared ${prepared[1]} ${prepared[2]}`, "Folder title preparation month");
  }

  const monthRange = title.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:-|–|to)\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\b/i,
  );
  if (monthRange) {
    const start = isoDate(monthRange[3], monthRange[1], 1);
    const end = monthEnd(isoDate(monthRange[3], monthRange[2], 1));
    return dateResult(start, end, `${monthRange[1]}-${monthRange[2]} ${monthRange[3]}`, "Folder title month range");
  }

  const twoYearMonthRange = title.match(
    /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\s*(?:-|–|to)\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\b/i,
  );
  if (twoYearMonthRange) {
    const start = isoDate(twoYearMonthRange[2], twoYearMonthRange[1], 1);
    const end = monthEnd(isoDate(twoYearMonthRange[4], twoYearMonthRange[3], 1));
    return dateResult(
      start,
      end,
      `${twoYearMonthRange[1]} ${twoYearMonthRange[2]}-${twoYearMonthRange[3]} ${twoYearMonthRange[4]}`,
      "Folder title month range",
    );
  }

  const yearToMonth = title.match(
    /\b(19\d{2}|20\d{2})\s*[-–]\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\b/i,
  );
  if (yearToMonth) {
    const start = `${yearToMonth[1]}-01-01`;
    const end = monthEnd(isoDate(yearToMonth[3], yearToMonth[2], 1));
    return dateResult(start, end, `${yearToMonth[1]}-${yearToMonth[2]} ${yearToMonth[3]}`, "Folder title date range");
  }

  const monthYear = [...title.matchAll(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(19\d{2}|20\d{2})\b/gi)].at(-1);
  if (monthYear) {
    const start = isoDate(monthYear[2], monthYear[1], 1);
    return dateResult(start, monthEnd(start), `${monthYear[1]} ${monthYear[2]}`, "Folder title month");
  }

  const yearRange = title.match(/\b(19\d{2}|20\d{2})\s*[-–]\s*((?:19|20)?\d{2})\b/);
  if (yearRange) {
    const startYear = Number(yearRange[1]);
    let endYear = Number(yearRange[2]);
    if (endYear < 100) endYear = Math.floor(startYear / 100) * 100 + endYear;
    return dateResult(`${startYear}-01-01`, `${endYear}-12-31`, `${startYear}-${endYear}`, "Folder title year range");
  }

  const years = [...title.matchAll(/\b(19\d{2}|20\d{2})\b/g)].map((match) => Number(match[1]));
  if (years.length) {
    const year = years.at(-1);
    return dateResult(`${year}-01-01`, `${year}-12-31`, String(year), "Folder title year");
  }

  return dateResult("9999-12-31", "9999-12-31", "Date not established", "No date in folder title");
}

function dateResult(start, end, label, basis) {
  return { workingStartDate: start, workingEndDate: end, workingDateLabel: label, dateBasis: basis };
}

function numericDate(month, day, year) {
  const fullYear = Number(year) < 100 ? 1900 + Number(year) : Number(year);
  return `${fullYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function isoDate(year, monthName, day) {
  return `${year}-${String(monthNumber(monthName)).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthEnd(start) {
  const [year, month] = start.split("-").map(Number);
  const day = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function monthNumber(name) {
  return [
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
  ].indexOf(name.toLowerCase()) + 1;
}

function formatDate(value) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function inferContextRouting(row) {
  if (
    /\[Copy Set\]|\[Copies from Other Files\]|Memcons\/Telcons|Bob Gates Memcons|Presidential Listing of .*Meetings\/Telephone Calls/i.test(
      row.title,
    )
  ) {
    return "Parallel-copy context";
  }
  if (
    /Media Articles|Gulf War Article|Scheduled Calls|Schedule Files/.test(row.seriesTitle) ||
    /Appointments (?:Completed|Regretted)|Press, 1989-1992|Today's News Events/i.test(row.title)
  ) {
    return "Reference context";
  }
  return "Series context";
}

function reviewSignalCounts(text) {
  return {
    memosToPresident: count(text, /MEMORANDUM\s+(?:FOR|TO)\s+(?:THE\s+)?PRESIDENT/gi),
    memosToScowcroft: count(text, /(?:MEMORANDUM|MEMO)\s+(?:FOR|TO)\s+(?:BRENT|GENERAL)[\s\S]{0,70}?SCOWCROFT/gi),
    memorandaOfConversation: count(text, /MEMORANDUM OF (?:TELEPHONE )?CONVERSATION/gi),
    meetingRecords: count(text, /\b(?:SUMMARY OF CONCLUSIONS|MINUTES OF (?:THE )?.{0,50}?MEETING|RECORD OF MEETING)\b/gi),
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
      /\b(?:debt|finance|financial|monetary|currency|exchange rates?|international monetary fund|world bank|imf|ebrd|brady plan)\b/gi,
    ),
    trade: count(
      searchableText,
      /\b(?:trade|exports?|imports?|tariffs?|investment|gatt|uruguay round|super 301|section 301|structural impediments?)\b/gi,
    ),
    assistanceSanctions: count(searchableText, /\b(?:economic assistance|foreign assistance|aid package|credits?|sanctions?)\b/gi),
    energy: count(searchableText, /\b(?:oil|energy|petroleum|opec|strategic petroleum reserve)\b/gi),
    agriculture: count(searchableText, /\b(?:agriculture|agricultural|food aid|food security|commodit(?:y|ies))\b/gi),
    treasury: count(searchableText, /\b(?:treasury|nicholas brady|secretary brady)\b/gi),
    summit: count(searchableText, /\b(?:economic summit|paris summit|houston summit|london summit|munich summit|g-?7|group of seven)\b/gi),
    transition: count(searchableText, /\b(?:economic reform|market economy|transition econom|western assistance|western lending)\b/gi),
    strategic: count(searchableText, /\b(?:cocom|export controls?|technology transfer|strategic trade|dual-use)\b/gi),
  };
  return { ...groups, total: Object.values(groups).reduce((sum, value) => sum + value, 0) };
}

function topicsFromSignals(signals) {
  const topics = [];
  if (signals.trade) topics.push("Trade and market access");
  if (signals.finance) topics.push("Debt and international finance");
  if (signals.summit) topics.push("Economic summits and G-7");
  if (signals.transition) topics.push("Transition economies");
  if (signals.strategic) topics.push("Strategic trade and technology");
  if (signals.energy) topics.push("Energy");
  if (signals.agriculture) topics.push("Agriculture");
  return topics;
}

function toCandidate(config, row) {
  if (!row) throw new Error(`Scowcroft candidate ${config.naid} is absent from the full ledger`);
  if (row.workingStartDate.startsWith("9999")) throw new Error(`Scowcroft candidate ${config.naid} lacks a working date`);
  const routeSelection = row.routing === "Volume XXX review" ? "Core" : "Boundary";
  if (config.selection !== routeSelection || config.chapter !== row.chapter) {
    throw new Error(`Scowcroft candidate routing mismatch for ${config.naid}`);
  }
  return {
    naid: config.naid,
    date: row.workingStartDate,
    sortDate: row.workingStartDate,
    datePrecision: row.workingStartDate === row.workingEndDate ? "day" : "range",
    displayDateLabel: row.workingDateLabel,
    pageCount: null,
    extentLabel:
      "Official file-unit PDF online; served-PDF page extent and document-level release or withdrawal status not measured in this collection-wide pass",
    selection: config.selection,
    topics: row.reviewTopics,
    notes: `${config.selection === "Core" ? "Direct Volume XXX review." : "Cross-volume boundary review."} ${row.reviewFocus} Promote an individual document only after checking its heading, dateline, terminal classification, release status, exact extent, and controlling copy in the source images.`,
  };
}

function canonicalSeriesTitle(seriesTitle) {
  return {
    "Latin America Files": "Latin American Files",
    "Meeting Files": "Meetings Files",
    "Robert M. Gates Subject Files": "Gates, Robert M. Files",
    "Brent Scowcroft Administrative Files": "Administrative Files",
    "Brent Scowcroft Media Articles Files": "Media Articles Files",
    "Brent Scowcroft Gulf War Article Files": "Gulf War Articles Files",
    "Brent Scowcroft Scheduled Calls Files": "Scheduled Calls Files",
    "Brent Scowcroft Schedule Files": "Schedule Files",
    "Separate Communication Channel Files": "Special Separate Channel Files",
  }[seriesTitle] || seriesTitle;
}

function normalizeTitle(value) {
  return value
    .replace(/\s*--\s*/g, "—")
    .replace(/\s+-\s+/g, "—")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function displayLocalId(value) {
  return value.replace(/-(?=\d{3}$)/, "–");
}

function count(text, expression) {
  return text.match(expression)?.length || 0;
}

function compact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
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

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
