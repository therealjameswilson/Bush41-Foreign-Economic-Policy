#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const data = JSON.parse(fs.readFileSync(path.join(root, "data/volume.json"), "utf8"));
const errors = [];
const warnings = [];

if (!Array.isArray(data.subjectAreas) || data.subjectAreas.length !== 5) errors.push("Subject-area metadata is missing");
if (Object.hasOwn(data, "chapters")) errors.push("Topical chapter structure must not appear in the volume data");
if (!/one continuous chronology/i.test(data.meta.scopeNote || "")) errors.push("Single-chronology arrangement note is missing");

const subjectAreaNames = new Set(data.subjectAreas.map((area) => area.name));
const ids = new Set();

for (const record of data.records) {
  if (ids.has(record.id)) errors.push(`Duplicate record id: ${record.id}`);
  ids.add(record.id);

  if (Object.hasOwn(record, "chapter")) errors.push(`${record.id}: structural chapter field leaked into the chronology`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.date)) errors.push(`${record.id}: invalid date ${record.date}`);
  if (!subjectAreaNames.has(record.subjectArea)) errors.push(`${record.id}: unknown subject area ${record.subjectArea}`);
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
    if (!/(?:Top Secret|Secret|Confidential|Unclassified|No classification marking)(?:; (?:Exdis|Nodis|Limited Access|Noforn))?\.$|the attachment is Confidential\.$/i.test(record.sourceNote)) {
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

const dealSummit = data.nscCollections?.find((collection) => collection.id === "deal-summit");
if (!dealSummit) {
  errors.push("Timothy E. Deal Summit Briefing Books collection is missing");
} else {
  if (data.nscCollections[7]?.id !== "deal-summit" || data.nscCollections[8]?.id !== "deal-reiss" || data.nscCollections[9]?.id !== "deal-chron" || data.nscCollections[10]?.id !== "tim-deal") {
    errors.push("Deal collection tabs are not in the expected order before the Deal Subject Files tab");
  }
  if (dealSummit.naid !== "2554817" || dealSummit.fileUnits.length !== 17 || dealSummit.fileUnitCount !== 17) {
    errors.push("Deal Summit collection identity or file-unit count changed");
  }
  if (dealSummit.onlinePdfCount !== 17 || dealSummit.catalogOnlyCount !== 0 || dealSummit.fileUnits.some((row) => !row.hasOnlinePdf)) {
    errors.push("Deal Summit online/catalog-only totals changed");
  }
  if (dealSummit.totalPdfPages !== 1248 || dealSummit.fileUnits.reduce((total, row) => total + row.pdfPages, 0) !== 1248) {
    errors.push("Deal Summit served-PDF page total is not 1,248");
  }
  if (dealSummit.markerVerified !== 17 || dealSummit.markerExceptionCount !== 0 || dealSummit.fileUnits.some((row) => row.markerStatus !== "verified")) {
    errors.push("Deal Summit opening-marker totals changed");
  }
  if (dealSummit.openingMarkerSubseriesSummary?.find((row) => row.name === "Summit Briefing Books")?.fileUnitCount !== 6 || dealSummit.openingMarkerSubseriesSummary?.find((row) => row.name === "Summit Briefing Books Files")?.fileUnitCount !== 11) {
    errors.push("Deal Summit opening-marker subseries wording no longer reconciles to 6 and 11 file units");
  }
  if (dealSummit.withdrawalMetadataMismatchCount !== 10) errors.push("Deal Summit withdrawal-metadata discrepancy count is not 10");
  const mismatchNaids = dealSummit.fileUnits.filter((row) => row.withdrawalMetadataNote).map((row) => row.naid).sort();
  if (mismatchNaids.join(",") !== "452050644,452050645,452050646,452050647,452050648,452050649,452050650,452050651,452050652,452050653") {
    errors.push("Deal Summit withdrawal-metadata discrepancy set changed");
  }
  if (new Set(dealSummit.fileUnits.map((row) => row.naid)).size !== 17) errors.push("Duplicate Deal Summit file-unit NAID");
  if (new Set(dealSummit.fileUnits.map((row) => row.localId)).size !== 17) errors.push("Duplicate Deal Summit OA/ID");
  if (dealSummit.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("Deal Summit ledger contains a nonofficial link");
  }
  if (dealSummit.fileUnits.some((row) => !Number.isInteger(row.pdfPages) || row.pdfPages <= 0 || !Number.isInteger(row.ocrCharacterCount) || !Number.isInteger(row.economicSignals?.total))) {
    errors.push("Deal Summit page or OCR signal accounting is incomplete");
  }
  if (dealSummit.fileUnits.some((row) => row.markerSeries !== "Deal, Timothy E., Files" || !["Summit Briefing Books", "Summit Briefing Books Files"].includes(row.markerSubseries))) {
    errors.push("Deal Summit ledger does not preserve opening-sheet series and subseries wording");
  }
  if (dealSummit.fileUnits.some((row) => row.routing !== "Volume XXX review" || !row.reviewTopics?.length || !row.reviewFocus || !row.reviewKeyExtent)) {
    errors.push("Deal Summit file unit lacks direct routing or compiler annotation");
  }
  const sortedUnits = [...dealSummit.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== dealSummit.fileUnits[index].naid)) errors.push("Deal Summit file units are not stored in chronological order");
  const fourthSherpa = dealSummit.fileUnits.find((row) => row.naid === "452050647");
  if (fourthSherpa?.workingStartDate !== "1991-07-05" || fourthSherpa?.workingEndDate !== "1991-07-07" || fourthSherpa?.dateBasis !== "Briefing-book cover event dates") {
    errors.push("Deal Summit fourth-Sherpa chronology no longer follows the dated cover");
  }
  const withheldItems = dealSummit.fileUnits.reduce((total, row) => total + row.withheldItemCount, 0);
  const withheldPages = dealSummit.fileUnits.reduce((total, row) => total + row.withheldPages, 0);
  if (dealSummit.totalWithheldItems !== 104 || withheldItems !== 104 || dealSummit.totalWithheldPages !== 324 || withheldPages !== 324) {
    errors.push("Deal Summit withdrawal inventory does not reconcile to 104 items and 324 pages");
  }
  if (dealSummit.candidateCount !== 17 || dealSummit.candidateIds.length !== 17 || dealSummit.auditedFolders.length !== 17) {
    errors.push("Deal Summit candidate or audited-folder count is not 17");
  }
  if (dealSummit.candidateIds.some((id) => !ids.has(id))) errors.push("Deal Summit candidate ID is missing from the master chronology");
  const candidateRecords = dealSummit.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  if (candidateRecords.some((record) => record.collectionId !== "deal-summit" || record.sourceNoteStatus !== "locator" || record.sourceNote)) {
    errors.push("Deal Summit file-level lead incorrectly asserts a document Source Note or lacks its collection ID");
  }
  if (candidateRecords.some((record) => {
    const fileUnit = dealSummit.fileUnits.find((row) => row.naid === record.naid);
    return !record.archivalLocator.startsWith(`George H.W. Bush Library, Bush Presidential Records, National Security Council, Timothy E. Deal Files, ${fileUnit?.markerSubseries}, OA/ID CF00960–`) || /CF00960-\d{3}/.test(record.archivalLocator);
  })) {
    errors.push("Deal Summit archival locator does not follow the provenance-sheet form");
  }
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 1248) errors.push("Deal Summit candidate page total is not 1,248");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 13) errors.push("Deal Summit Core count is not 13");
  if (candidateRecords.filter((record) => record.selection === "Consider").length !== 4) errors.push("Deal Summit Consider count is not 4");
  if (candidateRecords.some((record) => !["Core", "Consider"].includes(record.selection))) errors.push("Deal Summit contains an unexpected selection label");
  if (candidateRecords.reduce((total, record) => total + (record.withdrawalItems?.length || 0), 0) !== 104 || candidateRecords.reduce((total, record) => total + (record.withheldPages || 0), 0) !== 324) {
    errors.push("Deal Summit candidate withdrawal ledgers do not reconcile to the file ledger");
  }
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.localId.localeCompare(b.localId));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("Deal Summit candidates are not stored in chronological order");
}

const dealReiss = data.nscCollections?.find((collection) => collection.id === "deal-reiss");
if (!dealReiss) {
  errors.push("Timothy E. Deal and Mitchell B. Reiss Economic Summit collection is missing");
} else {
  if (data.nscCollections[8]?.id !== "deal-reiss" || data.nscCollections[9]?.id !== "deal-chron" || data.nscCollections[10]?.id !== "tim-deal") {
    errors.push("Deal-Reiss and Deal Chronological collections are not placed before the Deal Subject Files tab");
  }
  if (dealReiss.naid !== "2554819" || dealReiss.fileUnits.length !== 25 || dealReiss.fileUnitCount !== 25) {
    errors.push("Deal-Reiss collection identity or file-unit count changed");
  }
  if (dealReiss.onlinePdfCount !== 25 || dealReiss.catalogOnlyCount !== 0 || dealReiss.fileUnits.some((row) => !row.hasOnlinePdf)) {
    errors.push("Deal-Reiss online/catalog-only totals changed");
  }
  if (dealReiss.totalPdfPages !== 1683 || dealReiss.fileUnits.reduce((total, row) => total + row.pdfPages, 0) !== 1683) {
    errors.push("Deal-Reiss served-PDF page total is not 1,683");
  }
  if (dealReiss.totalPdfBytes !== 707294190 || dealReiss.fileUnits.reduce((total, row) => total + row.pdfBytes, 0) !== 707294190 || dealReiss.totalCatalogPdfBytes !== 707294187) {
    errors.push("Deal-Reiss served or Catalog PDF byte accounting changed");
  }
  if (dealReiss.markerVerified !== 25 || dealReiss.markerMismatchCount !== 3 || dealReiss.markerExceptionCount !== 0 || dealReiss.fileUnits.some((row) => !row.markerStatus.startsWith("verified"))) {
    errors.push("Deal-Reiss opening-marker totals changed");
  }
  const markerSeriesCounts = Object.fromEntries(dealReiss.openingMarkerSeriesSummary.map((row) => [row.name, row.fileUnitCount]));
  if (markerSeriesCounts["Deal, Timothy E., Files, and Reiss, Mitchell B., Files"] !== 3 || markerSeriesCounts["Deal, Timothy E., Files and Reiss, Mitchell B., Files"] !== 2 || markerSeriesCounts["Deal, Timothy E., Files"] !== 20) {
    errors.push("Deal-Reiss opening-marker series wording no longer reconciles to 3, 2, and 20 file units");
  }
  const markerSubseriesCounts = Object.fromEntries(dealReiss.openingMarkerSubseriesSummary.map((row) => [row.name, row.fileUnitCount]));
  if (markerSubseriesCounts["Summit Briefing Books Files / Economic Summit Files"] !== 3 || markerSubseriesCounts["No subseries supplied"] !== 2 || markerSubseriesCounts["Summit Briefing Books Files"] !== 20) {
    errors.push("Deal-Reiss opening-marker subseries wording no longer reconciles to 3, 2, and 20 file units");
  }
  const markerMismatchNaids = dealReiss.fileUnits.filter((row) => row.markerChecks?.catalogMismatch).map((row) => row.naid).sort();
  if (markerMismatchNaids.join(",") !== "452050409,452050410,452050411") errors.push("Deal-Reiss marker/Catalog Folder ID mismatch set changed");
  const metadataMismatchNaids = dealReiss.fileUnits.filter((row) => row.withdrawalMetadataNote).map((row) => row.naid).sort();
  if (dealReiss.withdrawalMetadataMismatchCount !== 3 || metadataMismatchNaids.join(",") !== "452050387,452050388,452050389") {
    errors.push("Deal-Reiss later-sheet metadata discrepancy set changed");
  }
  if (new Set(dealReiss.fileUnits.map((row) => row.naid)).size !== 25) errors.push("Duplicate Deal-Reiss file-unit NAID");
  if (new Set(dealReiss.fileUnits.map((row) => row.localId)).size !== 25) errors.push("Duplicate Deal-Reiss OA/ID");
  if (dealReiss.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("Deal-Reiss ledger contains a nonofficial link");
  }
  if (dealReiss.totalOcrCharacters !== 2251301 || dealReiss.fileUnits.reduce((total, row) => total + row.ocrCharacterCount, 0) !== 2251301) {
    errors.push("Deal-Reiss OCR character accounting changed");
  }
  if (dealReiss.fileUnits.some((row) => !Number.isInteger(row.pdfPages) || row.pdfPages <= 0 || !Number.isInteger(row.economicSignals?.total))) {
    errors.push("Deal-Reiss page or OCR signal accounting is incomplete");
  }
  if (dealReiss.fileUnits.some((row) => !row.reviewTopics?.length || !row.reviewFocus || !row.reviewKeyExtent || !["Volume XXX review", "Selective review", "Boundary review"].includes(row.routing))) {
    errors.push("Deal-Reiss file unit lacks routing or compiler annotation");
  }
  if (dealReiss.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 6 || dealReiss.fileUnits.filter((row) => row.routing === "Selective review").length !== 9 || dealReiss.fileUnits.filter((row) => row.routing === "Boundary review").length !== 10) {
    errors.push("Deal-Reiss file-level routing counts changed");
  }
  const sortedUnits = [...dealReiss.fileUnits].sort((a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.workingEndDate.localeCompare(b.workingEndDate) || a.localId.localeCompare(b.localId));
  if (sortedUnits.some((row, index) => row.naid !== dealReiss.fileUnits[index].naid)) errors.push("Deal-Reiss file units are not stored in working chronological order");
  if (dealReiss.fileUnits.some((row) => !row.workingDateLabel || !row.dateBasis)) errors.push("Deal-Reiss chronology loses source-supported date precision");
  const totalSheetItems = dealReiss.fileUnits.reduce((total, row) => total + row.withdrawalSheetItemCount, 0);
  const totalSheetPages = dealReiss.fileUnits.reduce((total, row) => total + row.withdrawalSheetPages, 0);
  const releasedInPartSheets = dealReiss.fileUnits.reduce((total, row) => total + row.releasedInPartSheetCount, 0);
  const noCopyIndicatedSheets = dealReiss.fileUnits.reduce((total, row) => total + row.noCopyIndicatedSheetCount, 0);
  if (dealReiss.totalWithdrawalSheetItems !== 142 || totalSheetItems !== 142 || dealReiss.totalWithdrawalSheetPages !== 540 || totalSheetPages !== 540 || dealReiss.releasedInPartSheetCount !== 8 || releasedInPartSheets !== 8 || dealReiss.noCopyIndicatedSheetCount !== 134 || noCopyIndicatedSheets !== 134) {
    errors.push("Deal-Reiss withdrawal/redaction sheet disposition ledger does not reconcile");
  }
  if (dealReiss.candidateCount !== 25 || dealReiss.candidateIds.length !== 25 || dealReiss.auditedFolders.length !== 25) {
    errors.push("Deal-Reiss candidate or audited-folder count is not 25");
  }
  if (dealReiss.candidateIds.some((id) => !ids.has(id))) errors.push("Deal-Reiss candidate ID is missing from the master chronology");
  const candidateRecords = dealReiss.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  if (candidateRecords.some((record) => record.collectionId !== "deal-reiss" || record.sourceNoteStatus !== "locator" || record.sourceNote)) {
    errors.push("Deal-Reiss file-level lead incorrectly asserts a document Source Note or lacks its collection ID");
  }
  if (candidateRecords.some((record) => !record.archivalLocator.startsWith("George H.W. Bush Library, Bush Presidential Records, National Security Council, Timothy E. Deal") || !record.archivalLocator.includes("OA/ID CF00186–") || /CF00186-\d{3}/.test(record.archivalLocator))) {
    errors.push("Deal-Reiss archival locator does not follow the provenance-marker form");
  }
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 1683) errors.push("Deal-Reiss candidate page total is not 1,683");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 6 || candidateRecords.filter((record) => record.selection === "Consider").length !== 9 || candidateRecords.filter((record) => record.selection === "Boundary").length !== 10) {
    errors.push("Deal-Reiss Core, Consider, or Boundary candidate counts changed");
  }
  if (candidateRecords.reduce((total, record) => total + record.withdrawalSheetItemCount, 0) !== 142 || candidateRecords.reduce((total, record) => total + record.withdrawalSheetPages, 0) !== 540 || candidateRecords.reduce((total, record) => total + record.releasedInPartSheetCount, 0) !== 8 || candidateRecords.reduce((total, record) => total + record.noCopyIndicatedSheetCount, 0) !== 134) {
    errors.push("Deal-Reiss candidate sheet-disposition totals do not reconcile to the file ledger");
  }
  const withdrawalItems = candidateRecords.flatMap((record) => record.withdrawalItems || []);
  if (withdrawalItems.length !== 142 || withdrawalItems.reduce((total, item) => total + item.pages, 0) !== 540 || withdrawalItems.some((item) => !item.sheetDisposition)) {
    errors.push("Deal-Reiss candidate withdrawal/redaction descriptions are incomplete");
  }
  const partialItems = withdrawalItems.filter((item) => item.sheetDisposition === "Released in part; copy follows in this PDF");
  const canonicalItems = withdrawalItems.filter((item) => item.canonicalMatch);
  if (partialItems.length !== 8 || canonicalItems.length !== 1 || !canonicalItems[0].canonicalMatch.includes("presidential-428080101")) {
    errors.push("Deal-Reiss released-in-part or canonical-copy accounting changed");
  }
  const canonicalRecord = data.records.find((record) => record.id === "presidential-428080101");
  if (canonicalRecord?.naid !== "428080101" || canonicalRecord.sourceNoteStatus !== "verified" || data.records.filter((record) => record.naid === "428080101").length !== 1) {
    errors.push("The released Paris First Plenary memcon is missing or duplicated");
  }
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.localId.localeCompare(b.localId));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("Deal-Reiss candidates are not stored in working chronological order");
}

const dealChron = data.nscCollections?.find((collection) => collection.id === "deal-chron");
if (!dealChron) {
  errors.push("Timothy E. Deal Chronological Files collection is missing");
} else {
  if (data.nscCollections[9]?.id !== "deal-chron" || data.nscCollections[10]?.id !== "tim-deal") {
    errors.push("Deal Chronological collection is not placed immediately before the Deal Subject Files tab");
  }
  if (dealChron.naid !== "2554807" || dealChron.fileUnits.length !== 96 || dealChron.fileUnitCount !== 96) {
    errors.push("Deal Chronological collection identity or file-unit count changed");
  }
  if (dealChron.onlinePdfCount !== 96 || dealChron.catalogOnlyCount !== 0 || dealChron.fileUnits.some((row) => !row.hasOnlinePdf)) {
    errors.push("Deal Chronological online/catalog-only totals changed");
  }
  if (dealChron.totalPdfPages !== 9093 || dealChron.fileUnits.reduce((total, row) => total + row.pdfPages, 0) !== 9093) {
    errors.push("Deal Chronological served-PDF page total is not 9,093");
  }
  const servedOrFallbackBytes = dealChron.fileUnits.reduce((total, row) => total + row.pdfBytes, 0);
  const catalogBytes = dealChron.fileUnits.reduce((total, row) => total + row.catalogPdfBytes, 0);
  if (
    dealChron.totalPdfBytes !== 4149236610 ||
    dealChron.totalPdfByteBasis !== "Catalog objectFileSize" ||
    dealChron.totalCatalogPdfBytes !== 4149236610 ||
    catalogBytes !== 4149236610 ||
    servedOrFallbackBytes !== 4149236608 ||
    dealChron.totalMeasuredServedPdfBytes !== 4132695338 ||
    dealChron.servedPdfSizeAvailableCount !== 94 ||
    dealChron.pdfSizeUnavailableCount !== 2 ||
    dealChron.pdfSizeMetadataMismatchCount !== 66
  ) {
    errors.push("Deal Chronological Catalog or measured PDF byte accounting changed");
  }
  if (
    dealChron.markerVerified !== 96 ||
    dealChron.markerMismatchCount !== 0 ||
    dealChron.markerExceptionCount !== 0 ||
    dealChron.fileUnits.some((row) =>
      row.markerStatus !== "verified" ||
      row.markerSeries !== "Deal, Timothy E., Files" ||
      row.markerSubseries !== "Chronological Files" ||
      row.markerChecks?.markerFolderId !== row.localId
    )
  ) {
    errors.push("Deal Chronological opening-marker accounting changed");
  }
  if (new Set(dealChron.fileUnits.map((row) => row.naid)).size !== 96) errors.push("Duplicate Deal Chronological file-unit NAID");
  if (new Set(dealChron.fileUnits.map((row) => row.localId)).size !== 96) errors.push("Duplicate Deal Chronological OA/ID");
  if (dealChron.fileUnits.some((row) => !row.catalogUrl.startsWith("https://catalog.archives.gov/id/") || !row.pdfUrl.startsWith("https://catalog.archives.gov/medialz/"))) {
    errors.push("Deal Chronological ledger contains a nonofficial link");
  }
  if (
    dealChron.totalOcrCharacters !== 12917675 ||
    dealChron.fileUnits.reduce((total, row) => total + row.ocrCharacterCount, 0) !== 12917675 ||
    dealChron.fileUnits.some((row) => !Number.isInteger(row.pdfPages) || row.pdfPages <= 0 || !Number.isInteger(row.economicSignals?.total))
  ) {
    errors.push("Deal Chronological page or OCR accounting is incomplete");
  }
  const sortedUnits = [...dealChron.fileUnits].sort((a, b) =>
    a.workingStartDate.localeCompare(b.workingStartDate) ||
    a.workingEndDate.localeCompare(b.workingEndDate) ||
    a.localId.localeCompare(b.localId),
  );
  if (sortedUnits.some((row, index) => row.naid !== dealChron.fileUnits[index].naid)) errors.push("Deal Chronological file units are not stored in month chronology");
  if (
    dealChron.fileUnits[0]?.workingDateLabel !== "March 1989 [1]" ||
    dealChron.fileUnits.at(-1)?.workingDateLabel !== "May 1992" ||
    dealChron.fileUnits.some((row) =>
      !/^\d{4}-\d{2}-01$/.test(row.workingStartDate) ||
      !row.workingDateLabel ||
      row.dateBasis !== "Catalog folder coverage dates and title; the first-of-month value is a sorting key only"
    )
  ) {
    errors.push("Deal Chronological month-level date evidence or boundary labels changed");
  }
  if (dealChron.fileUnits.some((row) => !row.reviewTopics?.length || !row.reviewFocus || !row.reviewKeyExtent || !["Volume XXX review", "Selective review"].includes(row.routing))) {
    errors.push("Deal Chronological file unit lacks routing or compiler annotation");
  }
  if (dealChron.fileUnits.filter((row) => row.routing === "Volume XXX review").length !== 76 || dealChron.fileUnits.filter((row) => row.routing === "Selective review").length !== 20) {
    errors.push("Deal Chronological file-level routing counts changed");
  }
  const subjectAreaCounts = Object.fromEntries(data.subjectAreas.map((area) => [area.name, dealChron.fileUnits.filter((row) => row.chapter === area.name).length]));
  if (
    subjectAreaCounts["Trade Policy and Market Access"] !== 36 ||
    subjectAreaCounts["Monetary Policy, Debt, and International Institutions"] !== 28 ||
    subjectAreaCounts["Economic Summits and Industrialized-Country Cooperation"] !== 13 ||
    subjectAreaCounts["Transition Economies and International Economic Strategy"] !== 15 ||
    subjectAreaCounts["Strategic Trade, Technology, and Investment Controls"] !== 4
  ) {
    errors.push("Deal Chronological subject-area routing counts changed");
  }
  const rawHeaders = dealChron.fileUnits.reduce((total, row) => total + row.rawWithdrawalSheetHeaderCount, 0);
  const inventoryHeaders = dealChron.fileUnits.reduce((total, row) => total + row.withdrawalInventoryHeaderCount, 0);
  const sheetItems = dealChron.fileUnits.reduce((total, row) => total + row.withdrawalSheetItemCount, 0);
  const sheetPages = dealChron.fileUnits.reduce((total, row) => total + row.withdrawalSheetPages, 0);
  const releasedInPartSheets = dealChron.fileUnits.reduce((total, row) => total + row.releasedInPartSheetCount, 0);
  const noCopyIndicatedSheets = dealChron.fileUnits.reduce((total, row) => total + row.noCopyIndicatedSheetCount, 0);
  if (
    dealChron.totalRawWithdrawalSheetHeaders !== 813 || rawHeaders !== 813 ||
    dealChron.withdrawalInventoryHeaderCount !== 116 || inventoryHeaders !== 116 ||
    dealChron.totalWithdrawalSheetItems !== 697 || sheetItems !== 697 ||
    dealChron.totalWithdrawalSheetPages !== 2121 || sheetPages !== 2121 ||
    dealChron.releasedInPartSheetCount !== 0 || releasedInPartSheets !== 0 ||
    dealChron.noCopyIndicatedSheetCount !== 697 || noCopyIndicatedSheets !== 697 ||
    rawHeaders !== inventoryHeaders + sheetItems
  ) {
    errors.push("Deal Chronological withdrawal/redaction header and disposition accounting does not reconcile");
  }
  const subjectLeads = dealChron.fileUnits.reduce((total, row) => total + (row.economicSubjectLeads?.length || 0), 0);
  const pertinentSheetLeads = dealChron.fileUnits.reduce((total, row) => total + row.relevantWithdrawalSheetCount, 0);
  if (dealChron.totalEconomicSubjectLeads !== 708 || subjectLeads !== 708 || dealChron.totalRelevantWithdrawalSheetLeads !== 275 || pertinentSheetLeads !== 275) {
    errors.push("Deal Chronological economic lead accounting changed");
  }
  if (dealChron.candidateCount !== 96 || dealChron.candidateIds.length !== 96 || dealChron.auditedFolders.length !== 96) {
    errors.push("Deal Chronological candidate or audited-folder count is not 96");
  }
  if (dealChron.candidateIds.some((id) => !ids.has(id))) errors.push("Deal Chronological candidate ID is missing from the master chronology");
  const candidateRecords = dealChron.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  if (candidateRecords.some((record) => record.collectionId !== "deal-chron" || record.sourceNoteStatus !== "locator" || record.sourceNote || !/file-unit locator only/i.test(record.sourceNoteBasis || ""))) {
    errors.push("Deal Chronological file-level lead incorrectly asserts a document Source Note or lacks its collection ID");
  }
  if (candidateRecords.some((record) =>
    !record.archivalLocator.startsWith("George H.W. Bush Library, Bush Presidential Records, National Security Council, Timothy E. Deal Files, Chronological Files, OA/ID CF") ||
    !/OA\/ID CF\d{5}–\d{3}, Chron File:/.test(record.archivalLocator) ||
    /OA\/ID CF\d{5}-\d{3}/.test(record.archivalLocator)
  )) {
    errors.push("Deal Chronological archival locator does not follow the provenance-marker form");
  }
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 9093) errors.push("Deal Chronological candidate page total is not 9,093");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 76 || candidateRecords.filter((record) => record.selection === "Consider").length !== 20 || candidateRecords.some((record) => !["Core", "Consider"].includes(record.selection))) {
    errors.push("Deal Chronological Core or Consider candidate counts changed");
  }
  if (candidateRecords.some((record) => record.datePrecision !== "month" || record.sortDate !== record.date || !/^\d{4}-\d{2}-01$/.test(record.date) || !/folder-level chronology/i.test(record.displayDateLabel || ""))) {
    errors.push("Deal Chronological candidates no longer preserve month precision");
  }
  if (
    candidateRecords.reduce((total, record) => total + record.rawWithdrawalSheetHeaderCount, 0) !== 813 ||
    candidateRecords.reduce((total, record) => total + record.withdrawalInventoryHeaderCount, 0) !== 116 ||
    candidateRecords.reduce((total, record) => total + record.withdrawalSheetItemCount, 0) !== 697 ||
    candidateRecords.reduce((total, record) => total + record.withdrawalSheetPages, 0) !== 2121 ||
    candidateRecords.reduce((total, record) => total + record.economicSubjectLeadCount, 0) !== 708 ||
    candidateRecords.reduce((total, record) => total + record.relevantWithdrawalSheetCount, 0) !== 275
  ) {
    errors.push("Deal Chronological candidate evidence totals do not reconcile to the file ledger");
  }
  const withdrawalItems = candidateRecords.flatMap((record) => record.withdrawalItems || []);
  if (
    withdrawalItems.length !== 697 ||
    withdrawalItems.reduce((total, item) => total + item.pages, 0) !== 2121 ||
    withdrawalItems.some((item) => item.sheetDisposition !== "No released copy indicated on the sheet")
  ) {
    errors.push("Deal Chronological individual withdrawal/redaction descriptions are incomplete");
  }
  const classificationCounts = Object.fromEntries(["Top Secret", "Secret", "Confidential", "Not stated"].map((marking) => [marking, withdrawalItems.filter((item) => item.classification === marking).length]));
  if (classificationCounts["Top Secret"] !== 33 || classificationCounts.Secret !== 392 || classificationCounts.Confidential !== 173 || classificationCounts["Not stated"] !== 99) {
    errors.push("Deal Chronological sheet-classification accounting changed");
  }
  const duplicateWarnings = withdrawalItems.filter((item) => item.possibleDuplicateMatch);
  const crossCollectionWarnings = withdrawalItems.filter((item) => item.crossCollectionMatch);
  if (dealChron.probableDuplicateGroupCount !== 69 || dealChron.probableDuplicateSheetEntryCount !== 152 || duplicateWarnings.length !== 152 || dealChron.crossCollectionTitleMatchCount !== 7 || crossCollectionWarnings.length !== 7) {
    errors.push("Deal Chronological duplicate or cross-collection comparison warnings changed");
  }
  const sortedCandidates = [...candidateRecords].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.localId.localeCompare(b.localId));
  if (sortedCandidates.some((record, index) => record.id !== candidateRecords[index].id)) errors.push("Deal Chronological candidates are not stored in month chronology");
}

const gatesMiddleEast = data.nscCollections?.find((collection) => collection.id === "gates-middle-east");
if (!gatesMiddleEast) {
  errors.push("Gates Middle East selected-file audit is missing");
} else {
  if (data.nscCollections.at(-1)?.id !== "gates-middle-east") errors.push("Gates Middle East tab is not last in the NSC collection sequence");
  if (gatesMiddleEast.naid !== "2554843" || gatesMiddleEast.fileUnitCount !== 2 || gatesMiddleEast.fileUnits.length !== 2) {
    errors.push("Gates Middle East collection or selected-file count changed");
  }
  if (gatesMiddleEast.markerVerified !== 2 || gatesMiddleEast.markerExceptionCount !== 0 || gatesMiddleEast.totalPdfPages !== 250) {
    errors.push("Gates Middle East provenance or PDF-page totals changed");
  }
  if (gatesMiddleEast.candidateCount !== 21 || gatesMiddleEast.candidateIds.length !== 21 || gatesMiddleEast.auditedFolders.length !== 2) {
    errors.push("Gates Middle East candidate or audited-folder count is not 21 and 2");
  }
  if (gatesMiddleEast.candidateIds.some((id) => !ids.has(id))) errors.push("Gates Middle East candidate ID is missing from the master chronology");
  const candidateRecords = gatesMiddleEast.candidateIds.map((id) => data.records.find((record) => record.id === id)).filter(Boolean);
  if (candidateRecords.some((record) => record.collectionId !== "gates-middle-east" || !["470437043", "470437044"].includes(record.naid) || record.sourceNoteStatus !== "verified")) {
    errors.push("Gates Middle East candidate provenance state changed");
  }
  const gatesSourceStems = {
    "470437043": "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Robert M. Gates Files, Subject Files, OA/ID CF00946–002, Middle East - Economic Strategy [1]. ",
    "470437044": "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Robert M. Gates Files, Subject Files, OA/ID CF00946–003, Middle East - Economic Strategy [2]. ",
  };
  if (candidateRecords.some((record) => !record.sourceNote.startsWith(gatesSourceStems[record.naid]))) errors.push("Gates Middle East Source Note does not follow its checked FRUS-style provenance stem");
  if (candidateRecords.reduce((total, record) => total + record.pageCount, 0) !== 137) errors.push("Gates Middle East candidate page total is not 137");
  if (candidateRecords.filter((record) => record.selection === "Core").length !== 12 || candidateRecords.filter((record) => record.selection === "Consider").length !== 9) {
    errors.push("Gates Middle East Core or Consider candidate counts changed");
  }
  if (candidateRecords.filter((record) => record.releaseStatus === "Released in part").length !== 4 || candidateRecords.filter((record) => record.releaseStatus === "Withheld").length !== 2) {
    errors.push("Gates Middle East released-in-part or withheld candidate counts changed");
  }
  const gatesFile = gatesMiddleEast.fileUnits.find((row) => row.naid === "470437043");
  if (!gatesFile || gatesFile.localId !== "CF00946-002" || gatesFile.pdfPages !== 125 || gatesFile.ledgerLabel !== "opening inventory") {
    errors.push("Gates Middle East file-unit identity or audit label changed");
  } else {
    const inventory = gatesFile.withdrawalItems || [];
    if (inventory.length !== 23 || inventory.reduce((total, item) => total + item.pages, 0) !== 113 || inventory.some((item) => !item.pdfPageRange)) {
      errors.push("Gates Middle East [1] opening inventory does not reconcile to 113 document pages");
    }
    const releasedInPart = inventory.filter((item) => /released in part/i.test(item.sheetDisposition || ""));
    if (releasedInPart.length !== 2 || releasedInPart.map((item) => item.itemNumber).join(",") !== "05a,05c") {
      errors.push("Gates Middle East [1] partial-release accounting changed");
    }
    const accounting = gatesFile.pageAccounting || {};
    const accountedPages = [
      accounting.openingMarkerPages,
      accounting.openingInventoryPages,
      accounting.laterIndividualSheetPages,
      accounting.listedDocumentPages,
      accounting.unlistedTreasuryDocumentPages,
      accounting.unlistedNscAdministrativePages,
    ].reduce((total, pages) => total + (pages || 0), 0);
    if (accountedPages !== 125 || accounting.totalPdfPages !== 125) errors.push("Gates Middle East [1] served-PDF page accounting does not total 125");
  }
  const gatesFile2 = gatesMiddleEast.fileUnits.find((row) => row.naid === "470437044");
  if (!gatesFile2 || gatesFile2.localId !== "CF00946-003" || gatesFile2.pdfPages !== 125 || gatesFile2.ledgerLabel !== "document-set ledger") {
    errors.push("Gates Middle East [2] file-unit identity or audit label changed");
  } else {
    const documentSets = gatesFile2.withdrawalItems || [];
    if (documentSets.length !== 18 || documentSets.reduce((total, item) => total + item.pages, 0) !== 119 || gatesFile2.ledgerPageTotal !== 119 || documentSets.some((item) => !item.pdfPageRange || !item.extentLabel)) {
      errors.push("Gates Middle East [2] document-set ledger does not reconcile to 119 served pages");
    }
    const accounting = gatesFile2.pageAccounting || {};
    const accountedPages = accounting.openingMarkerPages + accounting.withdrawalSheetPages + accounting.servedDocumentAdministrativeAndNotePages;
    if (accountedPages !== 125 || accounting.totalPdfPages !== 125 || accounting.logicalWithheldDocumentPages !== 12) {
      errors.push("Gates Middle East [2] served and logical page accounting changed");
    }
  }
  const secondFileCandidates = candidateRecords.filter((record) => record.naid === "470437044");
  if (secondFileCandidates.length !== 10 || secondFileCandidates.reduce((total, record) => total + record.pageCount, 0) !== 81) {
    errors.push("Gates Middle East [2] candidate count or logical page total changed");
  }
  if (gatesMiddleEast.candidateIds.some((id) => /^gates-470437043-(?:08a|08b|10|10a|10b|10c|10d)$/.test(id))) {
    errors.push("Gates Middle East version or H-Files duplicate was promoted to the chronology");
  }
}

if (data.nscCollections?.length !== 12) errors.push("NSC collection tab count is not 12");

const report = {
  checkedAt: new Date().toISOString(),
  records: data.records.length,
  verifiedSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "verified").length,
  draftSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "draft").length,
  locators: data.records.filter((record) => record.sourceNoteStatus === "locator").length,
  withheldItems: data.records.filter((record) => record.releaseStatus === "Withheld").length,
  nscCollections: data.nscCollections?.length || 0,
  scowcroftFileUnits: scowcroft?.fileUnits.length || 0,
  dealSummitFileUnits: dealSummit?.fileUnits.length || 0,
  dealReissFileUnits: dealReiss?.fileUnits.length || 0,
  dealChronFileUnits: dealChron?.fileUnits.length || 0,
  ifTransitionFileUnits: ifTransition?.fileUnits.length || 0,
  nsdFileUnits: nsd?.fileUnits.length || 0,
  nsrFileUnits: nsr?.fileUnits.length || 0,
  nscDcFollowUpFileUnits: nscDcFollowUp?.fileUnits.length || 0,
  nscDcMeetingFileUnits: nscDcMeetings?.fileUnits.length || 0,
  nscMeetingFileUnits: nscMeetings?.fileUnits.length || 0,
  timDealFileUnits: timDeal?.fileUnits.length || 0,
  gatesMiddleEastFileUnits: gatesMiddleEast?.fileUnits.length || 0,
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
