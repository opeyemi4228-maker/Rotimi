/**
 * The result filter and the arithmetic guards.
 *
 * `resultsWhere` decides which returns a page counts. It is the second place
 * (after lib/permissions) where a mistake shows one territory's numbers under
 * another's heading — and unlike the scope filters it also decides whether a
 * DISPUTED return sneaks into a published total.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resultsWhere } from "../lib/elections.js";
import { validateReturn } from "../lib/results.js";

describe("resultsWhere", () => {
  it("counts only submitted and verified returns", () => {
    const where = resultsWhere({ electionId: 1 });
    assert.deepEqual(where.status, { in: ["SUBMITTED", "VERIFIED"] });
  });

  it("never silently counts a disputed return", () => {
    /* A disputed return is evidence and is kept. It is not a vote. */
    for (const args of [
      { electionId: 1 },
      { electionId: 1, stateId: 12 },
      { electionId: 1, lgaId: 636 },
      { electionId: 1, wardId: 7239 },
      { electionId: 1, pollingUnitId: 91 },
      { electionId: 1, stateIds: [1, 2, 3] },
    ]) {
      assert.ok(!resultsWhere(args).status.in.includes("DISPUTED"));
    }
  });

  it("uses the narrowest place it is given", () => {
    /* The precedence matters: a page that passes both a state and a ward means
       the ward. Reading the state instead would widen the answer. */
    const where = resultsWhere({
      electionId: 1, stateId: 12, lgaId: 636, wardId: 7239, pollingUnitId: 91,
    });
    assert.equal(where.pollingUnitId, 91);
    assert.equal(where.wardId, undefined);
    assert.equal(where.stateId, undefined);
  });

  it("filters a zone to its list of states", () => {
    assert.deepEqual(resultsWhere({ electionId: 1, stateIds: [4, 5] }).stateId, { in: [4, 5] });
  });

  it("treats an empty zone as empty and not as the federation", () => {
    /* The dangerous case. A zone with no states must read nothing; falling
       through to an unfiltered query would show it the whole country. */
    const where = resultsWhere({ electionId: 1, stateIds: [] });
    assert.deepEqual(where.stateId, { in: [] });
  });

  it("filters nothing for the nation, which is the absence of a filter", () => {
    const where = resultsWhere({ electionId: 1 });
    for (const key of ["stateId", "lgaId", "wardId", "pollingUnitId"]) {
      assert.equal(where[key], undefined);
    }
  });
});

describe("validateReturn", () => {
  const ok = { votes: { 1: 100, 2: 50 }, accredited: 200, registered: 500, rejected: 10 };

  it("accepts a return whose arithmetic balances", () => {
    const result = validateReturn(ok);
    assert.equal(result.ok, true);
    assert.equal(result.cast, 150);
  });

  it("refuses more votes than people accredited", () => {
    /* 150 votes and 10 rejected out of 120 accredited is impossible, and it is
       the commonest signature of a stuffed booth. */
    const result = validateReturn({ ...ok, accredited: 120 });
    assert.equal(result.ok, false);
    assert.ok(result.errors);
  });

  it("refuses more accredited than registered", () => {
    const result = validateReturn({ ...ok, accredited: 600 });
    assert.equal(result.ok, false);
  });

  it("refuses a negative count", () => {
    assert.equal(validateReturn({ ...ok, votes: { 1: -5 } }).ok, false);
  });

  it("counts the total from the votes, not from the form", () => {
    assert.equal(validateReturn({ ...ok, votes: { 1: 7, 2: 8, 3: 9 } }).cast, 24);
  });
});
