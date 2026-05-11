import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import CorrelationInsightCard from "@/components/shared/CorrelationInsightCard";
import type { CorrelationInsight } from "@/types/habits";

const makeInsight = (
  overrides: Partial<CorrelationInsight> = {}
): CorrelationInsight => ({
  id: "test-1",
  habitType: "meditation",
  academicMetric: "submissions",
  description: "You tend to submit more on days when you meditate",
  strength: 0.72,
  ...overrides,
});

describe("CorrelationInsightCard", () => {
  it("renders the insight description", () => {
    render(<CorrelationInsightCard insight={makeInsight()} />);
    expect(
      screen.getByText("You tend to submit more on days when you meditate")
    ).toBeInTheDocument();
  });

  it("renders the strength percentage", () => {
    render(
      <CorrelationInsightCard insight={makeInsight({ strength: 0.85 })} />
    );
    expect(screen.getByText("85%")).toBeInTheDocument();
  });

  it("renders the strength bar", () => {
    render(<CorrelationInsightCard insight={makeInsight({ strength: 0.5 })} />);
    const bar = screen.getByTestId("strength-bar");
    expect(bar).toHaveStyle({ width: "50%" });
  });

  it("renders with correct test id", () => {
    render(<CorrelationInsightCard insight={makeInsight({ id: "abc-123" })} />);
    expect(
      screen.getByTestId("correlation-insight-abc-123")
    ).toBeInTheDocument();
  });

  it("renders icon for meditation habit type", () => {
    const { container } = render(
      <CorrelationInsightCard
        insight={makeInsight({ habitType: "meditation" })}
      />
    );
    // Icon container should have purple styling for meditation
    const iconContainer = container.querySelector(".bg-purple-50");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders icon for exercise habit type", () => {
    const { container } = render(
      <CorrelationInsightCard
        insight={makeInsight({ habitType: "exercise" })}
      />
    );
    const iconContainer = container.querySelector(".bg-green-50");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders icon for login habit type", () => {
    const { container } = render(
      <CorrelationInsightCard insight={makeInsight({ habitType: "login" })} />
    );
    const iconContainer = container.querySelector(".bg-teal-50");
    expect(iconContainer).toBeInTheDocument();
  });

  it("renders strength label", () => {
    render(<CorrelationInsightCard insight={makeInsight()} />);
    expect(screen.getByText("Strength")).toBeInTheDocument();
  });

  it("handles zero strength", () => {
    render(<CorrelationInsightCard insight={makeInsight({ strength: 0 })} />);
    expect(screen.getByText("0%")).toBeInTheDocument();
    const bar = screen.getByTestId("strength-bar");
    expect(bar).toHaveStyle({ width: "0%" });
  });

  it("handles full strength", () => {
    render(<CorrelationInsightCard insight={makeInsight({ strength: 1 })} />);
    expect(screen.getByText("100%")).toBeInTheDocument();
    const bar = screen.getByTestId("strength-bar");
    expect(bar).toHaveStyle({ width: "100%" });
  });
});
