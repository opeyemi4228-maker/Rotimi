/**
 * TOTP, against RFC 6238's published vectors.
 *
 * This file implements a specification rather than a preference, so the test
 * that matters is the one the specification ships with: if these vectors pass,
 * every authenticator app on earth agrees with us. Hand-rolled crypto with no
 * vector test is the thing that should never have been hand-rolled.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  codeAt,
  decodeBase32,
  encodeBase32,
  generateRecoveryCodes,
  generateSecret,
  hashRecoveryCode,
  otpauthUri,
  verifyTotp,
} from "../lib/totp.js";

/* RFC 6238 Appendix B uses the ASCII seed "12345678901234567890". */
const RFC_SECRET = encodeBase32(Buffer.from("12345678901234567890", "ascii"));

describe("base32", () => {
  it("round-trips arbitrary bytes", () => {
    for (const sample of ["", "a", "ab", "abc", "abcd", "abcde", "hello world"]) {
      const buffer = Buffer.from(sample, "utf8");
      assert.equal(decodeBase32(encodeBase32(buffer)).toString("utf8"), sample);
    }
  });

  it("ignores padding, spaces and case, the way an app's paste does", () => {
    const secret = generateSecret();
    const mangled = secret.toLowerCase().replace(/(.{4})/g, "$1 ");
    assert.deepEqual(decodeBase32(mangled), decodeBase32(secret));
  });
});

describe("codeAt — RFC 6238 test vectors", () => {
  /* Appendix B, the SHA-1 rows. Time is converted to a 30-second step. */
  const vectors = [
    [59, "287082"],
    [1111111109, "081804"],
    [1111111111, "050471"],
    [1234567890, "005924"],
    [2000000000, "279037"],
    [20000000000, "353130"],
  ];

  for (const [seconds, expected] of vectors) {
    it(`matches at T=${seconds}`, () => {
      assert.equal(codeAt(RFC_SECRET, Math.floor(seconds / 30)), expected);
    });
  }
});

describe("verifyTotp", () => {
  const at = 1111111109 * 1000;

  it("accepts the code for right now", () => {
    assert.notEqual(verifyTotp(RFC_SECRET, "081804", { at }), null);
  });

  it("allows one step of clock drift either side", () => {
    const step = Math.floor(at / 1000 / 30);
    assert.notEqual(verifyTotp(RFC_SECRET, codeAt(RFC_SECRET, step - 1), { at }), null);
    assert.notEqual(verifyTotp(RFC_SECRET, codeAt(RFC_SECRET, step + 1), { at }), null);
  });

  it("refuses two steps away", () => {
    const step = Math.floor(at / 1000 / 30);
    assert.equal(verifyTotp(RFC_SECRET, codeAt(RFC_SECRET, step - 2), { at }), null);
    assert.equal(verifyTotp(RFC_SECRET, codeAt(RFC_SECRET, step + 2), { at }), null);
  });

  it("refuses a step already used, so a code cannot be replayed", () => {
    /* The guard that stops a code read over somebody's shoulder from working
       for the rest of its window. */
    const step = Math.floor(at / 1000 / 30);
    assert.equal(verifyTotp(RFC_SECRET, "081804", { at, lastStep: step }), null);
    /* And every step before it, so a slow clock cannot walk backwards into an
       already-spent code. */
    assert.equal(verifyTotp(RFC_SECRET, codeAt(RFC_SECRET, step - 1), { at, lastStep: step }), null);
  });

  it("still accepts the next step after one is burned", () => {
    /* The other half of the guard, and the one that breaks sign-in if it is
       wrong: burning step N must not lock the account out at N+1. */
    const step = Math.floor(at / 1000 / 30);
    assert.equal(verifyTotp(RFC_SECRET, "081804", { at, lastStep: step - 1 }), step);
  });

  it("returns the step so the caller can burn it", () => {
    assert.equal(verifyTotp(RFC_SECRET, "081804", { at }), Math.floor(at / 1000 / 30));
  });

  it("refuses anything that is not six digits", () => {
    for (const bad of ["", "12345", "1234567", "abcdef", null, undefined]) {
      assert.equal(verifyTotp(RFC_SECRET, bad, { at }), null, `accepted ${bad}`);
    }
  });

  it("accepts a code pasted with spaces in it", () => {
    /* Deliberate: authenticator apps display "081 804" and people paste what
       they see. Stripping non-digits before counting is the difference between
       working and mystifying. */
    assert.notEqual(verifyTotp(RFC_SECRET, "081 804", { at }), null);
    assert.notEqual(verifyTotp(RFC_SECRET, " 081804 ", { at }), null);
  });
});

describe("otpauthUri", () => {
  it("names the issuer in both places apps read it from", () => {
    const uri = otpauthUri({ secret: "ABCDEFGH", account: "+2348031234567" });
    assert.ok(uri.startsWith("otpauth://totp/MAP%3A%2B2348031234567?"));
    assert.ok(uri.includes("issuer=MAP"));
    assert.ok(uri.includes("digits=6"));
    assert.ok(uri.includes("period=30"));
    assert.ok(uri.includes("algorithm=SHA1"));
  });
});

describe("recovery codes", () => {
  it("makes ten distinct codes with no ambiguous characters", () => {
    const codes = generateRecoveryCodes();
    assert.equal(codes.length, 10);
    assert.equal(new Set(codes).size, 10);
    for (const code of codes) {
      assert.match(code, /^[2-9A-HJ-NP-TV-Z]{5}-[2-9A-HJ-NP-TV-Z]{5}$/);
      /* Nothing that can be misread down a phone line or off paper. */
      assert.ok(!/[01OIL]/.test(code), `${code} contains an ambiguous character`);
    }
  });

  it("hashes the same code the same way however it is typed back", () => {
    const key = "a-test-secret-that-is-long-enough-for-this";
    const [code] = generateRecoveryCodes(1);
    const typed = code.toLowerCase().replace("-", " ");
    assert.equal(hashRecoveryCode(code, key), hashRecoveryCode(typed, key));
  });

  it("hashes differently under a different key", () => {
    const [code] = generateRecoveryCodes(1);
    assert.notEqual(
      hashRecoveryCode(code, "key-one-that-is-long-enough-for-hmac-here"),
      hashRecoveryCode(code, "key-two-that-is-long-enough-for-hmac-here")
    );
  });
});
