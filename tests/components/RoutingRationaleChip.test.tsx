// @vitest-environment happy-dom
import "./setup";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RoutingRationaleChip } from "../../components/workbench/RoutingRationaleChip";

describe("RoutingRationaleChip", () => {
  it("renders all four routing dimension badges and the ETA", () => {
    render(<RoutingRationaleChip />);
    expect(screen.getByTestId("badge-specialty")).toBeInTheDocument();
    expect(screen.getByTestId("badge-jurisdiction")).toBeInTheDocument();
    expect(screen.getByTestId("badge-continuity")).toBeInTheDocument();
    expect(screen.getByTestId("badge-complexity")).toBeInTheDocument();
    expect(screen.getByText(/ETA to handoff/)).toBeInTheDocument();
  });
});
