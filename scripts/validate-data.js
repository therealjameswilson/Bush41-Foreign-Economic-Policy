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
    if (!/(Top Secret|Secret|Confidential|Unclassified|No classification marking|the attachment is Confidential)\.$/i.test(record.sourceNote)) {
      errors.push(`${record.id}: Source Note lacks terminal classification sentence`);
    }
    if (/OA\/ID [A-Z0-9]+-[A-Z0-9]+/.test(record.sourceNote)) errors.push(`${record.id}: OA/ID uses a hyphen instead of an en dash`);
  }

  if (record.releaseStatus === "Withheld" && !Number.isInteger(record.pageCount)) errors.push(`${record.id}: withheld item lacks exact page extent`);
  if (record.releaseStatus === "Withheld" && !/withheld/i.test(record.extentLabel || "")) warnings.push(`${record.id}: withheld extent label is unclear`);
  if (record.sourceNoteStatus === "verified" && !/checked/i.test(record.sourceNoteBasis || "")) errors.push(`${record.id}: verified Source Note lacks evidence statement`);
}

const chronological = [...data.records].sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));
if (chronological.some((record, index) => record.id !== data.records[index].id)) errors.push("Records are not stored in chronological order");

if (data.meta.status !== "Being Researched") warnings.push(`Unexpected official status: ${data.meta.status}`);
if (data.publicReferences.length < 5) errors.push("Public reference register is too small for an initial release");
if (data.gaps.length < 5) errors.push("Compiler gap ledger is too small");

const report = {
  checkedAt: new Date().toISOString(),
  records: data.records.length,
  verifiedSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "verified").length,
  draftSourceNotes: data.records.filter((record) => record.sourceNoteStatus === "draft").length,
  locators: data.records.filter((record) => record.sourceNoteStatus === "locator").length,
  withheldItems: data.records.filter((record) => record.releaseStatus === "Withheld").length,
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
