# Bush41 Foreign Economic Policy

An independent FRUS compiler workbench for **Foreign Relations of the United States, 1989-1992, Volume XXX, Foreign Economic Policy**.

The official volume is currently [Being Researched](https://history.state.gov/historicaldocuments/frus1989-92v30), and the Office of the Historian has not published a table of contents. The site's five chapters are therefore a provisional working arrangement.

## What is in the workbench

- A global chronology of released documents, withdrawn items, meeting packets, and file-unit leads.
- Source-image-checked FRUS-style Source Notes kept distinct from drafts and archival locators.
- Copy-ready heading, dateline, and provenance blocks for each candidate.
- Exact page extents for four separately identified withheld records and the withdrawal ledger in NSC0030.
- Direct NARA Catalog/PDF links, a selective Public Papers register, official source map, and compiler gap ledger.
- CSV and JSON exports.

## NSC staff files

The NSC files section begins with the complete [Timothy E. Deal Subject Files](https://catalog.archives.gov/id/2554810): 134 online file units in working chronological order. It includes a document-level chronology for the PDFs audited to date, plus a filterable series ledger with official Catalog and PDF links, provenance-marker status, and OCR review signals.

The first page of each PDF is treated as the provenance authority. A Source Note is marked verified only after that marker and the document's terminal classification have been checked. One PDF lacks the opening marker and is kept as a catalog-derived locator. OCR-derived date spans and search hits are triage aids, not document-level findings.

## Chapter plan

1. Trade Policy and Market Access
2. Monetary Policy, Debt, and International Institutions
3. Economic Summits and Industrialized-Country Cooperation
4. Transition Economies and International Economic Strategy
5. Strategic Trade, Technology, and Investment Controls

NAFTA and the central Canada/Mexico record are retained in a boundary queue because they belong primarily to FRUS Volume XXXIII.

## Build and validate

The checked-in site is static. To refresh the Tim Deal series from NARA, then rebuild the generated data from the collection files and adjacent Western Europe presidential-conversation register:

```sh
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
