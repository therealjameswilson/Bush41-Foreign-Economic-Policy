const data = window.VOLUME_DATA;

if (!data) {
  throw new Error("Volume data did not load.");
}

const elements = {
  recordsRoot: document.querySelector("#records-root"),
  recordsSummary: document.querySelector("#records-summary"),
  search: document.querySelector("#record-search"),
  type: document.querySelector("#type-filter"),
  release: document.querySelector("#release-filter"),
  sourceNote: document.querySelector("#source-note-filter"),
  selection: document.querySelector("#selection-filter"),
  clear: document.querySelector("#clear-filters"),
  downloadFiltered: document.querySelector("#download-filtered"),
  compilerMetrics: document.querySelector("#compiler-metrics"),
  sourceGrid: document.querySelector("#source-grid"),
  gapRoot: document.querySelector("#gap-root"),
  publicRoot: document.querySelector("#public-root"),
  publicSearch: document.querySelector("#public-search"),
  publicType: document.querySelector("#public-type-filter"),
  publicClear: document.querySelector("#public-clear"),
  publicSummary: document.querySelector("#public-summary"),
  nscCollectionTabs: document.querySelector("#nsc-collection-tabs"),
  nscStatus: document.querySelector("#nsc-status"),
  nscIntro: document.querySelector("#nsc-intro"),
  nscMetrics: document.querySelector("#nsc-metrics"),
  nscProvenanceTitle: document.querySelector("#nsc-provenance-title"),
  nscProvenanceSummary: document.querySelector("#nsc-provenance-summary"),
  nscSeriesLink: document.querySelector("#nsc-series-link"),
  nscCandidateTitle: document.querySelector("#nsc-candidate-title"),
  nscCandidateDownload: document.querySelector("#nsc-candidate-download"),
  nscCandidateSummary: document.querySelector("#nsc-candidate-summary"),
  nscCandidatesRoot: document.querySelector("#nsc-candidates-root"),
  nscFileDownload: document.querySelector("#nsc-file-download"),
  nscReportLink: document.querySelector("#nsc-report-link"),
  nscFileRoot: document.querySelector("#nsc-file-root"),
  nscFileSummary: document.querySelector("#nsc-file-summary"),
  nscSearch: document.querySelector("#nsc-search"),
  nscChapter: document.querySelector("#nsc-chapter-filter"),
  nscRouting: document.querySelector("#nsc-routing-filter"),
  nscMarker: document.querySelector("#nsc-marker-filter"),
  nscSignal: document.querySelector("#nsc-signal-filter"),
  nscClear: document.querySelector("#nsc-clear"),
  nscDownloadFiltered: document.querySelector("#nsc-download-filtered"),
  toast: document.querySelector("#toast"),
};

let filteredRecords = [...data.records];
const nscCollections = data.nscCollections || [];
let activeNscCollection = nscCollections[0] || null;
let filteredNscFileUnits = [...(activeNscCollection?.fileUnits || [])];

initialize();

function initialize() {
  renderStats();
  populateFilters();
  renderCompilerMetrics();
  renderNscCollectionTabs();
  renderNscCollection();
  renderSources();
  renderGaps();
  renderPublicReferences(data.publicReferences);
  renderRecords(data.records);
  bindEvents();
}

function renderStats() {
  const knownWithheldPages = data.records.reduce((total, record) => {
    if (record.releaseStatus === "Withheld") return total + (record.pageCount || 0);
    return total + (record.withheldPages || 0);
  }, 0);

  setText("#stat-records", data.records.length);
  setText("#stat-source-notes", data.records.filter((record) => record.sourceNoteStatus === "verified").length);
  setText("#stat-released", data.records.filter((record) => record.releaseStatus === "Released").length);
  setText("#stat-withheld-pages", knownWithheldPages);
  setText("#stat-public", data.publicReferences.length);
}

function setText(selector, value) {
  document.querySelector(selector).textContent = value.toLocaleString("en-US");
}

function populateFilters() {
  addOptions(elements.type, unique(data.records.map((record) => record.type)), "All record types");
  addOptions(elements.release, unique(data.records.map((record) => record.releaseStatus)), "All release states");
  addOptions(elements.sourceNote, ["verified", "draft", "locator"], "All Source Note states", sourceNoteLabel);
  addOptions(elements.selection, ["Core", "Consider", "Boundary"], "All selection states");
  addOptions(elements.publicType, unique(data.publicReferences.map((record) => record.type)), "All types");
  populateNscFilters();
}

function populateNscFilters() {
  if (!activeNscCollection) return;
  const signalOptions = ["high-level", "president", "scowcroft", "conversation", "meeting", "withdrawal"];
  if (activeNscCollection.fileUnits.some((row) => row.reviewSignals?.memosToPorter)) signalOptions.splice(3, 0, "porter");
  if (activeNscCollection.fileUnits.some((row) => row.economicSignals?.total >= 20)) signalOptions.unshift("economic");
  addOptions(elements.nscChapter, unique(activeNscCollection.fileUnits.map((row) => row.chapter)), "All subject areas");
  addOptions(elements.nscRouting, unique(activeNscCollection.fileUnits.map((row) => row.routing)), "All routing states");
  addOptions(elements.nscMarker, unique(activeNscCollection.fileUnits.map((row) => row.markerStatus)), "All marker states", markerLabel);
  addOptions(
    elements.nscSignal,
    signalOptions,
    "All file units",
    signalLabel,
  );
}

function addOptions(select, values, allLabel, labeler = (value) => value) {
  select.replaceChildren(option("", allLabel), ...values.map((value) => option(value, labeler(value))));
}

function option(value, label) {
  const item = document.createElement("option");
  item.value = value;
  item.textContent = label;
  return item;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

function bindEvents() {
  [elements.search, elements.type, elements.release, elements.sourceNote, elements.selection].forEach((control) => {
    control.addEventListener(control.tagName === "INPUT" ? "input" : "change", updateRecords);
  });

  elements.clear.addEventListener("click", () => {
    [elements.search, elements.type, elements.release, elements.sourceNote, elements.selection].forEach((control) => {
      control.value = "";
    });
    updateRecords();
  });

  elements.downloadFiltered.addEventListener("click", downloadFilteredCsv);
  elements.publicSearch.addEventListener("input", updatePublicReferences);
  elements.publicType.addEventListener("change", updatePublicReferences);
  elements.publicClear.addEventListener("click", () => {
    elements.publicSearch.value = "";
    elements.publicType.value = "";
    updatePublicReferences();
  });

  [elements.nscSearch, elements.nscChapter, elements.nscRouting, elements.nscMarker, elements.nscSignal].forEach((control) => {
    if (!control) return;
    control.addEventListener(control.tagName === "INPUT" ? "input" : "change", updateNscFileUnits);
  });
  elements.nscClear?.addEventListener("click", () => {
    [elements.nscSearch, elements.nscChapter, elements.nscRouting, elements.nscMarker, elements.nscSignal].forEach((control) => {
      control.value = "";
    });
    updateNscFileUnits();
  });
  elements.nscDownloadFiltered?.addEventListener("click", downloadFilteredNscCsv);

}

function updateRecords() {
  const query = elements.search.value.trim().toLowerCase();
  filteredRecords = data.records.filter((record) => {
    return (
      (!query || recordSearchText(record).includes(query)) &&
      (!elements.type.value || record.type === elements.type.value) &&
      (!elements.release.value || record.releaseStatus === elements.release.value) &&
      (!elements.sourceNote.value || record.sourceNoteStatus === elements.sourceNote.value) &&
      (!elements.selection.value || record.selection === elements.selection.value)
    );
  });
  renderRecords(filteredRecords);
}

function recordSearchText(record) {
  return [
    record.title,
    record.heading,
    record.dateline,
    record.type,
    record.subjectArea,
    record.selection,
    record.releaseStatus,
    record.classification,
    record.naid,
    record.localId,
    record.seriesTitle,
    record.sourceNote,
    record.archivalLocator,
    record.notes,
    ...(record.topics || []),
    ...(record.economicSubjectLeads || []),
    ...(record.withdrawalItems || []).flatMap((item) => [
      item.title,
      item.sheetDisposition,
      item.canonicalMatch,
      item.possibleDuplicateMatch,
      item.crossCollectionMatch,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function renderRecords(records) {
  elements.recordsRoot.replaceChildren();
  elements.recordsSummary.textContent = summaryText(records);

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "empty-chapter";
    empty.textContent = "No records match the current filters.";
    elements.recordsRoot.append(empty);
    return;
  }

  const groups = groupBy(records, (record) => record.date.slice(0, 4));
  for (const [year, yearRecords] of groups) {
    const section = document.createElement("section");
    section.className = "record-chapter year-group";
    section.setAttribute("aria-labelledby", `year-${year}`);

    const header = document.createElement("div");
    header.className = "record-chapter-header";
    header.innerHTML = `<h3 id="year-${year}">${year}</h3><p class="record-count">${yearRecords.length} ${plural(yearRecords.length, "record")}</p>`;

    const list = document.createElement("div");
    list.className = "record-list";
    yearRecords.forEach((record) => list.append(createRecordRow(record)));
    section.append(header, list);
    elements.recordsRoot.append(section);
  }
}

function summaryText(records) {
  const released = records.filter((record) => record.releaseStatus === "Released").length;
  const releasedInPart = records.filter((record) => record.releaseStatus === "Released in part").length;
  const withheld = records.filter((record) => record.releaseStatus === "Withheld").length;
  const verified = records.filter((record) => record.sourceNoteStatus === "verified").length;
  return `${records.length} ${plural(records.length, "record")} shown; ${released} ${plural(released, "released document")}; ${releasedInPart} released in part; ${withheld} ${plural(withheld, "separately identified withheld item")}; ${verified} ${plural(verified, "verified Source Note")}.`;
}

function createRecordRow(record, idPrefix = "") {
  const row = document.createElement("article");
  row.className = `record-row record-state-${record.sourceNoteStatus} selection-${record.selection.toLowerCase()}`;
  row.id = `${idPrefix}${record.id}`;

  const dateStack = document.createElement("div");
  dateStack.className = "record-date-stack";
  const date = document.createElement("time");
  date.className = "record-date";
  if (record.datePrecision !== "undated") {
    date.dateTime = record.datePrecision === "month" ? record.date.slice(0, 7) : record.date;
  }
  date.textContent = displayDate(record);
  const number = document.createElement("span");
  number.className = "record-doc-number";
  number.textContent = compilerNumber(record);
  dateStack.append(date, number);

  const body = document.createElement("div");
  body.className = "record-body";

  const title = document.createElement("h3");
  title.className = "record-title-heading";
  const titleLink = document.createElement("a");
  titleLink.className = "record-title";
  titleLink.href = record.documentUrl || record.pdfUrl || record.catalogUrl;
  titleLink.target = "_blank";
  titleLink.rel = "noreferrer";
  titleLink.textContent = record.title;
  title.append(titleLink);

  const heading = document.createElement("p");
  heading.className = "record-heading";
  heading.textContent = record.heading;

  const dateline = document.createElement("p");
  dateline.className = "record-date-line";
  dateline.textContent = record.dateline;

  const meta = document.createElement("div");
  meta.className = "record-meta";
  [
    record.type,
    record.selection,
    record.releaseStatus,
    record.extentLabel,
    record.classification,
  ].forEach((value) => value && meta.append(badge(value)));

  const sourceState = document.createElement("p");
  sourceState.className = `record-source-line source-state-${record.sourceNoteStatus}`;
  sourceState.textContent = `${sourceNoteLabel(record.sourceNoteStatus)}: ${record.sourceNoteBasis}`;

  body.append(title, heading, dateline, meta, sourceState);

  if (record.notes) {
    const notes = document.createElement("p");
    notes.className = "record-notes";
    notes.textContent = record.notes;
    body.append(notes);
  }

  if (record.topics?.length) {
    const topics = document.createElement("div");
    topics.className = "record-topics";
    record.topics.forEach((topic) => topics.append(badge(topic)));
    body.append(topics);
  }

  body.append(createProvenance(record));
  if (record.economicSubjectLeads?.length) body.append(createSubjectLeadLedger(record));
  if (record.withdrawalItems?.length) body.append(createWithdrawalLedger(record));

  const links = document.createElement("div");
  links.className = "record-links";
  links.append(link("Catalog", record.catalogUrl));
  if (record.pdfUrl) links.append(link(record.documentUrl ? "Memorandum pages" : "PDF", record.documentUrl || record.pdfUrl));
  if (record.provenanceUrl) links.append(link("Provenance: page 1", record.provenanceUrl));
  if (record.proposalId) {
    const proposalLink = document.createElement("a");
    proposalLink.href = `#proposal-${record.proposalId}`;
    proposalLink.textContent = "Selection rationale";
    links.append(proposalLink);
  }
  if (record.naid) links.append(badge(`NAID ${record.naid}`));
  if (record.localId) links.append(badge(`OA/ID ${record.localId}`));

  row.append(dateStack, body, links);
  return row;
}

function createProvenance(record) {
  const details = document.createElement("details");
  details.className = "record-source-note";
  const summary = document.createElement("summary");
  summary.textContent = record.sourceNoteStatus === "locator" ? "Archival locator" : "Heading, dateline, and Source Note";

  const headingLabel = label("Heading");
  const heading = paragraph(record.heading, "record-frus-source-note");
  const datelineLabel = label("Dateline");
  const dateline = paragraph(record.dateline, "record-frus-source-note");
  const sourceLabel = label(record.sourceNoteStatus === "locator" ? "Archival locator, not a Source Note" : "Source Note");
  const sourceText = record.sourceNote || record.archivalLocator;
  const source = paragraph(sourceText, "record-frus-source-note");

  const actions = document.createElement("div");
  actions.className = "record-copy-actions";
  actions.append(
    copyButton("Copy Heading", record.heading),
    copyButton("Copy Dateline", record.dateline),
    copyButton(record.sourceNoteStatus === "locator" ? "Copy Locator" : "Copy Source Note", sourceText),
    copyButton("Copy Entry", compilerEntry(record)),
  );

  details.append(summary, headingLabel, heading, datelineLabel, dateline, sourceLabel, source, actions);
  return details;
}

function createWithdrawalLedger(record) {
  const details = document.createElement("details");
  details.className = "withdrawal-ledger";
  const summary = document.createElement("summary");
  const total = record.ledgerPageTotal ?? record.withdrawalItems.reduce((sum, item) => sum + item.pages, 0);
  summary.textContent = `${record.withdrawalItems.length}-item ${record.ledgerLabel || "withdrawal ledger"} (${total} pages)`;
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  const showDate = record.withdrawalItems.some((item) => item.date);
  const showExtent = record.withdrawalItems.some((item) => item.extentLabel);
  const showPdfPages = record.withdrawalItems.some((item) => item.pdfPageRange);
  const showRestriction = record.withdrawalItems.some((item) => item.restriction);
  const showDisposition = record.withdrawalItems.some(
    (item) => item.sheetDisposition || item.canonicalMatch || item.possibleDuplicateMatch || item.crossCollectionMatch,
  );
  if (showDisposition) table.classList.add("has-disposition");
  const headings = ["Item", "Description"];
  if (showPdfPages) headings.push("PDF pages");
  if (showDate) headings.push("Date");
  if (showRestriction) headings.push("Restriction");
  if (showDisposition) headings.push("Sheet disposition and duplicate check");
  headings.push("Marking", showExtent ? "Extent" : "Pages");
  table.innerHTML = `<thead><tr>${headings.map((heading) => `<th>${heading}</th>`).join("")}</tr></thead>`;
  const tbody = document.createElement("tbody");
  record.withdrawalItems.forEach((item) => {
    const tr = document.createElement("tr");
    const cells = [item.item || item.itemNumber, item.title];
    if (showPdfPages) cells.push(item.pdfPageRange || "Not stated");
    if (showDate) cells.push(item.date || "Not stated");
    if (showRestriction) cells.push(item.restriction || "Not stated");
    if (showDisposition) {
      cells.push(
        [item.sheetDisposition, item.canonicalMatch, item.possibleDuplicateMatch, item.crossCollectionMatch]
          .filter(Boolean)
          .join("; ") || "Not stated",
      );
    }
    cells.push(item.classification, showExtent ? item.extentLabel || `${item.pages} pages` : item.pages);
    tr.innerHTML = cells.map((value) => `<td>${escapeHtml(value)}</td>`).join("");
    tbody.append(tr);
  });
  table.append(tbody);
  tableWrap.append(table);
  details.append(summary, tableWrap);
  return details;
}

function createSubjectLeadLedger(record) {
  const details = document.createElement("details");
  details.className = "subject-lead-ledger";
  const summary = document.createElement("summary");
  summary.textContent = `${record.economicSubjectLeads.length} economic-policy subject-line ${plural(record.economicSubjectLeads.length, "lead")}`;
  const list = document.createElement("ol");
  record.economicSubjectLeads.forEach((subject) => {
    const item = document.createElement("li");
    item.textContent = subject;
    list.append(item);
  });
  details.append(summary, list);
  return details;
}

function compilerEntry(record) {
  const provenance = record.sourceNote || `Archival locator: ${record.archivalLocator}`;
  return `${record.heading}\n\n${record.dateline}\n\n1 ${provenance}`;
}

function compilerNumber(record) {
  return `FEP-${String(data.records.findIndex((item) => item.id === record.id) + 1).padStart(3, "0")}`;
}

function displayDate(record) {
  if (record.displayDateLabel) return record.displayDateLabel;
  if (record.datePrecision === "year") return `${record.date.slice(0, 4)} (date not established)`;
  return new Date(`${record.date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function markerLabel(status) {
  return {
    verified: "Opening marker verified",
    "verified with handwritten correction": "Marker verified; ID corrected by hand",
    "verified with catalog ID mismatch": "Marker verified; Catalog ID mismatch retained",
    "verified with record-group exception": "Marker verified; donated-materials exception retained",
    "verified with OCR normalization": "Marker verified; NARA OCR normalization retained",
    "verified in OCR": "Opening marker text verified in NARA OCR",
    "not online": "No online PDF",
    "not present": "Opening marker not present",
  }[status] || status;
}

function isVerifiedMarker(status) {
  return status?.startsWith("verified");
}

function signalLabel(signal) {
  return {
    economic: "20+ economic-policy OCR hits",
    "high-level": "Any high-level document signal",
    president: "Memorandum to the President",
    scowcroft: "Memorandum to Scowcroft",
    porter: "Memorandum to Roger Porter",
    conversation: "Memorandum of conversation",
    meeting: "Minutes or meeting record",
    withdrawal: "Withdrawal sheet",
  }[signal] || signal;
}

function sourceNoteLabel(status) {
  return {
    verified: "Source Note verified",
    draft: "Source Note draft",
    locator: "Archival locator only",
  }[status] || status;
}

function badge(text) {
  const span = document.createElement("span");
  span.textContent = text;
  return span;
}

function label(text) {
  const paragraph = document.createElement("p");
  paragraph.className = "record-provenance-label";
  paragraph.textContent = text;
  return paragraph;
}

function paragraph(text, className) {
  const paragraph = document.createElement("p");
  paragraph.className = className;
  paragraph.textContent = text;
  return paragraph;
}

function link(text, href) {
  const anchor = document.createElement("a");
  anchor.href = href;
  anchor.target = "_blank";
  anchor.rel = "noreferrer";
  anchor.textContent = text;
  return anchor;
}

function copyButton(text, value) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "record-copy-button";
  button.textContent = text;
  button.addEventListener("click", async () => {
    await copyText(value);
    showToast(`${text.replace("Copy", "Copied")}`);
  });
  return button;
}

async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

let toastTimeout;
function showToast(message) {
  window.clearTimeout(toastTimeout);
  elements.toast.textContent = message;
  elements.toast.classList.add("toast-visible");
  toastTimeout = window.setTimeout(() => elements.toast.classList.remove("toast-visible"), 1800);
}

function renderCompilerMetrics() {
  const metrics = [
    [data.records.filter((record) => record.sourceNoteStatus === "verified").length, "Verified Source Notes", "Citation marker or equivalent source image checked"],
    [data.records.filter((record) => record.sourceNoteStatus === "draft").length, "Draft Source Notes", "FRUS-style prose still awaiting archival confirmation"],
    [data.records.filter((record) => record.sourceNoteStatus === "locator").length, "Archival locators", "Folder or withdrawal-sheet evidence only"],
    [data.records.filter((record) => record.selection === "Core").length, "Core candidates", "Priority for compiler reading"],
    [data.records.filter((record) => record.selection === "Boundary").length, "Boundary records", "Retained for cross-volume routing"],
    [data.records.filter((record) => record.releaseStatus === "Withheld").length, "Withdrawn documents", "Separately identified with exact extents"],
  ];
  elements.compilerMetrics.replaceChildren(...metrics.map(([value, title, detail]) => metric(value, title, detail)));
}

function metric(value, title, detail) {
  const card = document.createElement("article");
  card.className = "compiler-card";
  card.innerHTML = `<strong>${value}</strong><span>${escapeHtml(title)}</span><p>${escapeHtml(detail)}</p>`;
  return card;
}

function renderNscCollectionTabs() {
  if (!elements.nscCollectionTabs) return;
  elements.nscCollectionTabs.replaceChildren();
  nscCollections.forEach((collection) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nsc-collection-tab";
    button.setAttribute("role", "tab");
    button.setAttribute("aria-selected", String(collection.id === activeNscCollection?.id));
    button.textContent = collection.shortTitle || collection.title;
    button.addEventListener("click", () => selectNscCollection(collection.id));
    elements.nscCollectionTabs.append(button);
  });
}

function selectNscCollection(collectionId) {
  const collection = nscCollections.find((item) => item.id === collectionId);
  if (!collection || collection.id === activeNscCollection?.id) return;
  activeNscCollection = collection;
  [elements.nscSearch, elements.nscChapter, elements.nscRouting, elements.nscMarker, elements.nscSignal].forEach((control) => {
    control.value = "";
  });
  filteredNscFileUnits = [...collection.fileUnits];
  populateNscFilters();
  renderNscCollectionTabs();
  renderNscCollection();
}

function renderNscCollection() {
  if (!activeNscCollection) return;

  elements.nscStatus.textContent = activeNscCollection.statusLabel;
  elements.nscIntro.textContent = activeNscCollection.intro;
  elements.nscMetrics.setAttribute("aria-label", `${activeNscCollection.shortTitle || activeNscCollection.title} collection metrics`);
  const provenanceMarkerVerified = activeNscCollection.provenanceMarkerVerified ?? activeNscCollection.markerVerified;
  const provenanceOnlinePdfCount = activeNscCollection.provenanceOnlinePdfCount
    ?? activeNscCollection.fileUnits.filter((row) => row.pdfUrl).length;
  const metrics = [
    [
      activeNscCollection.sourceFileUnitCount || activeNscCollection.fileUnits.length,
      activeNscCollection.fileUnitMetricLabel || "Catalog file units",
      activeNscCollection.fileUnitMetricDetail || `${activeNscCollection.seriesCount ? `${activeNscCollection.seriesCount} component series; ` : ""}${activeNscCollection.onlinePdfCount ?? activeNscCollection.fileUnits.filter((row) => row.pdfUrl).length} online PDFs`,
    ],
    [
      activeNscCollection.candidateCount,
      activeNscCollection.candidateLabel,
      activeNscCollection.candidateMetricDetail || `${activeNscCollection.auditedFolders.length} priority ${plural(activeNscCollection.auditedFolders.length, "folder")} screened`,
    ],
    [
      provenanceMarkerVerified,
      "Opening markers verified",
      activeNscCollection.markerMetricDetail || `${activeNscCollection.markerCorrectedCount || 0} corrected by hand; ${activeNscCollection.markerMismatchCount || 0} marker/Catalog mismatches; ${activeNscCollection.markerExceptionCount} unavailable or incomplete`,
    ],
    [formatByteSize(activeNscCollection.totalPdfBytes), "Online PDF corpus", activeNscCollection.corpusSizeNote || "Official NARA digital objects"],
  ];
  elements.nscMetrics.replaceChildren(...metrics.map(([value, title, detail]) => metric(value, title, detail)));

  const onlineRows = activeNscCollection.fileUnits.filter((row) => row.pdfUrl);
  const correctedRows = onlineRows.filter((row) => row.markerStatus === "verified with handwritten correction");
  const mismatchRows = onlineRows.filter((row) => row.markerStatus === "verified with catalog ID mismatch");
  const recordGroupRows = onlineRows.filter((row) => row.markerStatus === "verified with record-group exception");
  const ocrNormalizationRows = onlineRows.filter((row) => row.markerStatus === "verified with OCR normalization");
  const unverifiedRows = onlineRows.filter((row) => !isVerifiedMarker(row.markerStatus));
  const catalogOnlyRows = activeNscCollection.fileUnits.filter((row) => !row.pdfUrl);
  const exceptionParts = [];
  if (correctedRows.length) {
    const correctedIds = correctedRows.map((row) => row.localId).join(" and ");
    exceptionParts.push(
      `${correctedIds} ${correctedRows.length === 1 ? "carries a handwritten Folder ID correction" : "carry handwritten Folder ID corrections"} on the opening sheet`,
    );
  }
  if (mismatchRows.length) {
    const mismatchIds = mismatchRows.map((row) => row.localId).join(" and ");
    exceptionParts.push(
      `${mismatchIds} ${mismatchRows.length === 1 ? "retains a marker-to-Catalog Folder ID mismatch" : "retain marker-to-Catalog Folder ID mismatches"} in the ledger`,
    );
  }
  if (recordGroupRows.length) {
    exceptionParts.push(
      `${recordGroupRows.map((row) => row.localId).join(" and ")} ${recordGroupRows.length === 1 ? "identifies Donated Historical Materials on its opening marker" : "identify Donated Historical Materials on their opening markers"}`,
    );
  }
  if (ocrNormalizationRows.length) {
    exceptionParts.push(
      `${ocrNormalizationRows.map((row) => row.localId).join(" and ")} ${ocrNormalizationRows.length === 1 ? "retains a disclosed NARA OCR normalization" : "retain disclosed NARA OCR normalizations"}`,
    );
  }
  if (unverifiedRows.length) {
    exceptionParts.push(
      `${unverifiedRows.map((row) => row.localId).join(", ")} ${unverifiedRows.length === 1 ? "does" : "do"} not contain a complete opening marker`,
    );
  }
  if (catalogOnlyRows.length) {
    exceptionParts.push(`${catalogOnlyRows.length} catalog file units have no online PDF`);
  }
  const exceptionSummary = exceptionParts.length
    ? `${exceptionParts.join("; ")}. Any file without a complete online marker remains a catalog-derived locator and is not presented as a document-level Source Note.`
    : "No opening-sheet exceptions were found in this online series.";
  elements.nscProvenanceTitle.textContent = activeNscCollection.provenanceTitle;
  elements.nscProvenanceSummary.textContent =
    `${provenanceMarkerVerified} of ${provenanceOnlinePdfCount} online PDFs open with Bush Library provenance naming ${activeNscCollection.markerFieldSummary || "the record group, office, series, subseries, and folder"}. ${exceptionSummary}${activeNscCollection.provenanceQualifier ? ` ${activeNscCollection.provenanceQualifier}` : ""}`;
  elements.nscSeriesLink.href = activeNscCollection.catalogUrl;

  const candidates = activeNscCollection.candidateIds
    .map((id) => data.records.find((record) => record.id === id))
    .filter(Boolean);
  const locatorCount = candidates.filter((record) => record.sourceNoteStatus === "locator").length;
  const boundaryCount = candidates.filter((record) => record.selection === "Boundary").length;
  const withheldCount = candidates.filter((record) => record.releaseStatus === "Withheld").length;
  elements.nscCandidateTitle.textContent = activeNscCollection.candidateTitle;
  elements.nscCandidateDownload.href = activeNscCollection.candidateCsvUrl;
  elements.nscCandidateDownload.textContent = `Download ${activeNscCollection.candidateLabel.toLowerCase()} CSV`;
  elements.nscCandidateSummary.textContent = activeNscCollection.candidateSummary || (locatorCount
    ? `${candidates.length} file-unit leads, ordered by working date: ${candidates.length - boundaryCount} for direct Volume XXX review and ${boundaryCount} for cross-volume adjudication. All ${locatorCount} remain archival locators until individual documents are checked in the source images.`
    : `${candidates.length} document-level candidates from ${activeNscCollection.auditedFolders.length} fully audited PDFs, ordered by document date. The chronology includes ${withheldCount} separately identified ${plural(withheldCount, "record")} that were not declassified.`);
  renderNscCandidates(candidates);

  elements.nscFileDownload.href = activeNscCollection.fileUnitsCsvUrl;
  elements.nscFileDownload.textContent = activeNscCollection.fileUnitsDownloadLabel || `Download all ${activeNscCollection.fileUnits.length} file units`;
  elements.nscReportLink.href = activeNscCollection.reportUrl;
  elements.nscReportLink.textContent = "Open harvest report";
  filteredNscFileUnits = [...activeNscCollection.fileUnits];
  renderNscFileUnits(filteredNscFileUnits);
}

function renderNscCandidates(records) {
  elements.nscCandidatesRoot.replaceChildren();
  const groups = groupBy(records, (record) => record.date.slice(0, 4));
  for (const [year, yearRecords] of groups) {
    const section = document.createElement("section");
    section.className = "record-chapter year-group";
    section.setAttribute("aria-labelledby", `nsc-year-${year}`);
    const header = document.createElement("div");
    header.className = "record-chapter-header";
    header.innerHTML = `<h3 id="nsc-year-${year}">${year}</h3><p class="record-count">${yearRecords.length} ${plural(yearRecords.length, "candidate")}</p>`;
    const list = document.createElement("div");
    list.className = "record-list";
    yearRecords.forEach((record) => list.append(createRecordRow(record, "nsc-copy-")));
    section.append(header, list);
    elements.nscCandidatesRoot.append(section);
  }
}

function updateNscFileUnits() {
  if (!activeNscCollection) return;
  const query = elements.nscSearch.value.trim().toLowerCase();
  filteredNscFileUnits = activeNscCollection.fileUnits.filter((row) => {
    return (
      (!query || nscFileSearchText(row).includes(query)) &&
      (!elements.nscChapter.value || row.chapter === elements.nscChapter.value) &&
      (!elements.nscRouting.value || row.routing === elements.nscRouting.value) &&
      (!elements.nscMarker.value || row.markerStatus === elements.nscMarker.value) &&
      (!elements.nscSignal.value || fileUnitHasSignal(row, elements.nscSignal.value))
    );
  });
  renderNscFileUnits(filteredNscFileUnits);
}

function nscFileSearchText(row) {
  return [
    row.title,
    row.localId,
    row.naid,
    row.seriesTitle,
    row.markerRecordGroup,
    row.markerSeries,
    row.markerSubseries,
    row.chapter,
    row.routing,
    row.dateBasis,
    row.markerStatus,
    row.archivalLocator,
    ...(row.reviewTopics || []),
    row.reviewFocus,
    row.reviewKeyExtent,
    row.withdrawalMetadataNote,
    ...(row.economicSubjectLeads || []),
    ...(row.withdrawalItems || []).flatMap((item) => [
      item.title,
      item.sheetDisposition,
      item.canonicalMatch,
      item.possibleDuplicateMatch,
      item.crossCollectionMatch,
    ]),
    row.economicSignals?.total >= 20 ? "economic policy OCR signal" : "",
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function fileUnitHasSignal(row, signal) {
  const signals = row.reviewSignals || {};
  if (signal === "economic") return (row.economicSignals?.total || 0) >= 20;
  if (signal === "high-level") {
    return (signals.memosToPresident || 0) + (signals.memosToScowcroft || 0) + (signals.memosToPorter || 0) + (signals.memorandaOfConversation || 0) + (signals.meetingRecords || 0) > 0;
  }
  return {
    president: signals.memosToPresident || 0,
    scowcroft: signals.memosToScowcroft || 0,
    porter: signals.memosToPorter || 0,
    conversation: signals.memorandaOfConversation || 0,
    meeting: signals.meetingRecords || 0,
    withdrawal: signals.withdrawalSheets || 0,
  }[signal] > 0;
}

function renderNscFileUnits(rows) {
  elements.nscFileRoot.replaceChildren();
  const markerCount = rows.filter((row) => isVerifiedMarker(row.markerStatus)).length;
  const highLevelCount = rows.filter((row) => fileUnitHasSignal(row, "high-level")).length;
  elements.nscFileSummary.textContent =
    `${rows.length} of ${activeNscCollection.fileUnits.length} file units shown; ${markerCount} opening ${plural(markerCount, "marker")} verified; ${highLevelCount} ${plural(highLevelCount, "file unit")} with high-level document signals.`;

  if (!rows.length) {
    const empty = document.createElement("p");
    empty.className = "empty-chapter";
    empty.textContent = "No file units match the current filters.";
    elements.nscFileRoot.append(empty);
    return;
  }

  const groups = groupBy(rows, (row) => (row.workingStartDate.startsWith("9999") ? "Date not established" : row.workingStartDate.slice(0, 4)));
  for (const [year, yearRows] of groups) {
    const section = document.createElement("section");
    section.className = "nsc-file-year";
    const header = document.createElement("div");
    header.className = "record-chapter-header";
    const heading = document.createElement("h4");
    heading.textContent = year;
    const count = document.createElement("p");
    count.className = "record-count";
    count.textContent = `${yearRows.length} ${plural(yearRows.length, "file unit")}`;
    header.append(heading, count);
    const list = document.createElement("div");
    list.className = "nsc-file-list";
    yearRows.forEach((row) => list.append(createNscFileUnitRow(row)));
    section.append(header, list);
    elements.nscFileRoot.append(section);
  }
}

function createNscFileUnitRow(row) {
  const item = document.createElement("article");
  item.className = `nsc-file-row marker-${row.markerStatus.replaceAll(" ", "-")}`;

  const date = document.createElement("div");
  date.className = "nsc-file-date";
  const range = document.createElement("strong");
  range.textContent = workingDateRange(row);
  const basis = document.createElement("span");
  basis.textContent = row.dateBasis;
  date.append(range, basis);

  const body = document.createElement("div");
  body.className = "nsc-file-body";
  const title = document.createElement("h4");
  const titleLink = document.createElement("a");
  titleLink.href = row.pdfUrl || row.catalogUrl;
  titleLink.target = "_blank";
  titleLink.rel = "noreferrer";
  titleLink.textContent = row.title;
  title.append(titleLink);
  const meta = document.createElement("div");
  meta.className = "record-meta";
  [
    row.seriesTitle,
    row.chapter,
    row.routing,
    markerLabel(row.markerStatus),
    row.pdfUrl
      ? `${row.pdfPages ? `${row.pdfPages} ${plural(row.pdfPages, "page")}; ` : ""}${row.pdfBytes ? formatByteSize(row.pdfBytes) : "Size unmeasured"}`
      : "Catalog only",
  ].filter(Boolean).forEach((value) => meta.append(badge(value)));
  const signals = document.createElement("div");
  signals.className = "nsc-signals";
  reviewSignalPairs(row).forEach(([labelText, value]) => {
    if (value) signals.append(badge(`${value} ${labelText}`));
  });
  if (!signals.childElementCount) signals.append(badge("No high-level OCR signal"));

  const details = document.createElement("details");
  details.className = "record-source-note nsc-file-details";
  const summary = document.createElement("summary");
  summary.textContent = "Provenance and review signals";
  const sourceLabel = label(isVerifiedMarker(row.markerStatus) ? "Provenance stem - not a Source Note" : "Catalog-derived archival locator");
  const sourceText = row.provenanceStem || row.archivalLocator;
  const source = paragraph(sourceText, "record-frus-source-note");
  const signalNote = paragraph(
    `OCR review signals: ${reviewSignalPairs(row).map(([name, value]) => `${name} ${value}`).join("; ")}. These are search hits, not deduplicated document counts.`,
    "record-notes",
  );
  const markerNote =
    row.withdrawalMetadataNote ||
    row.markerChecks?.handwrittenCorrection ||
    row.markerChecks?.catalogMismatch ||
    row.markerChecks?.visualFolderIdCheck ||
    "";
  const actions = document.createElement("div");
  actions.className = "record-copy-actions";
  actions.append(copyButton(isVerifiedMarker(row.markerStatus) ? "Copy Provenance Stem" : "Copy Locator", sourceText));
  details.append(summary, sourceLabel, source);
  if (row.reviewFocus) {
    details.append(label("Compiler review note"), paragraph(row.reviewFocus, "record-notes"));
  }
  if (row.reviewKeyExtent) {
    details.append(label("Key extent and release evidence"), paragraph(row.reviewKeyExtent, "record-notes"));
  }
  if (markerNote) details.append(label("Provenance note"), paragraph(markerNote, "record-notes"));
  details.append(signalNote, actions);
  body.append(title, meta, signals, details);
  if (row.economicSubjectLeads?.length) body.append(createSubjectLeadLedger(row));
  if (row.withdrawalItems?.length) body.append(createWithdrawalLedger(row));

  const links = document.createElement("div");
  links.className = "record-links";
  links.append(link("Catalog", row.catalogUrl));
  if (row.pdfUrl) links.append(link("PDF", row.pdfUrl));
  links.append(badge(`NAID ${row.naid}`), badge(`OA/ID ${row.localId}`));
  item.append(date, body, links);
  return item;
}

function reviewSignalPairs(row) {
  return [
    ["economic-policy hits", row.economicSignals?.total || 0],
    ["memos to President", row.reviewSignals?.memosToPresident || 0],
    ["memos to Scowcroft", row.reviewSignals?.memosToScowcroft || 0],
    ["memos to Roger Porter", row.reviewSignals?.memosToPorter || 0],
    ["memcon hits", row.reviewSignals?.memorandaOfConversation || 0],
    ["meeting-record hits", row.reviewSignals?.meetingRecords || 0],
    ["withdrawal-sheet hits", row.reviewSignals?.withdrawalSheets || 0],
  ];
}

function workingDateRange(row) {
  if (row.workingDateLabel) return row.workingDateLabel;
  if (row.workingStartDate.startsWith("9999")) return "Date not established";
  const start = formatShortDate(row.workingStartDate);
  const end = formatShortDate(row.workingEndDate);
  return start === end ? start : `${start} to ${end}`;
}

function formatShortDate(value) {
  return new Date(`${value}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatByteSize(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Size unmeasured";
  if (bytes >= 1_073_741_824) return `${(bytes / 1_073_741_824).toFixed(2)} GiB`;
  return `${(bytes / 1_048_576).toFixed(1)} MiB`;
}

function renderSources() {
  elements.sourceGrid.replaceChildren();
  data.sourceCollections.forEach((source) => {
    const anchor = document.createElement("a");
    anchor.href = source.url;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    anchor.innerHTML = `<span>${escapeHtml(source.owner)}</span><strong>${escapeHtml(source.name)}</strong><p>${escapeHtml(source.role)}</p>`;
    elements.sourceGrid.append(anchor);
  });
}

function renderGaps() {
  const priorities = ["Critical", "High", "Medium"];
  elements.gapRoot.replaceChildren();
  priorities.forEach((priority) => {
    const matching = data.gaps.filter((gap) => gap.priority === priority);
    if (!matching.length) return;
    const group = document.createElement("section");
    group.className = "gap-priority";
    const header = document.createElement("div");
    header.className = "record-chapter-header";
    header.innerHTML = `<h3>${priority}</h3><p class="record-count">${matching.length} open ${plural(matching.length, "gap")}</p>`;
    const list = document.createElement("div");
    list.className = "gap-list";
    matching.forEach((gap) => {
      const card = document.createElement("article");
      card.className = "gap-card";
      card.innerHTML = `<p class="record-type">${escapeHtml(gap.scope)}</p><h3>${escapeHtml(gap.title)}</h3><p>${escapeHtml(gap.action)}</p>`;
      list.append(card);
    });
    group.append(header, list);
    elements.gapRoot.append(group);
  });
}

function updatePublicReferences() {
  const query = elements.publicSearch.value.trim().toLowerCase();
  const records = data.publicReferences.filter((record) => {
    const haystack = [record.title, record.type, record.source, ...(record.topics || [])].join(" ").toLowerCase();
    return (!query || haystack.includes(query)) && (!elements.publicType.value || record.type === elements.publicType.value);
  });
  renderPublicReferences(records);
}

function renderPublicReferences(records) {
  elements.publicRoot.replaceChildren();
  elements.publicSummary.textContent = `${records.length} official public ${plural(records.length, "reference")}.`;
  const list = document.createElement("div");
  list.className = "record-list";
  records.forEach((record) => {
    const row = document.createElement("article");
    row.className = "record-row public-statement-row";
    const dateStack = document.createElement("div");
    dateStack.className = "record-date-stack";
    const date = document.createElement("time");
    date.className = "record-date";
    date.dateTime = record.date;
    date.textContent = new Date(`${record.date}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
    dateStack.append(date);
    const body = document.createElement("div");
    const title = document.createElement("a");
    title.className = "record-title";
    title.href = record.url;
    title.target = "_blank";
    title.rel = "noreferrer";
    title.textContent = record.title;
    const meta = document.createElement("div");
    meta.className = "record-meta";
    [record.type, record.source, record.selection].filter(Boolean).forEach((value) => meta.append(badge(value)));
    const topics = document.createElement("div");
    topics.className = "record-topics";
    record.topics.forEach((topic) => topics.append(badge(topic)));
    body.append(title, meta, topics);
    const links = document.createElement("div");
    links.className = "record-links";
    links.append(link("Official text", record.url));
    row.append(dateStack, body, links);
    list.append(row);
  });
  elements.publicRoot.append(list);
}

function downloadFilteredCsv() {
  const fields = ["id", "date", "title", "heading", "dateline", "type", "subjectArea", "selection", "releaseStatus", "pageCount", "withheldPages", "classification", "naid", "localId", "sourceNoteStatus", "sourceNote", "archivalLocator", "catalogUrl", "pdfUrl", "datePrecision", "dateBasis", "displayDateLabel", "sortDate", "documentUrl", "provenanceUrl"];
  const csv = [
    fields.map(csvCell).join(","),
    ...filteredRecords.map((record) => fields.map((field) => csvCell(record[field])).join(",")),
  ].join("\n");
  triggerCsvDownload(csv, "frus1989-92v30-filtered-register.csv");
}

function downloadFilteredNscCsv() {
  const fields = [
    "naid",
    "workingStartDate",
    "workingEndDate",
    "workingDateLabel",
    "dateBasis",
    "title",
    "localId",
    "seriesNaid",
    "seriesTitle",
    "subjectArea",
    "selection",
    "routing",
    "markerStatus",
    "markerRecordGroup",
    "markerSeries",
    "markerSubseries",
    "hasOnlinePdf",
    "accessStatus",
    "pdfPages",
    "pdfBytes",
    "catalogPdfBytes",
    "pdfByteBasis",
    "memosToPresident",
    "memosToScowcroft",
    "memorandaOfConversation",
    "meetingRecords",
    "withdrawalSheets",
    "economicSignalTotal",
    "economySignals",
    "financeSignals",
    "tradeSignals",
    "assistanceSanctionsSignals",
    "energySignals",
    "agricultureSignals",
    "treasurySignals",
    "withheldItemCount",
    "withheldPages",
    "rawWithdrawalSheetHeaderCount",
    "withdrawalInventoryHeaderCount",
    "withdrawalSheetItemCount",
    "withdrawalSheetPages",
    "releasedInPartSheetCount",
    "noCopyIndicatedSheetCount",
    "economicSubjectLeadCount",
    "relevantWithdrawalSheetCount",
    "economicSubjectLeads",
    "withdrawalMetadataNote",
    "withdrawalInventory",
    "archivalLocator",
    "provenanceStem",
    "catalogUrl",
    "pdfUrl",
  ];
  const rows = filteredNscFileUnits.map((row) => ({
    ...row,
    subjectArea: row.chapter,
    ...row.reviewSignals,
    economicSignalTotal: row.economicSignals?.total ?? "",
    economySignals: row.economicSignals?.economy ?? "",
    financeSignals: row.economicSignals?.finance ?? "",
    tradeSignals: row.economicSignals?.trade ?? "",
    assistanceSanctionsSignals: row.economicSignals?.assistanceSanctions ?? "",
    energySignals: row.economicSignals?.energy ?? "",
    agricultureSignals: row.economicSignals?.agriculture ?? "",
    treasurySignals: row.economicSignals?.treasury ?? "",
    economicSubjectLeadCount: row.economicSubjectLeads?.length || 0,
    economicSubjectLeads: JSON.stringify(row.economicSubjectLeads || []),
    withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
  }));
  const csv = [
    fields.map(csvCell).join(","),
    ...rows.map((row) => fields.map((field) => csvCell(row[field])).join(",")),
  ].join("\n");
  triggerCsvDownload(csv, `frus1989-92v30-${activeNscCollection.id}-filtered-file-units.csv`);
}

function triggerCsvDownload(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function csvCell(value) {
  const normalized = Array.isArray(value) ? value.join("; ") : value ?? "";
  return `"${String(normalized).replaceAll('"', '""')}"`;
}

function groupBy(values, getter) {
  const result = new Map();
  values.forEach((value) => {
    const key = getter(value);
    if (!result.has(key)) result.set(key, []);
    result.get(key).push(value);
  });
  return result;
}

function plural(count, word) {
  return count === 1 ? word : `${word}s`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
