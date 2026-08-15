/**
 * The primitives everything else sits on: password hashing, phone
 * normalisation, registration validation, and SMS segmentation.
 *
 * These are pure and cheap, and each one has a failure mode that is invisible
 * until it matters — a phone that normalises two ways lets one person hold two
 * accounts, and a segment count that disagrees with the gateway is a bill
 * nobody predicted.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { hashPassword, verifyPassword, normalisePhone, validateRegistration } from "../lib/auth.js";
import { segments } from "../lib/sms.js";

describe("password hashing", () => {
  it("verifies the password it hashed", () => {
    const stored = hashPassword("correct horse battery staple");
    assert.equal(verifyPassword("correct horse battery staple", stored), true);
    assert.equal(verifyPassword("wrong horse battery staple", stored), false);
  });

  it("salts, so the same password hashes differently every time", () => {
    assert.notEqual(hashPassword("same"), hashPassword("same"));
  });

  it("normalises unicode, so a password typed on two keyboards still matches", () => {
    /* "é" composed vs decomposed. Without NFKC a member who set their password
       on a Mac cannot sign in from an Android keyboard. */
    const stored = hashPassword("cafépass");
    assert.equal(verifyPassword("cafépass", stored), true);
  });

  it("refuses a malformed stored hash instead of throwing", () => {
    for (const bad of ["", "not-a-hash", "bcrypt$x$y", null, undefined]) {
      assert.equal(verifyPassword("anything", bad), false);
    }
  });
});

describe("normalisePhone", () => {
  it("brings every Nigerian form to one canonical number", () => {
    for (const input of [
      "08031234567", "0803 123 4567", "+2348031234567",
      "2348031234567", "8031234567", "+234 803 123 4567",
    ]) {
      assert.equal(normalisePhone(input), "+2348031234567", `failed on ${input}`);
    }
  });

  it("rejects what is not a Nigerian mobile", () => {
    for (const input of ["", "123", "notaphone", "+14155551234", null, undefined]) {
      assert.ok(!normalisePhone(input), `accepted ${input}`);
    }
  });
});

describe("validateRegistration", () => {
  /* The shape the join form actually posts: one `name` field, and a password
     the validator requires a digit in. */
  const good = {
    name: "Ada Nwosu", phone: "08031234567",
    password: "longenough1", state: "Rivers", lga: "Port Harcourt", ward: "Diobu",
  };

  it("accepts a complete registration", () => {
    assert.equal(validateRegistration(good).ok, true);
  });

  it("refuses a NIN that is not eleven digits", () => {
    assert.equal(validateRegistration({ ...good, nin: "123" }).ok, false);
    assert.equal(validateRegistration({ ...good, nin: "12345678901" }).ok, true);
  });

  it("treats a missing NIN as absent rather than invalid", () => {
    /* Verification is the NIN, but registration without one must still work —
       otherwise nobody can join before they have found their slip. */
    const result = validateRegistration({ ...good, nin: "" });
    assert.equal(result.ok, true);
    assert.equal(result.clean.nin, null);
  });

  it("refuses a short password", () => {
    assert.equal(validateRegistration({ ...good, password: "shrt1" }).ok, false);
  });

  it("refuses a password with no digit in it", () => {
    assert.equal(validateRegistration({ ...good, password: "allletters" }).ok, false);
  });

  it("accepts a mononym", () => {
    /* Deliberate: splitName stores a single name as both first name and
       surname rather than leaving a NOT NULL column empty. Pinned here because
       it looks like an oversight and is not — the next person to read
       splitName should find a test saying so. */
    assert.equal(validateRegistration({ ...good, name: "Ada" }).ok, true);
  });

  it("collapses runs of whitespace in a name", () => {
    assert.equal(validateRegistration({ ...good, name: "Ada   Ngozi  Nwosu" }).clean.name,
      "Ada Ngozi Nwosu");
  });

  it("refuses digits and symbols in a name", () => {
    assert.equal(validateRegistration({ ...good, name: "Ada 2Nwosu" }).ok, false);
    assert.equal(validateRegistration({ ...good, name: "O'Brien-Adeyemi" }).ok, true);
  });
});

describe("SMS segmentation", () => {
  it("counts a plain message as one part up to 160 characters", () => {
    assert.equal(segments("a".repeat(160)).segments, 1);
    assert.equal(segments("a".repeat(161)).segments, 2);
    assert.equal(segments("a".repeat(160)).encoding, "GSM-7");
  });

  it("charges two characters for an escaped one", () => {
    /* A single "€" costs two units, so 80 of them fill a 160-character part. */
    assert.equal(segments("€".repeat(80)).units, 160);
    assert.equal(segments("€".repeat(80)).segments, 1);
    assert.equal(segments("€".repeat(81)).segments, 2);
  });

  it("drops to 70 characters the moment one character leaves the GSM alphabet", () => {
    /* The expensive mistake: one curly apostrophe pasted from Word more than
       halves what fits, and doubles the bill for a national broadcast. */
    const plain = segments("a".repeat(100));
    const curly = segments("a".repeat(99) + "’");
    assert.equal(plain.segments, 1);
    assert.equal(curly.encoding, "UCS-2");
    assert.equal(curly.segments, 2);
  });

  it("counts nothing as nothing", () => {
    assert.equal(segments("").segments, 0);
    assert.equal(segments(null).segments, 0);
  });
});
