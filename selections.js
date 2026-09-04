(() => {
  const volume = window.VOLUME_DATA;
  const selection = volume.proposedSelections;
  const records = selection.recordIds.map(id => volume.records.find(record => record.id === id));
  const root = document.querySelector('#proposals-root');
  const search = document.querySelector('#proposal-search');
  const person = document.querySelector('#proposal-person');
  const treatment = document.querySelector('#proposal-treatment');
  const pass = document.querySelector('#proposal-pass');
  const controls = [[search, 'p_q'], [person, 'p_role'], [treatment, 'p_treatment'], [pass, 'p_pass']];
  const params = new URLSearchParams(location.search);
  controls.forEach(([control, key]) => { control.value = params.get(key) || ''; });

  const node = (tag, text, className) => {
    const element = document.createElement(tag);
    if (text) element.textContent = text;
    if (className) element.className = className;
    return element;
  };
  const anchor = (text, href, className = '') => {
    const element = node('a', text, className);
    element.href = href;
    if (href.startsWith('https:')) { element.target = '_blank'; element.rel = 'noreferrer'; }
    return element;
  };
  const pageLabel = record => record.pdfPageStart === record.pdfPageEnd ? `PDF page ${record.pdfPageStart}` : `PDF pages ${record.pdfPageStart}–${record.pdfPageEnd}`;
  const packet = record => [record.heading, record.dateline, record.sourceNote,
    `Proposed treatment: ${record.proposalKind}. ${record.scowcroftRole}.`,
    `Release status: ${record.releaseStatus}.`,
    ...(record.institutions?.length ? [`Institutions and mechanisms: ${record.institutions.join('; ')}.`] : []),
    `Why select: ${record.selectionRationale}`, `Evidence: ${record.evidenceNotes}`,
    `Editorial review: ${record.editorialReview}`, `Date basis: ${record.dateBasis}`,
    `Extent: ${record.extentLabel}`, `Provenance, PDF page 1: ${record.provenanceUrl}`,
    `Document, ${pageLabel(record)}: ${record.documentUrl}`, `Catalog: ${record.catalogUrl}`].join('\n\n');

  const overview = document.querySelector('#proposal-overview');
  [[records.filter(record => record.proposalKind === 'Document').length, 'proposed documents'],
    [records.filter(record => record.proposalKind === 'Annotation').length, 'supporting memoranda'],
    [records.filter(record => record.scowcroftRole !== 'Companion paper').length, 'to or from Scowcroft'],
    [selection.sources.length, 'PDF provenance sheets checked']].forEach(([count, text]) => {
    const item = node('div'); item.append(node('strong', String(count)), node('span', text)); overview.append(item);
  });
  document.querySelector('#proposals-coverage').textContent = `${selection.scope} Source images checked September 4, 2026. Classification labels describe the archival markings; release is recorded separately.`;

  function card(record) {
    const file = selection.sources.find(source => source.id === record.sourceId);
    const article = node('article', '', `proposal-card proposal-${record.proposalKind.toLowerCase()}`);
    article.id = `proposal-${record.id}`;
    const meta = node('div', '', 'proposal-meta');
    meta.append(node('span', record.displayDateLabel || record.dateline.replace('Washington, ', ''), 'proposal-date'),
      node('span', record.scowcroftRole, 'proposal-role'),
      node('span', record.proposalKind === 'Document' ? (record.priority === 'High' ? 'High-priority proposal' : 'Proposed document') : 'For annotation', 'proposal-treatment'));
    const heading = node('h3'); heading.append(anchor(record.title, `#proposal-${record.id}`));
    article.append(meta, heading, node('p', `${record.sender} → ${record.recipient}`, 'proposal-correspondents'));
    if (record.institutions?.length) article.append(node('p', record.institutions.join(' · '), 'proposal-institutions'));
    article.append(node('p', record.selectionRationale, 'proposal-rationale'));

    const citation = node('div', '', 'proposal-citation');
    citation.append(node('p', 'Proposed FRUS heading and Source Note', 'proposal-label'),
      node('p', record.heading), node('p', record.dateline), node('p', record.sourceNote, 'proposal-source-text'));
    article.append(citation);
    const actions = node('div', '', 'proposal-actions');
    actions.append(anchor(`Read document · ${pageLabel(record)}`, record.documentUrl, 'button primary'),
      anchor('Provenance · PDF page 1', record.provenanceUrl, 'button secondary'),
      anchor('NARA Catalog', record.catalogUrl), copyButton('Copy proposal', packet(record)));
    article.append(actions);
    article.append(node('p', `${record.releaseStatus} · ${record.extentLabel} · Source images checked ${selection.reviewedOn}`, 'proposal-extent'));

    const details = node('details', '', 'proposal-evidence');
    details.append(node('summary', 'Inspect provenance, copy choice, and editorial questions'));
    const evidence = node('div', '', 'proposal-evidence-grid');
    const figure = node('figure');
    const imageLink = anchor('', record.provenanceUrl);
    const image = node('img'); image.src = file.preview; image.alt = `First-page provenance marker for folder ${file.id}: ${file.marker.folderTitle}`; image.loading = 'lazy'; image.width = 180; image.height = 235;
    imageLink.append(image); figure.append(imageLink, node('figcaption', 'Official PDF, page 1. Open the original to inspect the marker.'));
    const facts = node('div');
    facts.append(node('h4', 'Provenance transcribed from the opening page'));
    const list = node('dl', '', 'proposal-marker');
    [['Record group', file.marker.recordGroup], ['Office / collection', file.marker.office], ['Series', file.marker.series], ['Subseries', file.marker.subseries || 'Blank on marker'], ['OA/ID number', file.marker.oaId], ['Folder ID', file.marker.folderId], ['Folder title', file.marker.folderTitle]].forEach(([key, value]) => {
      const row = node('div'); row.append(node('dt', key), node('dd', value)); list.append(row);
    });
    facts.append(list, node('h4', 'Document and copy evidence'), node('p', record.evidenceNotes),
      node('h4', 'Date and extent'), node('p', `${record.dateBasis} ${record.extentLabel}.`),
      node('h4', 'Before final selection'), node('p', record.editorialReview));
    if (record.markingNote) facts.append(node('p', `Marking detail: ${record.markingNote}`));
    if (record.relatedIds.length) {
      const related = node('div', '', 'proposal-related'); related.append(node('strong', 'Related proposals'));
      record.relatedIds.forEach(id => {
        const other = records.find(row => row.id === id);
        related.append(anchor(`${other.title} · ${other.displayDateLabel || other.dateline.replace('Washington, ', '')}`, `#proposal-${id}`));
      });
      facts.append(related);
    }
    facts.append(node('p', `Review scope for this PDF: ${file.imageReviewScope}.`, 'proposal-extent'));
    evidence.append(figure, facts); details.append(evidence); article.append(details);
    return article;
  }

  function render() {
    const terms = search.value.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const filtered = records.filter(record => {
      const haystack = [record.title, record.heading, record.sender, record.recipient, record.dateline, record.displayDateLabel, record.sourceNote, record.selectionRationale, record.evidenceNotes, record.institutions?.join(' '), record.naid, record.localId].join(' ').toLowerCase();
      return (!pass.value || (record.selectionPass || 'initial') === pass.value) && (!person.value || record.scowcroftRole === person.value) && (!treatment.value || record.proposalKind === treatment.value) && terms.every(term => haystack.includes(term));
    });
    root.replaceChildren(...filtered.map(card));
    if (!filtered.length) root.append(node('p', 'No proposals match these filters. Clear the filters to return to the full selection sequence.', 'proposal-empty'));
    document.querySelector('#proposal-summary').textContent = `${filtered.length} of ${records.length} proposals shown in chronological order. Editorial recommendations are provisional.`;
  }
  function saveFilters() {
    const url = new URL(location.href);
    controls.forEach(([control, key]) => { if (control.value) url.searchParams.set(key, control.value); else url.searchParams.delete(key); });
    history.replaceState(null, '', url);
  }
  controls.forEach(([control]) => control.addEventListener(control === search ? 'input' : 'change', () => { render(); saveFilters(); }));
  document.querySelector('#proposal-clear').addEventListener('click', () => { controls.forEach(([control]) => { control.value = ''; }); render(); saveFilters(); });
  function revealLinkedProposal() {
    const id = location.hash.slice(1);
    if (!records.some(record => `proposal-${record.id}` === id)) return;
    if (!document.getElementById(id)) { controls.forEach(([control]) => { control.value = ''; }); render(); saveFilters(); }
    document.getElementById(id).scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', revealLinkedProposal);
  render();
  revealLinkedProposal();
})();
