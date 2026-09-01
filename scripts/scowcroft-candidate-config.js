const chapters = {
  trade: "Trade Policy and Market Access",
  finance: "Monetary Policy, Debt, and International Institutions",
  summit: "Economic Summits and Industrialized-Country Cooperation",
  transition: "Transition Economies and International Economic Strategy",
  strategic: "Strategic Trade, Technology, and Investment Controls",
};

const candidate = (naid, selection, chapter, topics, focus, dedupe = "") => ({
  naid,
  selection,
  chapter,
  topics,
  focus,
  dedupe,
});

const presidentialFocus =
  "The complete Scowcroft folder contains presidential memoranda of conversation or telephone conversations with substantive economic-policy OCR signals. Review each conversation separately and promote only the passages that bear directly on Volume XXX.";
const presidentialDedupe =
  "Parallel-copy control: match each conversation to the Bush Library Memcons and Telcons index and its canonical NARA item before selection. A Scowcroft folder copy is not a second documentary entry.";

const presidentialMeetings = [
  ["366551660", chapters.finance],
  ["366551661", chapters.strategic],
  ["366551662", chapters.transition],
  ["366551663", chapters.finance],
  ["366551664", chapters.summit],
  ["366551665", chapters.finance],
  ["366551666", chapters.transition],
  ["366551667", chapters.finance],
  ["366551668", chapters.trade],
  ["366551669", chapters.transition],
  ["366551670", chapters.summit],
  ["366551671", chapters.trade],
  ["366551672", chapters.trade],
  ["366551674", chapters.trade],
  ["366551675", chapters.trade],
  ["366551676", chapters.summit],
  ["366551677", chapters.finance],
  ["366551678", chapters.trade],
  ["366551679", chapters.trade],
  ["366551681", chapters.trade],
  ["366551682", chapters.finance],
  ["366551683", chapters.trade],
  ["366551684", chapters.summit],
].map(([naid, chapter]) =>
  candidate(
    naid,
    "Core",
    chapter,
    ["Presidential conversations", "Economic-content review", "Parallel-copy check"],
    presidentialFocus,
    presidentialDedupe,
  ),
);

const presidentialTelcons = [
  ["366551687", chapters.summit],
  ["366551688", chapters.summit],
  ["366551689", chapters.trade],
  ["366551691", chapters.trade],
  ["366551692", chapters.summit],
  ["366551693", chapters.strategic],
  ["366551695", chapters.trade],
  ["366551700", chapters.finance],
  ["366551702", chapters.trade],
  ["366551703", chapters.finance],
  ["366551704", chapters.trade],
  ["366551705", chapters.trade],
].map(([naid, chapter]) =>
  candidate(
    naid,
    "Core",
    chapter,
    ["Presidential telephone conversations", "Economic-content review", "Parallel-copy check"],
    presidentialFocus,
    presidentialDedupe,
  ),
);

const outgoingCorrespondence = [
  ["366551712", chapters.summit, "France"],
  ["366551714", chapters.summit, "Germany"],
  ["366551716", chapters.finance, "Italy"],
  ["366551718", chapters.trade, "Japan"],
  ["366551723", chapters.transition, "United Kingdom"],
  ["366551724", chapters.transition, "United Kingdom"],
].map(([naid, chapter, country]) =>
  candidate(
    naid,
    "Core",
    chapter,
    ["Head-of-state correspondence", country, "Economic coordination"],
    `Outgoing presidential correspondence with ${country} includes economic-summit, trade, finance, or transition-policy material identified in the complete OCR screen. Separate substantive messages from courtesy and security correspondence before selection.`,
    "Cross-check each message against the general Chronological Files, Special Channel files, and the presidential-correspondence index; retain one archival copy as the citation authority.",
  ),
);

const latinAmericaEconomic = [
  ["366551910", chapters.summit],
  ["366551911", chapters.finance],
  ["366551912", chapters.trade],
  ["366551913", chapters.trade],
  ["366551914", chapters.trade],
  ["366551915", chapters.trade],
  ["366551916", chapters.trade],
  ["366551917", chapters.finance],
  ["366551918", chapters.finance],
  ["366551919", chapters.finance],
  ["366551920", chapters.finance],
  ["366551921", chapters.trade],
  ["366551922", chapters.trade],
].map(([naid, chapter]) =>
  candidate(
    naid,
    "Core",
    chapter,
    ["Latin America", "Economic policy", "Debt and trade"],
    "This file belongs to the complete 13-folder Economic Chronological Files subseries. Screen its decision memoranda, presidential meeting materials, debt papers, trade papers, and follow-up actions individually for Volume XXX and route country-policy material to the appropriate regional volume.",
    "Country meeting packets and presidential conversations may duplicate the Presidential Correspondence Files or regional NSC staff files; compare dates, subjects, and document text before promotion.",
  ),
);

const directFiles = [
  candidate(
    "366551990",
    "Core",
    chapters.summit,
    ["G-7", "Paris Economic Summit", "EC 1992"],
    "The folder lists the January 31 paper on the U.S. position at the G-7, background papers on EC 1992, the February 28 paper on next steps for the Paris Economic Summit, and Scowcroft memoranda on summit preparations.",
  ),
  candidate(
    "366551992",
    "Core",
    chapters.strategic,
    ["COCOM", "Trade Strategy Review", "Export Enhancement Program", "Japan telecommunications"],
    "The opening inventory identifies Economic Policy Directive 1, Brady's Trade Strategy Review, the Soviet Export Enhancement Program decision package, Japan telecommunications determinations, and a White House Summit Group packet.",
  ),
  candidate(
    "366551997",
    "Core",
    chapters.transition,
    ["EBRD", "China", "Houston Economic Summit"],
    "The folder contains a concentrated EBRD decision trail, including Baker-Brady-Scowcroft meeting records and presidential papers, followed by Scowcroft and Melby memoranda on preparations for the Houston Economic Summit.",
  ),
  candidate(
    "366551999",
    "Core",
    chapters.transition,
    ["Nicholas Brady", "EBRD", "IEPR"],
    "The folder inventory identifies Scowcroft's meeting with Treasury Secretary Brady, a Deal memorandum on the EBRD, and the March 29 international-economic breakfast paper.",
  ),
  candidate(
    "366552000",
    "Core",
    chapters.summit,
    ["Houston Economic Summit", "Head-of-state correspondence"],
    "The folder contains Scowcroft and Melby papers on preparations for the Houston Economic Summit together with related correspondence from summit and other foreign leaders.",
  ),
  candidate(
    "366552001",
    "Core",
    chapters.trade,
    ["Taiwan", "GATT", "Jordan and Egypt"],
    "The opening inventory identifies the White House decision trail on Taiwan and the GATT and a four-page memorandum on mounting economic distress in Jordan and Egypt.",
  ),
  candidate(
    "366552002",
    "Core",
    chapters.summit,
    ["Houston Economic Summit", "Western assistance to the USSR", "Taiwan and GATT"],
    "The folder contains presidential and staff summit-preparation papers, a five-page initiative on Western assistance for the USSR, Taiwan-GATT coordination, and summit correspondence from foreign leaders.",
  ),
  candidate(
    "366552003",
    "Core",
    chapters.summit,
    ["Houston Economic Summit", "Western assistance to the USSR", "Summit messages"],
    "The folder inventory identifies the President's Houston briefing materials, messages to every summit leader, a six-page Scowcroft memorandum on Western assistance for the USSR, and the June 28 Cabinet Room briefing packet.",
  ),
  candidate(
    "366552005",
    "Core",
    chapters.summit,
    ["Houston Economic Summit", "World Bank lending to China", "Argentina"],
    "The folder contains Scowcroft papers on the Houston Summit and World Bank lending to China, Baker's eight-page summit memorandum, and a presidential telcon with Argentine President Menem.",
  ),
  candidate(
    "366552008",
    "Core",
    chapters.trade,
    ["GATT", "Margaret Thatcher", "Head-of-state correspondence"],
    "The opening inventory identifies Prime Minister Thatcher's October 30 message to President Bush on the GATT among a small set of presidential correspondence.",
  ),
  candidate(
    "366552131",
    "Core",
    chapters.transition,
    ["Poland and Hungary", "Eastern European economic initiative", "Economic outreach"],
    "This miscellaneous file contains reports titled Eastern European Economic Initiative and Economic Outreach to Eastern Europe, a presidential message to EC Commission President Delors, and records on the international support meeting for Poland and Hungary.",
    "Several items are convenience copies from policy and correspondence files; use this folder as a discovery lead until the controlling copy is identified.",
  ),
  candidate(
    "366552163",
    "Core",
    chapters.finance,
    ["Nicholas Brady", "IMF negotiations with Russia", "Post-Gulf economy", "NAFTA boundary"],
    "The folder inventory identifies a draft review of U.S. economic policy toward Latin America, IMF negotiations with Russia, Brady's memorandum on post-Gulf international economic issues, Gulf financing, and a NAFTA letter requiring Volume XXXIII routing.",
    "The draft review overlaps the NSR series, and the NAFTA item belongs primarily in Volume XXXIII. Compare those controlling files before promotion.",
  ),
];

const boundaryFiles = [
  ["366551729", chapters.transition, ["German unification", "Transition economy", "Cross-volume routing"]],
  ["366551744", chapters.transition, ["Soviet reform", "Trade policy", "Export controls"]],
  ["366551745", chapters.transition, ["Malta", "Soviet reform", "Economic assistance"]],
  ["366551747", chapters.transition, ["Soviet reform", "EBRD", "Economic assistance"]],
  ["366551750", chapters.transition, ["Soviet reform", "Western assistance", "Debt"]],
  ["366551753", chapters.transition, ["Houston Summit", "Soviet assistance", "International finance"]],
  ["366551759", chapters.transition, ["Soviet economic assistance", "IMF", "World Bank"]],
  ["366551761", chapters.transition, ["Soviet economic reform", "IMF", "World Bank"]],
  ["366551795", chapters.finance, ["Poland", "Debt relief", "Economic reform"]],
  ["366551799", chapters.transition, ["Eastern Europe", "Economic assistance", "Paris Summit"]],
  ["366551801", chapters.transition, ["Eastern Europe", "Economic assistance", "Paris Summit"]],
  ["366551802", chapters.transition, ["Eastern Europe", "Economic reform", "International institutions"]],
  ["366551803", chapters.transition, ["Eastern Europe", "Economic reform", "Debt"]],
  ["366551807", chapters.transition, ["Eastern Europe", "Market economy", "COCOM"]],
  ["366551808", chapters.transition, ["Eastern Europe", "EBRD", "Brady Plan"]],
  ["366551809", chapters.transition, ["Eastern Europe", "Economic reform", "International institutions"]],
  ["366551812", chapters.transition, ["Eastern Europe", "Debt reduction", "Houston Summit"]],
  ["366551815", chapters.transition, ["Eastern Europe", "Economic assistance", "International institutions"]],
  ["366551860", chapters.strategic, ["China", "Tiananmen sanctions", "Export controls"]],
  ["366551864", chapters.finance, ["China", "World Bank lending", "Post-Tiananmen policy"]],
  ["366551871", chapters.trade, ["China", "World Bank", "Agricultural trade"]],
  ["366551890", chapters.strategic, ["China", "Sensitive channel", "Trade and sanctions"]],
  ["366551951", chapters.strategic, ["Persian Gulf", "Oil prices", "Export controls"]],
  ["366551955", chapters.finance, ["Persian Gulf", "Burden sharing", "Energy"]],
  ["366551959", chapters.finance, ["Persian Gulf", "Oil prices", "Debt"]],
  ["366551961", chapters.finance, ["Persian Gulf", "Economic assistance", "International institutions"]],
  ["366551970", chapters.trade, ["Persian Gulf", "Uruguay Round", "Energy security"]],
  ["366551974", chapters.finance, ["Persian Gulf", "Gulf financing", "Oil prices"]],
  ["366551979", chapters.finance, ["Persian Gulf", "Economic assistance", "Debt relief"]],
].map(([naid, chapter, topics]) =>
  candidate(
    naid,
    "Boundary",
    chapter,
    topics,
    "The full OCR and opening withdrawal inventory identify a significant foreign-economic-policy strand, but the principal narrative belongs in a regional, Soviet, China, German-unification, or Persian Gulf volume. Review for cross-reference or a narrowly selected economic-policy document.",
    "Special-separate copy sets, meeting-file duplicates, and later retrospective chronologies are not separately promoted. Compare this file with the controlling regional and presidential records before selection.",
  ),
);

module.exports = [
  ...presidentialMeetings,
  ...presidentialTelcons,
  ...outgoingCorrespondence,
  ...latinAmericaEconomic,
  ...directFiles,
  ...boundaryFiles,
];
