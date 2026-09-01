#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/volume.json"), "utf8"));
const errors = [];
const warnings = [];

const chapterNames = new Set(data.chapters.map((chapter) => chapter.name));
const ids = new Set();

for (const record of data.records) {
  if (ids.has(record.id)) errors.push(`Duplicate record id: ${record.id}`);
  ids.add(record.id);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) errors.push(`${record.id}: invalid date ${record.date}`);
  if (!chapterNames.has(record.chapter)) errors.push(`${record.id}: unknown chapter ${record.chapter}`);
  if (!record.title || !record.heading || !record.dateline) errors.push(`${record.id}: missing title, heading, or dateline`);
  if (!record.catalogUrl?.startsWith("https://catalog.archives.gov/id/")) errors.push(`${record.id}: missing official Catalog URL`);
  if (record.pdfUrl && !record.pdfUrl.startsWith("https://catalog.archives.gov/medialz/")) errors.push(`${record.id}: nonofficial PDF URL`);
  if (!['verified', 'draft', 'locator'].includes(record.sourceNoteStatus)) errors.push(`${record.id}: invalid source-note status`);

  if (record.sourceNoteStatus === "locator") {
    if (record.sourceNote) errors.push(`${record.id}: locator must not assert a document-level Source Note`);
    if (!record.archivalLocator) errors.push(`${record.id}: locator missing archival locator text`);
  } else {
    if (!record.sourceNote?.startsWith("Source: George H.W. Bush Library,")) errors.push(`${record.id}: Source Note does not begin in project FRUS style`);
    if (/https?:|NARA Catalog ID|Digital object:/i.test(record.sourceNote)) errors.push(`${record.id}: URL or catalog metadata leaked into Source Note prose`);
    if (!/(?:Top Secret|Secret|Confidential|Unclassified|No classification marking)(?:; (?:Exdis|Nodis|Limited Access))?\.$|the attachment is Confidential\.$/i.test(record.sourceNote)) {
      errors.push(`${record.id}: Source Note lacks terminal classification sentence`);
    }
    if (/OA\/ID [A-Z0-9]+-[A-Z0-9]+/.test(record.sourceNote)) errors.push(`${record.id}: OA/ID uses a hyphen instead of an en dash`);
  }

  if (record.releaseStatus === "Withheld" && !Number.isInteger(record.pageCount)) errors.push(`${record.id}: withheld item lacks exact page extent`);
  if (record.releaseStatus === "Withheld" && !/(?:withheld|not declassified)/i.test(record.extentLabel || "")) warnings.push(`${record.id}: withheld extent label is unclear`);
  if (record.sourceNoteStatus === "verified" && !/checked/i.test(record.sourceNoteBasis || "")) errors.push(`${record.id}: verified Source Note lacks evidence statement`);
}

const chronological = [...data.records].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
if (chronological.some((record, index) => record.id !== data.records[index].id)) errors.push("Records are not stored in chronological order");

if (data.meta.status !== "Being Researched") warnings.push(`Unexpected official status: ${data.meta.status}`);
if (data.publicReferences.length < 5) errors.push("Public reference register is too small for an initial release");
if (data.gaps.length < 5) errors.push("Compiler gap ledger is too small");

const timDeal = data.nscCollections?.find((collection) => collection.id === "tim-deal");
if (!timDeal) {
  errors.push("Tim Deal NSC collection is missing");
} else {
  if (timDeal.fileUnits.length !== 134 || timDeal.fileUnitCount !== 134) errors.push("Tim Deal file-unit count is not 134");
  if (timDeal.markerVerified !== 133 || timDeal.markerExceptionCount !== 1) errors.push("Tim Deal provenance-marker totals changed");
  if (timDeal.candidateCount !== 15 || timDeal.candidateIds.length !== 15) errors.push("Tim Deal item-level candidate count is not 15");
  const markerExceptions = timDeal.fileUnits.filter((row) => row.markerStatus !== "verified");
  if (markerExceptions.length !== 1 || markerExceptions[0].naid !== "452050635" || markerExceptions[0].localId !== "CF00973-013") {
    errors.push("Tim Deal provenance-marker exception changed");
  }
  if (new Set(timDeal.fileUnits.map((row) => row.naid)).size !== timDeal.fileUnits.length) errors.push("Duplicate Tim Deal NAID");
  if (new Set(timDeal.fileUnits.map((row) => row.localId)).size !== timDeal.fileUnits.length) errors.push("Duplicate Tim Deal OA/ID");
  if (timDeal.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("Tim Deal ledger contains a nonofficial link");
  }
  const sortedUnits = [...timDeal.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== timDeal.fileUnits[index].naid)) errors.push("Tim Deal file units are not stored in working chronological order");
  if (timDeal.candidateIds.some((id) => !ids.has(id))) errors.push("Tim Deal candidate ID is missing from the master chronology");
  const candidateRecords = timDeal.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "verified")) errors.push("Tim Deal candidate lacks a verified Source Note");
}

const nscMeetings = data.nscCollections?.find((collection) => collection.id === "nsc-meetings");
if (!nscMeetings) {
  errors.push("NSC Meetings collection is missing");
} else {
  if (nscMeetings.fileUnits.length !== 90 || nscMeetings.fileUnitCount !== 90) errors.push("NSC Meetings file-unit count is not 90");
  if (nscMeetings.markerVerified !== 90 || nscMeetings.markerExceptionCount !== 0) errors.push("NSC Meetings provenance-marker totals changed");
  if (nscMeetings.candidateCount !== 35 || nscMeetings.candidateIds.length !== 35) errors.push("NSC Meetings review-candidate count is not 35");
  if (nscMeetings.auditedFolders.length !== 35) errors.push("NSC Meetings screened-folder count is not 35");
  if (nscMeetings.fileUnits.some((row) => row.markerStatus !== "verified")) errors.push("NSC Meetings ledger contains an opening-marker exception");
  if (nscMeetings.fileUnits.some((row) => !Number.isInteger(row.economicSignals?.total))) errors.push("NSC Meetings ledger lacks economic OCR signals");
  if (new Set(nscMeetings.fileUnits.map((row) => row.naid)).size !== nscMeetings.fileUnits.length) errors.push("Duplicate NSC Meetings NAID");
  if (new Set(nscMeetings.fileUnits.map((row) => row.localId)).size !== nscMeetings.fileUnits.length) errors.push("Duplicate NSC Meetings OA/ID");
  if (nscMeetings.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("NSC Meetings ledger contains a nonofficial link");
  }
  const sortedUnits = [...nscMeetings.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== nscMeetings.fileUnits[index].naid)) errors.push("NSC Meetings file units are not stored in chronological order");
  if (nscMeetings.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 13) errors.push("NSC Meetings direct-review routing count is not 13");
  if (nscMeetings.fileUnits.filter((row) => row.routing === "Boundary review").length !== 22) errors.push("NSC Meetings boundary-review routing count is not 22");
  if (nscMeetings.candidateIds.some((id) => !ids.has(id))) errors.push("NSC Meetings candidate ID is missing from the master chronology");
  const candidateRecords = nscMeetings.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(nscMeetings.fileUnits.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("NSC Meetings routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote)) errors.push("NSC Meetings file-unit lead incorrectly asserts a document-level Source Note");
  if (candidateRecords.some((record) => record.collectionId !== "nsc-meetings")) errors.push("NSC Meetings candidate lacks its collection ID");
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 1854) errors.push("NSC Meetings review-file page total is not 1,854");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 13) errors.push("NSC Meetings candidate direct-review count is not 13");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 22) errors.push("NSC Meetings candidate boundary count is not 22");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("NSC Meetings candidates are not stored in chronological order");
}

const ifTransition = data.nscCollections?.find((collection) => collection.id === "if-transition");
if (!ifTransition) {
  errors.push("NSC Institutional Files Transition collection is missing");
} else {
  if (data.nscCollections[0]?.id !== "if-transition") errors.push("IF Transition is not the first collection tab");
  if (ifTransition.fileUnits.length !== 30 || ifTransition.fileUnitCount !== 30) errors.push("IF Transition file-unit count is not 30");
  if (ifTransition.onlinePdfCount !== 30 || ifTransition.catalogOnlyCount !== 0) errors.push("IF Transition online/catalog-only totals changed");
  if (ifTransition.totalPdfPages !== 3612) errors.push("IF Transition served-PDF page total is not 3,612");
  if (ifTransition.markerVerified !== 30 || ifTransition.markerCorrectedCount !== 0 || ifTransition.markerMismatchCount !== 0 || ifTransition.markerExceptionCount !== 0) {
    errors.push("IF Transition provenance-marker totals changed");
  }
  if (ifTransition.candidateCount !== 4 || ifTransition.candidateIds.length !== 4) errors.push("IF Transition review-candidate count is not 4");
  if (ifTransition.auditedFolders.length !== 4) errors.push("IF Transition screened-folder count is not 4");
  if (ifTransition.fileUnits.some((row) => row.markerStatus !== "verified")) errors.push("IF Transition ledger contains an opening-marker exception");
  if (ifTransition.fileUnits.some((row) => !Number.isInteger(row.economicSignals?.total))) errors.push("IF Transition ledger lacks economic OCR signals");
  if (new Set(ifTransition.fileUnits.map((row) => row.naid)).size !== ifTransition.fileUnits.length) errors.push("Duplicate IF Transition NAID");
  if (new Set(ifTransition.fileUnits.map((row) => row.localId)).size !== ifTransition.fileUnits.length) errors.push("Duplicate IF Transition OA/ID");
  if (ifTransition.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("IF Transition ledger contains a nonofficial link");
  }
  if (ifTransition.fileUnits.some((row) => !Number.isInteger(row.pdfPages) || row.pdfPages <= 0 || row.hasOnlinePdf !== true)) {
    errors.push("IF Transition served-PDF page ledger is incomplete or inconsistent");
  }
  if (ifTransition.fileUnits.reduce((total, row) => total + row.pdfPages, 0) !== 3612) errors.push("IF Transition file-unit page counts do not total 3,612");
  const sortedUnits = [...ifTransition.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== ifTransition.fileUnits[index].naid)) errors.push("IF Transition file units are not stored in chronological order");
  if (ifTransition.fileUnits.some((row) => row.workingStartDate === "9999-12-31" || row.dateBasis === "Date not established")) errors.push("IF Transition ledger contains an undated working row");
  if (ifTransition.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 2) errors.push("IF Transition direct-review routing count is not 2");
  if (ifTransition.fileUnits.filter((row) => row.routing === "Boundary review").length !== 2) errors.push("IF Transition boundary-review routing count is not 2");
  if (ifTransition.fileUnits.filter((row) => row.routing !== "Series context").some((row) => !row.reviewTopics?.length || !row.reviewFocus || !row.reviewKeyExtent)) {
    errors.push("IF Transition routed file unit lacks its compiler review annotation");
  }
  if (ifTransition.candidateIds.some((id) => !ids.has(id))) errors.push("IF Transition candidate ID is missing from the master chronology");
  const candidateRecords = ifTransition.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(ifTransition.fileUnits.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("IF Transition routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote)) errors.push("IF Transition file-unit lead incorrectly asserts a document-level Source Note");
  if (candidateRecords.some((record) => record.collectionId !== "if-transition")) errors.push("IF Transition candidate lacks its collection ID");
  if (candidateRecords.some((record) => !record.archivalLocator.startsWith("George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, IF Transition Files, OA/ID ") || !/9901[56]–\d{3}/.test(record.archivalLocator) || /9901[56]-\d{3}/.test(record.archivalLocator))) {
    errors.push("IF Transition archival locator does not follow the published FRUS H-Files form");
  }
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 304) errors.push("IF Transition review-file page total is not 304");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 2) errors.push("IF Transition candidate direct-review count is not 2");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 2) errors.push("IF Transition candidate boundary count is not 2");
  if (candidateRecords.filter((record) => record.selection === "Core").reduce((total, record) => total + record.pageCount, 0) !== 81) errors.push("IF Transition direct-review page total is not 81");
  if (candidateRecords.filter((record) => record.selection === "Boundary").reduce((total, record) => total + record.pageCount, 0) !== 223) errors.push("IF Transition boundary-review page total is not 223");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("IF Transition candidates are not stored in chronological order");
  if ([...candidateNaids].sort().join(",") !== "470760855,470760857,470760859,470760866") errors.push("IF Transition candidate NAID set changed");
  const monthCandidates = candidateRecords.filter((record) => ["470760857", "470760859"].includes(record.naid));
  if (monthCandidates.length !== 2 || monthCandidates.some((record) => record.datePrecision !== "month" || record.displayDateLabel !== "November 1988" || record.dateline !== "November 1988")) {
    errors.push("IF Transition month-level candidate dates changed");
  }
  if (candidateNaids.has("470760865") || candidateNaids.has("470760868")) errors.push("Duplicate retained-files copies were promoted as separate IF Transition candidates");
}

const nsd = data.nscCollections?.find((collection) => collection.id === "nsd");
if (!nsd) {
  errors.push("National Security Directive collection is missing");
} else {
  if (nsd.fileUnits.length !== 108 || nsd.fileUnitCount !== 108) errors.push("NSD file-unit count is not 108");
  if (nsd.onlinePdfCount !== 106 || nsd.catalogOnlyCount !== 2) errors.push("NSD online/catalog-only totals changed");
  if (nsd.totalPdfPages !== 5243) errors.push("NSD served-PDF page total is not 5,243");
  if (nsd.markerVerified !== 106 || nsd.markerCorrectedCount !== 13 || nsd.markerMismatchCount !== 9 || nsd.markerExceptionCount !== 2) {
    errors.push("NSD provenance-marker totals changed");
  }
  if (nsd.candidateCount !== 33 || nsd.candidateIds.length !== 33) errors.push("NSD review-candidate count is not 33");
  if (nsd.auditedFolders.length !== 33) errors.push("NSD screened-folder count is not 33");
  if (nsd.fileUnits.some((row) => !Number.isInteger(row.economicSignals?.total))) errors.push("NSD ledger lacks economic OCR signals");
  if (new Set(nsd.fileUnits.map((row) => row.naid)).size !== nsd.fileUnits.length) errors.push("Duplicate NSD NAID");
  if (new Set(nsd.fileUnits.map((row) => row.localId)).size !== nsd.fileUnits.length) errors.push("Duplicate NSD OA/ID");
  if (nsd.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || (row.hasOnlinePdf && !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/")) || (!row.hasOnlinePdf && row.pdfUrl))) {
    errors.push("NSD ledger contains a nonofficial or inconsistent link");
  }
  if (nsd.fileUnits.some((row) => !Number.isInteger(row.pdfPages) || row.pdfPages < 0 || row.hasOnlinePdf !== (row.pdfPages > 0))) {
    errors.push("NSD served-PDF page ledger is incomplete or inconsistent");
  }
  if (nsd.fileUnits.reduce((total, row) => total + row.pdfPages, 0) !== 5243) errors.push("NSD file-unit page counts do not total 5,243");
  const markerStatuses = nsd.fileUnits.reduce((counts, row) => {
    counts[row.markerStatus] = (counts[row.markerStatus] || 0) + 1;
    return counts;
  }, {});
  if (markerStatuses.verified !== 84 || markerStatuses["verified with handwritten correction"] !== 13 || markerStatuses["verified with catalog ID mismatch"] !== 9 || markerStatuses["not online"] !== 2) {
    errors.push("NSD marker-state distribution changed");
  }
  const correctedMarkerNaids = nsd.fileUnits
    .filter((row) => row.markerStatus === "verified with handwritten correction")
    .map((row) => row.naid)
    .sort();
  if (correctedMarkerNaids.join(",") !== "446396821,446396822,446396825,446396826,446396827,446396829,446396833,446396835,446396836,446396838,446396839,446396840,446396882") {
    errors.push("NSD handwritten Folder ID correction set changed");
  }
  const mismatchNaids = nsd.fileUnits
    .filter((row) => row.markerStatus === "verified with catalog ID mismatch")
    .map((row) => row.naid)
    .sort();
  if (mismatchNaids.join(",") !== "446396830,446396834,446396837,446396841,446396842,446396843,446396852,446396853,446396854") {
    errors.push("NSD marker-to-Catalog mismatch set changed");
  }
  const catalogOnlyNaids = nsd.fileUnits.filter((row) => !row.hasOnlinePdf).map((row) => row.naid).sort();
  if (catalogOnlyNaids.join(",") !== "446396828,446396850") errors.push("NSD no-online-PDF set changed");
  const sortedUnits = [...nsd.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== nsd.fileUnits[index].naid)) errors.push("NSD file units are not stored in chronological order");
  if (nsd.fileUnits.some((row) => row.workingStartDate === "9999-12-31" || row.dateBasis === "Date not established")) errors.push("NSD ledger contains an undated working row");
  if (nsd.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 11) errors.push("NSD direct-review routing count is not 11");
  if (nsd.fileUnits.filter((row) => row.routing === "Boundary review").length !== 22) errors.push("NSD boundary-review routing count is not 22");
  if (nsd.candidateIds.some((id) => !ids.has(id))) errors.push("NSD candidate ID is missing from the master chronology");
  const candidateRecords = nsd.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(nsd.fileUnits.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("NSD routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote)) errors.push("NSD file-unit lead incorrectly asserts a document-level Source Note");
  if (candidateRecords.some((record) => record.collectionId !== "nsd")) errors.push("NSD candidate lacks its collection ID");
  if (candidateRecords.some((record) => !record.archivalLocator.startsWith("George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSD Files, OA/ID ") || !/NSD–\d/.test(record.archivalLocator) || /NSD-\d/.test(record.archivalLocator))) {
    errors.push("NSD archival locator does not follow the published FRUS H-Files form");
  }
  const catalogOnlyCandidates = candidateRecords.filter((record) => !record.pdfUrl);
  if (catalogOnlyCandidates.length !== 1 || catalogOnlyCandidates[0].naid !== "446396850" || catalogOnlyCandidates[0].pageCount !== 0 || catalogOnlyCandidates[0].releaseStatus !== "Catalog file unit; no online PDF") {
    errors.push("NSD Catalog-only review lead changed or asserts an unsupported extent");
  }
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 1946) errors.push("NSD review-file page total is not 1,946");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 11) errors.push("NSD candidate direct-review count is not 11");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 22) errors.push("NSD candidate boundary count is not 22");
  if (candidateRecords.filter((record) => record.selection === "Core").reduce((total, record) => total + record.pageCount, 0) !== 551) errors.push("NSD direct-review page total is not 551");
  if (candidateRecords.filter((record) => record.selection === "Boundary").reduce((total, record) => total + record.pageCount, 0) !== 1395) errors.push("NSD boundary-review page total is not 1,395");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("NSD candidates are not stored in chronological order");
}

const nsr = data.nscCollections?.find((collection) => collection.id === "nsr");
if (!nsr) {
  errors.push("National Security Review collection is missing");
} else {
  if (nsr.fileUnits.length !== 65 || nsr.fileUnitCount !== 65) errors.push("NSR file-unit count is not 65");
  if (nsr.onlinePdfCount !== 65 || nsr.catalogOnlyCount !== 0) errors.push("NSR online/catalog-only totals changed");
  if (nsr.totalPdfPages !== 3024) errors.push("NSR served-PDF page total is not 3,024");
  if (nsr.markerVerified !== 65 || nsr.markerCorrectedCount !== 1 || nsr.markerMismatchCount !== 2 || nsr.markerExceptionCount !== 0) {
    errors.push("NSR provenance-marker totals changed");
  }
  if (nsr.candidateCount !== 21 || nsr.candidateIds.length !== 21) errors.push("NSR review-candidate count is not 21");
  if (nsr.auditedFolders.length !== 21) errors.push("NSR screened-folder count is not 21");
  if (nsr.fileUnits.some((row) => !row.markerStatus.startsWith("verified"))) errors.push("NSR ledger contains an unverified opening marker");
  if (nsr.fileUnits.some((row) => !Number.isInteger(row.economicSignals?.total))) errors.push("NSR ledger lacks economic OCR signals");
  if (new Set(nsr.fileUnits.map((row) => row.naid)).size !== nsr.fileUnits.length) errors.push("Duplicate NSR NAID");
  if (new Set(nsr.fileUnits.map((row) => row.localId)).size !== nsr.fileUnits.length) errors.push("Duplicate NSR OA/ID");
  if (nsr.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("NSR ledger contains a nonofficial link");
  }
  const markerStatuses = nsr.fileUnits.reduce((counts, row) => {
    counts[row.markerStatus] = (counts[row.markerStatus] || 0) + 1;
    return counts;
  }, {});
  if (markerStatuses.verified !== 62 || markerStatuses["verified with handwritten correction"] !== 1 || markerStatuses["verified with catalog ID mismatch"] !== 2) {
    errors.push("NSR marker-state distribution changed");
  }
  const correctedMarker = nsr.fileUnits.filter((row) => row.markerStatus === "verified with handwritten correction");
  if (correctedMarker.map((row) => row.naid).join(",") !== "446394935") errors.push("NSR handwritten Folder ID correction changed");
  const markerMismatches = nsr.fileUnits.filter((row) => row.markerStatus === "verified with catalog ID mismatch");
  if (markerMismatches.map((row) => row.naid).join(",") !== "446394932,446394934") errors.push("NSR marker-to-Catalog mismatch set changed");
  const sortedUnits = [...nsr.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== nsr.fileUnits[index].naid)) errors.push("NSR file units are not stored in chronological order");
  if (nsr.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 10) errors.push("NSR direct-review routing count is not 10");
  if (nsr.fileUnits.filter((row) => row.routing === "Boundary review").length !== 11) errors.push("NSR boundary-review routing count is not 11");
  if (nsr.candidateIds.some((id) => !ids.has(id))) errors.push("NSR candidate ID is missing from the master chronology");
  const candidateRecords = nsr.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(nsr.fileUnits.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("NSR routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote)) errors.push("NSR file-unit lead incorrectly asserts a document-level Source Note");
  if (candidateRecords.some((record) => record.collectionId !== "nsr")) errors.push("NSR candidate lacks its collection ID");
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 1114) errors.push("NSR review-file page total is not 1,114");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 10) errors.push("NSR candidate direct-review count is not 10");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 11) errors.push("NSR candidate boundary count is not 11");
  if (candidateRecords.filter((record) => record.selection === "Core").reduce((total, record) => total + record.pageCount, 0) !== 487) errors.push("NSR direct-review page total is not 487");
  if (candidateRecords.filter((record) => record.selection === "Boundary").reduce((total, record) => total + record.pageCount, 0) !== 627) errors.push("NSR boundary-review page total is not 627");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("NSR candidates are not stored in chronological order");
}

const nscDcFollowUp = data.nscCollections?.find((collection) => collection.id === "nsc-dc-follow-up");
if (!nscDcFollowUp) {
  errors.push("NSC/DC Meetings Follow-Up collection is missing");
} else {
  if (nscDcFollowUp.fileUnits.length !== 112 || nscDcFollowUp.fileUnitCount !== 112) errors.push("NSC/DC follow-up file-unit count is not 112");
  if (nscDcFollowUp.onlinePdfCount !== 112 || nscDcFollowUp.catalogOnlyCount !== 0) errors.push("NSC/DC follow-up online/catalog-only totals changed");
  if (nscDcFollowUp.totalPdfPages !== 1887) errors.push("NSC/DC follow-up served-PDF page total is not 1,887");
  if (nscDcFollowUp.markerVerified !== 112 || nscDcFollowUp.markerCorrectedCount !== 0 || nscDcFollowUp.markerExceptionCount !== 0) {
    errors.push("NSC/DC follow-up provenance-marker totals changed");
  }
  if (nscDcFollowUp.candidateCount !== 29 || nscDcFollowUp.candidateIds.length !== 29) errors.push("NSC/DC follow-up review-candidate count is not 29");
  if (nscDcFollowUp.auditedFolders.length !== 29) errors.push("NSC/DC follow-up screened-folder count is not 29");
  if (nscDcFollowUp.fileUnits.some((row) => row.markerStatus !== "verified")) errors.push("NSC/DC follow-up ledger contains an opening-marker exception");
  if (nscDcFollowUp.fileUnits.some((row) => !Number.isInteger(row.economicSignals?.total))) errors.push("NSC/DC follow-up ledger lacks economic OCR signals");
  if (new Set(nscDcFollowUp.fileUnits.map((row) => row.naid)).size !== nscDcFollowUp.fileUnits.length) errors.push("Duplicate NSC/DC follow-up NAID");
  if (new Set(nscDcFollowUp.fileUnits.map((row) => row.localId)).size !== nscDcFollowUp.fileUnits.length) errors.push("Duplicate NSC/DC follow-up OA/ID");
  if (nscDcFollowUp.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("NSC/DC follow-up ledger contains a nonofficial link");
  }
  const sortedUnits = [...nscDcFollowUp.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== nscDcFollowUp.fileUnits[index].naid)) errors.push("NSC/DC follow-up file units are not stored in chronological order");
  if (nscDcFollowUp.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 8) errors.push("NSC/DC follow-up direct-review routing count is not 8");
  if (nscDcFollowUp.fileUnits.filter((row) => row.routing === "Boundary review").length !== 21) errors.push("NSC/DC follow-up boundary-review routing count is not 21");
  const expectedDateCorrections = new Map([
    ["470761484", "1991-09-27"],
    ["470761498", "1992-03-17"],
    ["470761506", "1992-04-15"],
    ["470761526", "1992-06-17"],
    ["470761533", "1992-07-16"],
    ["470761562", "1992-12-23"],
    ["470761566", "1993-01-05"],
  ]);
  for (const [naid, expectedDate] of expectedDateCorrections) {
    if (nscDcFollowUp.fileUnits.find((row) => row.naid === naid)?.workingStartDate !== expectedDate) {
      errors.push(`NSC/DC follow-up ${naid} no longer preserves its source-documented date`);
    }
  }
  const undatedNaids = nscDcFollowUp.fileUnits.filter((row) => row.dateBasis === "Date not established").map((row) => row.naid);
  if (undatedNaids.join(",") !== "470761571,470761572,470761573,470761574,470761575,470761576") errors.push("NSC/DC follow-up undated set changed");
  if (nscDcFollowUp.candidateIds.some((id) => !ids.has(id))) errors.push("NSC/DC follow-up candidate ID is missing from the master chronology");
  const candidateRecords = nscDcFollowUp.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(nscDcFollowUp.fileUnits.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("NSC/DC follow-up routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote)) errors.push("NSC/DC follow-up file-unit lead incorrectly asserts a document-level Source Note");
  if (candidateRecords.some((record) => record.collectionId !== "nsc-dc-follow-up")) errors.push("NSC/DC follow-up candidate lacks its collection ID");
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 628) errors.push("NSC/DC follow-up review-file page total is not 628");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 8) errors.push("NSC/DC follow-up candidate direct-review count is not 8");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 21) errors.push("NSC/DC follow-up candidate boundary count is not 21");
  if (candidateRecords.filter((record) => record.selection === "Core").reduce((total, record) => total + record.pageCount, 0) !== 223) errors.push("NSC/DC follow-up direct-review page total is not 223");
  if (candidateRecords.filter((record) => record.selection === "Boundary").reduce((total, record) => total + record.pageCount, 0) !== 405) errors.push("NSC/DC follow-up boundary-review page total is not 405");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("NSC/DC follow-up candidates are not stored in chronological order");
}

const nscDcMeetings = data.nscCollections?.find((collection) => collection.id === "nsc-dc-meetings");
if (!nscDcMeetings) {
  errors.push("NSC/DC Meetings collection is missing");
} else {
  if (nscDcMeetings.fileUnits.length !== 492 || nscDcMeetings.fileUnitCount !== 492) errors.push("NSC/DC Meetings file-unit count is not 492");
  if (nscDcMeetings.onlinePdfCount !== 479 || nscDcMeetings.catalogOnlyCount !== 13) errors.push("NSC/DC Meetings online/catalog-only totals changed");
  if (nscDcMeetings.markerVerified !== 479 || nscDcMeetings.markerCorrectedCount !== 2 || nscDcMeetings.markerExceptionCount !== 13) {
    errors.push("NSC/DC Meetings provenance-marker totals changed");
  }
  if (nscDcMeetings.candidateCount !== 79 || nscDcMeetings.candidateIds.length !== 79) errors.push("NSC/DC Meetings review-candidate count is not 79");
  if (nscDcMeetings.auditedFolders.length !== 79) errors.push("NSC/DC Meetings screened-folder count is not 79");
  if (nscDcMeetings.fileUnits.some((row) => !Number.isInteger(row.economicSignals?.total))) errors.push("NSC/DC Meetings ledger lacks economic OCR signals");
  if (new Set(nscDcMeetings.fileUnits.map((row) => row.naid)).size !== nscDcMeetings.fileUnits.length) errors.push("Duplicate NSC/DC Meetings NAID");
  if (new Set(nscDcMeetings.fileUnits.map((row) => row.localId)).size !== nscDcMeetings.fileUnits.length) errors.push("Duplicate NSC/DC Meetings OA/ID");
  if (nscDcMeetings.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/"))) {
    errors.push("NSC/DC Meetings ledger contains a nonofficial Catalog link");
  }
  if (nscDcMeetings.fileUnits.some((row) => row.hasOnlinePdf !== Boolean(row.pdfUrl) || (row.pdfUrl && !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/")))) {
    errors.push("NSC/DC Meetings ledger contains inconsistent or nonofficial PDF metadata");
  }
  const markerStatuses = nscDcMeetings.fileUnits.reduce((counts, row) => {
    counts[row.markerStatus] = (counts[row.markerStatus] || 0) + 1;
    return counts;
  }, {});
  if (markerStatuses.verified !== 477 || markerStatuses["verified with handwritten correction"] !== 2 || markerStatuses["not online"] !== 13) {
    errors.push("NSC/DC Meetings marker-state distribution changed");
  }
  const correctedMarkers = nscDcMeetings.fileUnits.filter((row) => row.markerStatus === "verified with handwritten correction");
  if (correctedMarkers.map((row) => row.naid).join(",") !== "470761226,470761228") errors.push("NSC/DC handwritten Folder ID corrections changed");
  const sortedUnits = [...nscDcMeetings.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== nscDcMeetings.fileUnits[index].naid)) errors.push("NSC/DC Meetings file units are not stored in chronological order");
  if (nscDcMeetings.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 47) errors.push("NSC/DC Meetings direct-review routing count is not 47");
  if (nscDcMeetings.fileUnits.filter((row) => row.routing === "Boundary review").length !== 32) errors.push("NSC/DC Meetings boundary-review routing count is not 32");
  const titleDateFallbacks = nscDcMeetings.fileUnits.filter((row) => row.dateBasis === "Folder title date").map((row) => row.naid).sort();
  if (titleDateFallbacks.join(",") !== ["352220592", "352356448", "352356450"].join(",")) errors.push("NSC/DC title-date fallback set changed");
  const machineToolVra = nscDcMeetings.fileUnits.find((row) => row.naid === "470761367");
  if (machineToolVra?.workingStartDate !== "1992-03-26") errors.push("NSC/DC 343 chronology no longer preserves the March 26 source date");
  if (nscDcMeetings.candidateIds.some((id) => !ids.has(id))) errors.push("NSC/DC Meetings candidate ID is missing from the master chronology");
  const candidateRecords = nscDcMeetings.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(nscDcMeetings.fileUnits.filter((row) => row.routing !== "Series context").map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("NSC/DC Meetings routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote)) errors.push("NSC/DC Meetings file-unit lead incorrectly asserts a document-level Source Note");
  if (candidateRecords.some((record) => record.collectionId !== "nsc-dc-meetings")) errors.push("NSC/DC Meetings candidate lacks its collection ID");
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 5995) errors.push("NSC/DC Meetings review-file page total is not 5,995");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 47) errors.push("NSC/DC Meetings candidate direct-review count is not 47");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 32) errors.push("NSC/DC Meetings candidate boundary count is not 32");
  if (candidateRecords.filter((record) => record.selection === "Core").reduce((total, record) => total + record.pageCount, 0) !== 3070) errors.push("NSC/DC Meetings direct-review page total is not 3,070");
  if (candidateRecords.filter((record) => record.selection === "Boundary").reduce((total, record) => total + record.pageCount, 0) !== 2925) errors.push("NSC/DC Meetings boundary-review page total is not 2,925");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("NSC/DC Meetings candidates are not stored in chronological order");
}

const scowcroft = data.nscCollections?.find((collection) => collection.id === "scowcroft");
if (!scowcroft) {
  errors.push("Brent Scowcroft Papers collection is missing");
} else {
  if (data.nscCollections[1]?.id !== "scowcroft") errors.push("Scowcroft Papers is not the second collection tab");
  if (scowcroft.naid !== "4522156" || scowcroft.fileUnits.length !== 676 || scowcroft.fileUnitCount !== 676) {
    errors.push("Scowcroft collection identity or file-unit count changed");
  }
  if (scowcroft.seriesCount !== 20 || scowcroft.seriesSummary?.length !== 20) errors.push("Scowcroft series count is not 20");
  if (scowcroft.seriesSummary?.reduce((total, series) => total + series.fileUnitCount, 0) !== 676) errors.push("Scowcroft series totals do not reconcile to 676 file units");
  if (new Set(scowcroft.seriesSummary?.map((series) => series.naid)).size !== 20) errors.push("Duplicate Scowcroft series NAID");
  if (scowcroft.onlinePdfCount !== 676 || scowcroft.catalogOnlyCount !== 0 || scowcroft.fileUnits.some((row) => !row.hasOnlinePdf)) {
    errors.push("Scowcroft online/catalog-only totals changed");
  }
  if (scowcroft.markerVerified !== 676 || scowcroft.markerExceptionCount !== 0 || scowcroft.markerRecordGroupExceptionCount !== 1 || scowcroft.markerOcrNormalizationCount !== 1) {
    errors.push("Scowcroft provenance-marker totals changed");
  }
  const markerStatuses = scowcroft.fileUnits.reduce((counts, row) => {
    counts[row.markerStatus] = (counts[row.markerStatus] || 0) + 1;
    return counts;
  }, {});
  if (markerStatuses.verified !== 674 || markerStatuses["verified with record-group exception"] !== 1 || markerStatuses["verified with OCR normalization"] !== 1) {
    errors.push("Scowcroft marker-state distribution changed");
  }
  const recordGroupException = scowcroft.fileUnits.filter((row) => row.markerStatus === "verified with record-group exception");
  if (recordGroupException.length !== 1 || recordGroupException[0].naid !== "366551745" || recordGroupException[0].markerRecordGroup !== "Donated Historical Materials") {
    errors.push("Scowcroft donated-materials marker exception changed");
  }
  const ocrNormalization = scowcroft.fileUnits.filter((row) => row.markerStatus === "verified with OCR normalization");
  if (ocrNormalization.length !== 1 || ocrNormalization[0].naid !== "366551751" || !/Colfapse/.test(ocrNormalization[0].markerSeries)) {
    errors.push("Scowcroft opening-marker OCR normalization changed");
  }
  if (new Set(scowcroft.fileUnits.map((row) => row.naid)).size !== 676) errors.push("Duplicate Scowcroft file-unit NAID");
  if (new Set(scowcroft.fileUnits.map((row) => row.localId)).size !== 676) errors.push("Duplicate Scowcroft OA/ID");
  if (scowcroft.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("Scowcroft ledger contains a nonofficial link");
  }
  if (scowcroft.fileUnits.some((row) => !Number.isInteger(row.ocrCharacterCount) || !Number.isInteger(row.economicSignals?.total))) {
    errors.push("Scowcroft ledger lacks complete OCR signal accounting");
  }
  if (scowcroft.totalOcrCharacters !== 67504920 || scowcroft.fileUnits.reduce((total, row) => total + row.ocrCharacterCount, 0) !== 67504920) {
    errors.push("Scowcroft OCR character total changed");
  }
  const measuredPdfRows = scowcroft.fileUnits.filter((row) => Number.isFinite(row.pdfBytes) && row.pdfBytes > 0);
  const unmeasuredPdfRows = scowcroft.fileUnits.filter((row) => !Number.isFinite(row.pdfBytes) || row.pdfBytes <= 0);
  if (scowcroft.pdfSizeMeasuredCount !== 660 || scowcroft.pdfSizeUnknownCount !== 16 || measuredPdfRows.length !== 660 || unmeasuredPdfRows.length !== 16) {
    errors.push("Scowcroft served-PDF size coverage changed");
  }
  if (scowcroft.totalPdfBytes !== 15709430360 || measuredPdfRows.reduce((total, row) => total + row.pdfBytes, 0) !== 15709430360) {
    errors.push("Scowcroft measured served-PDF byte total changed");
  }
  const sortedUnits = [...scowcroft.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== scowcroft.fileUnits[index].naid)) errors.push("Scowcroft file units are not stored in working chronological order");
  if (scowcroft.fileUnits.filter((row) => row.workingStartDate === "9999-12-31").length !== 47) errors.push("Scowcroft undated working-row count changed");
  if (scowcroft.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 66) errors.push("Scowcroft direct-review routing count is not 66");
  if (scowcroft.fileUnits.filter((row) => row.routing === "Boundary review").length !== 29) errors.push("Scowcroft boundary-review routing count is not 29");
  if (scowcroft.fileUnits.filter((row) => row.routing === "Parallel-copy context").length !== 43) errors.push("Scowcroft parallel-copy context count is not 43");
  if (scowcroft.candidateCount !== 95 || scowcroft.candidateIds.length !== 95 || scowcroft.auditedFolders.length !== 95) {
    errors.push("Scowcroft review-candidate count is not 95");
  }
  if (scowcroft.candidateIds.some((id) => !ids.has(id))) errors.push("Scowcroft candidate ID is missing from the master chronology");
  const candidateRecords = scowcroft.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  const routedNaids = new Set(scowcroft.fileUnits.filter((row) => ["Volume XXX review", "Boundary review"].includes(row.routing)).map((row) => row.naid));
  const candidateNaids = new Set(candidateRecords.map((record) => record.naid));
  if (routedNaids.size !== candidateNaids.size || [...routedNaids].some((naid) => !candidateNaids.has(naid))) errors.push("Scowcroft routed file units and chronology candidates do not match");
  if (candidateRecords.some((record) => record.sourceNoteStatus !== "locator" || record.sourceNote || record.pageCount !== null)) {
    errors.push("Scowcroft file-unit lead asserts unsupported document-level Source Note or page extent");
  }
  if (candidateRecords.some((record) => record.collectionId !== "scowcroft")) errors.push("Scowcroft candidate lacks its collection ID");
  if (candidateRecords.some((record) => !record.archivalLocator.startsWith("George H.W. Bush Library, ") || !record.archivalLocator.includes("Brent Scowcroft Collection,") || !/OA\/ID \d+–\d{3},/.test(record.archivalLocator))) {
    errors.push("Scowcroft archival locator does not follow the published FRUS collection form");
  }
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 66) errors.push("Scowcroft candidate direct-review count is not 66");
  if (candidateRecords.filter((record) => record.selection === "Boundary").length !== 29) errors.push("Scowcroft candidate boundary count is not 29");
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("Scowcroft candidates are not stored in chronological order");
  const correctedLatinAmerica = scowcroft.fileUnits.find((row) => row.naid === "366551922");
  if (correctedLatinAmerica?.workingStartDate !== "1990-12-17" || correctedLatinAmerica?.workingEndDate !== "1991-02-08" || !/withdrawal inventory/i.test(correctedLatinAmerica?.dateBasis || "")) {
    errors.push("Scowcroft Latin America chronology no longer preserves the opening-inventory correction");
  }
}

const report = {
  checkedAt: new Date().toISOString(),
  records: data.records.length,
  verifiedSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "verified").length,
  draftSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "draft").length,
  locators: data.records.filter((record) => record.sourceNoteStatus === "locator").length,
  withheldItems: data.records.filter((record) => record.releaseStatus === "Withheld").length,
  nscCollections: data.nscCollections?.length || 0,
  scowcroftFileUnits: scowcroft?.fileUnits.length || 0,
  ifTransitionFileUnits: ifTransition?.fileUnits.length || 0,
  nsdFileUnits: nsd?.fileUnits.length || 0,
  nsrFileUnits: nsr?.fileUnits.length || 0,
  nscDcFollowUpFileUnits: nscDcFollowUp?.fileUnits.length || 0,
  nscDcMeetingFileUnits: nscDcMeetings?.fileUnits.length || 0,
  nscMeetingFileUnits: nscMeetings?.fileUnits.length || 0,
  timDealFileUnits: timDeal?.fileUnits.length || 0,
  errors,
  warnings,
};

fs.mkdirSync(path.join(root, "reports"), { recursive: true });
fs.writeFileSync(path.join(root, "reports/data-validation.json"), `${JSON.stringify(report, null, 2)}\n`);

if (errors.length) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}

console.log(`Validated ${report.records} records: ${report.verifiedSourceNotes} verified Source Notes, ${report.draftSourceNotes} drafts, ${report.locators} locators, ${report.withheldItems} withheld items.`);
if (warnings.length) console.warn(`Warnings: ${warnings.join("; ")}`);
