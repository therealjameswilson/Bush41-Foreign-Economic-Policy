const source = require('../data/frus-selections-source.json');

function applySelections(records) {
  const byId = new Map(records.map(record => [record.id, record]));
  for (const proposal of source.documents) {
    const file = source.sources.find(item => item.id === proposal.sourceId);
    if (!file) throw new Error(`Missing selection source: ${proposal.sourceId}`);
    const existing = byId.get(proposal.id);
    const pageCount = proposal.pdfPageEnd - proposal.pdfPageStart + 1;
    const dateline = proposal.dateline || `Washington, ${new Date(`${proposal.date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}`;
    const record = {
      ...proposal,
      dateline,
      type: proposal.type || 'Memorandum',
      chapter: proposal.subjectArea,
      selection: proposal.proposalKind === 'Document' ? 'Core' : 'Consider',
      releaseStatus: proposal.releaseStatus || 'Released',
      pageCount,
      extentLabel: `${pageCount} ${proposal.releaseStatus === 'Released in part' ? 'partly released' : 'released'} ${proposal.type === 'Draft report' ? 'report' : 'memorandum'} ${pageCount === 1 ? 'page' : 'pages'}; PDF ${proposal.pdfPageStart === proposal.pdfPageEnd ? `page ${proposal.pdfPageStart}` : `pages ${proposal.pdfPageStart}–${proposal.pdfPageEnd}`}; ${proposal.type === 'Draft report' ? 'includes title page and five tables' : 'attachments described separately'}`,
      naid: file.naid,
      localId: file.id,
      catalogUrl: file.catalogUrl,
      pdfUrl: file.pdfUrl,
      documentUrl: `${file.pdfUrl}#page=${proposal.pdfPageStart}`,
      provenanceUrl: `${file.pdfUrl}#page=1`,
      sourceNote: `${file.provenanceStem} ${proposal.classification}.`,
      sourceNoteStatus: 'verified',
      sourceNoteBasis: `Opening provenance marker (PDF page 1), selected ${proposal.type === 'Draft report' ? 'report' : 'memorandum'} pages, and terminal markings checked in the official NARA PDF on ${source.reviewedOn}.`,
      provenanceMethod: 'Opening PDF provenance marker and document source images',
      collectionId: existing?.collectionId || proposal.collectionId || 'scowcroft',
      notes: proposal.evidenceNotes,
      proposalId: proposal.id,
    };
    delete record.subjectArea;
    if (existing) Object.assign(existing, record);
    else { records.push(record); byId.set(record.id, record); }
  }
  return records;
}

function selectionPacket(records) {
  return ['# Proposed FRUS Selections', '', source.scope, '', source.method, '', ...records.flatMap(record => [
    `## ${record.title}`, '', record.heading, '', record.dateline, '', record.sourceNote, '',
    `Proposed treatment: ${record.proposalKind}. ${record.scowcroftRole}.`, '',
    `Release status: ${record.releaseStatus}.`, '',
    ...(record.institutions?.length ? [`Institutions and mechanisms: ${record.institutions.join('; ')}.`, ''] : []),
    `Why select: ${record.selectionRationale}`, '', `Source-image evidence: ${record.evidenceNotes}`, '',
    `Editorial review: ${record.editorialReview}`, '', `Date basis: ${record.dateBasis}`, '',
    `Extent: ${record.extentLabel}`, '', `Provenance (PDF page 1): ${record.provenanceUrl}`, '',
    `Document: ${record.documentUrl}`, '', `Catalog: ${record.catalogUrl}`, '',
  ])].join('\n');
}

module.exports = { source, applySelections, selectionPacket };
