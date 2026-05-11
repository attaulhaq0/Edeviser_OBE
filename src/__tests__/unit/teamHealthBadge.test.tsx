// Unit test: TeamHealthBadge — color coding green ≥70, yellow 40-69, red <40
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import TeamHealthBadge from "@/components/shared/TeamHealthBadge";

describe("TeamHealthBadge", () => {
  it("renders score value", () => {
    render(<TeamHealthBadge score={85} />);
    expect(screen.getByText("85")).toBeDefined();
  });

  it('score ≥70 shows "Healthy" with green styling', () => {
    const { container } = render(<TeamHealthBadge score={75} />);
    const badge = screen.getByTestId("team-health-badge");
    expect(badge.getAttribute("data-status")).toBe("healthy");
    expect(container.querySelector('[class*="green"]')).not.toBeNull();
  });

  it('score 40-69 shows "Needs Attention" with yellow styling', () => {
    const { container } = render(<TeamHealthBadge score={55} />);
    const badge = screen.getByTestId("team-health-badge");
    expect(badge.getAttribute("data-status")).toBe("needs_attention");
    expect(container.querySelector('[class*="yellow"]')).not.toBeNull();
  });

  it('score <40 shows "At Risk" with red styling', () => {
    const { container } = render(<TeamHealthBadge score={25} />);
    const badge = screen.getByTestId("team-health-badge");
    expect(badge.getAttribute("data-status")).toBe("at_risk");
    expect(container.querySelector('[class*="red"]')).not.toBeNull();
  });

  it("boundary: score 70 is healthy", () => {
    render(<TeamHealthBadge score={70} />);
    expect(
      screen.getByTestId("team-health-badge").getAttribute("data-status")
    ).toBe("healthy");
  });

  it("boundary: score 69 is needs_attention", () => {
    render(<TeamHealthBadge score={69} />);
    expect(
      screen.getByTestId("team-health-badge").getAttribute("data-status")
    ).toBe("needs_attention");
  });

  it("boundary: score 40 is needs_attention", () => {
    render(<TeamHealthBadge score={40} />);
    expect(
      screen.getByTestId("team-health-badge").getAttribute("data-status")
    ).toBe("needs_attention");
  });

  it("boundary: score 39 is at_risk", () => {
    render(<TeamHealthBadge score={39} />);
    expect(
      screen.getByTestId("team-health-badge").getAttribute("data-status")
    ).toBe("at_risk");
  });

  it("has accessible aria-label", () => {
    render(<TeamHealthBadge score={85} />);
    expect(screen.getByLabelText("Health score: 85, Healthy")).toBeDefined();
  });

  it("clamps score to 0-100 range", () => {
    render(<TeamHealthBadge score={150} />);
    expect(screen.getByText("100")).toBeDefined();
  });
});
