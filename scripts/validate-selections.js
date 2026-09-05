const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const source = require('../data/frus-selections-source.json');
const volume = JSON.parse(fs.readFileSync(path.join(root, 'data/volume.json'), 'utf8'));
const exported = JSON.parse(fs.readFileSync(path.join(root, 'data/frus-selections.json'), 'utf8'));
const audit = require('../reports/frus-selections-source-audit.json');
const model = require('../data/frus-editorial-model.json');
const records = volume.records.filter(record => record.proposalId);
assert.equal(records.length, source.documents.length, 'Every source proposal must reach the chronology');
assert.equal(new Set(records.map(record => record.id)).size, records.length);
assert.deepEqual(records, exported.records, 'Proposal export and master chronology must agree');
assert.deepEqual(volume.proposedSelections.recordIds, records.map(record => record.id));
assert.deepEqual(exported.editorialModel, volume.proposedSelections.editorialModel);
assert.equal(new Set(model.assessments.map(row => row.recordId)).size, records.length, 'Every proposal needs one editorial assessment');
assert.deepEqual(new Set(model.assessments.map(row => row.recordId)), new Set(records.map(row => row.id)));
assert.equal(new Set(model.examples.map(row => row.id)).size, model.examples.length);
for (const example of model.examples) {
  assert.equal(example.url, `${model.url}/d${example.number}`);
  assert.equal(example.id, `d${example.number}`);
}
assert.equal(records.filter(record => record.proposalKind === 'Document').length, 41);
assert.equal(records.filter(record => record.proposalKind === 'Annotation').length, 4);
const expansion = records.filter(record => record.selectionPass === 'ifi-expansion');
assert.equal(expansion.length, 30, 'The institutions pass must add thirty distinct document proposals');
expansion.forEach(record => {
  assert.equal(record.proposalKind, 'Document');
  assert.ok(record.institutions.length, 'Each new proposal identifies its institutional focus');
  assert.equal(record.collectionId, record.sourceId.startsWith('CF') ? 'deal-chron' : 'scowcroft');
});
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
  const { recordId, ...assessment } = model.assessments.find(row => row.recordId === record.id);
  assert.deepEqual(record.editorialAssessment, assessment, 'Assessment must survive the data build');
  for (const field of ['role', 'assessment', 'followUp']) assert.ok(assessment[field], `Missing ${field}: ${record.id}`);
  assert.ok(assessment.exampleIds.length);
  assessment.exampleIds.forEach(id => assert.ok(model.examples.some(example => example.id === id), `Unknown model example: ${id}`));
  const file = source.sources.find(row => row.id === record.sourceId);
  assert.ok(Number.isInteger(record.pdfPageStart) && record.pdfPageStart > 1);
  assert.ok(Number.isInteger(record.pdfPageEnd) && record.pdfPageEnd >= record.pdfPageStart && record.pdfPageEnd <= file.pdfPages);
  assert.equal(record.pageCount, record.pdfPageEnd - record.pdfPageStart + 1);
  assert.equal(record.provenanceUrl, `${file.pdfUrl}#page=1`);
  assert.equal(record.documentUrl, `${file.pdfUrl}#page=${record.pdfPageStart}`);
  const locator = record.documentNumber ? `${file.provenanceStem.slice(0, -1)}, ${record.documentNumber}.` : file.provenanceStem;
  assert.equal(record.sourceNote, `${locator} ${record.classification}.${record.sourceNoteDetail ? ` ${record.sourceNoteDetail}` : ''}`);
  assert.ok(['Released', 'Released in part'].includes(record.releaseStatus));
  const evidence = audit.documents.find(row => row.id === record.id);
  assert.deepEqual(evidence?.pages, [record.pdfPageStart, record.pdfPageEnd]);
  assert.equal(evidence.releaseStatus, record.releaseStatus);
  assert.equal(record.sourceNoteStatus, 'verified');
  for (const field of ['heading', 'dateline', 'dateBasis', 'selectionRationale', 'evidenceNotes', 'editorialReview']) assert.ok(record[field], `${record.id}: missing ${field}`);
  record.relatedIds.forEach(id => assert.ok(records.some(row => row.id === id), `Missing related proposal ${id}`));
  if (record.scowcroftRole === 'From Scowcroft') assert.equal(record.sender, 'Brent Scowcroft');
  if (record.scowcroftRole === 'To Scowcroft') assert.ok(record.recipient.includes('Brent Scowcroft'));
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
assert.equal(records.find(row => row.id === 'ifi-1990-01-25-iepr').releaseStatus, 'Released in part');
assert.equal(records.find(row => row.id === 'ifi-1991-undated-philippines-loan').datePrecision, 'undated');
assert.equal(records.find(row => row.id === 'ifi-1989-04-esaf-report').datePrecision, 'month');
assert.match(source.sources.find(row => row.id === '91139-013').marker.folderTitle, /February 1991/);
const deal = records.filter(row => row.selectionPass === 'deal-standalone');
assert.equal(deal.length, 4);
assert.deepEqual(deal.map(row => row.date), [...deal.map(row => row.date)].sort(), 'Deal additions remain chronological');
deal.forEach(row => {
  assert.equal(row.sender, 'Timothy E. Deal');
  assert.equal(row.proposalKind, 'Document');
  assert.equal(row.collectionId, 'deal-chron');
});
assert.match(deal.find(row => row.id === 'deal-1989-03-07-brady-speech').sourceNote, /1475\. Unclassified upon removal/);
assert.match(deal.find(row => row.id === 'deal-1989-03-08-brady-redraft').sourceNote, /1531\..*March 8.*March 9/);
assert.equal(deal.find(row => row.id === 'deal-1989-05-03-philippines-world-bank').dateline, 'May 3, 1989, 6:51 p.m. EDT');
assert.equal(deal.find(row => row.id === 'deal-1989-05-25-poland-debt').dateline, 'May 25, 1989');
console.log(`Validated ${records.length} proposals and editorial assessments, ${model.examples.length} model examples, ${source.sources.length} first-page provenance chains, page bounds, exports, and documented source exceptions.`);
