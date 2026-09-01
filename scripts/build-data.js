#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const westernEuropePath = process.env.WESTERN_EUROPE_MEMCONS_PATH
  ? path.resolve(process.env.WESTERN_EUROPE_MEMCONS_PATH)
  : path.resolve(root, "../Bush41-Western-Europe/data/memcons.json");
const timDealCandidatesPath = path.join(root, "data", "tim-deal-candidates.json");
const timDealFileUnitsPath = path.join(root, "data", "tim-deal-file-units.json");
const nscMeetingsCandidatesPath = path.join(root, "data", "nsc-meetings-candidates.json");
const nscMeetingsFileUnitsPath = path.join(root, "data", "nsc-meetings-file-units.json");
const nscDcMeetingsCandidatesPath = path.join(root, "data", "nsc-dc-meetings-candidates.json");
const nscDcMeetingsFileUnitsPath = path.join(root, "data", "nsc-dc-meetings-file-units.json");
const nscDcFollowUpCandidatesPath = path.join(root, "data", "nsc-dc-follow-up-candidates.json");
const nscDcFollowUpFileUnitsPath = path.join(root, "data", "nsc-dc-follow-up-file-units.json");
const nsdCandidatesPath = path.join(root, "data", "nsd-candidates.json");
const nsdFileUnitsPath = path.join(root, "data", "nsd-file-units.json");
const nsrCandidatesPath = path.join(root, "data", "nsr-candidates.json");
const nsrFileUnitsPath = path.join(root, "data", "nsr-file-units.json");
const ifTransitionCandidatesPath = path.join(root, "data", "if-transition-candidates.json");
const ifTransitionFileUnitsPath = path.join(root, "data", "if-transition-file-units.json");
const scowcroftCandidatesPath = path.join(root, "data", "scowcroft-candidates.json");
const scowcroftFileUnitsPath = path.join(root, "data", "scowcroft-file-units.json");
const dealSummitCandidatesPath = path.join(root, "data", "deal-summit-candidates.json");
const dealSummitFileUnitsPath = path.join(root, "data", "deal-summit-file-units.json");
const dealReissCandidatesPath = path.join(root, "data", "deal-reiss-candidates.json");
const dealReissFileUnitsPath = path.join(root, "data", "deal-reiss-file-units.json");
const dealChronCandidatesPath = path.join(root, "data", "deal-chron-candidates.json");
const dealChronFileUnitsPath = path.join(root, "data", "deal-chron-file-units.json");
const gatesMiddleEastAudit = require("./gates-middle-east-file-audit");
const gatesMiddleEastAudit2 = require("./gates-middle-east-file-2-audit");

if (!fs.existsSync(westernEuropePath)) {
  throw new Error(`Missing source register: ${westernEuropePath}`);
}
if (
  !fs.existsSync(timDealCandidatesPath) ||
  !fs.existsSync(timDealFileUnitsPath) ||
  !fs.existsSync(nscMeetingsCandidatesPath) ||
  !fs.existsSync(nscMeetingsFileUnitsPath) ||
  !fs.existsSync(nscDcMeetingsCandidatesPath) ||
  !fs.existsSync(nscDcMeetingsFileUnitsPath) ||
  !fs.existsSync(nscDcFollowUpCandidatesPath) ||
  !fs.existsSync(nscDcFollowUpFileUnitsPath) ||
  !fs.existsSync(nsdCandidatesPath) ||
  !fs.existsSync(nsdFileUnitsPath) ||
  !fs.existsSync(nsrCandidatesPath) ||
  !fs.existsSync(nsrFileUnitsPath) ||
  !fs.existsSync(ifTransitionCandidatesPath) ||
  !fs.existsSync(ifTransitionFileUnitsPath) ||
  !fs.existsSync(scowcroftCandidatesPath) ||
  !fs.existsSync(scowcroftFileUnitsPath) ||
  !fs.existsSync(dealSummitCandidatesPath) ||
  !fs.existsSync(dealSummitFileUnitsPath) ||
  !fs.existsSync(dealReissCandidatesPath) ||
  !fs.existsSync(dealReissFileUnitsPath) ||
  !fs.existsSync(dealChronCandidatesPath) ||
  !fs.existsSync(dealChronFileUnitsPath)
) {
  throw new Error("Missing NSC candidate or file-unit source data");
}

const westernEuropeRecords = JSON.parse(fs.readFileSync(westernEuropePath, "utf8"));
const timDealCandidates = JSON.parse(fs.readFileSync(timDealCandidatesPath, "utf8"));
const timDealFileUnits = JSON.parse(fs.readFileSync(timDealFileUnitsPath, "utf8"));
const nscMeetingsCandidates = JSON.parse(fs.readFileSync(nscMeetingsCandidatesPath, "utf8"));
const nscMeetingsFileUnits = JSON.parse(fs.readFileSync(nscMeetingsFileUnitsPath, "utf8"));
const nscDcMeetingsCandidates = JSON.parse(fs.readFileSync(nscDcMeetingsCandidatesPath, "utf8"));
const nscDcMeetingsFileUnits = JSON.parse(fs.readFileSync(nscDcMeetingsFileUnitsPath, "utf8"));
const nscDcFollowUpCandidates = JSON.parse(fs.readFileSync(nscDcFollowUpCandidatesPath, "utf8"));
const nscDcFollowUpFileUnits = JSON.parse(fs.readFileSync(nscDcFollowUpFileUnitsPath, "utf8"));
const nsdCandidates = JSON.parse(fs.readFileSync(nsdCandidatesPath, "utf8"));
const nsdFileUnits = JSON.parse(fs.readFileSync(nsdFileUnitsPath, "utf8"));
const nsrCandidates = JSON.parse(fs.readFileSync(nsrCandidatesPath, "utf8"));
const nsrFileUnits = JSON.parse(fs.readFileSync(nsrFileUnitsPath, "utf8"));
const ifTransitionCandidates = JSON.parse(fs.readFileSync(ifTransitionCandidatesPath, "utf8"));
const ifTransitionFileUnits = JSON.parse(fs.readFileSync(ifTransitionFileUnitsPath, "utf8"));
const scowcroftCandidates = JSON.parse(fs.readFileSync(scowcroftCandidatesPath, "utf8"));
const scowcroftFileUnits = JSON.parse(fs.readFileSync(scowcroftFileUnitsPath, "utf8"));
const dealSummitCandidates = JSON.parse(fs.readFileSync(dealSummitCandidatesPath, "utf8"));
const dealSummitFileUnits = JSON.parse(fs.readFileSync(dealSummitFileUnitsPath, "utf8"));
const dealReissCandidates = JSON.parse(fs.readFileSync(dealReissCandidatesPath, "utf8"));
const dealReissFileUnits = JSON.parse(fs.readFileSync(dealReissFileUnitsPath, "utf8"));
const dealChronCandidates = JSON.parse(fs.readFileSync(dealChronCandidatesPath, "utf8"));
const dealChronFileUnits = JSON.parse(fs.readFileSync(dealChronFileUnitsPath, "utf8"));

const meta = {
  id: "frus1989-92v30",
  title: "Foreign Economic Policy",
  fullTitle: "Foreign Relations of the United States, 1989-1992, Volume XXX, Foreign Economic Policy",
  officialUrl: "https://history.state.gov/historicaldocuments/frus1989-92v30",
  status: "Being Researched",
  statusChecked: "2026-09-01",
  editorialState: "Provisional chronological compiler register",
  scopeNote:
    "Volume XXX is arranged here as one continuous chronology. Subject-area labels support search and archival screening only; they do not divide the prospective volume into chapters or topical sections.",
  boundaryNote:
    "Canada and Mexico, including the central NAFTA record, belong primarily to Volume XXXIII. Boundary records remain visible here so economic-policy decisions are not lost during routing.",
};

const subjectAreas = [
  {
    name: "Trade Policy and Market Access",
    shortName: "Trade and Market Access",
    description:
      "Uruguay Round strategy, Section 301 and Super 301, Structural Impediments Initiative, market-opening negotiations, and trade-policy coordination.",
  },
  {
    name: "Monetary Policy, Debt, and International Institutions",
    shortName: "Money, Debt, and Institutions",
    description:
      "International monetary policy, sovereign debt, the IMF and World Bank, finance-minister coordination, and the institutional architecture of the global economy.",
  },
  {
    name: "Economic Summits and Industrialized-Country Cooperation",
    shortName: "Economic Summits",
    description:
      "Paris, Houston, London, and Munich summit preparation, presidential plenaries, communiques, and G-7 coordination.",
  },
  {
    name: "Transition Economies and International Economic Strategy",
    shortName: "Transition Economies",
    description:
      "Economic assistance and integration strategies for Poland, Hungary, the Soviet Union, Russia, and other transition economies.",
  },
  {
    name: "Strategic Trade, Technology, and Investment Controls",
    shortName: "Strategic Trade and Technology",
    description:
      "COCOM policy, export-control reform, technology transfer, investment questions, and economic instruments with national-security consequences.",
  },
];

const subjectAreaNames = new Set(subjectAreas.map((area) => area.name));

const presidentialConfig = {
  "428082491": {
    chapter: "Trade Policy and Market Access",
    selection: "Consider",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID CF01729–005, [Memorandum of Conversations (Memcons)—January 1989–May 1989]: May 1989. Confidential.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF.",
  },
  "428080101": {
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Core",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Condoleezza Rice Files, 1989–1990 Subject Files, OA/ID CF00716–016, President's Trip to Poland/Hungary, July 1989 [2]. Confidential.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF; this corrects a prior Presidential Memcon Files attribution.",
  },
  "428080649": {
    chapter: "Trade Policy and Market Access",
    selection: "Consider",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID CF01729–016, [Memorandum of Conversations (Memcons)—January 1990–June 1990]: April 1990. Confidential.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF.",
  },
  "428080829": summit("CF01728–001", "July 1990", "Confidential"),
  "428080831": summit("CF01728–001", "July 1990", "Secret"),
  "428080833": summit("CF01728–001", "July 1990", "Confidential"),
  "428080835": summit("CF01728–001", "July 1990", "Confidential"),
  "428081745": {
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Core",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID CF01728–013, [Memorandum of Conversations (Memcons)—July 1991–December 1991]: July 1991. Secret.",
    sourceNoteStatus: "draft",
    sourceNoteBasis: "FRUS-style draft from the Catalog hierarchy; the online PDF lacks a citation marker and requires archival confirmation.",
  },
  "428081749": london("Confidential"),
  "428081771": london("Secret"),
  "428081773": {
    ...london("Secret"),
    chapter: "Transition Economies and International Economic Strategy",
  },
  "428081775": london("Confidential"),
  "428082021": {
    chapter: "Trade Policy and Market Access",
    selection: "Core",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID CF01728–017, [Memorandum of Conversations (Memcons)—July 1991–December 1991]: November 1991. Confidential.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF.",
  },
  "428082275": munich("Confidential"),
  "428082277": munich("Confidential"),
  "428082281": {
    ...munich("Confidential"),
    chapter: "Transition Economies and International Economic Strategy",
  },
  "428082283": {
    ...munich("Confidential"),
    chapter: "Transition Economies and International Economic Strategy",
  },
  "428081135": {
    chapter: "Trade Policy and Market Access",
    selection: "Consider",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID CF01728–005, [Memorandum of Conversations (Memcons)—July 1990–December 1990]: November 1990. Secret.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF.",
  },
};

function summit(localId, month, classification) {
  return {
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Core",
    sourceNote: `Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID ${localId}, [Memorandum of Conversations (Memcons)—July 1990–December 1990]: ${month}. ${classification}.`,
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF.",
  };
}

function london(classification) {
  return {
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Core",
    sourceNote: `Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Presidential Memcon Files, OA/ID CF01728–013, [Memorandum of Conversations (Memcons)—July 1991–December 1991]: July 1991. ${classification}.`,
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF.",
  };
}

function munich(classification) {
  return {
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Core",
    sourceNote: `Source: George H.W. Bush Library, Bush Presidential Records, National Security Council, Eric Melby Files, Economic Summit Files, OA/ID CF00971–015, Munich Economic Summit [1]. ${classification}.`,
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker and document classification checked in the NARA PDF; this corrects a prior Presidential Memcon Files attribution.",
  };
}

function classFromSourceNote(note) {
  const match = note.match(/(Top Secret|Secret|Confidential|Unclassified|No classification marking)\.$/);
  return match ? match[1] : "Not determined";
}

const presidentialRecords = Object.entries(presidentialConfig).map(([naid, config]) => {
  const source = westernEuropeRecords.find((record) => String(record.naid) === naid);
  if (!source) throw new Error(`Missing presidential conversation ${naid}`);

  return {
    id: `presidential-${naid}`,
    date: source.date,
    sortDate: source.sortDate || source.date,
    title: source.subjectLine || source.title,
    heading: "Memorandum of Conversation",
    dateline: cleanDateline(source.dateLine),
    type: source.type,
    chapter: config.chapter,
    selection: config.selection,
    releaseStatus: source.releaseStatus === "Full" ? "Released" : source.releaseStatus,
    pageCount: source.pageCount,
    extentLabel: `${source.pageCount} PDF pages, including citation marker where present`,
    naid,
    catalogUrl: `https://catalog.archives.gov/id/${naid}`,
    pdfUrl: source.pdfUrl,
    sourceNote: config.sourceNote,
    sourceNoteStatus: config.sourceNoteStatus,
    sourceNoteBasis: config.sourceNoteBasis,
    classification: classFromSourceNote(config.sourceNote),
    topics: inferTopics(source, config.chapter),
    notes: "Presidential conversation selected from the Bush Library Memcons and Telcons index; substantive inclusion remains a compiler judgment.",
  };
});

function cleanDateline(value = "") {
  return value
    .replace(/\bP\.M\./g, "p.m.")
    .replace(/\bA\.M\./g, "a.m.")
    .replace(/p\.m\.\s+p\.m\./g, "p.m.")
    .replace(/\s+-\s+/g, "–")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function inferTopics(source, chapter) {
  const values = [
    ...(source.topics || []),
    ...(source.countries || []),
    chapter,
  ].filter((value) => value && !/^Western Europe$/i.test(value));
  return [...new Set(values)].slice(0, 7);
}

const itemRecords = [
  {
    id: "boskin-1989-07-07-brady-trade-review",
    date: "1989-07-07",
    sortDate: "1989-07-07",
    title: "Trade Review",
    heading: "Memorandum From the Chairman Pro Tempore of the Economic Policy Council (Brady) to President Bush",
    dateline: "Washington, July 7, 1989",
    type: "Memorandum",
    chapter: "Trade Policy and Market Access",
    selection: "Core",
    releaseStatus: "Released",
    pageCount: 1,
    extentLabel: "1 released document page in a 4-page online file unit",
    naid: "492062321",
    localId: "CF01113–004",
    catalogUrl: "https://catalog.archives.gov/id/492062321",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-004.pdf",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID CF01113–004, [1989]: EPC [Economic Policy Council] Memo to the President, re: Trade Policy, (7/7/89). Unclassified; the attachment is Confidential.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker, withdrawal sheet, and released document checked in the NARA PDF.",
    classification: "Unclassified; Confidential attachment",
    topics: ["Trade strategy", "Uruguay Round", "Japan", "Structural Impediments Initiative"],
    notes:
      "The memorandum identifies the Uruguay Round, Mexico, Japan, the Pacific Rim, and Western Europe as trade-policy priorities. Its separate 17-page attachment is listed as its own withdrawn record.",
  },
  {
    id: "boskin-1989-trade-policy-position-withdrawn",
    date: "1989-07-07",
    sortDate: "1989-07-07T23:59:01",
    title: "Trade Policy and the U.S. Trade Position",
    heading: "Paper Prepared for the Economic Policy Council",
    dateline: "Undated",
    type: "Withdrawn paper",
    chapter: "Trade Policy and Market Access",
    selection: "Core",
    releaseStatus: "Withheld",
    pageCount: 17,
    extentLabel: "17 pages withheld under FOIA exemption (b)(1)",
    naid: "492062321",
    localId: "CF01113–004",
    catalogUrl: "https://catalog.archives.gov/id/492062321",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-004.pdf",
    archivalLocator:
      "George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID CF01113–004, [1989]: EPC [Economic Policy Council] Memo to the President, re: Trade Policy, (7/7/89).",
    sourceNoteStatus: "locator",
    sourceNoteBasis: "Withdrawal-sheet description only; no document-level Source Note is asserted for the unavailable paper.",
    classification: "Confidential",
    topics: ["Trade strategy", "Withheld record", "Declassification queue"],
    notes: "The withdrawal sheet supplies the exact title, classification, and 17-page extent.",
  },
  {
    id: "boskin-1990-01-17-brady-international-policy-withdrawn",
    date: "1990-01-17",
    sortDate: "1990-01-17",
    title: "U.S. International Economic Policy in the 1990s",
    heading: "Memorandum From the Secretary of the Treasury (Brady) to President Bush",
    dateline: "Washington, January 17, 1990",
    type: "Withdrawn memorandum",
    chapter: "Monetary Policy, Debt, and International Institutions",
    selection: "Core",
    releaseStatus: "Withheld",
    pageCount: 3,
    extentLabel: "3 pages withheld",
    naid: "492062327",
    localId: "CF01113–011",
    catalogUrl: "https://catalog.archives.gov/id/492062327",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-011.pdf",
    archivalLocator:
      "George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID CF01113–011, [1990]: 1/18/90, NSC Meeting on International Economic Policy, Cabinet Room.",
    sourceNoteStatus: "locator",
    sourceNoteBasis: "Withdrawal-sheet description only.",
    classification: "Secret",
    topics: ["International economic policy", "Treasury", "Withheld record"],
    notes: "Exact author, recipient, date, title, classification, and three-page extent come from the withdrawal sheet.",
  },
  {
    id: "boskin-1990-international-economic-policy-paper-withdrawn",
    date: "1990-01-18",
    sortDate: "1990-01-18T00:00:01",
    title: "U.S. International Economic Policy in the 1990s",
    heading: "Paper Prepared for the National Security Council",
    dateline: "Undated",
    type: "Withdrawn paper",
    chapter: "Monetary Policy, Debt, and International Institutions",
    selection: "Core",
    releaseStatus: "Withheld",
    pageCount: 48,
    extentLabel: "48 pages withheld",
    naid: "492062327",
    localId: "CF01113–011",
    catalogUrl: "https://catalog.archives.gov/id/492062327",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-011.pdf",
    archivalLocator:
      "George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID CF01113–011, [1990]: 1/18/90, NSC Meeting on International Economic Policy, Cabinet Room.",
    sourceNoteStatus: "locator",
    sourceNoteBasis: "Withdrawal-sheet description only.",
    classification: "Secret",
    topics: ["International economic policy", "NSC meeting", "Withheld record"],
    notes: "The withdrawal sheet records a 48-page Secret paper; authorship and precise date remain unavailable.",
  },
  {
    id: "boskin-1990-debt-strategy-paper-withdrawn",
    date: "1990-01-18",
    sortDate: "1990-01-18T00:00:02",
    title: "Update on International Debt Strategy",
    heading: "Paper Prepared for the National Security Council",
    dateline: "Undated",
    type: "Withdrawn paper",
    chapter: "Monetary Policy, Debt, and International Institutions",
    selection: "Core",
    releaseStatus: "Withheld",
    pageCount: 3,
    extentLabel: "3 pages withheld",
    naid: "492062327",
    localId: "CF01113–011",
    catalogUrl: "https://catalog.archives.gov/id/492062327",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-011.pdf",
    archivalLocator:
      "George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID CF01113–011, [1990]: 1/18/90, NSC Meeting on International Economic Policy, Cabinet Room.",
    sourceNoteStatus: "locator",
    sourceNoteBasis: "Withdrawal-sheet description only.",
    classification: "Secret",
    topics: ["Sovereign debt", "Brady Plan", "Withheld record"],
    notes: "The withdrawal sheet supplies the exact title, classification, and three-page extent.",
  },
  {
    id: "boskin-1990-01-18-taylor-collins",
    date: "1990-01-18",
    sortDate: "1990-01-18T00:00:03",
    title: "NSC Meeting on U.S. International Economic Policy in the 1990s",
    heading:
      "Memorandum From John B. Taylor and Susan Collins of the Council of Economic Advisers to the Chairman of the Council of Economic Advisers (Boskin)",
    dateline: "Washington, January 18, 1990",
    type: "Memorandum",
    chapter: "Monetary Policy, Debt, and International Institutions",
    selection: "Core",
    releaseStatus: "Released",
    pageCount: 4,
    extentLabel: "4 released document pages in a 27-page online file unit",
    naid: "492062327",
    localId: "CF01113–011",
    catalogUrl: "https://catalog.archives.gov/id/492062327",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-011.pdf",
    sourceNote:
      "Source: George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID CF01113–011, [1990]: 1/18/90, NSC Meeting on International Economic Policy, Cabinet Room. No classification marking.",
    sourceNoteStatus: "verified",
    sourceNoteBasis: "Citation marker, withdrawal sheets, and released document checked in the NARA PDF.",
    classification: "No classification marking",
    topics: ["International economic policy", "NSC meeting", "Council of Economic Advisers"],
    notes: "The released memorandum appears on PDF pages 3–6; three separately withdrawn records from the folder are listed above.",
  },
];

const withdrawalItems = [
  ["Scowcroft to President Bush, NSC Meeting on New Assistance for Poland", 3],
  ["Talking points", 1],
  ["Poland's Economic Plight", 7],
  ["Talking points for Scowcroft", 4],
  ["Notecard", 1],
  ["Hughes to Stapleton Roy et al.", 2],
  ["Poland's Economic Plight", 7],
  ["President Bush to President Mitterrand", 2],
  ["President Bush to Chancellor Kohl", 2],
  ["President Bush to Prime Minister Andreotti", 2],
  ["President Bush to Prime Minister Mulroney", 2],
  ["President Bush to Prime Minister Kaifu", 2],
  ["President Bush to Jacques Delors", 2],
  ["President Bush to Prime Minister Thatcher", 3],
  ["President Bush to President Jaruzelski", 2],
  ["President Bush to Prime Minister Mazowiecki", 2],
  ["Poland's Economic Plight", 7],
  ["Scowcroft to President Bush", 3],
  ["Scowcroft to President Bush", 3],
  ["Poland's Economic Plight", 7],
  ["Talking points", 1],
  ["Talking points for Scowcroft", 4],
].map(([title, pages], index) => ({ item: String(index + 1).padStart(2, "0"), title, pages, classification: "Secret" }));

const leadRecords = [
  {
    naid: "470760921",
    date: "1989-10-03",
    title: "NSC0030—Poland, Economic Assistance",
    type: "NSC meeting file",
    chapter: "Transition Economies and International Economic Strategy",
    selection: "Core",
    releaseStatus: "Partly released",
    pageCount: 134,
    withheldPages: 69,
    extentLabel: "134 PDF pages; withdrawal sheets identify 69 Secret pages withheld",
    pdfUrl:
      "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC_Mtgs_312293887/41-bpr-nsc-hfiles-nsc_mtgs-30-90001-018.pdf",
    localId: "90001–018",
    archivalLocator:
      "George H.W. Bush Library, Bush Presidential Records, National Security Council, H-Files, NSC Meetings Files, OA/ID 90001–018, NSC0030—October 03, 1989—Poland, Economic Assistance.",
    topics: ["Poland", "Economic assistance", "NSC meeting", "Declassification queue"],
    notes: "Folder-level candidate. Expand the withdrawal ledger for the exact item descriptions and page counts.",
    withdrawalItems,
  },
  hfile("470760944", "1990-03-29", "NSC0042—Fiber Optic Systems for the USSR", "NSC meeting file", "90002–006", "H-Files, NSC Meetings Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC_Mtgs_312293887/41-bpr-nsc-hfiles-nsc_mtgs-42-90002-006.pdf", ["Fiber optics", "Soviet Union", "Technology transfer"]),
  hfile("446394967", "1990-01-12", "NSR-22—COCOM Policy Towards Eastern Europe and the Soviet Union [1]", "National Security Review file", "90007–015", "H-Files, National Security Review Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSRs_313189297/41-bpr-nsc-hfiles-nsr-22_1-90007-015.pdf", ["COCOM", "Eastern Europe", "Soviet Union"]),
  hfile("446394968", "1990-01-12", "NSR-22—COCOM Policy Towards Eastern Europe and the Soviet Union [2]", "National Security Review file", "90007–016", "H-Files, National Security Review Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSRs_313189297/41-bpr-nsc-hfiles-nsr-22_2-90007-016.pdf", ["COCOM", "Eastern Europe", "Soviet Union"]),
  hfile("446396859", "1990-05-01", "NSD-39—COCOM Policy toward Eastern Europe and Soviet Union", "National Security Directive file", "90004–013", "H-Files, National Security Directives Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSDs_313189290/41-bpr-nsc-hfiles-nsd-39-90004-013.pdf", ["COCOM", "Export controls", "Eastern Europe"]),
  hfile("446396879", "1990-12-10", "NSD-53—Interagency Review and Disposition of Export Control Licenses [2]", "National Security Directive file", "90004–033", "H-Files, National Security Directives Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSDs_313189290/41-bpr-nsc-hfiles-nsd-53_2-90004-033.pdf", ["Export licenses", "Commerce Department", "Interagency review"]),
  hfile("470761340", "1991-10-29", "NSC/DC 317—Intra-COCOM Trade in MTCR Annex Items", "NSC/Deputies Committee file", "90021–005", "H-Files, NSC/Deputies Committee Meetings Files", "Strategic Trade, Technology, and Investment Controls", "Consider", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC-DC_Mtgs_312294079/41-bpr-nsc-hfiles-dc_mtgs-317-90021-005.pdf", ["COCOM", "MTCR", "Nonproliferation"]),
  hfile("470761369", "1992-04-09", "NSC/DC 345—Export Control Regulatory Reform", "NSC/Deputies Committee file", "90022–004", "H-Files, NSC/Deputies Committee Meetings Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC-DC_Mtgs_312294079/41-bpr-nsc-hfiles-dc_mtgs-345-90022-004.pdf", ["Export controls", "Regulatory reform"]),
  hfile("470761371", "1992-04-22", "NSC/DC 347—Export Control Regulatory Review [1]", "NSC/Deputies Committee file", "90022–006", "H-Files, NSC/Deputies Committee Meetings Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC-DC_Mtgs_312294079/41-bpr-nsc-hfiles-dc_mtgs-347_1-90022-006.pdf", ["Export controls", "Regulatory review"]),
  hfile("470761372", "1992-04-22", "NSC/DC 347—Export Control Regulatory Review [2]", "NSC/Deputies Committee file", "90022–007", "H-Files, NSC/Deputies Committee Meetings Files", "Strategic Trade, Technology, and Investment Controls", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC-DC_Mtgs_312294079/41-bpr-nsc-hfiles-dc_mtgs-347_2-90022-007.pdf", ["Export controls", "Regulatory review"]),
  hfile("470761377", "1992-05-13", "NSC/DC 351—Safety of Soviet-Designed Nuclear Reactors", "NSC/Deputies Committee file", "90022–012", "H-Files, NSC/Deputies Committee Meetings Files", "Transition Economies and International Economic Strategy", "Consider", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/H-Files/NSC-DC_Mtgs_312294079/41-bpr-nsc-hfiles-dc_mtgs-351-90022-012.pdf", ["Nuclear safety", "Soviet-designed reactors", "Economic assistance"]),
  boskin("492062323", "1989-07-14", "Paris Summit—7/14–16/89 [1]", "CF01113–006", "Economic Summits and Industrialized-Country Cooperation", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-006.pdf", ["Paris Summit", "Summit preparation"]),
  boskin("492062325", "1989-09-26", "Poland Initiatives, Situation Room [1]", "CF01113–008", "Transition Economies and International Economic Strategy", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-008.pdf", ["Poland", "Economic assistance", "NSC meeting"]),
  boskin("492062331", "1990-04-25", "Economic Policy Council Meeting on Special 301", "CF01113–015", "Trade Policy and Market Access", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-015.pdf", ["Special 301", "Trade barriers", "EPC"]),
  boskin("492062348", "1990-09-27", "Meeting with Eagleburger and Balcerowicz on Poland", "CF01113–033", "Transition Economies and International Economic Strategy", "Consider", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-033.pdf", ["Poland", "Balcerowicz", "Transition economy"]),
  boskin("492062363", "1991-01-01", "U.S./Soviet Economic Relations", "CF01113–048", "Transition Economies and International Economic Strategy", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-048.pdf", ["Soviet Union", "Economic relations"], "year"),
  boskin("492062366", "1991-04-22", "Economic Policy Council Meeting on Fast Track Authority", "CF01113–051", "Trade Policy and Market Access", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-051.pdf", ["Fast track", "Trade negotiations", "EPC"]),
  boskin("492062472", "1991-06-19", "Uruguay Round and North American Free Trade Agreement", "CF01169–001", "Trade Policy and Market Access", "Boundary", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01169-001.pdf", ["Uruguay Round", "NAFTA", "Volume XXXIII boundary"]),
  boskin("492062473", "1991-06-21", "Meeting with President Bush on the Soviet Union", "CF01169–002", "Transition Economies and International Economic Strategy", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01169-002.pdf", ["Soviet Union", "Presidential meeting"]),
  boskin("492062476", "1991-07-09", "Economic Policy Council Meeting on Eastern and Central Europe", "CF01169–006", "Transition Economies and International Economic Strategy", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01169-006.pdf", ["Eastern Europe", "Central Europe", "EPC"]),
  boskin("492062480", "1992-03-13", "Meeting with Mulford, Zoellick, and Hewitt on the Soviet Union", "CF01169–010", "Transition Economies and International Economic Strategy", "Consider", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01169-010.pdf", ["Soviet Union", "Treasury", "State Department"]),
  boskin("492062328", "1990-03-25", "U.S.-Mexico Free Trade Agreement", "CF01113–012", "Trade Policy and Market Access", "Boundary", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-012.pdf", ["Mexico", "Free trade agreement", "Volume XXXIII boundary"]),
  boskin("492062335", "1990-06-07", "Economic Policy Council Meeting on the U.S.-Mexico FTA", "CF01113–019", "Trade Policy and Market Access", "Boundary", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01113-019.pdf", ["Mexico", "Free trade agreement", "Volume XXXIII boundary"]),
  boskin("492062479", "1992-01-01", "NAFTA [1992]", "CF01169–009", "Trade Policy and Market Access", "Boundary", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/boskin/nsc_mtg_473987122/41-bpr-cea-boskin_nsc_meetng-01169-009.pdf", ["NAFTA", "Volume XXXIII boundary"], "year"),
  fileLead("492061797", "1991-12-30", "USTR Briefing Book on Dunkel Text", "Trade Policy Review Group Staff Files", "94001–004", "Trade Policy and Market Access", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/tprg_misc_staff/tprg_misc_staff_486388768/41-bpr-cea-tprg_misc_stf-94001-004.pdf", ["Uruguay Round", "Dunkel text", "USTR"]),
  fileLead("492061798", "1992-01-01", "Uruguay Round Strategy", "Trade Policy Review Group Staff Files", "94001–005", "Trade Policy and Market Access", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/tprg_misc_staff/tprg_misc_staff_486388768/41-bpr-cea-tprg_misc_stf-94001-005.pdf", ["Uruguay Round", "Trade strategy"], "year"),
  fileLead("492061965", "1990-02-22", "Structural Impediments Initiative Meeting, Tokyo, February 22–23, 1990 [1]", "John B. Taylor Briefing Books Files", "CF00502–001", "Trade Policy and Market Access", "Core", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-cea/taylor/briefing_books_2363649/41-bpr-cea-taylor_brief_bk-cf00502-001.pdf", ["Japan", "Structural Impediments Initiative", "Market access"]),
  summitLead("452050593", "1989-07-14", "Paris Economic Summit [July 1989]", "Timothy E. Deal Subject Files", "CF00972–002", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00972-002.pdf"),
  summitLead("452050566", "1990-07-09", "Houston Economic Summit (July 9–11, 1990) [4]", "Timothy E. Deal Subject Files", "CF00963–017", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00963-017.pdf"),
  summitLead("452050567", "1990-07-09", "Houston Economic Summit (July 9–11, 1990) [5]", "Timothy E. Deal Subject Files", "CF00963–018", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00963-018.pdf"),
  summitLead("452050583", "1991-07-15", "London Economic Summit [July 1991] [3]", "Timothy E. Deal Subject Files", "CF00964–014", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00964-014.pdf"),
  summitLead("452050584", "1991-07-15", "London Economic Summit [July 1991] [4]", "Timothy E. Deal Subject Files", "CF00964–015", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00964-015.pdf"),
  summitLead("452050586", "1991-07-15", "London Economic Summit [July 1991] [6]", "Timothy E. Deal Subject Files", "CF00964–017", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00964-017.pdf"),
  summitLead("452050631", "1992-05-22", "Munich Economic Summit Fourth Sherpa Meeting Briefing Book, May 22–24, 1992 [1]", "Timothy E. Deal Subject Files", "CF00973–009", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/subject_2554810/41-bpr-nsc-deal-subj-cf00973-009.pdf"),
  summitLead("452050650", "1991-07-15", "London Economic Summit: President's Briefing Book [1 of 2]", "Timothy E. Deal Summit Briefing Books Files", "CF00960–014", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/summit_brief_books_2554817/41-bpr-nsc-deal-sumit_bref_bks-cf00960-014.pdf"),
  summitLead("452050652", "1991-07-15", "London Economic Summit: President's Background Book [1 of 2]", "Timothy E. Deal Summit Briefing Books Files", "CF00960–016", "https://catalog.archives.gov/medialz/presidential-libraries/bush/gb-nsc/deal/summit_brief_books_2554817/41-bpr-nsc-deal-sumit_bref_bks-cf00960-016.pdf"),
  {
    naid: "470429205",
    date: "1990-07-09",
    title: "Houston Economic Summit [1]",
    type: "File-unit lead",
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Consider",
    releaseStatus: "Catalog only",
    localId: null,
    archivalLocator:
      "George H.W. Bush Library, Bush Presidential Records, National Security Council, Eric Melby Files, Economic Summit Files, Houston [Economic] Summit [1].",
    topics: ["Houston Summit", "Eric Melby", "On-site research"],
    notes: "The Catalog describes the file unit but exposes no digital object. Page extent and document boundaries require on-site or staff-assisted review.",
  },
].map(normalizeLead);

function hfile(naid, date, title, type, localId, series, chapter, selection, pdfUrl, topics) {
  return {
    naid,
    date,
    title,
    type,
    chapter,
    selection,
    releaseStatus: "Online file unit",
    localId,
    pdfUrl,
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, National Security Council, ${series}, OA/ID ${localId}, ${title}.`,
    topics,
    notes: "File-unit lead. Document boundaries, citation markers, classification, and item-level extent remain to be audited before drafting Source Notes.",
  };
}

function boskin(naid, date, title, localId, chapter, selection, pdfUrl, topics, datePrecision = "day") {
  return {
    naid,
    date,
    datePrecision,
    title,
    type: "EPC/NSC file-unit lead",
    chapter,
    selection,
    releaseStatus: "Online file unit",
    localId,
    pdfUrl,
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, Michael J. Boskin Files, NSC Meeting Files, OA/ID ${localId}, ${title}.`,
    topics,
    notes: "File-unit lead. Audit the scan document by document before promoting any item to Source Note-ready status.",
  };
}

function fileLead(naid, date, title, series, localId, chapter, selection, pdfUrl, topics, datePrecision = "day") {
  return {
    naid,
    date,
    datePrecision,
    title,
    type: "File-unit lead",
    chapter,
    selection,
    releaseStatus: "Online file unit",
    localId,
    pdfUrl,
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, Council of Economic Advisers, ${series}, OA/ID ${localId}, ${title}.`,
    topics,
    notes: "File-unit lead. Item-level headings, datelines, Source Notes, and page extents await source-image review.",
  };
}

function summitLead(naid, date, title, series, localId, pdfUrl) {
  return {
    naid,
    date,
    title,
    type: "Summit file-unit lead",
    chapter: "Economic Summits and Industrialized-Country Cooperation",
    selection: "Consider",
    releaseStatus: "Online file unit",
    localId,
    pdfUrl,
    archivalLocator: `George H.W. Bush Library, Bush Presidential Records, National Security Council, ${series}, OA/ID ${localId}, ${title}.`,
    topics: ["Economic summit", "Briefing materials", "Document-boundary audit"],
    notes: "Summit file-unit lead. Use the scan to identify decision memoranda, records of meetings, and briefing papers worth item-level treatment.",
  };
}

function normalizeLead(record) {
  const date = record.date || "1992-12-31";
  return {
    id: `lead-${record.naid}`,
    sortDate: record.datePrecision === "year" ? `${date.slice(0, 4)}-12-31` : date,
    heading: record.heading || record.title,
    dateline: record.datePrecision === "year" ? date.slice(0, 4) : formatDateline(date),
    pageCount: record.pageCount ?? null,
    withheldPages: record.withheldPages ?? null,
    extentLabel: record.extentLabel || "Page extent not yet verified",
    catalogUrl: `https://catalog.archives.gov/id/${record.naid}`,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      record.sourceNoteBasis || "Catalog/file-unit hierarchy only; this is an archival locator, not a document-level FRUS Source Note.",
    classification: record.classification || "Not determined",
    ...record,
  };
}

function formatDateline(date) {
  const value = new Date(`${date}T12:00:00Z`);
  return value.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

const publicReferences = [
  {
    id: "ppp-1989-05-26-trade-barriers",
    date: "1989-05-26",
    title: "Statement on United States Action Against Foreign Trade Barriers",
    type: "Statement",
    topics: ["Super 301", "Structural Impediments Initiative", "Market access"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/statement-united-states-action-against-foreign",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-1990-06-28-japan-trade",
    date: "1990-06-28",
    title: "Statement on Japan-United States Trade Negotiations",
    type: "Statement",
    topics: ["Japan", "Structural Impediments Initiative", "Trade"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/statement-japan-united-states-trade-negotiations",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-1990-07-03-reporters",
    date: "1990-07-03",
    title: "Exchange With Reporters on the Houston Economic Summit and the Uruguay Round",
    type: "Exchange with reporters",
    topics: ["Houston Summit", "Uruguay Round"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/exchange-reporters-1",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-1990-houston-communique",
    date: "1990-07-11",
    title: "Remarks Presenting the Final Communique of the Houston Economic Summit",
    type: "Remarks",
    topics: ["Houston Summit", "G-7", "Communique"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/remarks-presenting-final-communique-houston",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-1991-economic-report",
    date: "1991-02-12",
    title: "Message to Congressional Leaders Transmitting the 1991 Economic Report of the President",
    type: "Message",
    topics: ["International economy", "Economic strategy"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/message-congressional-leaders-transmitting-1991",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-1991-04-04-japan",
    date: "1991-04-04",
    title: "Statement on Japan-United States Relations",
    type: "Statement",
    topics: ["Japan", "Trade", "Bilateral economic relations"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/statement-japan-united-states-relations",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-1991-london-declaration",
    date: "1991-07-17",
    title: "London Economic Summit Economic Declaration",
    type: "Declaration",
    topics: ["London Summit", "G-7", "International economy"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/london-economic-summit-economic-declaration",
    source: "Public Papers of George Bush",
  },
  {
    id: "ppp-nafta-fact-sheet",
    date: "1992-08-12",
    title: "White House Fact Sheet: North American Free Trade Agreement",
    type: "Fact sheet",
    topics: ["NAFTA", "Canada", "Mexico", "Volume XXXIII boundary"],
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/public-papers/white-house-fact-sheet-north-american-free-trade",
    source: "Public Papers of George Bush",
    selection: "Boundary",
  },
];

const sourceCollections = [
  {
    name: "FRUS Volume XXX status page",
    owner: "Office of the Historian",
    role: "Official volume title and research status",
    url: "https://history.state.gov/historicaldocuments/frus1989-92v30",
  },
  {
    name: "Bush NSC records finding aid",
    owner: "George H.W. Bush Presidential Library",
    role: "Presidential conversations, Deal, Melby, and other NSC series",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/records-national-security-council-george-h-w-bush-administration",
  },
  {
    name: "Brent Scowcroft Papers",
    owner: "National Archives Catalog",
    role: "Complete 20-series, 676-file collection audit for presidential correspondence, conversations, chronological files, meeting copies, and foreign-economic-policy leads",
    url: "https://catalog.archives.gov/id/4522156",
  },
  {
    name: "Timothy E. Deal Subject Files",
    owner: "National Archives Catalog",
    role: "Complete 134-file NSC international-economic series and provenance-controlled PDF set",
    url: "https://catalog.archives.gov/id/2554810",
  },
  {
    name: "Timothy E. Deal Summit Briefing Books Files",
    owner: "National Archives Catalog",
    role: "Complete 17-file Houston and London Economic Summit briefing-book series with verified opening markers and itemized withdrawal evidence",
    url: "https://catalog.archives.gov/id/2554817",
  },
  {
    name: "Timothy E. Deal and Mitchell B. Reiss Economic Summit Files",
    owner: "National Archives Catalog",
    role: "Complete 25-file Paris Economic Summit and presidential-trip series with provenance, release-disposition, withdrawal-sheet, and cross-volume routing review",
    url: "https://catalog.archives.gov/id/2554819",
  },
  {
    name: "Timothy E. Deal Chronological Files",
    owner: "National Archives Catalog",
    role: "Complete 96-file chronological series with month-level provenance, economic subject-line screening, disposition-aware withdrawal evidence, and duplicate-copy warnings",
    url: "https://catalog.archives.gov/id/2554807",
  },
  {
    name: "Robert M. Gates Subject Files",
    owner: "National Archives Catalog",
    role: "Selected 250-page Middle East - Economic Strategy [1]-[2] companion-folder audit with complete page accounting, item-level release evidence, withheld extents, and cross-collection duplicate review; not a full-series survey",
    url: "https://catalog.archives.gov/id/2554843",
  },
  {
    name: "Bush Memcons and Telcons index",
    owner: "George H.W. Bush Presidential Library",
    role: "Official presidential-conversation discovery table",
    url: "https://www.bush41library.gov/digital-research-room/about-textual-collections/memcons-and-telcons",
  },
  {
    name: "Council of Economic Advisers records",
    owner: "National Archives Catalog",
    role: "Boskin NSC/EPC files, Taylor briefing books, and TPRG files",
    url: "https://catalog.archives.gov/id/2163561",
  },
  {
    name: "NSC Meeting Files",
    owner: "National Archives Catalog",
    role: "H-Files packets and withdrawal sheets",
    url: "https://catalog.archives.gov/id/312293887",
  },
  {
    name: "NSC/Deputies Committee Meeting Files",
    owner: "National Archives Catalog",
    role: "Export-control and strategic economic-policy meetings",
    url: "https://catalog.archives.gov/id/312294079",
  },
  {
    name: "NSC/Deputies Committee Meetings Follow-up Files",
    owner: "National Archives Catalog",
    role: "Follow-up memoranda, conclusions, issue papers, and withdrawal-sheet evidence paired with Deputies Committee meetings",
    url: "https://catalog.archives.gov/id/312294094",
  },
  {
    name: "National Security Directive Files",
    owner: "National Archives Catalog",
    role: "Presidential directives, implementation files, opening provenance markers, and withdrawal-sheet evidence for NSD 1 through NSD 79",
    url: "https://catalog.archives.gov/id/313189290",
  },
  {
    name: "National Security Review Files",
    owner: "National Archives Catalog",
    role: "Presidential review directives, interagency studies, response papers, and withdrawal-sheet evidence for NSR 1 through NSR 30",
    url: "https://catalog.archives.gov/id/313189297",
  },
  {
    name: "NSC Institutional Files Transition Files",
    owner: "National Archives Catalog",
    role: "Reagan-Bush transition briefings, institutional background, retained-file lists, and opening provenance markers",
    url: "https://catalog.archives.gov/id/348937136",
  },
  {
    name: "Houston Economic Summit FOIA",
    owner: "George H.W. Bush Presidential Library",
    role: "Selective released summit records; finding aid is not all-inclusive",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-16-th-economic-summit-industrialized-nations-houston",
  },
  {
    name: "Structural Impediments Initiative FOIA",
    owner: "George H.W. Bush Presidential Library",
    role: "U.S.-Japan market-opening records",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-structural-impediments-initiative-sii",
  },
  {
    name: "Poland and Hungary economic-assistance FOIA",
    owner: "George H.W. Bush Presidential Library",
    role: "Transition-economy assistance records",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-us-economic-assistance-poland-and-hungary",
  },
  {
    name: "Secretary Nicholas Brady FOIA",
    owner: "George H.W. Bush Presidential Library",
    role: "Treasury leadership and international economic-policy leads",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-nicholas-f-brady-secretary-treasury-1988-1993",
  },
  {
    name: "NAFTA negotiating records",
    owner: "George H.W. Bush Presidential Library",
    role: "Boundary routing to FRUS Volume XXXIII",
    url: "https://www.bush41library.gov/digital-research-room/finding-aid/foia/records-negotiating-north-american-free-trade-agreement",
  },
  {
    name: "Public Papers of President George H.W. Bush",
    owner: "GovInfo",
    role: "Public chronology and documentary reference",
    url: "https://www.govinfo.gov/app/collection/ppp/president-41_Bush,%20George%20H.%20W.",
  },
];

const gaps = [
  {
    id: "gap-ustr",
    priority: "Critical",
    title: "USTR central and negotiator files are not yet systematically harvested",
    scope: "Trade-policy records",
    action: "Survey USTR accession lists and identify negotiating files for the Uruguay Round, Japan, Section 301, and fast-track decisions.",
  },
  {
    id: "gap-treasury",
    priority: "Critical",
    title: "Treasury and Secretary Brady international files remain underrepresented",
    scope: "Monetary, debt, and institutions records",
    action: "Use the Brady burden-sharing memorandum and Robson Egypt-debt transmittal now recovered in CF00946-002 as anchors, then build an item-level register for debt strategy, exchange rates, G-5/G-7 finance, IMF, World Bank, and transition-finance decisions.",
  },
  {
    id: "gap-fed",
    priority: "High",
    title: "Federal Reserve records are absent from the current register",
    scope: "Monetary policy",
    action: "Identify Board and Chairman Greenspan records bearing on international monetary coordination and exchange-rate policy.",
  },
  {
    id: "gap-state-zoellick",
    priority: "Critical",
    title: "Department of State economic-policy files need a full lot-file sweep",
    scope: "Whole chronology",
    action: "Prioritize Lot 96D484 (Robert Zoellick), Baker papers, and the Central Foreign Policy File P-, D-, and N-reels.",
  },
  {
    id: "gap-cables",
    priority: "High",
    title: "Decision-shaping cables and reporting telegrams are not represented",
    scope: "Whole chronology",
    action: "Search the Central Foreign Policy File for instructions, reporting, and negotiation records tied to each core decision cluster.",
  },
  {
    id: "gap-page-audit",
    priority: "High",
    title: "Most online file units still lack document-boundary audits",
    scope: "Online NARA PDFs",
    action: "Audit the 95 Scowcroft, 4 IF Transition, 33 NSD, 21 NSR, 79 NSC/Deputies Committee, 29 DC follow-up, 35 NSC Meetings, 17 Deal Summit Briefing Books, 25 Deal-Reiss Economic Summit, and 96 Deal Chronological leads document by document, then continue the Tim Deal Subject Files workflow across the remaining 131 file units and the Gates Subject Files beyond the completed CF00946-002 and CF00946-003 audits: split documents, verify markings, deduplicate companion and parallel copies, and retain exact withdrawal extents.",
  },
  {
    id: "gap-gates-subject-files",
    priority: "High",
    title: "Robert M. Gates Subject Files coverage is currently a selected-file audit",
    scope: "NSC staff files",
    action: "Enumerate the full NAID 2554843 series, prioritize additional international-economic subject folders beyond the completed Middle East - Economic Strategy [1]-[2] pair, and apply the same page accounting and controlling-copy review used for CF00946-002 and CF00946-003.",
  },
  {
    id: "gap-memcons",
    priority: "High",
    title: "Presidential conversations need item-level promotion and canonical-copy matching",
    scope: "Memcons and telcons",
    action: "Split and read the individual documents in the 35 economically signaled Scowcroft presidential memcon and telcon folders, cross-check them against the Bush Library index and Presidential Memcon Files, and cite only the controlling archival copy after deduplication.",
  },
  {
    id: "gap-public-papers",
    priority: "Medium",
    title: "The Public Papers reference register is selective",
    scope: "Public chronology",
    action: "Run a complete GovInfo sweep and retain all direct official links, dates, publication pages, and boundary labels.",
  },
  {
    id: "gap-boundaries",
    priority: "High",
    title: "Volume boundaries require formal cross-volume adjudication",
    scope: "NAFTA, sanctions, aid, environment, and security controls",
    action: "Route candidates against Volumes XXVI, XXVII, XXIX, XXXIII, and the appropriate regional volumes while preserving cross-references.",
  },
  {
    id: "gap-withheld",
    priority: "High",
    title: "Withdrawn records need declassification tracking",
    scope: "FOIA withdrawal sheets",
    action: "Use the 104-item Deal Summit inventory, the 142-entry Deal-Reiss disposition ledger, and the 697-item Deal Chronological ledger as structured baselines. Preserve exemption, extent, review status, and whether a released-in-part copy follows; do not infer current nonrelease from a historical withdrawal/redaction sheet alone.",
  },
];

const timDealDocumentRecords = timDealCandidates.documents.map((record) => ({
  ...record,
  collectionId: "tim-deal",
  provenanceMethod: "Opening PDF provenance marker",
}));

const gatesMiddleEastDocumentRecords = [...gatesMiddleEastAudit.documents, ...gatesMiddleEastAudit2.documents].sort(
  (a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title),
);
const gatesMiddleEastFileUnits = [gatesMiddleEastAudit.fileUnit, gatesMiddleEastAudit2.fileUnit].sort(
  (a, b) => a.workingStartDate.localeCompare(b.workingStartDate) || a.localId.localeCompare(b.localId),
);
const gatesMiddleEastCollection = {
  ...gatesMiddleEastAudit.collection,
  title: "Robert M. Gates Subject Files: Middle East Economic Strategy [1]-[2]",
  inclusiveDates: "1990-08-20/1990-09-20",
  fileUnitCount: gatesMiddleEastFileUnits.length,
  onlinePdfCount: gatesMiddleEastFileUnits.length,
  markerVerified: gatesMiddleEastFileUnits.filter((row) => row.markerStatus === "verified").length,
  totalPdfBytes: gatesMiddleEastFileUnits.reduce((total, row) => total + row.pdfBytes, 0),
  totalCatalogPdfBytes: gatesMiddleEastFileUnits.reduce((total, row) => total + row.catalogPdfBytes, 0),
  totalPdfPages: gatesMiddleEastFileUnits.reduce((total, row) => total + row.pdfPages, 0),
  methodology:
    "Selected-file audit only. The first page of each PDF controls provenance. Every served-PDF page in the two companion folders was mapped to a document, working-note set, administrative page, inventory, or withdrawal sheet; candidates were deduplicated across the Gates pair and against the harvested Deal Chronological, Scowcroft Desert Shield, and H-Files collections.",
};

const nscMeetingUnitByNaid = new Map(nscMeetingsFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const existingLeadByNaid = new Map(leadRecords.map((record) => [record.naid, record]));
const nscMeetingsDocumentRecords = nscMeetingsCandidates.documents.map((candidate) => {
  const fileUnit = nscMeetingUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`NSC Meetings candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const existing = existingLeadByNaid.get(candidate.naid) || {};
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    ...existing,
    id: `lead-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.date,
    title,
    heading: `National Security Council Meeting File: ${title}`,
    dateline: formatDateline(candidate.date),
    type: "NSC meeting file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: "Partly released",
    pageCount: candidate.pageCount,
    withheldPages: candidate.withheldPages ?? existing.withheldPages ?? null,
    extentLabel:
      candidate.extentLabel || `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance sheet checked in the official NARA PDF; file-unit locator only pending document-level source-image review.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    collectionId: "nsc-meetings",
    provenanceMethod: "Opening PDF provenance sheet",
  };
});

const nscDcMeetingUnitByNaid = new Map(nscDcMeetingsFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const nscDcMeetingsDocumentRecords = nscDcMeetingsCandidates.documents.map((candidate) => {
  const fileUnit = nscDcMeetingUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`NSC/DC Meetings candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const existing = existingLeadByNaid.get(candidate.naid) || {};
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    ...existing,
    id: `lead-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.date,
    title,
    heading: `National Security Council Deputies Committee Meeting File: ${title}`,
    dateline: formatDateline(candidate.date),
    type: "NSC/Deputies Committee file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    withheldPages: candidate.withheldPages ?? existing.withheldPages ?? null,
    extentLabel:
      candidate.extentLabel || `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance sheet checked in the official NARA PDF; file-unit locator only pending document-level source-image review.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    collectionId: "nsc-dc-meetings",
    provenanceMethod: "Opening PDF provenance sheet",
  };
});

const nscDcFollowUpUnitByNaid = new Map(nscDcFollowUpFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const nscDcFollowUpDocumentRecords = nscDcFollowUpCandidates.documents.map((candidate) => {
  const fileUnit = nscDcFollowUpUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`NSC/DC follow-up candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const existing = existingLeadByNaid.get(candidate.naid) || {};
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    ...existing,
    id: `lead-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    title,
    heading: `National Security Council Deputies Committee Follow-Up File: ${title}`,
    dateline: formatDateline(candidate.date),
    type: "NSC/Deputies Committee follow-up file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    extentLabel:
      candidate.extentLabel || `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance sheet and withdrawal-sheet descriptions checked in the official NARA PDF; file-unit locator only pending document-level source-image review.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    collectionId: "nsc-dc-follow-up",
    provenanceMethod: "Opening PDF provenance and withdrawal sheets",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

const nsdUnitByNaid = new Map(nsdFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const nsdDocumentRecords = nsdCandidates.documents.map((candidate) => {
  const fileUnit = nsdUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`NSD candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const existing = existingLeadByNaid.get(candidate.naid) || {};
  const title = fileUnit.title
    .replace(/\bNSD-(\d+[a-z]?)/gi, "NSD–$1")
    .replaceAll(" - ", "—")
    .replace(
      /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+0(\d),/gi,
      "$1 $2,",
    );
  return {
    ...existing,
    id: `lead-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    title,
    heading: `National Security Directive File: ${title}`,
    dateline: formatDateline(candidate.date),
    type: "National Security Directive file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: fileUnit.hasOnlinePdf
      ? "Online file unit; item audit pending"
      : "Catalog file unit; no online PDF",
    pageCount: candidate.pageCount,
    extentLabel:
      candidate.extentLabel || `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
    classification: fileUnit.hasOnlinePdf
      ? "Mixed; document-level audit required"
      : "Not established; no online PDF",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis: fileUnit.hasOnlinePdf
      ? "Opening provenance marker and withdrawal-sheet descriptions checked in the official NARA PDF; file-unit locator only pending document-level source-image review."
      : "Catalog hierarchy supplies the file-unit locator; no online PDF is available for source-image or classification review.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    collectionId: "nsd",
    provenanceMethod: fileUnit.hasOnlinePdf
      ? "Opening PDF provenance marker and withdrawal sheets"
      : "Catalog hierarchy; no online PDF",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

const nsrUnitByNaid = new Map(nsrFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const nsrDocumentRecords = nsrCandidates.documents.map((candidate) => {
  const fileUnit = nsrUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`NSR candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const existing = existingLeadByNaid.get(candidate.naid) || {};
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    ...existing,
    id: `lead-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    title,
    heading: `National Security Review File: ${title}`,
    dateline: formatDateline(candidate.date),
    type: "National Security Review file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    extentLabel:
      candidate.extentLabel || `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance marker and withdrawal-sheet descriptions checked in the official NARA PDF; file-unit locator only pending document-level source-image review.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    collectionId: "nsr",
    provenanceMethod: "Opening PDF provenance marker and withdrawal sheets",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

const ifTransitionUnitByNaid = new Map(ifTransitionFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const ifTransitionDocumentRecords = ifTransitionCandidates.documents.map((candidate) => {
  const fileUnit = ifTransitionUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`IF Transition candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    id: `lead-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    datePrecision: candidate.datePrecision || "day",
    displayDateLabel: candidate.displayDateLabel || "",
    title,
    heading: `National Security Council Institutional Files Transition File: ${title}`,
    dateline: candidate.displayDateLabel || formatDateline(candidate.date),
    type: "NSC Institutional Files transition file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    extentLabel:
      candidate.extentLabel || `${candidate.pageCount} PDF pages; document-level release and withdrawal audit pending`,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance marker, full PDF, and withdrawal-sheet descriptions checked in the official NARA file; file-unit locator only pending document-level source-image review.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    collectionId: "if-transition",
    provenanceMethod: "Opening PDF provenance marker, full-text review, and withdrawal sheets",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

const scowcroftUnitByNaid = new Map(scowcroftFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const scowcroftDocumentRecords = scowcroftCandidates.documents.map((candidate) => {
  const fileUnit = scowcroftUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`Scowcroft candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const title = fileUnit.title.replaceAll("--", "—").replaceAll(" - ", "—");
  return {
    id: `scowcroft-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    datePrecision: candidate.datePrecision || "range",
    displayDateLabel: candidate.displayDateLabel || "",
    title,
    heading: `Brent Scowcroft Collection File: ${title}`,
    dateline: candidate.displayDateLabel || formatDateline(candidate.date),
    type: "Brent Scowcroft collection file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    extentLabel: candidate.extentLabel,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance marker and full NARA OCR checked; file-unit locator only pending document boundaries, terminal markings, release status, and canonical-copy review in the source images.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    seriesTitle: fileUnit.seriesTitle,
    collectionId: "scowcroft",
    provenanceMethod: "Opening PDF provenance marker and complete collection OCR",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

const dealSummitUnitByNaid = new Map(dealSummitFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const dealSummitDocumentRecords = dealSummitCandidates.documents.map((candidate) => {
  const fileUnit = dealSummitUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`Deal Summit candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    id: `deal-summit-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    datePrecision: candidate.datePrecision || "range",
    displayDateLabel: candidate.displayDateLabel || "",
    title,
    heading: `Timothy E. Deal Summit Briefing Book File: ${title}`,
    dateline: candidate.displayDateLabel || formatDateline(candidate.date),
    type: "Timothy E. Deal summit briefing-book file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: candidate.withdrawalItems?.length
      ? "Partly released"
      : "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    withheldPages: candidate.withheldPages,
    withdrawalItems: (candidate.withdrawalItems || []).map((item) => ({
      ...item,
      item: item.itemNumber,
    })),
    extentLabel: candidate.extentLabel,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance marker, all served-PDF pages, and individual withdrawal sheets checked; file-unit locator only pending document boundaries, terminal markings, release status, and controlling-copy review in the source images.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    withdrawalMetadataNote: fileUnit.withdrawalMetadataNote,
    collectionId: "deal-summit",
    provenanceMethod: "Opening PDF provenance marker, complete PDF review, and individual withdrawal sheets",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.localId.localeCompare(b.localId));

const dealReissUnitByNaid = new Map(dealReissFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const dealReissDocumentRecords = dealReissCandidates.documents.map((candidate) => {
  const fileUnit = dealReissUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`Deal-Reiss candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    id: `deal-reiss-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    datePrecision: candidate.datePrecision || "range",
    displayDateLabel: candidate.displayDateLabel || "",
    title,
    heading: `Timothy E. Deal and Mitchell B. Reiss Economic Summit File: ${title}`,
    dateline: candidate.displayDateLabel || formatDateline(candidate.date),
    type: "Timothy E. Deal and Mitchell B. Reiss economic-summit file",
    chapter: fileUnit.chapter,
    selection: candidate.selection,
    releaseStatus: candidate.releasedInPartSheetCount
      ? "Online file unit; released-in-part copies present"
      : candidate.withdrawalItems?.length
        ? "Online file unit; sheet dispositions unresolved"
        : "Online file unit; item audit pending",
    pageCount: candidate.pageCount,
    withdrawalSheetItemCount: candidate.withdrawalSheetItemCount,
    withdrawalSheetPages: candidate.withdrawalSheetPages,
    releasedInPartSheetCount: candidate.releasedInPartSheetCount,
    noCopyIndicatedSheetCount: candidate.withdrawalSheetItemCount - candidate.releasedInPartSheetCount,
    withdrawalItems: (candidate.withdrawalItems || []).map((item) => ({
      ...item,
      item: item.itemNumber,
    })),
    extentLabel: candidate.extentLabel,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance marker, all served-PDF pages, and every withdrawal/redaction sheet checked; file-unit locator only pending document boundaries, terminal markings, current release status, and controlling-copy review in the source images.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    withdrawalMetadataNote: fileUnit.withdrawalMetadataNote,
    markerMismatchNote: fileUnit.markerChecks?.catalogMismatch || "",
    collectionId: "deal-reiss",
    provenanceMethod: "Opening PDF provenance marker, complete PDF review, and disposition-aware withdrawal/redaction sheets",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.localId.localeCompare(b.localId));

const dealChronUnitByNaid = new Map(dealChronFileUnits.fileUnits.map((fileUnit) => [fileUnit.naid, fileUnit]));
const dealChronDocumentRecords = dealChronCandidates.documents.map((candidate) => {
  const fileUnit = dealChronUnitByNaid.get(candidate.naid);
  if (!fileUnit) throw new Error(`Deal Chronological candidate ${candidate.naid} is missing from the full file-unit ledger`);
  const title = fileUnit.title.replaceAll(" - ", "—");
  return {
    id: `deal-chron-${candidate.naid}`,
    date: candidate.date,
    sortDate: candidate.sortDate || candidate.date,
    datePrecision: candidate.datePrecision || "month",
    displayDateLabel: candidate.displayDateLabel || fileUnit.workingDateLabel || "",
    title,
    heading: `Timothy E. Deal Chronological File: ${title}`,
    dateline: candidate.displayDateLabel || fileUnit.workingDateLabel || formatDateline(candidate.date),
    type: "Timothy E. Deal chronological file",
    chapter: candidate.chapter,
    selection: candidate.selection,
    releaseStatus: candidate.withdrawalItems?.length
      ? "Online file unit; sheet dispositions unresolved"
      : "Online file unit; document boundaries not yet split",
    pageCount: candidate.pageCount,
    rawWithdrawalSheetHeaderCount: fileUnit.rawWithdrawalSheetHeaderCount,
    withdrawalInventoryHeaderCount: fileUnit.withdrawalInventoryHeaderCount,
    withdrawalSheetItemCount: candidate.withdrawalSheetItemCount,
    withdrawalSheetPages: candidate.withdrawalSheetPages,
    releasedInPartSheetCount: candidate.releasedInPartSheetCount,
    noCopyIndicatedSheetCount: candidate.withdrawalSheetItemCount - candidate.releasedInPartSheetCount,
    economicSubjectLeadCount: candidate.economicSubjectLeadCount,
    relevantWithdrawalSheetCount: candidate.relevantWithdrawalSheetCount,
    economicSubjectLeads: fileUnit.economicSubjectLeads || [],
    withdrawalItems: (candidate.withdrawalItems || []).map((item) => ({
      ...item,
      item: item.itemNumber,
    })),
    extentLabel: candidate.extentLabel,
    classification: "Mixed; document-level audit required",
    naid: candidate.naid,
    localId: fileUnit.localId.replaceAll("-", "–"),
    catalogUrl: fileUnit.catalogUrl,
    pdfUrl: fileUnit.pdfUrl,
    sourceNoteStatus: "locator",
    sourceNoteBasis:
      "Opening provenance marker, all served-PDF pages, full NARA OCR, and every individual withdrawal/redaction sheet checked; file-unit locator only pending document boundaries, terminal markings, current release status, and controlling-copy review in the source images.",
    sourceNote: undefined,
    archivalLocator: fileUnit.archivalLocator,
    topics: candidate.topics,
    notes: candidate.notes,
    withdrawalMetadataNote:
      "Inventory-sheet headers and individual withdrawal/redaction sheets are counted separately. No individual sheet says that a released-in-part copy follows; this does not establish present nonrelease.",
    collectionId: "deal-chron",
    provenanceMethod: "Opening PDF provenance marker, complete PDF and OCR review, and disposition-aware individual withdrawal/redaction sheets",
  };
}).sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.localId.localeCompare(b.localId));

const supersededLeadIds = new Set(
  [
    ...nscMeetingsDocumentRecords,
    ...nscDcMeetingsDocumentRecords,
    ...nscDcFollowUpDocumentRecords,
    ...nsdDocumentRecords,
    ...nsrDocumentRecords,
    ...ifTransitionDocumentRecords,
  ].map((record) => record.id),
);
const remainingLeadRecords = leadRecords.filter((record) => !supersededLeadIds.has(record.id));

const allRecords = [
  ...presidentialRecords,
  ...itemRecords,
  ...timDealDocumentRecords,
  ...nscMeetingsDocumentRecords,
  ...nscDcMeetingsDocumentRecords,
  ...nscDcFollowUpDocumentRecords,
  ...nsdDocumentRecords,
  ...nsrDocumentRecords,
  ...ifTransitionDocumentRecords,
  ...scowcroftDocumentRecords,
  ...dealSummitDocumentRecords,
  ...dealReissDocumentRecords,
  ...dealChronDocumentRecords,
  ...gatesMiddleEastDocumentRecords,
  ...remainingLeadRecords,
]
  .map((record) => {
    if (!subjectAreaNames.has(record.chapter)) throw new Error(`Unknown subject area for ${record.id}: ${record.chapter}`);
    const { chapter, ...chronologyRecord } = record;
    return { ...chronologyRecord, subjectArea: chapter };
  })
  .sort((a, b) => a.sortDate.localeCompare(b.sortDate) || a.title.localeCompare(b.title));

const data = {
  meta,
  subjectAreas,
  records: allRecords,
  nscCollections: [
    {
      id: "if-transition",
      ...ifTransitionFileUnits.collection,
      statusLabel: "H-Files Institutional Files transition series",
      intro:
        `${ifTransitionDocumentRecords.length} of the 30 NSC Institutional Files Transition file units are surfaced after complete PDF, OCR, opening-marker, withdrawal-sheet, and duplicate-copy review: 2 for direct Volume XXX review and 2 for boundary or compiler-context review. All 30 official PDFs and all 3,612 served-PDF pages remain visible in the ledger; month and season labels are preserved where the source supplies no day date.`,
      provenanceTitle: "Opening PDF provenance markers and withdrawal sheets",
      candidateLabel: "Transition files for review",
      candidateTitle: "Volume XXX Transition File Chronology",
      auditScope: ifTransitionCandidates.auditScope,
      auditedFolders: ifTransitionCandidates.auditedFolders,
      candidateCount: ifTransitionDocumentRecords.length,
      candidateIds: ifTransitionDocumentRecords.map((record) => record.id),
      fileUnits: ifTransitionFileUnits.fileUnits,
      candidateMethodology: ifTransitionCandidates.methodology,
      candidateCsvUrl: "data/if-transition-candidates.csv",
      fileUnitsCsvUrl: "data/if-transition-file-units.csv",
      reportUrl: "reports/if-transition-harvest.json",
    },
    {
      id: "scowcroft",
      ...scowcroftFileUnits.collection,
      statusLabel: "Complete Brent Scowcroft Papers collection audit",
      intro:
        `${scowcroftDocumentRecords.length} of the 676 Brent Scowcroft Papers file units are surfaced after complete 20-series hierarchy, OCR, and opening-marker review: 66 for direct Volume XXX review and 29 for cross-volume adjudication. All 676 official PDFs remain in the ledger. Served sizes total at least 15.7 GB across 660 PDFs; 16 PDF sizes were unavailable and no file-unit page total is asserted. Duplicate meeting, special-separate, schedule, and communication-channel copies remain visible without being promoted as separate candidates.`,
      provenanceTitle: "Opening PDF provenance markers across all 20 series",
      markerFieldSummary: "the record group or disclosed donated-materials exception, Brent Scowcroft Collection, series, supplied subseries, and folder",
      markerMetricDetail: "1 donated-materials record-group exception; 1 NARA OCR normalization; 0 unverified",
      corpusSizeNote: "Measured across 660 PDFs; 16 sizes unavailable",
      candidateLabel: "Scowcroft files for review",
      candidateTitle: "Volume XXX Scowcroft File Chronology",
      auditScope: scowcroftCandidates.auditScope,
      auditedFolders: scowcroftCandidates.auditedFolders,
      candidateCount: scowcroftDocumentRecords.length,
      candidateIds: scowcroftDocumentRecords.map((record) => record.id),
      fileUnits: scowcroftFileUnits.fileUnits,
      candidateMethodology: scowcroftCandidates.methodology,
      candidateCsvUrl: "data/scowcroft-candidates.csv",
      fileUnitsCsvUrl: "data/scowcroft-file-units.csv",
      reportUrl: "reports/scowcroft-harvest.json",
    },
    {
      id: "nsd",
      ...nsdFileUnits.collection,
      statusLabel: "H-Files National Security Directive series",
      intro:
        `${nsdDocumentRecords.length} of the 108 National Security Directive file units are surfaced after complete PDF, OCR, opening-marker, and withdrawal-sheet review: 11 for direct Volume XXX review and 22 for cross-volume adjudication. The ledger accounts for all 108 file units and all 5,243 served-PDF pages, including two Catalog units without online PDFs, 13 handwritten Folder ID corrections, and nine marker-to-Catalog ID mismatches.`,
      provenanceTitle: "Opening PDF provenance markers and withdrawal sheets",
      candidateLabel: "NSD files for review",
      candidateTitle: "Volume XXX National Security Directive Chronology",
      auditScope: nsdCandidates.auditScope,
      auditedFolders: nsdCandidates.auditedFolders,
      candidateCount: nsdDocumentRecords.length,
      candidateIds: nsdDocumentRecords.map((record) => record.id),
      fileUnits: nsdFileUnits.fileUnits,
      candidateMethodology: nsdCandidates.methodology,
      candidateCsvUrl: "data/nsd-candidates.csv",
      fileUnitsCsvUrl: "data/nsd-file-units.csv",
      reportUrl: "reports/nsd-harvest.json",
    },
    {
      id: "nsr",
      ...nsrFileUnits.collection,
      statusLabel: "H-Files National Security Review series",
      intro:
        `${nsrDocumentRecords.length} of the 65 National Security Review file units are surfaced after complete PDF, OCR, opening-marker, and withdrawal-sheet review: 10 for direct Volume XXX review and 11 for cross-volume adjudication. All 65 official PDFs remain visible in the ledger, including one handwritten Folder ID correction and two marker-to-Catalog ID mismatches.`,
      provenanceTitle: "Opening PDF provenance markers and withdrawal sheets",
      candidateLabel: "NSR files for review",
      candidateTitle: "Volume XXX National Security Review Chronology",
      auditScope: nsrCandidates.auditScope,
      auditedFolders: nsrCandidates.auditedFolders,
      candidateCount: nsrDocumentRecords.length,
      candidateIds: nsrDocumentRecords.map((record) => record.id),
      fileUnits: nsrFileUnits.fileUnits,
      candidateMethodology: nsrCandidates.methodology,
      candidateCsvUrl: "data/nsr-candidates.csv",
      fileUnitsCsvUrl: "data/nsr-file-units.csv",
      reportUrl: "reports/nsr-harvest.json",
    },
    {
      id: "nsc-dc-follow-up",
      ...nscDcFollowUpFileUnits.collection,
      statusLabel: "H-Files Deputies Committee follow-up series",
      intro:
        `${nscDcFollowUpDocumentRecords.length} of the 112 NSC/Deputies Committee follow-up file units are surfaced after complete PDF, OCR, opening-sheet, and withdrawal-sheet review: 8 for direct Volume XXX review and 21 for cross-volume adjudication. All 112 official PDFs remain visible in the ledger; companion notes identify related main meeting packets so distinct records can be retained without silently duplicating them.`,
      provenanceTitle: "Opening PDF provenance and withdrawal sheets",
      candidateLabel: "Follow-up files for review",
      candidateTitle: "Volume XXX Follow-Up Review Chronology",
      auditScope: nscDcFollowUpCandidates.auditScope,
      auditedFolders: nscDcFollowUpCandidates.auditedFolders,
      candidateCount: nscDcFollowUpDocumentRecords.length,
      candidateIds: nscDcFollowUpDocumentRecords.map((record) => record.id),
      fileUnits: nscDcFollowUpFileUnits.fileUnits,
      candidateMethodology: nscDcFollowUpCandidates.methodology,
      candidateCsvUrl: "data/nsc-dc-follow-up-candidates.csv",
      fileUnitsCsvUrl: "data/nsc-dc-follow-up-file-units.csv",
      reportUrl: "reports/nsc-dc-follow-up-harvest.json",
    },
    {
      id: "nsc-dc-meetings",
      ...nscDcMeetingsFileUnits.collection,
      statusLabel: "H-Files Deputies Committee series",
      intro:
        `${nscDcMeetingsDocumentRecords.length} of the 492 NSC/Deputies Committee file units are surfaced after complete title review and a full-series economic OCR sweep: 47 for direct Volume XXX review and 32 for cross-volume adjudication. NARA supplies 479 online PDFs; 13 catalog-only folders remain visible in the ledger.`,
      provenanceTitle: "Opening PDF provenance sheet",
      candidateLabel: "Files for review",
      candidateTitle: "Volume XXX Deputies Committee Review Chronology",
      auditScope: nscDcMeetingsCandidates.auditScope,
      auditedFolders: nscDcMeetingsCandidates.auditedFolders,
      candidateCount: nscDcMeetingsDocumentRecords.length,
      candidateIds: nscDcMeetingsDocumentRecords.map((record) => record.id),
      fileUnits: nscDcMeetingsFileUnits.fileUnits,
      candidateMethodology: nscDcMeetingsCandidates.methodology,
      candidateCsvUrl: "data/nsc-dc-meetings-candidates.csv",
      fileUnitsCsvUrl: "data/nsc-dc-meetings-file-units.csv",
      reportUrl: "reports/nsc-dc-meetings-harvest.json",
    },
    {
      id: "nsc-meetings",
      ...nscMeetingsFileUnits.collection,
      statusLabel: "H-Files meeting series",
      intro:
        `${nscMeetingsDocumentRecords.length} of the 90 NSC Meetings file units are surfaced after title review and a full-series economic OCR sweep: 13 for direct Volume XXX review and 22 for cross-volume adjudication. They remain file-level leads until the documents inside are checked individually.`,
      provenanceTitle: "Opening PDF provenance sheet",
      candidateLabel: "Files for review",
      candidateTitle: "Volume XXX File Review Chronology",
      auditScope: nscMeetingsCandidates.auditScope,
      auditedFolders: nscMeetingsCandidates.auditedFolders,
      candidateCount: nscMeetingsDocumentRecords.length,
      candidateIds: nscMeetingsDocumentRecords.map((record) => record.id),
      fileUnits: nscMeetingsFileUnits.fileUnits,
      candidateMethodology: nscMeetingsCandidates.methodology,
      candidateCsvUrl: "data/nsc-meetings-candidates.csv",
      fileUnitsCsvUrl: "data/nsc-meetings-file-units.csv",
      reportUrl: "reports/nsc-meetings-harvest.json",
    },
    {
      id: "deal-summit",
      ...dealSummitFileUnits.collection,
      statusLabel: "Complete Timothy E. Deal Summit Briefing Books audit",
      intro:
        "All 17 Houston and London Economic Summit briefing-book files are surfaced in event chronology after a complete 1,248-page PDF audit. Thirteen are Core and four are Consider leads for Volume XXX. The ledger preserves 104 uniquely described withdrawal entries totaling 324 pages and flags possible duplicate copies for comparison against the Deal Subject Files and Deal-Reiss Economic Summit Files.",
      provenanceTitle: "Opening PDF provenance markers and individual withdrawal sheets",
      markerMetricDetail: "17 complete; 0 opening-marker exceptions; 10 later withdrawal-metadata discrepancies",
      corpusSizeNote: "1,248 served-PDF pages; 104 withdrawals totaling 324 pages",
      provenanceQualifier:
        "The first six opening sheets say Summit Briefing Books and the remaining eleven say Summit Briefing Books Files; each locator preserves that wording. Nine London files have later withdrawal sheets labeled Subject Files, and CF00960–013 has later withdrawal sheets attributed to the Deal-Reiss files. The opening marker controls each file-level locator.",
      candidateLabel: "Summit files for review",
      candidateTitle: "Volume XXX Deal Summit Briefing-Book Chronology",
      candidateSummary:
        "17 file-unit leads, ordered by event date: 13 Core and 4 Consider. All remain archival locators until individual documents are checked in the source images and controlling copies are selected. The displayed withdrawal ledgers account for 104 entries totaling 324 pages.",
      auditScope: dealSummitCandidates.auditScope,
      auditedFolders: dealSummitCandidates.auditedFolders,
      candidateCount: dealSummitDocumentRecords.length,
      candidateIds: dealSummitDocumentRecords.map((record) => record.id),
      fileUnits: dealSummitFileUnits.fileUnits,
      candidateMethodology: dealSummitCandidates.methodology,
      candidateCsvUrl: "data/deal-summit-candidates.csv",
      fileUnitsCsvUrl: "data/deal-summit-file-units.csv",
      reportUrl: "reports/deal-summit-harvest.json",
    },
    {
      id: "deal-reiss",
      ...dealReissFileUnits.collection,
      statusLabel: "Complete Timothy E. Deal and Mitchell B. Reiss Economic Summit Files audit",
      intro:
        "All 25 Paris Economic Summit and connected presidential-trip files are surfaced in working chronology after a complete 1,683-page PDF audit. Six are Core, nine are Consider, and ten are Boundary leads. The ledger extracts 142 withdrawal/redaction sheet descriptions totaling 540 pages and distinguishes the eight sheets that explicitly say a released-in-part copy follows from the 134 that do not.",
      provenanceTitle: "Opening PDF provenance markers and disposition-aware withdrawal/redaction sheets",
      markerMetricDetail: "25 complete; 3 marker/Catalog Folder ID mismatches; 0 unverified",
      corpusSizeNote: "1,683 served-PDF pages; 142 sheet descriptions covering 540 pages",
      provenanceQualifier:
        "The first three markers name both Deal and Reiss with a combined Summit Briefing Books Files / Economic Summit Files subseries; two NATO folders name both series but supply no subseries; the remaining twenty name Timothy E. Deal Files and Summit Briefing Books Files. CF00186–023 through CF00186–025 carry opening-marker IDs three numbers lower than the Catalog paths. Later sheet metadata in the first three folders also varies; every discrepancy remains visible and the opening marker controls the file-level locator wording.",
      candidateLabel: "Deal-Reiss files for review",
      candidateTitle: "Volume XXX Deal-Reiss Economic Summit File Chronology",
      candidateSummary:
        "25 file-unit leads, ordered at the precision supported by the folders: 6 Core, 9 Consider, and 10 Boundary. All remain archival locators pending document-level review. The First Plenary sheet in CF00186–010 is matched to the released canonical memcon already in the chronology rather than promoted as a duplicate.",
      auditScope: dealReissCandidates.auditScope,
      auditedFolders: dealReissCandidates.auditedFolders,
      candidateCount: dealReissDocumentRecords.length,
      candidateIds: dealReissDocumentRecords.map((record) => record.id),
      fileUnits: dealReissFileUnits.fileUnits,
      candidateMethodology: dealReissCandidates.methodology,
      candidateCsvUrl: "data/deal-reiss-candidates.csv",
      fileUnitsCsvUrl: "data/deal-reiss-file-units.csv",
      reportUrl: "reports/deal-reiss-harvest.json",
    },
    {
      id: "deal-chron",
      ...dealChronFileUnits.collection,
      statusLabel: "Complete Timothy E. Deal Chronological Files audit",
      intro:
        "All 96 monthly Timothy E. Deal chronological files are surfaced after a complete 9,093-page PDF and OCR audit. Seventy-six are Core and twenty are Consider leads for Volume XXX. The screen preserves 708 economic-policy subject lines and 275 pertinent descriptions among 697 individual withdrawal/redaction sheets covering 2,121 pages.",
      provenanceTitle: "Opening PDF provenance markers, full OCR, and disposition-aware individual withdrawal/redaction sheets",
      markerMetricDetail: "96 complete; 0 opening-marker exceptions or Folder ID mismatches",
      corpusSizeNote: "9,093 served-PDF pages; 3.86 GiB by Catalog objectFileSize metadata; HTTP sizes measured for 94 PDFs and unavailable for 2",
      provenanceQualifier:
        "The opening marker in every PDF identifies the Timothy E. Deal Files, Chronological Files subseries, and the Catalog Folder ID. The 813 raw withdrawal/redaction headers consist of 116 inventory-sheet headers and 697 individual document sheets. None of the individual sheets says that a released-in-part copy follows; that historical sheet evidence is not treated as proof of present nonrelease. The displayed 3.86 GiB total follows Catalog objectFileSize metadata because two live PDF responses supplied no measurable Content-Length.",
      candidateLabel: "Deal chronological files for review",
      candidateTitle: "Volume XXX Deal Chronological File Chronology",
      candidateSummary:
        "96 file-unit leads, ordered at month precision: 76 Core and 20 Consider. All remain archival locators pending document splitting and source-image review. Sixty-nine same-title/date groups involving 152 sheet entries and seven cross-collection title matches are comparison warnings, not silent deduplications or canonical-copy determinations.",
      auditScope: dealChronCandidates.auditScope,
      auditedFolders: dealChronCandidates.auditedFolders,
      candidateCount: dealChronDocumentRecords.length,
      candidateIds: dealChronDocumentRecords.map((record) => record.id),
      fileUnits: dealChronFileUnits.fileUnits,
      candidateMethodology: dealChronCandidates.methodology,
      candidateCsvUrl: "data/deal-chron-candidates.csv",
      fileUnitsCsvUrl: "data/deal-chron-file-units.csv",
      reportUrl: "reports/deal-chron-harvest.json",
    },
    {
      id: "tim-deal",
      ...timDealFileUnits.collection,
      statusLabel: "Timothy E. Deal first pass",
      intro:
        "The Timothy E. Deal Subject Files are fully inventoried. The document chronology contains item-level candidates only where heading, date, classification, and provenance have been checked; the full ledger keeps every online file unit visible for further selection work.",
      provenanceTitle: "Opening PDF provenance marker",
      candidateLabel: "Item-level candidates",
      candidateTitle: "Document Chronology",
      auditScope: timDealCandidates.auditScope,
      auditedFolders: timDealCandidates.auditedFolders,
      candidateCount: timDealDocumentRecords.length,
      candidateIds: timDealDocumentRecords.map((record) => record.id),
      fileUnits: timDealFileUnits.fileUnits,
      candidateMethodology: timDealCandidates.methodology,
      candidateCsvUrl: "data/tim-deal-candidates.csv",
      fileUnitsCsvUrl: "data/tim-deal-file-units.csv",
      reportUrl: "reports/tim-deal-harvest.json",
    },
    {
      id: "gates-middle-east",
      ...gatesMiddleEastCollection,
      statusLabel: "Selected Robert M. Gates Subject Files audit",
      intro:
        "Two companion Gates Subject Files folders, totaling 250 served-PDF pages, have been audited page by page. Twenty-one document candidates are promoted with verified FRUS-style Source Notes; the file ledgers preserve every page, release sheet, withheld extent, version, and duplicate-copy warning. This tab does not imply full coverage of the Gates series.",
      provenanceTitle: "Opening PDF provenance marker and complete page accounting",
      markerMetricDetail: "2 complete; 0 opening-marker exceptions; every served-PDF page assigned",
      corpusSizeNote: "250 served-PDF pages; Catalog metadata is one byte larger than each measured file",
      provenanceQualifier:
        "The opening markers identify Gates, Robert M., Files; Subject Files; and Folder IDs CF00946-002 and CF00946-003. Published FRUS form is used in the document Source Notes as Robert M. Gates Files, Subject Files. The first folder retains its complete 23-item opening inventory. The second has no opening inventory, so its 119 served document, administrative, and working-note pages are reconstructed as an 18-set ledger alongside five withdrawal sheets and 12 logical pages not served.",
      markerFieldSummary: "the record group, office, Gates series, Subject Files subseries, and folder ID",
      candidateLabel: "Gates document candidates",
      candidateTitle: "Middle East Economic Strategy Document Chronology",
      candidateSummary:
        "21 document candidates totaling 137 logical pages, ordered by exact date or disclosed working placement: 12 Core and 9 Consider. All 21 headings, datelines, extents, terminal markings, and Source Notes have been checked against the source images. Parallel Gates, Deal, Scowcroft, and H-Files copies remain one intellectual record with alternate provenance disclosed instead of appearing repeatedly.",
      auditScope: "Complete page-level audit of NAIDs 470437043 and 470437044",
      auditedFolders: ["CF00946-002", "CF00946-003"],
      candidateCount: gatesMiddleEastDocumentRecords.length,
      candidateIds: gatesMiddleEastDocumentRecords.map((record) => record.id),
      fileUnits: gatesMiddleEastFileUnits,
      candidateMethodology: gatesMiddleEastCollection.methodology,
      candidateCsvUrl: "data/gates-middle-east-candidates.csv",
      fileUnitsCsvUrl: "data/gates-middle-east-file-units.csv",
      reportUrl: "reports/gates-middle-east-audit.json",
    },
  ],
  publicReferences: publicReferences.sort((a, b) => a.date.localeCompare(b.date)),
  sourceCollections,
  gaps,
  generatedAt: new Date().toISOString(),
};

const dataDir = path.join(root, "data");
fs.mkdirSync(dataDir, { recursive: true });
fs.writeFileSync(path.join(dataDir, "volume.json"), `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(path.join(dataDir, "volume.js"), `window.VOLUME_DATA = ${JSON.stringify(data, null, 2)};\n`);
fs.writeFileSync(
  path.join(dataDir, "gates-middle-east-candidates.json"),
  `${JSON.stringify({
    auditScope: "Complete page-level audit of NAIDs 470437043 and 470437044",
    auditedFolders: ["CF00946-002", "CF00946-003"],
    methodology: gatesMiddleEastCollection.methodology,
    documents: gatesMiddleEastDocumentRecords,
  }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(dataDir, "gates-middle-east-file-units.json"),
  `${JSON.stringify({ collection: gatesMiddleEastCollection, fileUnits: gatesMiddleEastFileUnits }, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(root, "reports", "gates-middle-east-470437043-audit.json"),
  `${JSON.stringify(gatesMiddleEastAudit.audit, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(root, "reports", "gates-middle-east-470437044-audit.json"),
  `${JSON.stringify(gatesMiddleEastAudit2.audit, null, 2)}\n`,
);
fs.writeFileSync(
  path.join(root, "reports", "gates-middle-east-audit.json"),
  `${JSON.stringify({
    auditScope: "Complete page-level audit of NAIDs 470437043 and 470437044",
    collection: gatesMiddleEastCollection,
    candidateAccounting: {
      documentCandidates: gatesMiddleEastDocumentRecords.length,
      candidatePages: gatesMiddleEastDocumentRecords.reduce((total, row) => total + row.pageCount, 0),
      core: gatesMiddleEastDocumentRecords.filter((row) => row.selection === "Core").length,
      consider: gatesMiddleEastDocumentRecords.filter((row) => row.selection === "Consider").length,
      released: gatesMiddleEastDocumentRecords.filter((row) => row.releaseStatus === "Released").length,
      releasedInPart: gatesMiddleEastDocumentRecords.filter((row) => row.releaseStatus === "Released in part").length,
      withheld: gatesMiddleEastDocumentRecords.filter((row) => row.releaseStatus === "Withheld").length,
      verifiedSourceNotes: gatesMiddleEastDocumentRecords.filter((row) => row.sourceNoteStatus === "verified").length,
    },
    files: [gatesMiddleEastAudit.audit, gatesMiddleEastAudit2.audit],
  }, null, 2)}\n`,
);
fs.writeFileSync(path.join(dataDir, "records.csv"), toCsv(allRecords, [
  "id",
  "date",
  "title",
  "heading",
  "dateline",
  "type",
  "subjectArea",
  "selection",
  "releaseStatus",
  "pageCount",
  "withheldPages",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNote",
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "public-references.csv"), toCsv(publicReferences, [
  "id",
  "date",
  "title",
  "type",
  "source",
  "topics",
  "selection",
  "url",
]));
fs.writeFileSync(path.join(dataDir, "scowcroft-candidates.csv"), toCsv(scowcroftDocumentRecords, [
  "id",
  "date",
  "displayDateLabel",
  "datePrecision",
  "title",
  "seriesTitle",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNoteBasis",
  "archivalLocator",
  "topics",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "scowcroft-file-units.csv"), toCsv(scowcroftFileUnits.fileUnits.map(flattenFileUnit), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "dateBasis",
  "title",
  "localId",
  "seriesNaid",
  "seriesTitle",
  "chapter",
  "routing",
  "reviewTopics",
  "reviewFocus",
  "reviewKeyExtent",
  "markerStatus",
  "markerRecordGroup",
  "markerSeries",
  "markerSubseries",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
  "ocrCharacterCount",
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
  "archivalLocator",
  "provenanceStem",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "if-transition-candidates.csv"), toCsv(ifTransitionDocumentRecords, [
  "id",
  "date",
  "displayDateLabel",
  "datePrecision",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "archivalLocator",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "if-transition-file-units.csv"), toCsv(ifTransitionFileUnits.fileUnits.map(flattenFileUnit), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "reviewTopics",
  "reviewFocus",
  "reviewKeyExtent",
  "markerStatus",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
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
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsd-candidates.csv"), toCsv(nsdDocumentRecords, [
  "id",
  "date",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "archivalLocator",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsd-file-units.csv"), toCsv(nsdFileUnits.fileUnits.map((row) => ({
  ...flattenFileUnit(row),
  markerFolderId: row.markerChecks?.markerFolderId || "",
  catalogFolderId: row.localId,
  markerIdNote:
    row.markerChecks?.handwrittenCorrection ||
    row.markerChecks?.catalogMismatch ||
    row.markerChecks?.visualFolderIdCheck ||
    "",
})), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "markerStatus",
  "markerFolderId",
  "catalogFolderId",
  "markerIdNote",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
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
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsr-candidates.csv"), toCsv(nsrDocumentRecords, [
  "id",
  "date",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "archivalLocator",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsr-file-units.csv"), toCsv(nsrFileUnits.fileUnits.map((row) => ({
  ...flattenFileUnit(row),
  markerFolderId: row.markerChecks?.markerFolderId || "",
  catalogFolderId: row.localId,
  markerIdNote: row.markerChecks?.handwrittenCorrection || row.markerChecks?.catalogMismatch || "",
})), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "markerStatus",
  "markerFolderId",
  "catalogFolderId",
  "markerIdNote",
  "hasOnlinePdf",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
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
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsc-dc-follow-up-candidates.csv"), toCsv(nscDcFollowUpDocumentRecords, [
  "id",
  "date",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "archivalLocator",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsc-dc-follow-up-file-units.csv"), toCsv(nscDcFollowUpFileUnits.fileUnits.map(flattenFileUnit), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "markerStatus",
  "hasOnlinePdf",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
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
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsc-dc-meetings-candidates.csv"), toCsv(nscDcMeetingsDocumentRecords, [
  "id",
  "date",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "withheldPages",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "archivalLocator",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsc-dc-meetings-file-units.csv"), toCsv(nscDcMeetingsFileUnits.fileUnits.map(flattenFileUnit), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "markerStatus",
  "hasOnlinePdf",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
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
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsc-meetings-candidates.csv"), toCsv(nscMeetingsDocumentRecords, [
  "id",
  "date",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "withheldPages",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "archivalLocator",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "nsc-meetings-file-units.csv"), toCsv(nscMeetingsFileUnits.fileUnits.map(flattenFileUnit), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "markerStatus",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
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
  "treasurySignals",
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "deal-summit-candidates.csv"), toCsv(dealSummitDocumentRecords.map((row) => ({
  ...row,
  topics: row.topics,
  withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
})), [
  "id",
  "date",
  "displayDateLabel",
  "datePrecision",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "withheldPages",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNoteBasis",
  "archivalLocator",
  "topics",
  "notes",
  "withdrawalMetadataNote",
  "withdrawalInventory",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "deal-summit-file-units.csv"), toCsv(dealSummitFileUnits.fileUnits.map((row) => ({
  ...flattenFileUnit(row),
  withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
})), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "reviewTopics",
  "reviewFocus",
  "reviewKeyExtent",
  "markerStatus",
  "markerSeries",
  "markerSubseries",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
  "ocrCharacterCount",
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
  "withdrawalMetadataNote",
  "withdrawalInventory",
  "archivalLocator",
  "provenanceStem",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "deal-reiss-candidates.csv"), toCsv(dealReissDocumentRecords.map((row) => ({
  ...row,
  withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
})), [
  "id",
  "date",
  "displayDateLabel",
  "datePrecision",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "withdrawalSheetItemCount",
  "withdrawalSheetPages",
  "releasedInPartSheetCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNoteBasis",
  "archivalLocator",
  "topics",
  "notes",
  "withdrawalMetadataNote",
  "markerMismatchNote",
  "withdrawalInventory",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "deal-reiss-file-units.csv"), toCsv(dealReissFileUnits.fileUnits.map((row) => ({
  ...flattenFileUnit(row),
  withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
})), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "reviewTopics",
  "reviewFocus",
  "reviewKeyExtent",
  "markerStatus",
  "markerSeries",
  "markerSubseries",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
  "ocrCharacterCount",
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
  "withdrawalSheetItemCount",
  "withdrawalSheetPages",
  "releasedInPartSheetCount",
  "noCopyIndicatedSheetCount",
  "withdrawalMetadataNote",
  "withdrawalInventory",
  "archivalLocator",
  "provenanceStem",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "deal-chron-candidates.csv"), toCsv(dealChronDocumentRecords.map((row) => ({
  ...row,
  topics: row.topics,
  economicSubjectLeads: JSON.stringify(row.economicSubjectLeads || []),
  withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
})), [
  "id",
  "date",
  "sortDate",
  "displayDateLabel",
  "datePrecision",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNoteBasis",
  "archivalLocator",
  "topics",
  "notes",
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
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "deal-chron-file-units.csv"), toCsv(dealChronFileUnits.fileUnits.map((row) => ({
  ...flattenFileUnit(row),
  markerFolderId: row.markerChecks?.markerFolderId || "",
  economicSubjectLeadCount: row.economicSubjectLeads?.length || 0,
  economicSubjectLeads: JSON.stringify(row.economicSubjectLeads || []),
  withdrawalInventory: JSON.stringify(row.withdrawalItems || []),
})), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "selection",
  "routing",
  "reviewTopics",
  "reviewFocus",
  "reviewKeyExtent",
  "markerStatus",
  "markerSeries",
  "markerSubseries",
  "markerFolderId",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
  "ocrCharacterCount",
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
  "economicSubjectLeadCount",
  "relevantWithdrawalSheetCount",
  "economicSubjectLeads",
  "rawWithdrawalSheetHeaderCount",
  "withdrawalInventoryHeaderCount",
  "withdrawalSheetItemCount",
  "withdrawalSheetPages",
  "releasedInPartSheetCount",
  "noCopyIndicatedSheetCount",
  "withdrawalInventory",
  "archivalLocator",
  "provenanceStem",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "tim-deal-candidates.csv"), toCsv(timDealDocumentRecords, [
  "id",
  "date",
  "displayDateLabel",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNote",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "tim-deal-file-units.csv"), toCsv(timDealFileUnits.fileUnits.map(flattenFileUnit), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "dateBasis",
  "title",
  "localId",
  "chapter",
  "routing",
  "markerStatus",
  "pdfBytes",
  "accessStatus",
  "memosToPresident",
  "memosToScowcroft",
  "memorandaOfConversation",
  "meetingRecords",
  "withdrawalSheets",
  "archivalLocator",
  "catalogUrl",
  "pdfUrl",
]));

fs.writeFileSync(path.join(dataDir, "gates-middle-east-candidates.csv"), toCsv(gatesMiddleEastDocumentRecords, [
  "id",
  "item",
  "date",
  "sortDate",
  "title",
  "heading",
  "dateline",
  "type",
  "chapter",
  "selection",
  "releaseStatus",
  "pageCount",
  "extentLabel",
  "classification",
  "naid",
  "localId",
  "sourceNoteStatus",
  "sourceNoteBasis",
  "sourceNote",
  "topics",
  "notes",
  "catalogUrl",
  "pdfUrl",
]));
fs.writeFileSync(path.join(dataDir, "gates-middle-east-file-units.csv"), toCsv(gatesMiddleEastFileUnits.map((fileUnit) => ({
  ...flattenFileUnit(fileUnit),
  pageAccounting: JSON.stringify(fileUnit.pageAccounting),
  withdrawalInventory: JSON.stringify(fileUnit.withdrawalItems),
})), [
  "naid",
  "workingStartDate",
  "workingEndDate",
  "workingDateLabel",
  "dateBasis",
  "title",
  "localId",
  "seriesNaid",
  "seriesTitle",
  "chapter",
  "selection",
  "routing",
  "reviewTopics",
  "reviewFocus",
  "reviewKeyExtent",
  "markerStatus",
  "markerSeries",
  "markerSubseries",
  "hasOnlinePdf",
  "pdfPages",
  "pdfBytes",
  "catalogPdfBytes",
  "pdfByteBasis",
  "accessStatus",
  "ocrCharacterCount",
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
  "withdrawalSheetItemCount",
  "withdrawalSheetPages",
  "releasedInPartSheetCount",
  "pageAccounting",
  "withdrawalInventory",
  "archivalLocator",
  "provenanceStem",
  "catalogUrl",
  "pdfUrl",
]));

console.log(
  `Built ${allRecords.length} candidate records, ${scowcroftFileUnits.fileUnits.length} Scowcroft file units, ${dealSummitFileUnits.fileUnits.length} Deal Summit file units, ${dealReissFileUnits.fileUnits.length} Deal-Reiss file units, ${dealChronFileUnits.fileUnits.length} Deal Chronological file units, ${ifTransitionFileUnits.fileUnits.length} IF Transition file units, ${nsdFileUnits.fileUnits.length} NSD file units, ${nsrFileUnits.fileUnits.length} NSR file units, ${nscDcFollowUpFileUnits.fileUnits.length} NSC/DC follow-up file units, ${nscDcMeetingsFileUnits.fileUnits.length} NSC/DC file units, ${nscMeetingsFileUnits.fileUnits.length} NSC Meeting file units, ${timDealFileUnits.fileUnits.length} Tim Deal file units, ${gatesMiddleEastDocumentRecords.length} Gates Middle East document candidates, ${publicReferences.length} public references, and ${gaps.length} gap entries.`,
);

function toCsv(rows, fields) {
  const escape = (value) => {
    const normalized = Array.isArray(value) ? value.join("; ") : value ?? "";
    return `"${String(normalized).replaceAll('"', '""')}"`;
  };
  return `${fields.map(escape).join(",")}\n${rows.map((row) => fields.map((field) => escape(row[field])).join(",")).join("\n")}\n`;
}

function flattenFileUnit(row) {
  return {
    ...row,
    hasOnlinePdf: row.hasOnlinePdf ?? Boolean(row.pdfUrl),
    ...(row.reviewSignals || {}),
    economicSignalTotal: row.economicSignals?.total ?? "",
    economySignals: row.economicSignals?.economy ?? "",
    financeSignals: row.economicSignals?.finance ?? "",
    tradeSignals: row.economicSignals?.trade ?? "",
    assistanceSanctionsSignals: row.economicSignals?.assistanceSanctions ?? "",
    energySignals: row.economicSignals?.energy ?? "",
    agricultureSignals: row.economicSignals?.agriculture ?? "",
    treasurySignals: row.economicSignals?.treasury ?? "",
  };
}
