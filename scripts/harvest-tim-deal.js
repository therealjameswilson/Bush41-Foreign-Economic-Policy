#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "2554810";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";

const monthNumbers = {
  January: "01",
  February: "02",
  March: "03",
  April: "04",
  May: "05",
  June: "06",
  July: "07",
  August: "08",
  September: "09",
  October: "10",
  November: "11",
  December: "12",
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load Timothy E. Deal series ${seriesNaId}`);
  }

  const pages = await Promise.all([1, 2].map(fetchChildPage));
  const hits = pages.flatMap((page) => page.body.hits.hits);
  const expectedCount = pages[0].body.hits.total.value;
  if (hits.length !== expectedCount || expectedCount !== 134) {
    throw new Error(`Expected 134 Deal file units; received ${hits.length} of ${expectedCount}`);
  }

  const rows = hits
    .map(toBaseRow)
    .sort((a, b) => Number(a.naid) - Number(b.naid));

  await runPool(rows, 8, async (row) => {
    const response = await fetchJson(
      `${catalogBase}/proxy/extractedText/${row.naid}?objectId=${row.objectId}`,
    );
    const extractedText = response.digitalObjects?.[0]?.extractedText || "";
    Object.assign(row, deriveReviewFields(row, extractedText));
  });

  rows.sort((a, b) => {
    return (
      a.workingStartDate.localeCompare(b.workingStartDate) ||
      a.workingEndDate.localeCompare(b.workingEndDate) ||
      a.localId.localeCompare(b.localId)
    );
  });

  const generatedAt = new Date().toISOString();
  const markerVerified = rows.filter((row) => row.markerStatus === "verified").length;
  const totalPdfBytes = rows.reduce((total, row) => total + row.pdfBytes, 0);
  const output = {
    collection: {
      naid: seriesNaId,
      title: seriesRecord.title,
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: expectedCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "Deal, Timothy E., Files",
      subseries: "Subject Files",
      markerVerified,
      markerExceptionCount: rows.length - markerVerified,
      totalPdfBytes,
      methodology:
        "Every online file unit was enumerated from the NARA Catalog series hierarchy. NARA extracted text was used for working date spans and review signals. Marker status requires the PDF opening text to name the record group, office, series, subseries, and folder ID.",
    },
    fileUnits: rows,
    generatedAt,
  };

  const report = {
    generatedAt,
    seriesNaId,
    expectedFileUnits: expectedCount,
    harvestedFileUnits: rows.length,
    markerVerified,
    markerExceptions: rows
      .filter((row) => row.markerStatus !== "verified")
      .map(({ naid, localId, title, markerStatus }) => ({ naid, localId, title, markerStatus })),
    totalPdfBytes,
    totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "tim-deal-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "tim-deal-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} Tim Deal file units; ${markerVerified} opening provenance markers verified.`,
  );
}

async function fetchChildPage(page) {
  const query = new URLSearchParams({
    ancestorNaId: seriesNaId,
    controlGroup,
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
      await new Promise((resolve) => setTimeout(resolve, attempt * 750));
    }
  }
  throw new Error(`NARA request failed for ${url}: ${lastError}`);
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
  if (!object?.objectUrl || !object?.objectId) {
    throw new Error(`File unit ${record.naId} has no online PDF`);
  }
  return {
    naid: String(record.naId),
    title: record.title,
    localId: record.localIdentifier,
    catalogUrl: `${catalogBase}/id/${record.naId}`,
    pdfUrl: object.objectUrl,
    pdfBytes: object.objectFileSize || 0,
    objectId: String(object.objectId),
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
    series: /deal,?\s+timothy\s+e\.?\s*,?\s+files/i.test(openingText),
    subseries: /subject\s+files/i.test(openingText),
    folderId: compact(openingText).includes(compact(row.localId)),
  };
  const markerStatus = Object.values(markerChecks).every(Boolean) ? "verified" : "not present";
  const ocrDates = extractDates(extractedText);
  const workingStartDate = row.catalogCoverageStart || ocrDates[0] || "9999-12-31";
  const workingEndDate = row.catalogCoverageEnd || ocrDates.at(-1) || workingStartDate;
  const dateBasis = row.catalogCoverageStart ? "Catalog coverage dates" : ocrDates.length ? "OCR working span" : "Date not established";
  const chapter = inferChapter(row.title);
  const routing = inferRouting(row.title);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, Timothy E. Deal Files, Subject Files, OA/ID ${displayLocalId}, ${row.title}.`;

  return {
    chapter,
    routing,
    workingStartDate,
    workingEndDate,
    dateBasis,
    markerStatus,
    markerChecks,
    archivalLocator: folderCitation,
    provenanceStem: markerStatus === "verified" ? `Source: ${folderCitation}` : "",
    ocrCharacterCount: extractedText.length,
    reviewSignals: {
      memosToPresident: count(extractedText, /MEMORANDUM\s+(?:FOR|TO)\s+(?:THE\s+)?PRESIDENT/gi),
      memosToScowcroft: count(
        extractedText,
        /MEMORANDUM\s+(?:FOR|TO)\s+(?:BRENT|GENERAL|THE HONORABLE BRENT)[\s\S]{0,80}?SCOWCROFT/gi,
      ),
      memorandaOfConversation: count(extractedText, /MEMORANDUM OF CONVERSATION/gi),
      meetingRecords: count(
        extractedText,
        /\b(?:SUMMARY OF CONCLUSIONS|MINUTES OF (?:THE )?MEETING|RECORD OF MEETING)\b/gi,
      ),
      withdrawalSheets: count(extractedText, /Withdrawal\/Redaction Sheet/gi),
    },
  };
}

function extractDates(text) {
  const monthNames = Object.keys(monthNumbers).join("|");
  const expression = new RegExp(
    `\\b(${monthNames})\\s+(\\d{1,2}),\\s+(1989|1990|1991|1992)\\b`,
    "g",
  );
  const values = [];
  let match;
  while ((match = expression.exec(text))) {
    values.push(`${match[3]}-${monthNumbers[match[1]]}-${String(match[2]).padStart(2, "0")}`);
  }
  return [...new Set(values)].sort();
}

function inferChapter(title) {
  if (/COCOM|Export Controls|Fiber Optics|Offsets|CFIUS/i.test(title)) {
    return "Strategic Trade, Technology, and Investment Controls";
  }
  if (/Summit|Sherpa|Deal Travel/i.test(title)) {
    return "Economic Summits and Industrialized-Country Cooperation";
  }
  if (/Poland|Soviet Union|\bCIS\b/i.test(title)) {
    return "Transition Economies and International Economic Strategy";
  }
  if (/Debt|EBRD|IFI|Gulf Crisis|International Economic Policy|IEPR|Energy|Middle East|Iraq|War Risk/i.test(title)) {
    return "Monetary Policy, Debt, and International Institutions";
  }
  if (/Personnel/i.test(title)) return "Series administration";
  return "Trade Policy and Market Access";
}

function inferRouting(title) {
  if (/Personnel/i.test(title)) return "Administrative";
  if (/Argentina|Aviation|Brady Trip|Canada|EAI|Gulf Crisis|Iraq|Latin America|Middle East|Panama|Venezuela|War Risk/i.test(title)) {
    return "Boundary review";
  }
  return "Volume XXX review";
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
