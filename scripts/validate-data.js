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

const report = {
  checkedAt: new Date().toISOString(),
  records: data.records.length,
  verifiedSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "verified").length,
  draftSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "draft").length,
  locators: data.records.filter((record) => record.sourceNoteStatus === "locator").length,
  withheldItems: data.records.filter((record) => record.releaseStatus === "Withheld").length,
  nscCollections: data.nscCollections?.length || 0,
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
