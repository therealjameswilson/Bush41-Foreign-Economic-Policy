#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const collectionNaid = "2163585";
const catalogBase = "https://catalog.archives.gov";
const findingAidUrl =
  "https://www.bush41library.gov/digital-research-room/finding-aid/records-white-house-office-policy-development-george-h-w-bush";
const findingAidPdfUrl = "https://www.bush41library.gov/download/file/5911";
const expectedDescendants = 3302;
const expectedSeries = 62;
const expectedFileUnits = 3239;

const subjectAreas = {
  trade: "Trade Policy and Market Access",
  finance: "Monetary Policy, Debt, and International Institutions",
  summits: "Economic Summits and Industrialized-Country Cooperation",
  transition: "Transition Economies and International Economic Strategy",
  controls: "Strategic Trade, Technology, and Investment Controls",
};

const functionallyRelevantSeries = new Set([
  "Stephen P. Farrar Country Files",
  "Stephen P. Farrar Subject Files",
  "Stephen P. Farrar Trade Files",
  "Warren Maruyama Subject Files",
]);

const countryPolicySeries = new Set([
  "Betsy Anderson Subject Files",
  "Charles E. M. Kolb Subject Files",
  "Diana Furchtgott - Roth Subject Files",
  "J. French Hill Files",
  "Michael Klausner Subject Files",
  "Roger Porter Files",
  "Roger Porter Subject Files",
  "Tim Adam Subject Files",
]);

const porterChronologicalSeries = "Roger Porter's Chronological Files";
const boundaryPattern = /\b(?:NAFTA|North American Free Trade|Free Trade (?:Agreement|With Mexico)|Mexico|Canada)\b/i;
const directTitlePattern = new RegExp(
  [
    "\\bGATT\\b",
    "Uruguay Round",
    "Trade Policy",
    "Trade Strategy",
    "Trade Barrier",
    "Trade Arrangement",
    "Trade Chron",
    "Trade Agreement",
    "Trade Negotiat",
    "Free Trade",
    "\\bSII\\b",
    "Structural Impediments",
    "Super[ /-]*(?:Special )?301",
    "Section 301",
    "China 301",
    "Most Favored Nation",
    "Steel VRA",
    "Semiconductor Trade",
    "Foreign (?:Direct )?Investment",
    "Committee on Foreign Investment",
    "\\bCFIUS\\b",
    "\\bCOCOM\\b",
    "Export Controls?",
    "East-West Trade",
    "Technology Transfer",
    "Brady Plan",
    "International Debt",
    "Debt Files?",
    "European Bank for Reconstruction",
    "International Economic Policy",
    "IEP Breakfast",
    "Economic Summit",
    "G[- ]?7 Economic Summit",
    "Munich Summit",
    "Houston Summit",
    "Paris Summit",
    "London Summit",
    "Environmental Issues for Upcoming Economic Summit",
    "Summit - Environmental Initiatives",
    "\\bUNCED\\b",
    "Earth Summit",
    "Rio Summit",
    "European Energy Charter",
    "Oil Export Study",
    "U\\.S\\.-Japan Relations",
    "Japan.*(?:Trade|Antitrust|Capital Gains|Business Council)",
    "(?:Trade|Capital Gains).*Japan",
    "Interagency Review for U\\.S\\.-Japan",
    "European Community",
    "European Economic Community",
    "\\bEEC 1992\\b",
    "Economic Policy Council.*trade",
  ].join("|"),
  "i",
);
const climatePattern = /\b(?:global climate|climate change|global warming|greenhouse gases|Intergovernmental Panel on Climate Change)\b/i;
const countryPattern = /\b(?:Japan|China|European Community|Korea|Brazil|Argentina|Venezuela|USSR|Soviet Union|Poland|Hungary|Czechoslovakia|Eastern Europe|Taiwan|Caribbean Basin)\b/i;
const contextPattern = /\b(?:Arrival Ceremony|State Dinner|Toast|Presidential Remarks|Press Conference|Human Rights Leaders)\b/i;

const monthNumbers = {
  Jan: "01",
  January: "01",
  Feb: "02",
  February: "02",
  Mar: "03",
  March: "03",
  Apr: "04",
  April: "04",
  May: "05",
  Jun: "06",
  June: "06",
  Jul: "07",
  July: "07",
  Aug: "08",
  August: "08",
  Sep: "09",
  Sept: "09",
  September: "09",
  Oct: "10",
  October: "10",
  Nov: "11",
  November: "11",
  Dec: "12",
  December: "12",
};
const monthPattern = Object.keys(monthNumbers)
  .sort((a, b) => b.length - a.length)
  .join("|");

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const collectionResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${collectionNaid}`);
  const collectionRecord = collectionResponse.body.hits.hits[0]?._source.record;
  if (!collectionRecord || String(collectionRecord.naId) !== collectionNaid) {
    throw new Error(`Could not load Policy Development collection ${collectionNaid}`);
  }

  const firstPage = await fetchChildPage(1);
  const total = firstPage.body.hits.total.value;
  if (total !== expectedDescendants) {
    throw new Error(`Expected ${expectedDescendants} Policy Development descendants; Catalog reports ${total}`);
  }
  const pageCount = Math.ceil(total / 100);
  const remainingPages = await runPool(
    Array.from({ length: pageCount - 1 }, (_, index) => index + 2),
    6,
    fetchChildPage,
  );
  const hits = [firstPage, ...remainingPages].flatMap((page) => page.body.hits.hits);
  if (hits.length !== total) throw new Error(`Received ${hits.length} of ${total} descendants`);

  const records = hits.map((hit) => hit._source.record);
  const seriesRecords = records.filter((record) => record.levelOfDescription === "series");
  const fileUnitRecords = records.filter((record) => record.levelOfDescription === "fileUnit");
  if (seriesRecords.length !== expectedSeries || fileUnitRecords.length !== expectedFileUnits) {
    throw new Error(
      `Expected ${expectedSeries} series and ${expectedFileUnits} file units; received ${seriesRecords.length} and ${fileUnitRecords.length}`,
    );
  }

  const seriesByNaid = new Map(seriesRecords.map((record) => [String(record.naId), record]));
  const rows = fileUnitRecords.map((record) => toBaseRow(record, seriesByNaid));
  const onlineRows = rows.filter((row) => row.pdfUrl && row.objectId);
  await runPool(onlineRows, 6, async (row) => {
    const response = await fetchJson(`${catalogBase}/proxy/extractedText/${row.naid}?objectId=${row.objectId}`);
    const extractedText = response.digitalObjects?.[0]?.extractedText || "";
    Object.assign(row, deriveOcrFields(row, extractedText));
  });

  rows.forEach((row) => {
    if (!row.markerStatus) Object.assign(row, deriveOcrFields(row, ""));
  });
  rows.sort(compareRows);

  const reviewRows = rows.filter((row) => row.routing !== "Out of scope");
  const chronologyRows = reviewRows.filter(isChronologyCandidate);
  const generatedAt = new Date().toISOString();
  const reviewOnlineRows = reviewRows.filter((row) => row.pdfUrl);
  const allMarkerVerified = onlineRows.filter((row) => isVerifiedMarker(row.markerStatus)).length;
  const reviewMarkerVerified = reviewOnlineRows.filter((row) => isVerifiedMarker(row.markerStatus)).length;
  const placeholderSizeCount = onlineRows.filter((row) => row.pdfBytes === 1234).length;

  const output = {
    collection: {
      naid: collectionNaid,
      title: collectionRecord.title,
      localIdentifier: collectionRecord.collectionIdentifier || "GB-POD",
      inclusiveDates: `${collectionRecord.inclusiveStartDate.logicalDate}/${collectionRecord.inclusiveEndDate.logicalDate}`,
      catalogUrl: `${catalogBase}/id/${collectionNaid}`,
      findingAidUrl,
      findingAidPdfUrl,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "White House Office of Policy Development",
      seriesCount: seriesRecords.length,
      sourceFileUnitCount: rows.length,
      displayedFileUnitCount: reviewRows.length,
      onlinePdfCount: onlineRows.length,
      displayedOnlinePdfCount: reviewOnlineRows.length,
      markerVerified: reviewMarkerVerified,
      markerExceptionCount: reviewOnlineRows.length - reviewMarkerVerified,
      totalPdfBytes: reviewOnlineRows.reduce((sum, row) => sum + row.pdfBytes, 0),
      sourceTotalPdfBytes: onlineRows.reduce((sum, row) => sum + row.pdfBytes, 0),
      methodology:
        "Every descendant in the NARA Catalog hierarchy was enumerated. All file-unit titles, series, local identifiers, access status, container identifiers, and online-object metadata were retained in the full ledger. Transparent title rules identify foreign-economic review rows; all online PDFs were separately screened through NARA extracted text for opening-marker fields and high-level document signals. Only candidates with a source-supported working date enter the volume chronology.",
    },
    fileUnits: reviewRows,
    screening: {
      sourceFileUnits: rows.length,
      reviewFileUnits: reviewRows.length,
      chronologyCandidates: chronologyRows.length,
      routingCounts: countBy(rows, (row) => row.routing),
      subjectAreaCounts: countBy(reviewRows, (row) => row.chapter),
      seriesCounts: countBy(reviewRows, (row) => row.seriesTitle),
      onlinePdfCount: onlineRows.length,
      markerVerified: allMarkerVerified,
      markerExceptions: onlineRows.length - allMarkerVerified,
      placeholderSizeCount,
    },
    generatedAt,
  };

  const candidates = {
    auditScope: `Complete hierarchy screen of ${seriesRecords.length} series and ${rows.length} file units`,
    auditedFolders: onlineRows.map((row) => row.localId),
    methodology:
      "Chronology candidates require direct, selective, or boundary relevance plus a Catalog or title-supported date between 1989 and 1992. Folder-level candidates remain archival locators until a document is selected and its heading, dateline, extent, release state, terminal markings, and controlling copy are checked in the source images.",
    documents: chronologyRows.map((row) => ({
      naid: row.naid,
      date: row.workingStartDate,
      sortDate: row.workingStartDate,
      datePrecision: row.datePrecision,
      displayDateLabel: row.workingDateLabel,
      chapter: row.chapter,
      selection: row.selection,
      topics: row.reviewTopics,
      notes: row.reviewFocus,
    })),
    generatedAt,
  };

  const report = {
    generatedAt,
    collectionNaid,
    findingAidUrl,
    findingAidPdfUrl,
    expectedDescendants,
    harvestedDescendants: records.length,
    seriesCount: seriesRecords.length,
    fileUnitCount: rows.length,
    onlinePdfCount: onlineRows.length,
    reviewFileUnitCount: reviewRows.length,
    chronologyCandidateCount: chronologyRows.length,
    markerVerified: allMarkerVerified,
    markerExceptions: onlineRows
      .filter((row) => !isVerifiedMarker(row.markerStatus))
      .map(({ naid, localId, title, markerStatus }) => ({ naid, localId, title, markerStatus })),
    placeholderSizeCount,
    routingCounts: countBy(rows, (row) => row.routing),
    reviewSeriesCounts: countBy(reviewRows, (row) => row.seriesTitle),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
    methodology: output.collection.methodology,
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "policy-development-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "policy-development-candidates.json"), `${JSON.stringify(candidates, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "policy-development-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  fs.writeFileSync(path.join(dataDir, "policy-development-full-ledger.csv"), toCsv(rows, ledgerFields));
  fs.writeFileSync(path.join(dataDir, "policy-development-file-units.csv"), toCsv(reviewRows, ledgerFields));

  console.log(
    `Harvested ${rows.length} Policy Development file units across ${seriesRecords.length} series; ${reviewRows.length} review rows and ${chronologyRows.length} dated chronology candidates.`,
  );
  console.log(
    `Checked ${onlineRows.length} online PDFs through NARA OCR; ${allMarkerVerified} opening markers verified in extracted text.`,
  );
}

async function fetchChildPage(page) {
  const query = new URLSearchParams({
    ancestorNaId: collectionNaid,
    sort: "naId:asc",
    limit: "100",
    page: String(page),
    datesAgg: "true",
  });
  return fetchJson(`${catalogBase}/proxy/records/search?${query}`);
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
      await new Promise((resolve) => setTimeout(resolve, attempt * 700));
    }
  }
  throw new Error(`NARA request failed for ${url}: ${lastError}`);
}

async function runPool(values, size, worker) {
  const output = new Array(values.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(size, values.length || 1) }, async () => {
      while (next < values.length) {
        const index = next;
        next += 1;
        output[index] = await worker(values[index]);
      }
    }),
  );
  return output;
}

function toBaseRow(record, seriesByNaid) {
  const seriesAncestor = record.ancestors?.find((ancestor) => ancestor.levelOfDescription === "series");
  const seriesNaid = String(seriesAncestor?.naId || "");
  const seriesRecord = seriesByNaid.get(seriesNaid) || {};
  const object = record.digitalObjects?.find((item) => item.objectType === "Portable Document File (PDF)") || record.digitalObjects?.[0];
  const date = deriveWorkingDate(record);
  const screening = classify(record.title, seriesAncestor?.title || "", date.workingStartDate);
  const localId = record.localIdentifier || "Not supplied";
  const displayLocalId = localId.replace(/-(?=\d{3}$)/, "–");
  const containerId = record.physicalOccurrences?.flatMap((occurrence) => occurrence.mediaOccurrences || [])[0]?.containerId || "";
  const archivalLocator = `George H.W. Bush Library, Bush Presidential Records, White House Office of Policy Development, ${seriesAncestor?.title || "Series not identified"}, OA/ID ${displayLocalId}, ${record.title}.`;

  return {
    naid: String(record.naId),
    title: record.title,
    localId,
    seriesNaid,
    seriesTitle: seriesAncestor?.title || "Series not identified",
    seriesLocalId: seriesRecord.localIdentifier || "",
    containerId,
    catalogUrl: `${catalogBase}/id/${record.naId}`,
    pdfUrl: object?.objectUrl || "",
    pdfBytes: object?.objectFileSize || 0,
    objectId: object?.objectId ? String(object.objectId) : "",
    accessStatus: record.accessRestriction?.status || "Not stated",
    accessRestrictionNote: record.accessRestriction?.note || "",
    useStatus: record.useRestriction?.status || "Not stated",
    ...date,
    ...screening,
    archivalLocator,
    provenanceStem: "",
    markerStatus: object ? "not checked" : "not online",
    markerChecks: {},
    reviewSignals: emptyReviewSignals(),
    economicSignals: emptyEconomicSignals(),
    economicSubjectLeads: [],
  };
}

function classify(title, seriesTitle, workingStartDate) {
  const inFunctionalSeries = functionallyRelevantSeries.has(seriesTitle);
  const isPorterChron = seriesTitle === porterChronologicalSeries;
  const isDirectTitle = directTitlePattern.test(title);
  const isClimate = climatePattern.test(title);
  const isCountryPolicy = countryPolicySeries.has(seriesTitle) && countryPattern.test(title);
  const isRelevant = inFunctionalSeries || isPorterChron || isDirectTitle || isClimate || isCountryPolicy;
  const isContext = contextPattern.test(title);
  const year = workingStartDate.startsWith("9999") ? null : Number(workingStartDate.slice(0, 4));

  let routing = "Out of scope";
  if (isRelevant) {
    if (boundaryPattern.test(title)) routing = "Boundary review";
    else if (isContext || (year !== null && year < 1989) || (year !== null && year > 1992)) routing = "Context review";
    else if (isClimate || isPorterChron) routing = "Selective review";
    else routing = "Volume XXX review";
  }

  let chapter = subjectAreas.trade;
  if (/\b(?:COCOM|CFIUS|export controls?|technology transfer|satellites?|semiconductors?)\b/i.test(title)) chapter = subjectAreas.controls;
  else if (/\b(?:debt|Brady Plan|European Bank for Reconstruction|international economic policy|IEP Breakfast|IMF|World Bank)\b/i.test(title)) chapter = subjectAreas.finance;
  else if (/\b(?:economic summit|G[- ]?7|Munich Summit|Houston Summit|Paris Summit|London Summit|UNCED|Earth Summit|Rio Summit|global climate|climate change|global warming)\b/i.test(title)) chapter = subjectAreas.summits;
  else if (/\b(?:USSR|Soviet Union|Poland|Hungary|Czechoslovakia|Eastern Europe|East-West Trade)\b/i.test(title)) chapter = subjectAreas.transition;

  const selection = routing === "Boundary review"
    ? "Boundary"
    : /\b(?:Decision Documents?|POTUS Decision|EPC Meeting|Trade Policy|Trade Strategy|International Economic Policy|IEP Breakfast|CFIUS|Brady Plan|Economic Summit)\b/i.test(title)
      ? "Core"
      : "Consider";
  const reasons = [];
  if (inFunctionalSeries) reasons.push("functional trade or international-economic series");
  if (isPorterChron) reasons.push("online Roger Porter chronological file requiring document-level screening");
  if (isDirectTitle) reasons.push("foreign-economic title terms");
  if (isClimate) reasons.push("global climate or summit-environment title terms");
  if (isCountryPolicy) reasons.push("country file in a policy staff series");

  return {
    chapter,
    selection,
    routing,
    reviewTopics: inferTopics(title, seriesTitle),
    reviewFocus: isRelevant
      ? `Finding-aid lead retained because of ${reasons.join(", ")}. Review the folder document by document; the title does not establish document identity, selection value, or release completeness.`
      : "Title-screened as outside the present foreign-economic scope; retained in the complete source ledger.",
  };
}

function deriveWorkingDate(record) {
  const titleDate = parseTitleDate(record.title);
  const catalogStart = record.coverageStartDate?.logicalDate || "";
  const catalogEnd = record.coverageEndDate?.logicalDate || catalogStart;
  const titleYearConflictsWithCatalog = titleDate?.datePrecision === "year"
    && catalogStart
    && catalogStart.slice(0, 4) !== titleDate.workingStartDate.slice(0, 4);

  if (titleDate && (titleDate.datePrecision !== "year" || titleYearConflictsWithCatalog)) {
    const conflict = catalogStart && catalogStart.slice(0, 4) !== titleDate.workingStartDate.slice(0, 4);
    return {
      ...titleDate,
      dateBasis: conflict
        ? `Explicit folder-title date controls the apparent Catalog conflict beginning ${catalogStart}`
        : "Explicit folder-title date",
      catalogCoverageStart: catalogStart,
      catalogCoverageEnd: catalogEnd,
    };
  }
  if (catalogStart) {
    const precision = record.coverageStartDate?.day ? "day" : record.coverageStartDate?.month ? "month" : "year";
    return {
      workingStartDate: catalogStart,
      workingEndDate: catalogEnd,
      workingDateLabel: formatDateRange(catalogStart, catalogEnd, precision),
      datePrecision: catalogStart === catalogEnd ? precision : "range",
      dateBasis: "Catalog coverage dates",
      catalogCoverageStart: catalogStart,
      catalogCoverageEnd: catalogEnd,
    };
  }
  if (titleDate) {
    return {
      ...titleDate,
      dateBasis: "Year stated in folder title",
      catalogCoverageStart: "",
      catalogCoverageEnd: "",
    };
  }
  return {
    workingStartDate: "9999-12-31",
    workingEndDate: "9999-12-31",
    workingDateLabel: "Date not established",
    datePrecision: "unknown",
    dateBasis: "Finding aid supplies no file-unit date",
    catalogCoverageStart: "",
    catalogCoverageEnd: "",
  };
}

function parseTitleDate(title) {
  let match = title.match(new RegExp(`\\b(${monthPattern})\\s+(\\d{1,2})(?:-\\d{1,2})?,?\\s+(1989|1990|1991|1992|1993)\\b`, "i"));
  if (match) return dateResult(Number(match[3]), monthNumbers[normalizeMonth(match[1])], Number(match[2]), "day");

  match = title.match(/\b(1[0-2]|0?[1-9])\/(3[01]|[12]?\d)\/(8[9]|9[0-3]|19(?:89|9[0-3]))\b/);
  if (match) return dateResult(normalizeYear(match[3]), String(Number(match[1])).padStart(2, "0"), Number(match[2]), "day");

  match = title.match(new RegExp(`\\b(${monthPattern})[-–](${monthPattern}),?\\s+(1989|1990|1991|1992)\\b`, "i"));
  if (match) {
    const year = Number(match[3]);
    const startMonth = monthNumbers[normalizeMonth(match[1])];
    const endMonth = monthNumbers[normalizeMonth(match[2])];
    return {
      workingStartDate: `${year}-${startMonth}-01`,
      workingEndDate: `${year}-${endMonth}-${lastDay(year, Number(endMonth))}`,
      workingDateLabel: `${monthName(startMonth)}-${monthName(endMonth)} ${year}`,
      datePrecision: "range",
    };
  }

  match = title.match(new RegExp(`\\b(${monthPattern})[-–](${monthPattern})-(8[9]|9[0-2])\\b`, "i"));
  if (match) {
    const year = normalizeYear(match[3]);
    const startMonth = monthNumbers[normalizeMonth(match[1])];
    const endMonth = monthNumbers[normalizeMonth(match[2])];
    return {
      workingStartDate: `${year}-${startMonth}-01`,
      workingEndDate: `${year}-${endMonth}-${lastDay(year, Number(endMonth))}`,
      workingDateLabel: `${monthName(startMonth)}-${monthName(endMonth)} ${year}`,
      datePrecision: "range",
    };
  }

  match = title.match(new RegExp(`\\b(${monthPattern})(?:\\])?[,]?\\s+(1989|1990|1991|1992)\\b`, "i"));
  if (match) {
    const year = Number(match[2]);
    const month = monthNumbers[normalizeMonth(match[1])];
    return {
      workingStartDate: `${year}-${month}-01`,
      workingEndDate: `${year}-${month}-${lastDay(year, Number(month))}`,
      workingDateLabel: `${monthName(month)} ${year}`,
      datePrecision: "month",
    };
  }

  match = title.match(new RegExp(`\\b(${monthPattern})\\s+(8[9]|9[0-2])\\b`, "i"));
  if (match) {
    const year = normalizeYear(match[2]);
    const month = monthNumbers[normalizeMonth(match[1])];
    return {
      workingStartDate: `${year}-${month}-01`,
      workingEndDate: `${year}-${month}-${lastDay(year, Number(month))}`,
      workingDateLabel: `${monthName(month)} ${year}`,
      datePrecision: "month",
    };
  }

  match = title.match(/\b(1[0-2]|0?[1-9])\/(8[9]|9[0-2])\b/);
  if (match) {
    const year = normalizeYear(match[2]);
    const month = String(Number(match[1])).padStart(2, "0");
    return {
      workingStartDate: `${year}-${month}-01`,
      workingEndDate: `${year}-${month}-${lastDay(year, Number(month))}`,
      workingDateLabel: `${monthName(month)} ${year}`,
      datePrecision: "month",
    };
  }

  match = title.match(/\b(1989|1990|1991|1992)\b/);
  if (match) {
    return {
      workingStartDate: `${match[1]}-01-01`,
      workingEndDate: `${match[1]}-12-31`,
      workingDateLabel: match[1],
      datePrecision: "year",
    };
  }
  return null;
}

function dateResult(year, month, day, precision) {
  const date = `${year}-${month}-${String(day).padStart(2, "0")}`;
  return {
    workingStartDate: date,
    workingEndDate: date,
    workingDateLabel: formatLongDate(date),
    datePrecision: precision,
  };
}

function deriveOcrFields(row, extractedText) {
  const opening = extractedText.slice(0, 4_000);
  const markerRecordGroup = markerField(opening, "Record Group/Collection", "Collection/Office of Origin");
  const markerOffice = markerField(opening, "Collection/Office of Origin", "Series");
  const markerSeries = markerField(opening, "Series", "Subseries");
  const markerSubseries = markerField(opening, "Subseries", "OA/ID Number");
  const markerOaId = markerField(opening, "OA/ID Number", "Folder ID Number");
  const markerFolderId = markerField(opening, "Folder ID Number", "Folder Title");
  const markerChecks = {
    marker: /FOIA\s*MARKER/i.test(opening),
    recordGroup: /George\s+H\.?\s*W\.?\s+Bush\s+Presidential\s+Records/i.test(markerRecordGroup),
    office: /Policy\s+Development/i.test(markerOffice),
    folderId: compact(markerFolderId).includes(compact(row.localId)),
  };
  const markerStatus = !row.pdfUrl
    ? "not online"
    : Object.values(markerChecks).every(Boolean)
      ? "verified in OCR"
      : "not present";
  const reviewSignals = {
    memosToPresident: count(extractedText, /MEMORANDUM\s+(?:FOR|TO)\s+(?:THE\s+)?PRESIDENT/gi),
    memosToScowcroft: count(extractedText, /MEMORANDUM\s+(?:FOR|TO)[\s\S]{0,80}?SCOWCROFT/gi),
    memosToPorter: count(extractedText, /MEMORANDUM\s+(?:FOR|TO)\s*:?[\s\S]{0,50}?ROGER\s+(?:B\.?\s+)?PORTER/gi),
    memorandaOfConversation: count(extractedText, /MEMORANDUM OF CONVERSATION/gi),
    meetingRecords: count(extractedText, /\b(?:SUMMARY OF CONCLUSIONS|MINUTES OF (?:THE )?MEETING|RECORD OF MEETING)\b/gi),
    withdrawalSheets: count(extractedText, /Withdrawal\/Redaction Sheet/gi),
  };
  const economicSignals = {
    trade: count(extractedText, /\b(?:trade policy|GATT|Uruguay Round|Section 301|Super 301|SII|market access)\b/gi),
    finance: count(extractedText, /\b(?:international debt|Brady Plan|IMF|World Bank|exchange rate|international monetary)\b/gi),
    summits: count(extractedText, /\b(?:economic summit|G[- ]?7|Group of Seven|Houston Summit|London Summit|Munich Summit|Paris Summit)\b/gi),
    transition: count(extractedText, /\b(?:Soviet economy|Eastern Europe|Poland|Hungary|enterprise fund|economic assistance)\b/gi),
    controls: count(extractedText, /\b(?:COCOM|CFIUS|export controls?|technology transfer|foreign investment)\b/gi),
  };
  economicSignals.total = Object.values(economicSignals).reduce((sum, value) => sum + value, 0);
  return {
    markerStatus,
    markerRecordGroup,
    markerOffice,
    markerSeries,
    markerSubseries,
    markerOaId,
    markerFolderId,
    markerChecks,
    provenanceStem: isVerifiedMarker(markerStatus) ? `Source: ${row.archivalLocator}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals,
    economicSignals,
    economicSubjectLeads: extractEconomicSubjectLeads(extractedText),
  };
}

function markerField(text, label, nextLabel) {
  const expression = new RegExp(`${escapeRegExp(label)}:\\s*([\\s\\S]{0,220}?)(?=\\n${escapeRegExp(nextLabel)}:)`, "i");
  return (text.match(expression)?.[1] || "").replace(/\s+/g, " ").trim();
}

function extractEconomicSubjectLeads(text) {
  const lines = text.split(/\r?\n/);
  const leads = [];
  for (const line of lines) {
    const value = line.match(/^\s*(?:SUBJECT|RE)\s*:?\s*(.{4,180})$/i)?.[1]?.trim();
    if (value && (directTitlePattern.test(value) || climatePattern.test(value) || countryPattern.test(value))) leads.push(value);
  }
  return [...new Set(leads)].slice(0, 80);
}

function isChronologyCandidate(row) {
  if (!["Volume XXX review", "Selective review", "Boundary review"].includes(row.routing)) return false;
  if (row.workingStartDate.startsWith("9999")) return false;
  const year = Number(row.workingStartDate.slice(0, 4));
  return year >= 1989 && year <= 1992;
}

function inferTopics(title, seriesTitle) {
  const topics = ["White House Office of Policy Development", seriesTitle];
  const terms = [
    ["Trade policy", /\b(?:trade|GATT|Uruguay|Section 301|SII|tariff)\b/i],
    ["Foreign investment", /\b(?:foreign investment|CFIUS)\b/i],
    ["International debt", /\b(?:debt|Brady Plan)\b/i],
    ["Economic summits", /\b(?:economic summit|G[- ]?7|Munich Summit|Houston Summit|Paris Summit|London Summit)\b/i],
    ["Transition economies", /\b(?:USSR|Soviet Union|Poland|Hungary|Czechoslovakia|Eastern Europe)\b/i],
    ["Export controls", /\b(?:COCOM|export controls?|technology transfer|semiconductors?)\b/i],
    ["Global environment", /\b(?:UNCED|climate change|global warming|Earth Summit|Rio Summit)\b/i],
    ["NAFTA boundary", /\b(?:NAFTA|North American Free Trade|Mexico|Canada)\b/i],
  ];
  terms.forEach(([label, expression]) => {
    if (expression.test(title)) topics.push(label);
  });
  return [...new Set(topics)];
}

function compareRows(a, b) {
  return (
    a.workingStartDate.localeCompare(b.workingStartDate) ||
    a.seriesTitle.localeCompare(b.seriesTitle) ||
    a.localId.localeCompare(b.localId)
  );
}

function formatDateRange(start, end, precision) {
  if (start === end) {
    if (precision === "year") return start.slice(0, 4);
    if (precision === "month") return `${monthName(start.slice(5, 7))} ${start.slice(0, 4)}`;
    return formatLongDate(start);
  }
  return `${formatLongDate(start)}-${formatLongDate(end)}`;
}

function formatLongDate(date) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthName(month) {
  return new Date(`2000-${month}-01T12:00:00Z`).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" });
}

function normalizeMonth(value) {
  const match = Object.keys(monthNumbers).find((month) => month.toLowerCase() === value.toLowerCase());
  return match || value;
}

function normalizeYear(value) {
  const number = Number(value);
  return number < 100 ? 1900 + number : number;
}

function lastDay(year, month) {
  return String(new Date(Date.UTC(year, month, 0)).getUTCDate()).padStart(2, "0");
}

function emptyReviewSignals() {
  return {
    memosToPresident: 0,
    memosToScowcroft: 0,
    memosToPorter: 0,
    memorandaOfConversation: 0,
    meetingRecords: 0,
    withdrawalSheets: 0,
  };
}

function emptyEconomicSignals() {
  return { trade: 0, finance: 0, summits: 0, transition: 0, controls: 0, total: 0 };
}

function isVerifiedMarker(status) {
  return status.startsWith("verified");
}

function count(text, expression) {
  return text.match(expression)?.length || 0;
}

function countBy(rows, selector) {
  return Object.fromEntries(
    [...rows.reduce((map, row) => map.set(selector(row), (map.get(selector(row)) || 0) + 1), new Map())]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])),
  );
}

function compact(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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

function toCsv(rows, fields) {
  return [
    fields.join(","),
    ...rows.map((row) => fields.map((field) => csvCell(readField(row, field))).join(",")),
  ].join("\n") + "\n";
}

function readField(row, field) {
  if (field === "reviewTopics") return row.reviewTopics.join(" | ");
  if (field === "economicSubjectLeads") return row.economicSubjectLeads.join(" | ");
  if (Object.hasOwn(row.reviewSignals || {}, field)) return row.reviewSignals[field];
  if (field === "economicSignalTotal") return row.economicSignals?.total;
  if (field.endsWith("Signals")) return row.economicSignals?.[field.replace(/Signals$/, "")];
  return row[field];
}

function csvCell(value) {
  if (value === null || value === undefined) return "";
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

const ledgerFields = [
  "naid",
  "localId",
  "seriesNaid",
  "seriesLocalId",
  "seriesTitle",
  "containerId",
  "title",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "datePrecision",
  "dateBasis",
  "chapter",
  "selection",
  "routing",
  "accessStatus",
  "accessRestrictionNote",
  "useStatus",
  "markerStatus",
  "markerRecordGroup",
  "markerOffice",
  "markerSeries",
  "markerSubseries",
  "markerOaId",
  "markerFolderId",
  "objectId",
  "pdfBytes",
  "ocrCharacterCount",
  "memosToPresident",
  "memosToScowcroft",
  "memosToPorter",
  "memorandaOfConversation",
  "meetingRecords",
  "withdrawalSheets",
  "economicSignalTotal",
  "tradeSignals",
  "financeSignals",
  "summitsSignals",
  "transitionSignals",
  "controlsSignals",
  "reviewTopics",
  "reviewFocus",
  "economicSubjectLeads",
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
];
