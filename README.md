# Bush41 Foreign Economic Policy

An independent FRUS compiler workbench for **Foreign Relations of the United States, 1989-1992, Volume XXX, Foreign Economic Policy**.

The official volume is currently [Being Researched](https://history.state.gov/historicaldocuments/frus1989-92v30). This workbench arranges every proposed document in one continuous chronology. Subject-area metadata supports search and archival screening only; it does not divide the volume into topical chapters.

## What is in the workbench

### Proposed FRUS selections

The [Proposed Selections section](https://therealjameswilson.github.io/Bush41-Foreign-Economic-Policy/#frus-selections) presents an expanding set of proposed documents and supporting memoranda for annotation, with particular attention to papers to or from Brent Scowcroft. Institutional proposals examine IMF quotas and concessional lending, World Bank and IDA resources, development-bank voting, EBRD rules, and coordination of development finance. The site derives current totals and selection-pass counts from the proposal records. This selective set does not claim complete coverage of the administration or any collection.

Each proposal includes an editorial rationale, FRUS-style heading and Source Note, exact document-page links, a separate link to **PDF page 1**, a thumbnail and transcription of that page's provenance marker, and questions about dates, attachments, copy choice, or approval. Proposals remain in chronological order and can be filtered by selection pass, Scowcroft's role, or proposed treatment. Institutional names and mechanisms are searchable. The same document appears once in the master chronology; the proposal section adds a selection assessment to it.

The first institutions pass contains 30 item-level records, with 24 directly to or from Scowcroft, and remains separately available through the selection-pass filter. Additional institutional proposals appear as a distinct follow-up pass. The source evidence preserves the partial release of the January 25, 1990 breakfast paper, the undated Philippine-loan memorandum, and the month-only date of the draft IMF-ESAF report. Folder 91139–013 uses the first-page marker’s February 1991 title despite the Catalog’s February 1990 title. The initial pass adds seven item-level records and revisits four existing Tim Deal records. The marked March 15 and March 20 Paris copies have terminal Confidential stamps, which correct the earlier citation based only on the printed “Unclassified with Confidential Attachment” wording. The June 25 Houston paper names both Baker and Brady. The China-lending memorandum remains undated, with blank approval lines; its July 1 sorting reference comes from the covering memorandum. Its conflicting $700 billion / $700 million figures are explicitly flagged.

The institutional follow-up adds **15 candidates: 14 proposed documents and one memorandum for annotation**, eight to or from Scowcroft. The complete set now contains 60 proposals supported by 25 first-page provenance sheets. New papers cover private-sector debt alternatives, Treasury’s development-finance designs, World Bank voting, IMF quota authorization, environmental financing, and multilateral trade rules. The signed Bush–Kohl letter retains its dispatch hold and later-version caveat; the GEF talking points remain undated and unattributed. Scowcroft’s signed April 17, 1989 reply is linked to the earlier trade-review recommendation. Letters with substantive enclosures are counted once, with their complete selected extent identified.

A separate Deal pass adds four source-verified memoranda on the Brady debt strategy (March 7 and 8, 1989), a Philippine World Bank vote (May 3), and Polish debt and assistance options (May 25). Their document numbers, the March 8/March 9 dating discrepancy, classification wording, and omitted places where none appears in the source are preserved.

- Editorial input: `data/frus-selections-source.json`; enrichment and exports: `scripts/frus-selections.js` through `npm run build:data`.
- Downloads: `data/frus-selections.md`, `data/frus-selections.csv`, and `data/frus-selections.json`.

The selection model is [FRUS, 1977–1980, Volume III, Foreign Economic Policy](https://history.state.gov/historicaldocuments/frus1977-80v03). A visible, downloadable guide draws on its preface, source discussion, and seven documents (146, 163, 233, 258, 262, 273, and 304). Each proposal identifies its role in a policy decision, an individual editorial assessment, and the next evidence to seek. The guide favors consequential choices, comparison across economic agencies, and connections between advice, negotiation, and disposition; it also identifies where extracts or annotation may suffice. These are working judgments, not changes to source verification or final selection decisions. Carter examples are editorial models, not provenance for Bush documents. The single Bush chronology and NARA first-page provenance remain controlling.

- Editorial model and assessments: `data/frus-editorial-model.json`; downloadable guide: `data/frus-editorial-model.md`.
- Proposal JSON, CSV, Markdown, and copy actions include the individual assessments and links to their Carter-volume examples.
- Audit: `reports/frus-selections-source-audit.json`, including Catalog-to-object matches, downloaded-PDF hashes, and exact visual-review scope. Thumbnail images are rendered from official PDF first pages; originals remain at NARA.
- Validation: `npm run validate:selections` checks provenance chains, page bounds, chronology/export agreement, undated status, authorship, and the documented classification exceptions.

### Existing register

- A single global chronology of released documents, withdrawn items, meeting packets, and file-unit leads.
- Source-image-checked FRUS-style Source Notes kept distinct from drafts and archival locators.
- Copy-ready heading, dateline, and provenance blocks for each candidate.
- Exact page extents for separately identified withheld records and the withdrawal ledger in NSC0030.
- Direct NARA Catalog/PDF links, a selective Public Papers register, official source map, and compiler gap ledger.
- CSV and JSON exports.

## Archival collection files

The collection workbench currently includes twelve complete Catalog collections or series, plus a selected two-folder Gates audit:

- [National Security Council Institutional Files Transition Files](https://catalog.archives.gov/id/348937136): all 30 file units, all 30 official PDFs, and all 3,612 served-PDF pages. Every opening provenance marker, full OCR transcript, and withdrawal-sheet description was checked. The audit surfaces four deduplicated leads totaling 304 PDF pages: two direct Volume XXX leads and two boundary or compiler-context leads. The ledger preserves source-supported month and season labels instead of inventing day dates, and it records repeated copies of the retained-files memorandum without promoting them as separate candidates.
- [Brent Scowcroft Papers](https://catalog.archives.gov/id/4522156): all 20 component series, all 676 file units, and all 676 official PDFs in working chronological order. The complete hierarchy, 67.5 million characters of NARA OCR, and every opening provenance marker were screened. The audit surfaces 95 file-level leads: 66 for direct Volume XXX review and 29 for cross-volume adjudication. Served sizes total at least 15.7 GB across 660 PDFs; 16 sizes were unavailable, so no complete page or byte extent is asserted. Duplicate meeting, special-separate, schedule, call-log, and communication-channel copies remain in the ledger without being promoted as separate candidates.
- [H-Files - National Security Directive Files](https://catalog.archives.gov/id/313189290): all 108 file units, including 106 online PDFs and two Catalog-only units, totaling 5,243 served-PDF pages. Every online opening provenance marker, full OCR transcript, and withdrawal-sheet description was checked. The audit surfaces 33 pertinent files totaling 1,946 served-PDF pages: 11 direct Volume XXX leads and 22 cross-volume boundary leads. One review lead is itself Catalog-only and carries no asserted page extent. The ledger explicitly preserves 13 handwritten Folder ID corrections, nine opening-marker-to-Catalog ID mismatches, and seven working dates documented by withdrawal sheets or an action profile.
- [H-Files - National Security Review Files](https://catalog.archives.gov/id/313189297): all 65 file units and all 65 official PDFs, totaling 3,024 served-PDF pages. Every opening provenance marker, full OCR transcript, and withdrawal-sheet description was checked. The audit surfaces 21 pertinent files totaling 1,114 PDF pages: 10 direct Volume XXX leads and 11 cross-volume boundary leads. The ledger explicitly preserves one handwritten Folder ID correction and two opening-marker-to-Catalog ID mismatches.
- [H-Files - National Security Council/Deputies Committee Meetings Follow-up Files](https://catalog.archives.gov/id/312294094): all 112 file units and all 112 official PDFs, totaling 1,887 served-PDF pages. Every opening provenance sheet and full OCR transcript was checked. Withdrawal-sheet and content review surfaces 29 pertinent files totaling 628 PDF pages: 8 direct Volume XXX leads and 21 cross-volume boundary leads. Notes identify companion main meeting packets and preserve source-documented corrections to several Catalog or folder dates.
- [H-Files - National Security Council/Deputies Committee Meetings Files](https://catalog.archives.gov/id/312294079): all 492 file units, including 479 online PDFs and 13 catalog-only files. All 479 opening provenance sheets were checked; two Folder IDs are corrected by hand on the marker. A complete title and OCR sweep surfaces 79 pertinent files totaling 5,995 PDF pages: 47 direct Volume XXX leads and 32 cross-volume boundary leads.
- [H-Files - National Security Council Meeting Files](https://catalog.archives.gov/id/312293887): all 90 file units, with all 90 opening provenance sheets verified. A title review and full-series economic OCR sweep surface 35 pertinent files totaling 1,854 PDF pages: 13 direct Volume XXX leads and 22 cross-volume boundary leads.
- [Timothy E. Deal Summit Briefing Books Files](https://catalog.archives.gov/id/2554817): all 17 Houston and London Economic Summit briefing-book files and all 1,248 served-PDF pages in event chronology. Every opening provenance marker and individual withdrawal sheet was checked. The audit surfaces 13 Core and four Consider leads and preserves 104 uniquely described withdrawals totaling 324 pages. The first six opening sheets say Summit Briefing Books and the remaining eleven say Summit Briefing Books Files, and each locator preserves that wording. Nine London files have later withdrawal sheets labeled Subject Files, and CF00960–013 has later sheets attributed to the Deal-Reiss files; the opening marker controls each file-level locator, and possible duplicate briefing papers remain flagged for controlling-copy review.
- [Timothy E. Deal and Mitchell B. Reiss' Economic Summit Files](https://catalog.archives.gov/id/2554819): all 25 file units, all 25 official PDFs, and all 1,683 served-PDF pages in working chronology. The audit surfaces six Core, nine Consider, and ten Boundary leads and extracts 142 withdrawal/redaction sheet descriptions totaling 540 pages. Eight sheets explicitly say a released-in-part copy follows; 134 do not indicate a copy, which is not treated as proof of current nonrelease. Three opening-marker Folder IDs differ from the Catalog paths, and every discrepancy remains explicit. The First Plenary Paris memcon is matched to its released canonical record rather than promoted as a duplicate.
- [Timothy E. Deal Chronological Files](https://catalog.archives.gov/id/2554807): all 96 monthly file units, all 96 official PDFs, and all 9,093 served-PDF pages in month-level chronology. Every opening marker, the complete NARA OCR corpus, and every individual withdrawal/redaction sheet was checked. The screen surfaces 76 Core and 20 Consider file leads, 708 economic-policy subject lines, and 275 pertinent descriptions among 697 individual sheets covering 2,121 pages. The 813 raw withdrawal headers are explicitly separated into 116 inventory-sheet headers and those 697 individual sheets; none says that a released-in-part copy follows, which is not treated as proof of current nonrelease. Sixty-nine same-title/date groups involving 152 sheet entries and seven cross-collection title matches remain flagged for source-image and controlling-copy comparison. The 3.86 GiB corpus size follows Catalog objectFileSize metadata because live HTTP sizes were measurable for 94 PDFs and unavailable for two.
- [Timothy E. Deal Subject Files](https://catalog.archives.gov/id/2554810): all 134 file units in working chronological order, plus a document-level chronology for the PDFs audited to date.
- [White House Office of Policy Development records](https://catalog.archives.gov/id/2163585): all 62 component series and all 3,239 file units are retained in a complete downloadable ledger. A transparent title screen surfaces 396 foreign-economic or cross-volume review rows, and 69 file-unit leads with source-supported dates enter the single volume chronology. NARA supplies 98 online PDFs; extracted text verifies 91 opening file markers and retains seven OCR exceptions. Page 1 of the [Bush Library finding aid](https://www.bush41library.gov/digital-research-room/finding-aid/records-white-house-office-policy-development-george-h-w-bush) controls collection-level provenance. Every chronology entry remains a locator pending document-level source-image review.
- Robert M. Gates Files, Middle East - Economic Strategy [1] and [2]: a selected two-folder, 250-page audit with 21 document candidates and source-image-checked Source Notes. This is not represented as complete coverage of the Gates series.

Collection tabs keep each series' candidate chronology, provenance accounting, filterable full-series ledger, official links, and CSV exports together. The same interface can accept additional NSC collections without collapsing their archival identities.

The first page of each PDF is treated as the provenance authority, with discrepancies checked against the withdrawal sheets, Catalog record, and official digital-object path. A Source Note is marked verified only after that provenance and the document's terminal classification have been checked. The 95 Scowcroft, 17 Deal Summit, 25 Deal-Reiss, 96 Deal Chronological, 4 IF Transition, 33 NSD, 21 NSR, 29 follow-up, 79 NSC/DC, and 35 NSC Meetings entries remain archival locators because the documents inside have not yet received that item-level review. One Scowcroft marker identifies Donated Historical Materials, one requires a disclosed NARA OCR normalization, one NSD review lead is Catalog-only, three Deal-Reiss marker Folder IDs conflict with their Catalog paths, and one Tim Deal Subject Files PDF lacks the opening marker. All remain explicitly qualified. OCR-derived search hits are triage aids, not document-level findings; working dates are changed only where a withdrawal, action-profile, briefing-book cover, or meeting sheet in the official PDF supplies the date or corrects an evident folder error. Deal Chronological folders retain month precision rather than acquiring invented day dates.

Scowcroft locators use the collection naming and archival order found in a [published FRUS Source Note](https://history.state.gov/historicaldocuments/frus1989-92v31/d38): George H.W. Bush Library, Bush Presidential Records, Brent Scowcroft Collection, series, subseries where supplied, OA/ID, and folder. They are deliberately not presented as final Source Notes until a compiler verifies an individual document's heading, dateline, terminal classification, release status, exact extent, and controlling copy.

## Chronological arrangement

The prospective volume is presented as one date-ordered sequence for 1989-1992. Searchable subject areas and topic tags remain attached to records as research metadata, but they do not create chapters, separate chronologies, or topical document groups. NAFTA and the central Canada/Mexico record remain identified for cross-volume routing because they belong primarily to FRUS Volume XXXIII.

## Build and validate

The checked-in site is static. To refresh the eleven archival collection tabs from NARA, then rebuild the generated data from the collection files and adjacent Western Europe presidential-conversation register:

```sh
npm run harvest:scowcroft
npm run harvest:deal-summit
npm run harvest:deal-reiss
npm run harvest:deal-chron
npm run harvest:if-transition
npm run harvest:nsd
npm run harvest:nsr
npm run harvest:nsc-dc-follow-up
npm run harvest:nsc-dc-meetings
npm run harvest:nsc-meetings
npm run harvest:tim-deal
npm run harvest:policy-development
npm run build:data
npm run check
```

Serve locally from the repository root:

```sh
python3 -m http.server 4173
```

Then open `http://localhost:4173/`.

## Editorial rule

Only document-level records supported by a citation marker or equivalent source-image evidence are labeled **Source Note verified**. Catalog hierarchy produces a **draft** or an **archival locator**, never an invented final citation. URLs and NARA identifiers remain separate from Source Note prose unless they are part of the archival citation itself.

This project is not an official publication of the Department of State, the National Archives, or the George H.W. Bush Presidential Library.
