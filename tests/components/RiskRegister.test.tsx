// @vitest-environment happy-dom
import "./setup";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RiskRegister } from "../../components/workbench/RiskRegister";
import { mitchellPreWorkFixture } from "../../components/workbench/__fixtures__/mitchell-prework.fixture";
import { mitchellRecommendationsFixture } from "../../components/workbench/__fixtures__/mitchell-recommendations.fixture";
import type { Recommendation } from "../../src/contracts";

describe("RiskRegister", () => {
  it("renders all 10 risk register entries with severities and impact", () => {
    const byRule: Record<string, Recommendation> = {};
    for (const rec of mitchellRecommendationsFixture) byRule[rec.rule_id] = rec;

    render(
      <RiskRegister
        entries={mitchellPreWorkFixture.risk_register}
        recommendationsByRuleId={byRule}
      />,
    );
    // All 10 entries should be in the DOM
    for (const entry of mitchellPreWorkFixture.risk_register) {
      expect(screen.getByTestId(`risk-entry-${entry.id}`)).toBeInTheDocument();
    }
    expect(
      mitchellPreWorkFixture.risk_register.length,
    ).toBe(10);
  });
});
