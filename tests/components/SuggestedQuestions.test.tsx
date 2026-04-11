// @vitest-environment happy-dom
import "./setup";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuggestedQuestions } from "../../components/workbench/SuggestedQuestions";
import { mitchellRecommendationsFixture } from "../../components/workbench/__fixtures__/mitchell-recommendations.fixture";

describe("SuggestedQuestions", () => {
  it("renders at least one suggested question from recommendations", () => {
    render(
      <SuggestedQuestions recommendations={mitchellRecommendationsFixture} />,
    );
    const list = screen.getByTestId("suggested-questions");
    expect(list).toBeInTheDocument();
    // Should surface the top recommendation as a question
    const topRec = mitchellRecommendationsFixture[0];
    expect(
      screen.getByTestId(`suggested-question-${topRec.id}`),
    ).toBeInTheDocument();
  });
});
