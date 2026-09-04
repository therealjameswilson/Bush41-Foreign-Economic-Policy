const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = require('../data/frus-selections-source.json');
const volume = JSON.parse(fs.readFileSync(path.join(root, 'data/volume.json'), 'utf8'));
const exported = JSON.parse(fs.readFileSync(path.join(root, 'data/frus-selections.json'), 'utf8'));
const audit = require('../reports/frus-selections-source-audit.json');
const records = volume.records.filter(record => record.proposalId);
assert.equal(records.length, source.documents.length, 'Every source proposal must reach the chronology');
assert.equal(new Set(records.map(record => record.id)).size, records.length);
assert.deepEqual(records, exported.records, 'Proposal export and master chronology must agree');
assert.deepEqual(volume.proposedSelections.recordIds, records.map(record => record.id));
assert.equal(records.filter(record => record.proposalKind === 'Document').length, 7);
assert.equal(records.filter(record => record.proposalKind === 'Annotation').length, 4);
for (const file of source.sources) {
  assert.equal(file.provenancePage, 1);
  assert.equal(file.id, file.marker.folderId);
  assert.match(file.sha256, /^[0-9a-f]{64}$/);
  assert.ok(file.marker.recordGroup && file.marker.office && file.marker.series && file.marker.folderTitle);
  assert.ok(fs.existsSync(path.join(root, file.preview)));
  const checked = audit.sources.find(row => row.id === file.id);
  assert.equal(checked?.sha256, file.sha256, 'Audit must identify the same downloaded PDF');
  assert.equal(checked.catalogObjectMatched, true);
}
for (const record of records) {
  const file = source.sources.find(row => row.id === record.sourceId);
  assert.ok(Number.isInteger(record.pdfPageStart) && record.pdfPageStart > 1);
  assert.ok(Number.isInteger(record.pdfPageEnd) && record.pdfPageEnd >= record.pdfPageStart && record.pdfPageEnd <= file.pdfPages);
  assert.equal(record.pageCount, record.pdfPageEnd - record.pdfPageStart + 1);
  assert.equal(record.provenanceUrl, `${file.pdfUrl}#page=1`);
  assert.equal(record.documentUrl, `${file.pdfUrl}#page=${record.pdfPageStart}`);
  assert.equal(record.sourceNote, `${file.provenanceStem} ${record.classification}.`);
  assert.equal(record.releaseStatus, 'Released');
  assert.equal(record.sourceNoteStatus, 'verified');
  for (const field of ['heading', 'dateline', 'dateBasis', 'selectionRationale', 'evidenceNotes', 'editorialReview']) assert.ok(record[field], `${record.id}: missing ${field}`);
  record.relatedIds.forEach(id => assert.ok(records.some(row => row.id === id), `Missing related proposal ${id}`));
  if (record.scowcroftRole === 'From Scowcroft') assert.equal(record.sender, 'Brent Scowcroft');
  if (record.scowcroftRole === 'To Scowcroft') assert.equal(record.recipient, 'Brent Scowcroft');
}
const undated = records.find(record => record.id === 'scowcroft-undated-1990-china-lending');
assert.equal(undated.datePrecision, 'undated');
assert.equal(undated.dateline, 'Washington, undated');
assert.match(undated.displayDateLabel, /^Undated/);
assert.match(undated.evidenceNotes, /blank/);
assert.match(undated.evidenceNotes, /billion.*million/);
assert.match(records.find(record => record.id === 'scowcroft-1990-06-25-baker-brady-houston').heading, /Baker.*Brady/);
for (const id of ['deal-1989-03-15-melby-white-house-summit-group', 'deal-1989-03-20-scowcroft-sununu-paris']) {
  assert.equal(records.find(record => record.id === id).classification, 'Confidential', 'Selected annotated copies have terminal Confidential stamps');
}
console.log(`Validated ${records.length} proposals, four first-page provenance chains, page bounds, exports, and documented source exceptions.`);
