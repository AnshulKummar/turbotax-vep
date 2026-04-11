// @vitest-environment happy-dom
import "./setup";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { GoalDashboard } from "../../components/workbench/GoalDashboard";
import { mitchellGoalsFixture } from "../../components/workbench/__fixtures__/mitchell-goals.fixture";
import { mitchellRecommendationsFixture } from "../../components/workbench/__fixtures__/mitchell-recommendations.fixture";

describe("GoalDashboard", () => {
  it("renders three goal columns with progress bars", () => {
    render(
      <GoalDashboard
        goals={mitchellGoalsFixture}
        recommendations={mitchellRecommendationsFixture}
        acceptedIds={new Set(["rec-001"])}
      />,
    );
    for (const goal of mitchellGoalsFixture) {
      expect(
        screen.getByTestId(`goal-column-${goal.id}`),
      ).toBeInTheDocument();
    }
    expect(screen.getByText(/Maximize refund/)).toBeInTheDocument();
    expect(screen.getByText(/Minimize audit risk/)).toBeInTheDocument();
    expect(screen.getByText(/Optimize next year/)).toBeInTheDocument();
  });
});
