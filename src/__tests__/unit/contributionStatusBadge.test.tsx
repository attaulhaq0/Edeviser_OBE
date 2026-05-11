// Unit test: ContributionStatusBadge — correct color/label for active, warning, inactive
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContributionStatusBadge from "@/components/shared/ContributionStatusBadge";

describe("ContributionStatusBadge", () => {
  it('renders "Active" label for active status', () => {
    render(<ContributionStatusBadge status="active" />);
    expect(screen.getByText("Active")).toBeDefined();
  });

  it('renders "Warning" label for warning status', () => {
    render(<ContributionStatusBadge status="warning" />);
    expect(screen.getByText("Warning")).toBeDefined();
  });

  it('renders "Inactive" label for inactive status', () => {
    render(<ContributionStatusBadge status="inactive" />);
    expect(screen.getByText("Inactive")).toBeDefined();
  });

  it("active status has green styling", () => {
    const { container } = render(<ContributionStatusBadge status="active" />);
    const badge = container.querySelector('[class*="green"]');
    expect(badge).not.toBeNull();
  });

  it("warning status has yellow styling", () => {
    const { container } = render(<ContributionStatusBadge status="warning" />);
    const badge = container.querySelector('[class*="yellow"]');
    expect(badge).not.toBeNull();
  });

  it("inactive status has red styling", () => {
    const { container } = render(<ContributionStatusBadge status="inactive" />);
    const badge = container.querySelector('[class*="red"]');
    expect(badge).not.toBeNull();
  });

  it("has accessible aria-label", () => {
    render(<ContributionStatusBadge status="active" />);
    expect(screen.getByLabelText("Contribution status: Active")).toBeDefined();
  });
});
