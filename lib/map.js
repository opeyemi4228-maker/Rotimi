/**
 * MAP organisational structure.
 *
 * The movement's own shape, kept separate from `site.js` (which holds site
 * chrome: nav, socials, CTAs). Everything here is structural fact taken from
 * the Web Platform Plan §6 and Appendices A and B: office titles, role codes,
 * tier ranks, seat counts and the appointing authority for each seat.
 *
 * PERSONNEL ARE DELIBERATELY ABSENT. No officer names, secretariat address,
 * founding date or event record appears in this file, because none of those
 * were supplied and inventing them on a political movement's public site would
 * be indefensible. Slots that need the Secretariat to fill them are marked
 * `pending: true` and render as an honest "position vacant / to be announced"
 * state rather than as placeholder text that looks like data.
 */

/* ------------------------------------------------------------------ tiers */

export const tiers = [
  {
    rank: 1,
    key: "national",
    name: "National",
    scope: "The federation",
    seatsPerUnit: 15,
    units: 1,
    blurb:
      "The National Executive sets direction for the movement and is the final authority on every appointment.",
  },
  {
    rank: 2,
    key: "zonal",
    name: "Zonal",
    scope: "Geopolitical zone",
    seatsPerUnit: 5,
    units: 6,
    blurb:
      "Six zonal executives translate national direction into regional coordination across the states in their zone.",
  },
  {
    rank: 3,
    key: "state",
    name: "State",
    scope: "State / FCT",
    seatsPerUnit: 5,
    units: 37,
    blurb:
      "An executive of five in each of the 36 states and the Federal Capital Territory.",
  },
  {
    rank: 4,
    key: "lga",
    name: "LGA",
    scope: "Local Government Area",
    seatsPerUnit: 5,
    units: 774,
    blurb:
      "The tier that turns a state strategy into local organisation, across all 774 Local Government Areas.",
  },
  {
    rank: 5,
    key: "ward",
    name: "Ward",
    scope: "Ward",
    seatsPerUnit: 10,
    units: 8809,
    blurb:
      "The base of the movement. Ten officers in every ward in Nigeria, where elections are actually won.",
  },
];

/** §6.7: the seat mathematics, presented publicly to communicate scale. */
export const seatCapacity = tiers.map((tier) => ({
  tier: tier.name,
  units: tier.units,
  seatsPerUnit: tier.seatsPerUnit,
  total: tier.units * tier.seatsPerUnit,
}));

export const totalSeats = seatCapacity.reduce((sum, row) => sum + row.total, 0);

/* ---------------------------------------------------------------- offices */

/** §6.2: the 15 National Executive offices. */
export const nationalExecutive = [
  { code: "NAT_COORD", title: "National Coordinator", scope: "Entire federation", authority: "Super Admin" },
  { code: "NAT_ASST_COORD", title: "Assistant National Coordinator", scope: "Federation, delegated", authority: "Administrative" },
  { code: "DIR_OPS", title: "Director of Operations and Strategy", scope: "Federation, functional", authority: "Functional" },
  { code: "DIR_MOB", title: "Director of Mobilization", scope: "Federation, functional", authority: "Functional" },
  { code: "DIR_MEDIA_IT", title: "Director of Media and IT", scope: "Federation, content and platform", authority: "Functional" },
  { code: "ASST_DIR_MEDIA", title: "Assistant Director of Media (Social Media)", scope: "Federation, content", authority: "Functional" },
  { code: "GEN_SEC", title: "General Secretary", scope: "Federation, records", authority: "Functional" },
  { code: "ASST_COORD_NORTH", title: "Assistant Coordinator North", scope: "North East, North West, North Central", authority: "Administrative" },
  { code: "ASST_COORD_SOUTH", title: "Assistant Coordinator South", scope: "South East, South South, South West", authority: "Administrative" },
  { code: "ZC_NE", title: "North East Coordinator", scope: "North East zone", authority: "Administrative" },
  { code: "ZC_NW", title: "North West Coordinator", scope: "North West zone", authority: "Administrative" },
  { code: "ZC_NC", title: "North Central Coordinator", scope: "North Central zone, including FCT", authority: "Administrative" },
  { code: "ZC_SE", title: "South East Coordinator", scope: "South East zone", authority: "Administrative" },
  { code: "ZC_SS", title: "South South Coordinator", scope: "South South zone", authority: "Administrative" },
  { code: "ZC_SW", title: "South West Coordinator", scope: "South West zone", authority: "Administrative" },
];

/** §6.3 to §6.6: the repeating executive template below national level. */
export const executiveTemplate = {
  zonal: {
    label: "Zonal Executive",
    perUnit: "per zone",
    offices: [
      { code: "ZON_COORD", title: "Zonal Coordinator", admin: true },
      { code: "ZON_SEC", title: "Zonal Secretary", admin: false },
      { code: "ZON_MOB", title: "Zonal Mobilization Officer", admin: false },
      { code: "ZON_YOUTH", title: "Zonal Youth Leader", admin: false },
      { code: "ZON_WOMEN", title: "Zonal Women Leader", admin: false },
    ],
  },
  state: {
    label: "State Executive",
    perUnit: "per state",
    offices: [
      { code: "ST_COORD", title: "State Coordinator", admin: true },
      { code: "ST_SEC", title: "State Secretary", admin: false },
      { code: "ST_MOB", title: "State Mobilization Officer", admin: false },
      { code: "ST_YOUTH", title: "State Youth Leader", admin: false },
      { code: "ST_WOMEN", title: "State Women Leader", admin: false },
    ],
  },
  lga: {
    label: "LGA Executive",
    perUnit: "per Local Government Area",
    offices: [
      { code: "LG_COORD", title: "LGA Coordinator", admin: true },
      { code: "LG_SEC", title: "LGA Secretary", admin: false },
      { code: "LG_MOB", title: "LGA Mobilization Officer", admin: false },
      { code: "LG_YOUTH", title: "LGA Youth Leader", admin: false },
      { code: "LG_WOMEN", title: "LGA Women Leader", admin: false },
    ],
  },
  ward: {
    label: "Ward Officers",
    perUnit: "per ward",
    offices: [
      { code: "WD_COORD", title: "Ward Coordinator", admin: true, seats: 1 },
      { code: "WD_OFFICER", title: "Ward Officer", admin: false, seats: 9 },
    ],
  },
};

/* ----------------------------------------------------- appointing authority */

/**
 * §8.2: who appoints to each seat.
 *
 * Members do not apply for office in MAP. Every seat is filled by the one
 * office above it in this chain — a coordinator appointing from the register
 * of members in their own territory — and the National Coordinator, as Super
 * Admin, may appoint anywhere. This table is the whole of it: there is no
 * second, informal route into a seat, and nothing here is initiated by the
 * member being appointed.
 */
export const appointmentChain = [
  { seat: "Ward Officer / Ward Coordinator", tier: "Ward", appointedBy: "LGA Coordinator of that LGA" },
  { seat: "LGA Secretary, Mobilization, Youth, Women", tier: "LGA", appointedBy: "LGA Coordinator of that LGA" },
  { seat: "LGA Coordinator", tier: "LGA", appointedBy: "State Coordinator of that state" },
  { seat: "State Secretary, Mobilization, Youth, Women", tier: "State", appointedBy: "State Coordinator of that state" },
  { seat: "State Coordinator", tier: "State", appointedBy: "Zonal Coordinator of that zone" },
  { seat: "Zonal Secretary, Mobilization, Youth, Women", tier: "Zone", appointedBy: "Zonal Coordinator of that zone" },
  { seat: "Zonal Coordinator", tier: "Zone", appointedBy: "Assistant Coordinator North or South" },
  { seat: "Assistant Coordinator North / South", tier: "National", appointedBy: "National Coordinator" },
  { seat: "All other National offices", tier: "National", appointedBy: "National Coordinator" },
];

/* --------------------------------------------------------- geography */

/** Appendix A: the 6 geopolitical zones and their states. */
export const zones = [
  {
    code: "NC",
    name: "North Central",
    region: "North",
    states: ["Benue", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau", "Federal Capital Territory"],
  },
  {
    code: "NE",
    name: "North East",
    region: "North",
    states: ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
  },
  {
    code: "NW",
    name: "North West",
    region: "North",
    states: ["Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Sokoto", "Zamfara"],
  },
  {
    code: "SE",
    name: "South East",
    region: "South",
    states: ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  },
  {
    code: "SS",
    name: "South South",
    region: "South",
    states: ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
  },
  {
    code: "SW",
    name: "South West",
    region: "South",
    states: ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"],
  },
];

/** Flat list of all 37, for the cascading selectors on /structure. */
export const allStates = zones
  .flatMap((zone) => zone.states.map((name) => ({ name, zone: zone.name, code: zone.code })))
  .sort((a, b) => a.name.localeCompare(b.name));

/* ------------------------------------------------------------ the movement */

/** §4.2: core values. */
export const coreValues = [
  { title: "Loyalty", body: "To the movement, to its structure, and to the mandate we are organising to win." },
  { title: "Discipline", body: "Every appointment made by the right authority, recorded, and answerable." },
  { title: "Integrity", body: "One register, one truth. What the platform reports is what the movement is." },
  { title: "Inclusion", body: "Every zone, every state, every ward, with women and young people in office, not in the audience." },
  { title: "Service", body: "Office in MAP is work to be done, not a title to be held." },
  { title: "National Unity", body: "A structure that is genuinely national, built the same way in all 36 states and the FCT." },
];

/** §2.1: the organising objectives, stated publicly. */
export const objectives = [
  "Build a disciplined, verifiable structure in all 36 states, the Federal Capital Territory, 774 Local Government Areas and over 8,000 wards.",
  "Register and verify members down to ward level, in a single authoritative national register.",
  "Ensure every office in the movement is filled by appointment from the correct authority, and permanently logged.",
  "Give every coordinator live visibility of the territory they are responsible for.",
  "Mobilise members for congresses, rallies and voter registration, zone by zone.",
  "Present the record and the case for the presidential aspiration of Rt. Hon. Chibuike Rotimi Amaechi.",
];
