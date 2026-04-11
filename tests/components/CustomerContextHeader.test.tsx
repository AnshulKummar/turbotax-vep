// @vitest-environment happy-dom
import "./setup";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CustomerContextHeader } from "../../components/workbench/CustomerContextHeader";

describe("CustomerContextHeader", () => {
  it("renders customer name, prior preparer, and prior year summary", () => {
    render(
      <CustomerContextHeader
        customerName="Olivia & Ryan Mitchell"
        priorExpertNotes="Suspended PAL carried forward. Recommend PTET."
        priorPreparerName="Pat Daniels, CPA"
        priorYearAgi={289_400}
        priorYearRefundOrOwed={1_240}
        priorYearFiledDate="2025-03-18"
        taxYear={2025}
      />,
    );
    expect(screen.getByText("Olivia & Ryan Mitchell")).toBeInTheDocument();
    expect(screen.getByText(/Pat Daniels, CPA/)).toBeInTheDocument();
    expect(screen.getByText(/Filed 2025-03-18/)).toBeInTheDocument();
    expect(screen.getByText(/Refund/)).toBeInTheDocument();
  });
});
