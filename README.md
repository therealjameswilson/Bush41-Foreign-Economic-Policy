# Bush41 Foreign Economic Policy

An independent FRUS compiler workbench for **Foreign Relations of the United States, 1989-1992, Volume XXX, Foreign Economic Policy**.

The official volume is currently [Being Researched](https://history.state.gov/historicaldocuments/frus1989-92v30), and the Office of the Historian has not published a table of contents. The site's five chapters are therefore a provisional working arrangement.

## What is in the workbench

- A global chronology of released documents, withdrawn items, meeting packets, and file-unit leads.
- Source-image-checked FRUS-style Source Notes kept distinct from drafts and archival locators.
- Copy-ready heading, dateline, and provenance blocks for each candidate.
- Exact page extents for separately identified withheld records and the withdrawal ledger in NSC0030.
- Direct NARA Catalog/PDF links, a selective Public Papers register, official source map, and compiler gap ledger.
- CSV and JSON exports.

## NSC staff files

The collection workbench currently includes six complete Catalog series:

- [H-Files - National Security Directive Files](https://catalog.archives.gov/id/313189290): all 108 file units, including 106 online PDFs and two Catalog-only units, totaling 5,243 served-PDF pages. Every online opening provenance marker, full OCR transcript, and withdrawal-sheet description was checked. The audit surfaces 33 pertinent files totaling 1,946 served-PDF pages: 11 direct Volume XXX leads and 22 cross-volume boundary leads. One review lead is itself Catalog-only and carries no asserted page extent. The ledger explicitly preserves 13 handwritten Folder ID corrections, nine opening-marker-to-Catalog ID mismatches, and seven working dates documented by withdrawal sheets or an action profile.
- [H-Files - National Security Review Files](https://catalog.archives.gov/id/313189297): all 65 file units and all 65 official PDFs, totaling 3,024 served-PDF pages. Every opening provenance marker, full OCR transcript, and withdrawal-sheet description was checked. The audit surfaces 21 pertinent files totaling 1,114 PDF pages: 10 direct Volume XXX leads and 11 cross-volume boundary leads. The ledger explicitly preserves one handwritten Folder ID correction and two opening-marker-to-Catalog ID mismatches.
- [H-Files - National Security Council/Deputies Committee Meetings Follow-up Files](https://catalog.archives.gov/id/312294094): all 112 file units and all 112 official PDFs, totaling 1,887 served-PDF pages. Every opening provenance sheet and full OCR transcript was checked. Withdrawal-sheet and content review surfaces 29 pertinent files totaling 628 PDF pages: 8 direct Volume XXX leads and 21 cross-volume boundary leads. Notes identify companion main meeting packets and preserve source-documented corrections to several Catalog or folder dates.
- [H-Files - National Security Council/Deputies Committee Meetings Files](https://catalog.archives.gov/id/312294079): all 492 file units, including 479 online PDFs and 13 catalog-only files. All 479 opening provenance sheets were checked; two Folder IDs are corrected by hand on the marker. A complete title and OCR sweep surfaces 79 pertinent files totaling 5,995 PDF pages: 47 direct Volume XXX leads and 32 cross-volume boundary leads.
- [H-Files - National Security Council Meeting Files](https://catalog.archives.gov/id/312293887): all 90 file units, with all 90 opening provenance sheets verified. A title review and full-series economic OCR sweep surface 35 pertinent files totaling 1,854 PDF pages: 13 direct Volume XXX leads and 22 cross-volume boundary leads.
- [Timothy E. Deal Subject Files](https://catalog.archives.gov/id/2554810): all 134 file units in working chronological order, plus a document-level chronology for the PDFs audited to date.

Collection tabs keep each series' candidate chronology, provenance accounting, filterable full-series ledger, official links, and CSV exports together. The same interface can accept additional NSC collections without collapsing their archival identities.

The first page of each PDF is treated as the provenance authority, with discrepancies checked against the withdrawal sheets, Catalog record, and official digital-object path. A Source Note is marked verified only after that provenance and the document's terminal classification have been checked. The 33 NSD, 21 NSR, 29 follow-up, 79 NSC/DC, and 35 NSC Meetings entries remain archival locators because the documents inside have not yet received that item-level review. One NSD review lead is Catalog-only, and one Tim Deal PDF lacks the opening marker; both remain catalog-derived locators. OCR-derived search hits are triage aids, not document-level findings; working dates are changed only where a withdrawal, action-profile, or meeting sheet in the official PDF supplies the date or corrects an evident folder error.

## Chapter plan

1. Trade Policy and Market Access
2. Monetary Policy, Debt, and International Institutions
3. Economic Summits and Industrialized-Country Cooperation
4. Transition Economies and International Economic Strategy
5. Strategic Trade, Technology, and Investment Controls

NAFTA and the central Canada/Mexico record are retained in a boundary queue because they belong primarily to FRUS Volume XXXIII.

## Build and validate

The checked-in site is static. To refresh the six NSC series from NARA, then rebuild the generated data from the collection files and adjacent Western Europe presidential-conversation register:

```sh
npm run harvest:nsd
npm run harvest:nsr
npm run harvest:nsc-dc-follow-up
npm run harvest:nsc-dc-meetings
npm run harvest:nsc-meetings
npm run harvest:tim-deal
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
