const source = require('../data/frus-selections-source.json');
const { assessments, ...editorialModel } = require('../data/frus-editorial-model.json');
const assessmentsById = new Map(assessments.map(({ recordId, ...assessment }) => [recordId, assessment]));

function sourceNoteFor(file, proposal) {
  const locator = proposal.documentNumber
    ? `${file.provenanceStem.replace(/\.$/, '')}, ${proposal.documentNumber}.`
    : file.provenanceStem;
  return `${locator} ${proposal.classification}.${proposal.sourceNoteDetail ? ` ${proposal.sourceNoteDetail}` : ''}`;
}

function applySelections(records) {
  const byId = new Map(records.map(record => [record.id, record]));
  for (const proposal of source.documents) {
    const file = source.sources.find(item => item.id === proposal.sourceId);
    if (!file) throw new Error(`Missing selection source: ${proposal.sourceId}`);
    const existing = byId.get(proposal.id);
    const editorialAssessment = assessmentsById.get(proposal.id);
    if (!editorialAssessment) throw new Error(`Missing editorial assessment: ${proposal.id}`);
    const pageCount = proposal.pdfPageEnd - proposal.pdfPageStart + 1;
    const documentNoun = proposal.type === 'Draft report' ? 'report' : (!proposal.type || proposal.type.toLowerCase().includes('memorandum')) ? 'memorandum' : 'document';
    const dateline = proposal.dateline || `Washington, ${new Date(`${proposal.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
    const record = {
      ...proposal,
      dateline,
      type: proposal.type || 'Memorandum',
      chapter: proposal.subjectArea,
      selection: proposal.proposalKind === 'Document' ? 'Core' : 'Consider',
      releaseStatus: proposal.releaseStatus || 'Released',
      pageCount,
      extentLabel: proposal.extentLabel || `${pageCount} ${proposal.releaseStatus === 'Released in part' ? 'partly released' : 'released'} ${documentNoun} ${pageCount === 1 ? 'page' : 'pages'}; PDF ${proposal.pdfPageStart === proposal.pdfPageEnd ? `page ${proposal.pdfPageStart}` : `pages ${proposal.pdfPageStart}–${proposal.pdfPageEnd}`}; ${proposal.type === 'Draft report' ? 'includes title page and five tables' : 'attachments described separately'}`,
      naid: file.naid,
      localId: file.id,
      catalogUrl: file.catalogUrl,
      pdfUrl: file.pdfUrl,
      documentUrl: `${file.pdfUrl}#page=${proposal.pdfPageStart}`,
      provenanceUrl: `${file.pdfUrl}#page=1`,
      sourceNote: sourceNoteFor(file, proposal),
      sourceNoteStatus: 'verified',
      sourceNoteBasis: `Opening provenance marker (PDF page 1), selected ${documentNoun} pages, and terminal markings checked in the official NARA PDF on ${source.reviewedOn}.`,
      provenanceMethod: 'Opening PDF provenance marker and document source images',
      collectionId: existing?.collectionId || proposal.collectionId || 'scowcroft',
      notes: proposal.evidenceNotes,
      proposalId: proposal.id,
      editorialAssessment,
    };
    delete record.subjectArea;
    if (existing) Object.assign(existing, record);
    else { records.push(record); byId.set(record.id, record); }
  }
  return records;
}

function modelGuide() {
  return ['# Editorial Model', '', `[${editorialModel.title}](${editorialModel.url})`, '',
    editorialModel.intro, '', editorialModel.adaptation, '',
    `Basis: [Preface](${editorialModel.prefaceUrl}); [Sources](${editorialModel.sourcesUrl}). Reviewed ${editorialModel.reviewedOn}.`, '',
    '## Selection principles', '', ...editorialModel.principles.flatMap(item => [
      `### ${item.title}`, '', item.text, '', `[Model reference](${item.sourceUrl})`, '',
    ]), '## Examples from the model volume', '', ...editorialModel.examples.flatMap(item => [
      `### [Document ${item.number}: ${item.label}](${item.url})`, '', item.date, '',
      item.lesson, '', `Application to the Bush compilation: ${item.application}`, '',
    ]), '## Next research priorities', '', ...editorialModel.researchPriorities.flatMap(item => [
      `### ${item.title}`, '', item.text, '',
      item.exampleIds.map(id => { const example = editorialModel.examples.find(row => row.id === id); return `[Document ${example.number}](${example.url})`; }).join('; '), '',
    ]),
  ].join('\n');
}

function assessmentPacket(record) {
  const assessment = record.editorialAssessment;
  return [`Decision role: ${assessment.role}.`, '', `Model-based assessment: ${assessment.assessment}`, '',
    `Next evidence to seek: ${assessment.followUp}`, '',
    `Editorial models: ${assessment.exampleIds.map(id => { const example = editorialModel.examples.find(row => row.id === id); return `[Carter volume, Document ${example.number}](${example.url})`; }).join('; ')}.`, ''];
}

function selectionPacket(records) {
  return ['# Proposed FRUS Selections', '', source.scope, '', source.method, '',
    `Editorial model: [${editorialModel.title}](${editorialModel.url}). [Read the selection guide](frus-editorial-model.md).`, '',
    editorialModel.adaptation, '', ...records.flatMap(record => [
    `## ${record.title}`, '', record.heading, '', record.dateline, '', record.sourceNote, '',
    `Proposed treatment: ${record.proposalKind}. ${record.scowcroftRole}.`, '',
    `Release status: ${record.releaseStatus}.`, '',
    ...(record.institutions?.length ? [`Institutions and mechanisms: ${record.institutions.join('; ')}.`, ''] : []),
    `Why select: ${record.selectionRationale}`, '', `Source-image evidence: ${record.evidenceNotes}`, '',
    ...assessmentPacket(record),
    `Editorial review: ${record.editorialReview}`, '', `Date basis: ${record.dateBasis}`, '',
    `Extent: ${record.extentLabel}`, '', `Provenance (PDF page 1): ${record.provenanceUrl}`, '',
    `Document: ${record.documentUrl}`, '', `Catalog: ${record.catalogUrl}`, '',
  ])].join('\n');
}

module.exports = { source, editorialModel, applySelections, selectionPacket, modelGuide };
