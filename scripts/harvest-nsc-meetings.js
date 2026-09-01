#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const dataDir = path.join(root, "data");
const reportsDir = path.join(root, "reports");
const seriesNaId = "312293887";
const controlGroup = "2163580";
const catalogBase = "https://catalog.archives.gov";
const directReviewNaids = new Set([
  "470760887",
  "470760892",
  "470760893",
  "470760894",
  "470760921",
  "470760926",
  "470760927",
  "470760935",
  "470760936",
  "470760942",
  "470760944",
  "470760948",
  "470760949",
]);
const boundaryReviewNaids = new Set([
  "470760889",
  "470760890",
  "470760932",
  "470760933",
  "470760934",
  "470760939",
  "470760940",
  "470760941",
  "470760945",
  "470760946",
  "470760947",
  "470760952",
  "470760953",
  "470760954",
  "470760955",
  "470760957",
  "470760959",
  "470760960",
  "470760961",
  "470760962",
  "470760967",
  "470760971",
]);
const transitionEconomyNaids = new Set([
  "470760892",
  "470760893",
  "470760894",
  "470760921",
  "470760926",
  "470760927",
  "470760945",
  "470760946",
  "470760947",
]);
const monetaryPolicyNaids = new Set([
  "470760887",
  "470760932",
  "470760933",
  "470760934",
  "470760935",
  "470760936",
  "470760939",
  "470760940",
  "470760941",
  "470760953",
  "470760954",
  "470760955",
  "470760957",
  "470760959",
  "470760960",
  "470760961",
  "470760962",
]);
const strategicTradeNaids = new Set([
  "470760889",
  "470760890",
  "470760942",
  "470760944",
  "470760948",
  "470760949",
  "470760952",
  "470760967",
  "470760971",
]);

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

async function main() {
  const seriesResponse = await fetchJson(`${catalogBase}/proxy/records/search?naId=${seriesNaId}`);
  const seriesRecord = seriesResponse.body.hits.hits[0]?._source.record;
  if (!seriesRecord || String(seriesRecord.naId) !== seriesNaId) {
    throw new Error(`Could not load NSC Meetings series ${seriesNaId}`);
  }

  const query = new URLSearchParams({
    ancestorNaId: seriesNaId,
    controlGroup,
    sort: "naId:asc",
    limit: "100",
    page: "1",
    datesAgg: "true",
  });
  const childResponse = await fetchJson(`${catalogBase}/proxy/records/search?${query}`);
  const hits = childResponse.body.hits.hits;
  const expectedCount = childResponse.body.hits.total.value;
  if (hits.length !== expectedCount || expectedCount !== 90) {
    throw new Error(`Expected 90 NSC Meeting file units; received ${hits.length} of ${expectedCount}`);
  }

  const rows = hits.map(toBaseRow);
  await runPool(rows, 8, async (row) => {
    const [response, servedPdfBytes] = await Promise.all([
      fetchJson(`${catalogBase}/proxy/extractedText/${row.naid}?objectId=${row.objectId}`),
      fetchContentLength(row.pdfUrl),
    ]);
    if (servedPdfBytes) {
      row.pdfBytes = servedPdfBytes;
      row.pdfByteBasis = "HTTP Content-Length";
    }
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
      shortTitle: "NSC Meeting Files",
      localIdentifier: seriesRecord.localIdentifier,
      inclusiveDates: `${seriesRecord.inclusiveStartDate.logicalDate}/${seriesRecord.inclusiveEndDate.logicalDate}`,
      fileUnitCount: expectedCount,
      catalogUrl: `${catalogBase}/id/${seriesNaId}`,
      recordGroup: "George H.W. Bush Presidential Records",
      office: "National Security Council",
      series: "H-Files",
      subseries: "NSC Meetings Files",
      markerVerified,
      markerExceptionCount: rows.length - markerVerified,
      totalPdfBytes,
      methodology:
        "Every online file unit was enumerated from the NARA Catalog series hierarchy. Catalog coverage dates control the working chronology. NARA extracted text supplies high-level and economic-policy review signals; routing reflects manual review of the title and OCR evidence. Marker status requires the opening OCR segment to name the record group, office, series, subseries, and folder ID.",
    },
    fileUnits: rows,
    generatedAt,
  };

  const report = {
    generatedAt,
    seriesNaId,
    expectedFileUnits: expectedCount,
    harvestedFileUnits: rows.length,
    volumeReviewFileUnits: rows.filter((row) => row.routing === "Volume XXX review").length,
    boundaryReviewFileUnits: rows.filter((row) => row.routing === "Boundary review").length,
    volumeReviewNaids: rows.filter((row) => row.routing === "Volume XXX review").map((row) => row.naid),
    boundaryReviewNaids: rows.filter((row) => row.routing === "Boundary review").map((row) => row.naid),
    economicSignalThreshold: 20,
    economicSignalFileUnits: rows.filter((row) => row.economicSignals.total >= 20).length,
    markerVerified,
    markerExceptions: rows
      .filter((row) => row.markerStatus !== "verified")
      .map(({ naid, localId, title, markerStatus }) => ({ naid, localId, title, markerStatus })),
    totalPdfBytes,
    pdfSizeMetadataMismatches: rows
      .filter((row) => row.catalogPdfBytes && row.catalogPdfBytes !== row.pdfBytes)
      .map(({ naid, catalogPdfBytes, pdfBytes }) => ({ naid, catalogPdfBytes, servedPdfBytes: pdfBytes })),
    totalOcrCharacters: rows.reduce((total, row) => total + row.ocrCharacterCount, 0),
    duplicateNaids: duplicates(rows.map((row) => row.naid)),
    duplicateLocalIds: duplicates(rows.map((row) => row.localId)),
  };

  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(dataDir, "nsc-meetings-file-units.json"), `${JSON.stringify(output, null, 2)}\n`);
  fs.writeFileSync(path.join(reportsDir, "nsc-meetings-harvest.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `Harvested ${rows.length} NSC Meeting file units; ${markerVerified} opening provenance markers verified.`,
  );
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
  if (!object?.objectUrl || !object?.objectId) {
    throw new Error(`File unit ${record.naId} has no online PDF`);
  }
  return {
    naid: String(record.naId),
    title: record.title,
    localId: record.localIdentifier,
    catalogUrl: `${catalogBase}/id/${record.naId}`,
    pdfUrl: object.objectUrl,
    catalogPdfBytes: Number(object.objectFileSize) || 0,
    pdfBytes: Number(object.objectFileSize) || 0,
    pdfByteBasis: "Catalog objectFileSize",
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
    series: /series:\s*H-Files/i.test(openingText),
    subseries: /subseries:\s*NSC\s+Meetings\s+Files/i.test(openingText),
    folderId: compact(openingText).includes(compact(row.localId)),
  };
  const markerStatus = Object.values(markerChecks).every(Boolean) ? "verified" : "not present";
  const workingStartDate = row.catalogCoverageStart || "9999-12-31";
  const workingEndDate = row.catalogCoverageEnd || workingStartDate;
  const dateBasis = row.catalogCoverageStart ? "Catalog coverage dates" : "Date not established";
  const chapter = inferChapter(row.naid);
  const routing = inferRouting(row.naid);
  const displayLocalId = row.localId.replace(/-(?=\d{3}$)/, "–");
  const normalizedTitle = row.title.replaceAll(" - ", "—");
  const folderCitation = `George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSC Meetings Files, OA/ID ${displayLocalId}, ${normalizedTitle}.`;

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
        /\b(?:SUMMARY OF CONCLUSIONS|MINUTES OF (?:THE )?(?:NATIONAL SECURITY COUNCIL )?MEETING|MEETING OF THE NATIONAL SECURITY COUNCIL|RECORD OF MEETING)\b/gi,
      ),
      withdrawalSheets: count(extractedText, /Withdrawal\/Redaction Sheet/gi),
    },
    economicSignals: economicSignalCounts(extractedText),
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
      /\b(?:trade|exports?|imports?|cocom|tariffs?|investment|gatt|uruguay round|technology transfer)\b/gi,
    ),
    assistanceSanctions: count(
      searchableText,
      /\b(?:economic assistance|foreign assistance|aid package|credits?|sanctions?)\b/gi,
    ),
    energy: count(searchableText, /\b(?:oil|energy|petroleum|opec)\b/gi),
    treasury: count(searchableText, /\b(?:treasury|nicholas brady|secretary brady)\b/gi),
  };
  return {
    ...groups,
    total: Object.values(groups).reduce((sum, value) => sum + value, 0),
  };
}

function inferChapter(naid) {
  if (strategicTradeNaids.has(naid)) return "Strategic Trade, Technology, and Investment Controls";
  if (transitionEconomyNaids.has(naid)) return "Transition Economies and International Economic Strategy";
  if (monetaryPolicyNaids.has(naid)) return "Monetary Policy, Debt, and International Institutions";
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
