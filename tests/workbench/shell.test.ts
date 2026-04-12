/**
 * T-G09 — WorkbenchShell unit tests.
 *
 * Tests the shell's section routing logic and section definitions.
 * Component rendering tests are deliberately minimal — we verify the
 * pure-function logic and section structure rather than importing React.
 */
import { describe, expect, it } from "vitest";

import {
  DEFAULT_SECTION,
  resolve_section,
  SECTION_IDS,
  type SectionId,
} from "../../components/workbench/WorkbenchShell";

describe("WorkbenchShell section definitions", () => {
  it("defines exactly 6 sections", () => {
    expect(SECTION_IDS).toHaveLength(6);
  });

  it("has all expected section ids", () => {
    expect(SECTION_IDS).toEqual([
      "brief",
      "goals",
      "documents",
      "prework",
      "recommendations",
      "audit",
    ]);
  });

  it("defaults to brief", () => {
    expect(DEFAULT_SECTION).toBe("brief");
  });
});

describe("resolve_section", () => {
  it("returns brief when input is undefined", () => {
    expect(resolve_section(undefined)).toBe("brief");
  });

  it("returns brief when input is empty string", () => {
    expect(resolve_section("")).toBe("brief");
  });

  it("accepts valid section ids", () => {
    const valid: SectionId[] = [
      "brief",
      "goals",
      "documents",
      "prework",
      "recommendations",
      "audit",
    ];
    for (const id of valid) {
      expect(resolve_section(id)).toBe(id);
    }
  });

  it("is case-insensitive", () => {
    expect(resolve_section("Brief")).toBe("brief");
    expect(resolve_section("RECOMMENDATIONS")).toBe("recommendations");
    expect(resolve_section("Audit")).toBe("audit");
  });

  it("falls back to brief for unknown sections", () => {
    expect(resolve_section("nonexistent")).toBe("brief");
    expect(resolve_section("settings")).toBe("brief");
    expect(resolve_section("dashboard")).toBe("brief");
  });
});
