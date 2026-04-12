/**
 * T-709 — cassette hash-pin CI gate.
 *
 * Fails loudly if someone regenerates mitchell-rec-cassette.json (or deletes
 * it) without updating the pinned hash. The demo's deterministic behaviour
 * depends on this exact cassette, so silent drift is a bug.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const EXPECTED_CASSETTE_SHA256 =
  "0139269ea00f77ccdfc9b5ca6b8556826d84f1bcabe085cb3fb4da67ab5ceb13";

const CASSETTE_PATH = path.resolve(
  __dirname,
  "cassettes",
  "mitchell-rec-cassette.json",
);

describe("mitchell-rec-cassette.json is pinned", () => {
  it("exists on disk", () => {
    expect(existsSync(CASSETTE_PATH)).toBe(true);
  });

  it("matches the pinned SHA-256", () => {
    const buf = readFileSync(CASSETTE_PATH);
    const actual = createHash("sha256").update(buf).digest("hex");
    expect(actual).toBe(EXPECTED_CASSETTE_SHA256);
  });
});
