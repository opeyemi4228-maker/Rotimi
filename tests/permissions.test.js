/**
 * The Descendant Rule, tested.
 *
 * ── WHY THESE AND NOT SOMETHING ELSE FIRST ─────────────────────────────────
 * Everything in this app that keeps one coordinator out of another's territory
 * goes through four pure functions in lib/permissions.js. A bug anywhere else
 * is an inconvenience; a bug in these is the Edo Coordinator reading Delta, or
 * a ward officer texting a state. They take a plain object and return a plain
 * object, so they can be tested exhaustively with no database at all — which is
 * exactly why the scope logic was put in one file of pure functions.
 * ───────────────────────────────────────────────────────────────────────────
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  TIER_RANK,
  can,
  memberScopeWhere,
  pollingUnitScopeWhere,
  resultScope,
} from "../lib/permissions.js";

/* The six seats the demo cast holds, as resolveScope() would return them. */
const NATIONAL = {
  roleCode: "NAT_COORD", tier: "NATIONAL", tierRank: 1, isAdmin: true, isFunctional: false,
  isSuperAdmin: true, scopeType: "NATION", readsNationwide: true,
  zoneId: null, stateId: null, lgaId: null, wardId: null, pollingUnitId: null,
};
const DIRECTOR = {
  roleCode: "DIR_MOB", tier: "NATIONAL", tierRank: 1, isAdmin: false, isFunctional: true,
  isSuperAdmin: false, scopeType: "NATION", readsNationwide: true,
  zoneId: null, stateId: null, lgaId: null, wardId: null, pollingUnitId: null,
};
const ZONAL = {
  roleCode: "ZC_SS", tier: "ZONAL", tierRank: 2, isAdmin: true, isFunctional: false,
  isSuperAdmin: false, scopeType: "ZONE", readsNationwide: false,
  zoneId: 5, stateId: null, lgaId: null, wardId: null, pollingUnitId: null,
};
const STATE = {
  roleCode: "ST_COORD", tier: "STATE", tierRank: 3, isAdmin: true, isFunctional: false,
  isSuperAdmin: false, scopeType: "STATE", readsNationwide: false,
  zoneId: null, stateId: 12, lgaId: null, wardId: null, pollingUnitId: null,
};
const LGA = {
  roleCode: "LG_COORD", tier: "LGA", tierRank: 4, isAdmin: true, isFunctional: false,
  isSuperAdmin: false, scopeType: "LGA", readsNationwide: false,
  zoneId: null, stateId: null, lgaId: 636, wardId: null, pollingUnitId: null,
};
const WARD = {
  roleCode: "WD_COORD", tier: "WARD", tierRank: 5, isAdmin: true, isFunctional: false,
  isSuperAdmin: false, scopeType: "WARD", readsNationwide: false,
  zoneId: null, stateId: null, lgaId: null, wardId: 7239, pollingUnitId: null,
};
const BOOTH = {
  roleCode: "PU_AGENT", tier: "POLLING_UNIT", tierRank: 6, isAdmin: true, isFunctional: false,
  isSuperAdmin: false, scopeType: "POLLING_UNIT", readsNationwide: false,
  zoneId: null, stateId: null, lgaId: null, wardId: 7239, pollingUnitId: 91,
};

describe("memberScopeWhere", () => {
  it("gives the whole register to a nationwide reader", () => {
    assert.deepEqual(memberScopeWhere(NATIONAL), {});
    assert.deepEqual(memberScopeWhere(DIRECTOR), {});
  });

  it("cuts each tier to its own territory", () => {
    assert.deepEqual(memberScopeWhere(ZONAL), { state: { zoneId: 5 } });
    assert.deepEqual(memberScopeWhere(STATE), { stateId: 12 });
    assert.deepEqual(memberScopeWhere(LGA), { lgaId: 636 });
    assert.deepEqual(memberScopeWhere(WARD), { wardId: 7239 });
    assert.deepEqual(memberScopeWhere(BOOTH), { pollingUnitId: 91 });
  });

  it("refuses rather than opens up when the scope makes no sense", () => {
    /* The failure that matters. An unrecognised scopeType must mean no access —
       a `{}` here would hand the whole register to a seat nobody understands. */
    assert.equal(memberScopeWhere(null), null);
    assert.equal(memberScopeWhere({ ...STATE, scopeType: "GALAXY" }), null);
  });

  it("never returns an empty filter for a scoped seat", () => {
    for (const scope of [ZONAL, STATE, LGA, WARD, BOOTH]) {
      const where = memberScopeWhere(scope);
      assert.ok(where && Object.keys(where).length > 0, `${scope.roleCode} leaked an open filter`);
    }
  });
});

describe("pollingUnitScopeWhere", () => {
  it("reaches booths through the relation chain at every level", () => {
    assert.deepEqual(pollingUnitScopeWhere(STATE), { ward: { lga: { stateId: 12 } } });
    assert.deepEqual(pollingUnitScopeWhere(LGA), { ward: { lgaId: 636 } });
    assert.deepEqual(pollingUnitScopeWhere(WARD), { wardId: 7239 });
    assert.deepEqual(pollingUnitScopeWhere(BOOTH), { id: 91 });
  });

  it("closes on an unknown scope", () => {
    assert.equal(pollingUnitScopeWhere({ ...LGA, scopeType: "NOWHERE" }), null);
  });
});

describe("resultScope", () => {
  it("names the level each tier stands at", () => {
    assert.equal(resultScope(NATIONAL).level, "nation");
    assert.equal(resultScope(ZONAL).level, "zone");
    assert.equal(resultScope(STATE).level, "state");
    assert.equal(resultScope(LGA).level, "lga");
    assert.equal(resultScope(WARD).level, "ward");
    assert.equal(resultScope(BOOTH).level, "pollingUnit");
  });

  it("carries the id the query will filter on", () => {
    assert.equal(resultScope(STATE).stateId, 12);
    assert.equal(resultScope(LGA).lgaId, 636);
    assert.equal(resultScope(WARD).wardId, 7239);
    assert.equal(resultScope(BOOTH).pollingUnitId, 91);
  });

  it("gives a scoped seat no nationwide id", () => {
    /* If a scoped seat came back with every id null, resultsWhere() would build
       an unfiltered query and a Ward Coordinator would read the federation. */
    for (const scope of [ZONAL, STATE, LGA, WARD, BOOTH]) {
      const cut = resultScope(scope);
      assert.notEqual(cut.level, "nation", `${scope.roleCode} resolved to the federation`);
      assert.ok(cut.parentId != null, `${scope.roleCode} has no parent id to filter on`);
    }
  });

  it("closes on an unknown scope", () => {
    assert.equal(resultScope(null), null);
    assert.equal(resultScope({ ...WARD, scopeType: "SOMEWHERE" }), null);
  });
});

describe("can", () => {
  it("lets nobody do anything without a seat", () => {
    for (const capability of ["viewDirectory", "viewNationwide", "appoint", "broadcast", "viewAudit"]) {
      assert.equal(can(null, capability), false);
    }
  });

  it("lets the super admin do everything", () => {
    for (const capability of ["appoint", "remove", "broadcast", "viewNationwide", "viewAudit"]) {
      assert.equal(can(NATIONAL, capability), true);
    }
  });

  it("gives a functional director reading but not speaking", () => {
    assert.equal(can(DIRECTOR, "viewNationwide"), true);
    assert.equal(can(DIRECTOR, "broadcast"), false, "a director speaks for no territory");
    assert.equal(can(DIRECTOR, "appoint"), false);
  });

  it("stops the booth broadcasting", () => {
    /* PU_AGENT is flagged isAdmin so the election form is reachable. That flag
       must not become permission to text people. */
    assert.equal(can(BOOTH, "broadcast"), false);
    assert.equal(can(WARD, "broadcast"), true, "ward is the floor for broadcast");
  });

  it("stops a ward coordinator appointing", () => {
    assert.equal(can(WARD, "appoint"), false);
    assert.equal(can(LGA, "appoint"), true);
  });

  it("refuses a capability nobody defined", () => {
    assert.equal(can(STATE, "launchMissiles"), false);
  });
});

describe("TIER_RANK", () => {
  it("orders authority from national down to the booth", () => {
    const order = ["NATIONAL", "ZONAL", "STATE", "LGA", "WARD", "POLLING_UNIT"];
    const ranks = order.map((tier) => TIER_RANK[tier]);
    assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
    assert.equal(new Set(ranks).size, order.length, "two tiers share a rank");
  });
});
