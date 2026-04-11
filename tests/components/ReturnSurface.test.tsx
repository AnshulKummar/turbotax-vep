// @vitest-environment happy-dom
import "./setup";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReturnSurface } from "../../components/workbench/ReturnSurface";
import { mitchellPreWorkFixture } from "../../components/workbench/__fixtures__/mitchell-prework.fixture";

describe("ReturnSurface", () => {
  it("renders one row per OCR field with a confidence indicator", () => {
    render(<ReturnSurface ocr={mitchellPreWorkFixture.ocr} />);
    for (const lineId of Object.keys(mitchellPreWorkFixture.ocr.fields)) {
      expect(screen.getByTestId(`return-line-${lineId}`)).toBeInTheDocument();
    }
    // At least one high-confidence line shows a percentage label
    expect(screen.getByText("98%")).toBeInTheDocument();
  });
});
