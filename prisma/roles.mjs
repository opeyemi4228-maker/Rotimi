/**
 * Appendix B — the office catalogue, and the approval chain of §8.2.
 *
 * `approverRole` is the role code that decides an application to this seat.
 * It is data, not a switch statement, so the chain can be corrected by an
 * UPDATE rather than a deploy.
 *
 * §6.8 is resolved the way the plan recommends: the six ZC_* offices sit in
 * the National Executive list AND lead their zonal executives. They are one
 * seat each, scoped to a zone, at tier rank 2. There is no second, separate
 * zonal coordinator.
 */

export const roles = [
  // ── National, tier rank 1 ────────────────────────────────────── 15 offices
  { code: "NAT_COORD",        title: "National Coordinator",                        tier: "NATIONAL", tierRank: 1, isAdmin: true,  approverRole: null,                sortOrder: 1 },
  { code: "NAT_ASST_COORD",   title: "Assistant National Coordinator",              tier: "NATIONAL", tierRank: 1, isAdmin: true,  approverRole: "NAT_COORD",         sortOrder: 2 },
  { code: "DIR_OPS",          title: "Director of Operations and Strategy",         tier: "NATIONAL", tierRank: 1, isFunctional: true, approverRole: "NAT_COORD",     sortOrder: 3 },
  { code: "DIR_MOB",          title: "Director of Mobilization",                    tier: "NATIONAL", tierRank: 1, isFunctional: true, approverRole: "NAT_COORD",     sortOrder: 4 },
  { code: "DIR_MEDIA_IT",     title: "Director of Media and IT",                    tier: "NATIONAL", tierRank: 1, isFunctional: true, approverRole: "NAT_COORD",     sortOrder: 5 },
  { code: "ASST_DIR_MEDIA",   title: "Assistant Director of Media (Social Media)",  tier: "NATIONAL", tierRank: 1, isFunctional: true, approverRole: "NAT_COORD",     sortOrder: 6 },
  { code: "GEN_SEC",          title: "General Secretary",                           tier: "NATIONAL", tierRank: 1, isFunctional: true, approverRole: "NAT_COORD",     sortOrder: 7 },
  { code: "ASST_COORD_NORTH", title: "Assistant Coordinator North",                 tier: "NATIONAL", tierRank: 1, isAdmin: true,  approverRole: "NAT_COORD",         sortOrder: 8 },
  { code: "ASST_COORD_SOUTH", title: "Assistant Coordinator South",                 tier: "NATIONAL", tierRank: 1, isAdmin: true,  approverRole: "NAT_COORD",         sortOrder: 9 },

  // ── Zonal coordinators, tier rank 2, one per zone ──────────────── 6 offices
  // Scoped to a zone; approved by the Assistant Coordinator for their region.
  { code: "ZC_NE", title: "North East Coordinator",    tier: "ZONAL", tierRank: 2, isAdmin: true, zone: "NE", approverRole: "ASST_COORD_NORTH", sortOrder: 10 },
  { code: "ZC_NW", title: "North West Coordinator",    tier: "ZONAL", tierRank: 2, isAdmin: true, zone: "NW", approverRole: "ASST_COORD_NORTH", sortOrder: 11 },
  { code: "ZC_NC", title: "North Central Coordinator", tier: "ZONAL", tierRank: 2, isAdmin: true, zone: "NC", approverRole: "ASST_COORD_NORTH", sortOrder: 12 },
  { code: "ZC_SE", title: "South East Coordinator",    tier: "ZONAL", tierRank: 2, isAdmin: true, zone: "SE", approverRole: "ASST_COORD_SOUTH", sortOrder: 13 },
  { code: "ZC_SS", title: "South South Coordinator",   tier: "ZONAL", tierRank: 2, isAdmin: true, zone: "SS", approverRole: "ASST_COORD_SOUTH", sortOrder: 14 },
  { code: "ZC_SW", title: "South West Coordinator",    tier: "ZONAL", tierRank: 2, isAdmin: true, zone: "SW", approverRole: "ASST_COORD_SOUTH", sortOrder: 15 },

  // ── Zonal executive, 4 more per zone ───────────────────────────── §6.3
  { code: "ZON_SEC",   title: "Zonal Secretary",             tier: "ZONAL", tierRank: 2, everyZone: true, approverRole: "ZONAL_COORD_OF_ZONE", sortOrder: 20 },
  { code: "ZON_MOB",   title: "Zonal Mobilization Officer",  tier: "ZONAL", tierRank: 2, everyZone: true, approverRole: "ZONAL_COORD_OF_ZONE", sortOrder: 21 },
  { code: "ZON_YOUTH", title: "Zonal Youth Leader",          tier: "ZONAL", tierRank: 2, everyZone: true, approverRole: "ZONAL_COORD_OF_ZONE", sortOrder: 22 },
  { code: "ZON_WOMEN", title: "Zonal Women Leader",          tier: "ZONAL", tierRank: 2, everyZone: true, approverRole: "ZONAL_COORD_OF_ZONE", sortOrder: 23 },

  // ── State executive, 5 per state ───────────────────────────────── §6.4
  { code: "ST_COORD", title: "State Coordinator",            tier: "STATE", tierRank: 3, isAdmin: true, approverRole: "ZONAL_COORD_OF_ZONE", sortOrder: 30 },
  { code: "ST_SEC",   title: "State Secretary",              tier: "STATE", tierRank: 3, approverRole: "ST_COORD", sortOrder: 31 },
  { code: "ST_MOB",   title: "State Mobilization Officer",   tier: "STATE", tierRank: 3, approverRole: "ST_COORD", sortOrder: 32 },
  { code: "ST_YOUTH", title: "State Youth Leader",           tier: "STATE", tierRank: 3, approverRole: "ST_COORD", sortOrder: 33 },
  { code: "ST_WOMEN", title: "State Women Leader",           tier: "STATE", tierRank: 3, approverRole: "ST_COORD", sortOrder: 34 },

  // ── LGA executive, 5 per LGA ───────────────────────────────────── §6.5
  { code: "LG_COORD", title: "LGA Coordinator",              tier: "LGA", tierRank: 4, isAdmin: true, approverRole: "ST_COORD", sortOrder: 40 },
  { code: "LG_SEC",   title: "LGA Secretary",                tier: "LGA", tierRank: 4, approverRole: "LG_COORD", sortOrder: 41 },
  { code: "LG_MOB",   title: "LGA Mobilization Officer",     tier: "LGA", tierRank: 4, approverRole: "LG_COORD", sortOrder: 42 },
  { code: "LG_YOUTH", title: "LGA Youth Leader",             tier: "LGA", tierRank: 4, approverRole: "LG_COORD", sortOrder: 43 },
  { code: "LG_WOMEN", title: "LGA Women Leader",             tier: "LGA", tierRank: 4, approverRole: "LG_COORD", sortOrder: 44 },

  // ── Ward, 10 seats per ward ────────────────────────────────────── §6.6
  // Appendix C item 2 recommends designating seat 1 as Ward Coordinator, and
  // that is what is seeded. To make all ten equal instead, set WARD_COORDINATOR
  // to false in prisma/seed.mjs — it is a flag, not a rebuild.
  { code: "WD_COORD",   title: "Ward Coordinator", tier: "WARD", tierRank: 5, isAdmin: true, seatsPerUnit: 1, approverRole: "LG_COORD", sortOrder: 50 },
  { code: "WD_OFFICER", title: "Ward Officer",     tier: "WARD", tierRank: 5, seatsPerUnit: 9, approverRole: "LG_COORD", sortOrder: 51 },
];

/**
 * `ZONAL_COORD_OF_ZONE` is a placeholder: the approver is whichever ZC_* seat
 * governs the zone the application is in, which cannot be a fixed role code.
 * Resolving it needs the target's zone, so it happens at query time.
 */
export const DYNAMIC_APPROVER = "ZONAL_COORD_OF_ZONE";

export const zoneCoordinatorCode = (zoneCode) => `ZC_${zoneCode}`;
