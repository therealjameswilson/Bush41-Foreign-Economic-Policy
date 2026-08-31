const data = window.VOLUME_DATA;

if (!data) {
  throw new Error("Volume data did not load.");
}

const elements = {
  recordsRoot: document.querySelector("#records-root"),
  recordsSummary: document.querySelector("#records-summary"),
  search: document.querySelector("#record-search"),
  chapter: document.querySelector("#chapter-filter"),
  type: document.querySelector("#type-filter"),
  release: document.querySelector("#release-filter"),
  sourceNote: document.querySelector("#source-note-filter"),
  selection: document.querySelector("#selection-filter"),
  clear: document.querySelector("#clear-filters"),
  downloadFiltered: document.querySelector("#download-filtered"),
  chapterGrid: document.querySelector("#chapter-grid"),
  compilerMetrics: document.querySelector("#compiler-metrics"),
  sourceGrid: document.querySelector("#source-grid"),
  gapRoot: document.querySelector("#gap-root"),
  publicRoot: document.querySelector("#public-root"),
  publicSearch: document.querySelector("#public-search"),
  publicType: document.querySelector("#public-type-filter"),
  publicClear: document.querySelector("#public-clear"),
  publicSummary: document.querySelector("#public-summary"),
  toast: document.querySelector("#toast"),
};

let filteredRecords = [...data.records];

initialize();

function initialize() {
  renderStats();
  populateFilters();
  renderChapters();
  renderCompilerMetrics();
  renderSources();
  renderGaps();
  renderPublicReferences(data.publicReferences);
  renderRecords(data.records);
  bindEvents();
  document.querySelector("#chapter-scope-note").textContent = data.meta.scopeNote;
  document.querySelector("#boundary-note").textContent = data.meta.boundaryNote;
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
  addOptions(elements.chapter, data.chapters.map((chapter) => chapter.name), "All chapters");
  addOptions(elements.type, unique(data.records.map((record) => record.type)), "All record types");
  addOptions(elements.release, unique(data.records.map((record) => record.releaseStatus)), "All release states");
  addOptions(elements.sourceNote, ["verified", "draft", "locator"], "All Source Note states", sourceNoteLabel);
  addOptions(elements.selection, ["Core", "Consider", "Boundary"], "All selection states");
  addOptions(elements.publicType, unique(data.publicReferences.map((record) => record.type)), "All types");
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
  [elements.search, elements.chapter, elements.type, elements.release, elements.sourceNote, elements.selection].forEach((control) => {
    control.addEventListener(control.tagName === "INPUT" ? "input" : "change", updateRecords);
  });

  elements.clear.addEventListener("click", () => {
    [elements.search, elements.chapter, elements.type, elements.release, elements.sourceNote, elements.selection].forEach((control) => {
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

  document.querySelector("#show-boundary").addEventListener("click", () => {
    elements.selection.value = "Boundary";
    updateRecords();
    document.querySelector("#chronology").scrollIntoView({ behavior: "smooth" });
  });
}

function updateRecords() {
  const query = elements.search.value.trim().toLowerCase();
  filteredRecords = data.records.filter((record) => {
    return (
      (!query || recordSearchText(record).includes(query)) &&
      (!elements.chapter.value || record.chapter === elements.chapter.value) &&
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
    record.chapter,
    record.selection,
    record.releaseStatus,
    record.classification,
    record.naid,
    record.localId,
    record.sourceNote,
    record.archivalLocator,
    record.notes,
    ...(record.topics || []),
    ...(record.withdrawalItems || []).map((item) => item.title),
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
  const withheld = records.filter((record) => record.releaseStatus === "Withheld").length;
  const verified = records.filter((record) => record.sourceNoteStatus === "verified").length;
  return `${records.length} ${plural(records.length, "record")} shown; ${released} ${plural(released, "released document")}; ${withheld} ${plural(withheld, "separately identified withheld item")}; ${verified} ${plural(verified, "verified Source Note")}.`;
}

function createRecordRow(record) {
  const row = document.createElement("article");
  row.className = `record-row record-state-${record.sourceNoteStatus} selection-${record.selection.toLowerCase()}`;
  row.id = record.id;

  const dateStack = document.createElement("div");
  dateStack.className = "record-date-stack";
  const date = document.createElement("time");
  date.className = "record-date";
  date.dateTime = record.date;
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
  titleLink.href = record.pdfUrl || record.catalogUrl;
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
    record.chapter,
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
  if (record.withdrawalItems?.length) body.append(createWithdrawalLedger(record));

  const links = document.createElement("div");
  links.className = "record-links";
  links.append(link("Catalog", record.catalogUrl));
  if (record.pdfUrl) links.append(link("PDF", record.pdfUrl));
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
  const total = record.withdrawalItems.reduce((sum, item) => sum + item.pages, 0);
  summary.textContent = `${record.withdrawalItems.length}-item withdrawal ledger (${total} pages)`;
  const tableWrap = document.createElement("div");
  tableWrap.className = "table-wrap";
  const table = document.createElement("table");
  table.innerHTML = "<thead><tr><th>Item</th><th>Description</th><th>Marking</th><th>Pages</th></tr></thead>";
  const tbody = document.createElement("tbody");
  record.withdrawalItems.forEach((item) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${escapeHtml(item.item)}</td><td>${escapeHtml(item.title)}</td><td>${escapeHtml(item.classification)}</td><td>${item.pages}</td>`;
    tbody.append(tr);
  });
  table.append(tbody);
  tableWrap.append(table);
  details.append(summary, tableWrap);
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
  if (record.datePrecision === "year") return `${record.date.slice(0, 4)} (date not established)`;
  return new Date(`${record.date}T12:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
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

function renderChapters() {
  elements.chapterGrid.replaceChildren();
  data.chapters.forEach((chapter) => {
    const count = data.records.filter((record) => record.chapter === chapter.name).length;
    const core = data.records.filter((record) => record.chapter === chapter.name && record.selection === "Core").length;
    const card = document.createElement("a");
    card.className = "chapter-card";
    card.href = "#chronology";
    card.innerHTML = `
      <p class="chapter-number">Chapter ${chapter.number}</p>
      <h3>${escapeHtml(chapter.name)}</h3>
      <p>${escapeHtml(chapter.description)}</p>
      <p class="chapter-count">${count} candidates; ${core} core</p>
      <span class="chapter-action">Open chronology</span>
    `;
    card.addEventListener("click", () => {
      elements.chapter.value = chapter.name;
      updateRecords();
    });
    elements.chapterGrid.append(card);
  });
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
  const fields = ["id", "date", "title", "heading", "dateline", "type", "chapter", "selection", "releaseStatus", "pageCount", "withheldPages", "classification", "naid", "localId", "sourceNoteStatus", "sourceNote", "archivalLocator", "catalogUrl", "pdfUrl"];
  const csv = [
    fields.map(csvCell).join(","),
    ...filteredRecords.map((record) => fields.map((field) => csvCell(record[field])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "frus1989-92v30-filtered-register.csv";
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
