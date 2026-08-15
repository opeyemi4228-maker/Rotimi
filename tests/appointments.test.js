/**
 * The appointment chain: who may fill which seat.
 *
 * Each office appoints the one directly below it — national to state, state to
 * LGA, LGA to ward, ward to booth — so that every officer is answerable to
 * whoever put them there. The rule is not a tier comparison; it is the
 * `approverRole` each RoleDefinition carries, and isApproverFor() reads it.
 *
 * The failure this guards against is the quiet one: canAdminister() alone would
 * happily let a National Coordinator reach past four tiers and place somebody
 * in a ward directly, which is legal by the Descendant Rule and wrong by the
 * structure.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { canAdminister, isApproverFor } from "../lib/permissions.js";

const scope = (over) => ({
  isAdmin: true,
  isFunctional: false,
  isSuperAdmin: false,
  region: null,
  ...over,
});

const NATIONAL = scope({ roleCode: "NAT_COORD", tier: "NATIONAL", tierRank: 1, isSuperAdmin: true, scopeType: "NATION" });
const GEN_SEC = scope({ roleCode: "GEN_SEC", tier: "NATIONAL", tierRank: 1, scopeType: "NATION" });
const DIRECTOR = scope({ roleCode: "DIR_MOB", tier: "NATIONAL", tierRank: 1, isFunctional: true, scopeType: "NATION" });
const ZONAL = scope({ roleCode: "ZC_SS", tier: "ZONAL", tierRank: 2, scopeType: "ZONE", zoneId: 5 });
const STATE = scope({ roleCode: "ST_COORD", tier: "STATE", tierRank: 3, scopeType: "STATE", stateId: 12 });
const OTHER_STATE = scope({ roleCode: "ST_COORD", tier: "STATE", tierRank: 3, scopeType: "STATE", stateId: 99 });
const LGA = scope({ roleCode: "LG_COORD", tier: "LGA", tierRank: 4, scopeType: "LGA", lgaId: 636 });
const WARD = scope({ roleCode: "WD_COORD", tier: "WARD", tierRank: 5, scopeType: "WARD", wardId: 7239 });
const BOOTH = scope({ roleCode: "PU_AGENT", tier: "POLLING_UNIT", tierRank: 6, scopeType: "POLLING_UNIT", wardId: 7239, pollingUnitId: 91 });

/* Seats, shaped the way the database hands them over. */
const lgaSeat = {
  scopeType: "LGA", lgaId: 636, stateId: null, wardId: null, pollingUnitId: null, zoneId: null,
  role: { code: "LG_COORD", tier: "LGA", tierRank: 4, approverRole: "ST_COORD" },
  lga: { stateId: 12, state: { zoneId: 5 } },
};
const wardSeat = {
  scopeType: "WARD", wardId: 7239, lgaId: null, stateId: null, pollingUnitId: null, zoneId: null,
  role: { code: "WD_COORD", tier: "WARD", tierRank: 5, approverRole: "LG_COORD" },
  ward: { lgaId: 636, lga: { stateId: 12, state: { zoneId: 5 } } },
};
const boothSeat = {
  scopeType: "POLLING_UNIT", pollingUnitId: 91, wardId: null, lgaId: null, stateId: null, zoneId: null,
  role: { code: "PU_AGENT", tier: "POLLING_UNIT", tierRank: 6, approverRole: "WD_COORD" },
  pollingUnit: { wardId: 7239, ward: { lgaId: 636, lga: { stateId: 12, state: { zoneId: 5 } } } },
};
const stateSeat = {
  scopeType: "STATE", stateId: 12, lgaId: null, wardId: null, pollingUnitId: null, zoneId: null,
  role: { code: "ST_COORD", tier: "STATE", tierRank: 3, approverRole: "ZONAL_COORD_OF_ZONE" },
  state: { zoneId: 5 },
};

describe("the chain: each office appoints the one below it", () => {
  it("ward appoints the booth", () => {
    assert.equal(isApproverFor(WARD, boothSeat), true);
  });

  it("LGA appoints the ward", () => {
    assert.equal(isApproverFor(LGA, wardSeat), true);
  });

  it("state appoints the LGA", () => {
    assert.equal(isApproverFor(STATE, lgaSeat), true);
  });

  it("the zonal coordinator appoints the state", () => {
    /* ZONAL_COORD_OF_ZONE is a placeholder, not a role code: the approver is
       whichever zonal seat governs the zone the vacancy is in. */
    assert.equal(isApproverFor(ZONAL, stateSeat), true);
  });
});

describe("nobody reaches past their own step", () => {
  it("the LGA cannot appoint a booth", () => {
    assert.equal(isApproverFor(LGA, boothSeat), false);
    /* And the looser rule WOULD have allowed it — which is the whole reason
       isApproverFor exists. */
    assert.equal(canAdminister(LGA, boothSeat), true);
  });

  it("the state cannot appoint a ward", () => {
    assert.equal(isApproverFor(STATE, wardSeat), false);
    assert.equal(canAdminister(STATE, wardSeat), true);
  });

  it("a national officer cannot reach into a ward", () => {
    assert.equal(isApproverFor(GEN_SEC, wardSeat), false);
    assert.equal(isApproverFor(GEN_SEC, boothSeat), false);
  });

  it("the booth appoints nobody at all", () => {
    for (const seat of [boothSeat, wardSeat, lgaSeat, stateSeat]) {
      assert.equal(isApproverFor(BOOTH, seat), false);
    }
  });

  it("a functional director appoints nobody, at any tier", () => {
    for (const seat of [boothSeat, wardSeat, lgaSeat, stateSeat]) {
      assert.equal(isApproverFor(DIRECTOR, seat), false);
    }
  });
});

describe("territory still binds", () => {
  it("a state coordinator cannot appoint into another state", () => {
    assert.equal(isApproverFor(OTHER_STATE, lgaSeat), false);
  });

  it("the right role in the wrong place is still refused", () => {
    /* Same role code as the approver, different territory. The role check
       alone would pass this; containment is what stops it. */
    assert.equal(OTHER_STATE.roleCode, "ST_COORD");
    assert.equal(lgaSeat.role.approverRole, "ST_COORD");
    assert.equal(isApproverFor(OTHER_STATE, lgaSeat), false);
  });
});

describe("the super admin exception (§6.9)", () => {
  it("may fill any seat at any depth", () => {
    for (const seat of [boothSeat, wardSeat, lgaSeat, stateSeat]) {
      assert.equal(isApproverFor(NATIONAL, seat), true);
    }
  });
});

describe("refusals that must never open up", () => {
  it("no scope, no appointment", () => {
    assert.equal(isApproverFor(null, wardSeat), false);
  });

  it("a seat whose role names no approver is filled by nobody", () => {
    const orphan = { ...wardSeat, role: { ...wardSeat.role, approverRole: null } };
    assert.equal(isApproverFor(LGA, orphan), false);
  });

  it("a malformed seat is refused rather than assumed", () => {
    assert.equal(isApproverFor(LGA, {}), false);
    assert.equal(isApproverFor(LGA, null), false);
  });
});
