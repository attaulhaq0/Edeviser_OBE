import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import StreakDisplay from "@/components/shared/StreakDisplay";
import { getNextMilestone, getMilestoneProgress } from "@/lib/streakMilestones";

// ---------------------------------------------------------------------------
// Pure function tests
// ---------------------------------------------------------------------------
describe("getNextMilestone", () => {
  it("returns 7 for a streak of 0", () => {
    expect(getNextMilestone(0)).toBe(7);
  });

  it("returns 7 for a streak of 5", () => {
    expect(getNextMilestone(5)).toBe(7);
  });

  it("returns 14 when streak equals 7", () => {
    expect(getNextMilestone(7)).toBe(14);
  });

  it("returns 100 for a streak of 61", () => {
    expect(getNextMilestone(61)).toBe(100);
  });

  it("returns null when all milestones are passed", () => {
    expect(getNextMilestone(100)).toBeNull();
    expect(getNextMilestone(150)).toBeNull();
  });
});

describe("getMilestoneProgress", () => {
  it("returns 0 for streak of 0", () => {
    expect(getMilestoneProgress(0)).toBe(0);
  });

  it("returns 100 when all milestones passed", () => {
    expect(getMilestoneProgress(100)).toBe(100);
    expect(getMilestoneProgress(200)).toBe(100);
  });

  it("calculates progress within first milestone range (0-7)", () => {
    expect(getMilestoneProgress(3)).toBe(43);
  });

  it("calculates progress within second milestone range (7-14)", () => {
    expect(getMilestoneProgress(10)).toBe(43);
  });

  it("calculates progress within 30-60 range", () => {
    expect(getMilestoneProgress(45)).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// Component rendering tests
// ---------------------------------------------------------------------------
describe("StreakDisplay", () => {
  it("renders streak count in full mode", () => {
    render(<StreakDisplay streakCount={12} />);
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
  });

  it("renders compact mode with just count", () => {
    render(<StreakDisplay streakCount={5} compact />);
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.queryByText("day streak")).not.toBeInTheDocument();
    expect(screen.getByLabelText("5 day streak")).toBeInTheDocument();
  });

  it("shows milestone progress bar in full mode", () => {
    render(<StreakDisplay streakCount={5} />);
    expect(screen.getByText("Next milestone: 7 days")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it('shows "All milestones reached" when past all milestones', () => {
    render(<StreakDisplay streakCount={100} />);
    expect(screen.getByText("All milestones reached!")).toBeInTheDocument();
    expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
  });

  it("renders streak freeze indicators when available", () => {
    render(<StreakDisplay streakCount={10} streakFreezesAvailable={2} />);
    expect(
      screen.getByLabelText("2 streak freezes available")
    ).toBeInTheDocument();
  });

  it("does not render freeze indicators when none available", () => {
    render(<StreakDisplay streakCount={10} streakFreezesAvailable={0} />);
    expect(screen.queryByLabelText(/streak freeze/)).not.toBeInTheDocument();
  });

  it("caps freeze indicators at 2", () => {
    const { container } = render(
      <StreakDisplay streakCount={10} streakFreezesAvailable={5} />
    );
    const snowflakes = container.querySelectorAll(".text-blue-400");
    expect(snowflakes).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// Sabbatical range format tests — Requirement 126.1
// ---------------------------------------------------------------------------
describe("StreakDisplay — Sabbatical range format", () => {
  it("shows range format when sabbatical enabled and rest days > 0", () => {
    render(
      <StreakDisplay
        streakCount={15}
        streakSabbaticalEnabled={true}
        restDays={4}
      />
    );
    expect(screen.getByTestId("streak-range-label")).toHaveTextContent(
      "day streak, 4 rest days"
    );
  });

  it('shows singular "rest day" when restDays is 1', () => {
    render(
      <StreakDisplay
        streakCount={6}
        streakSabbaticalEnabled={true}
        restDays={1}
      />
    );
    expect(screen.getByTestId("streak-range-label")).toHaveTextContent(
      "day streak, 1 rest day"
    );
  });

  it("shows standard format when sabbatical disabled", () => {
    render(
      <StreakDisplay
        streakCount={10}
        streakSabbaticalEnabled={false}
        restDays={2}
      />
    );
    expect(screen.queryByTestId("streak-range-label")).not.toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
  });

  it("shows standard format when restDays is 0 even with sabbatical enabled", () => {
    render(
      <StreakDisplay
        streakCount={5}
        streakSabbaticalEnabled={true}
        restDays={0}
      />
    );
    expect(screen.queryByTestId("streak-range-label")).not.toBeInTheDocument();
    expect(screen.getByText("day streak")).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Total Active Days tests — Requirement 126.2, 126.5
// ---------------------------------------------------------------------------
describe("StreakDisplay — Total Active Days", () => {
  it("shows total active days counter", () => {
    render(<StreakDisplay streakCount={5} totalActiveDays={42} />);
    expect(screen.getByTestId("total-active-days")).toHaveTextContent(
      "42 Total Active Days"
    );
  });

  it("does not show total active days when 0", () => {
    render(<StreakDisplay streakCount={5} totalActiveDays={0} />);
    expect(screen.queryByTestId("total-active-days")).not.toBeInTheDocument();
  });

  it("celebrates milestone at 30 days", () => {
    render(<StreakDisplay streakCount={5} totalActiveDays={30} />);
    expect(screen.getByTestId("active-days-milestone")).toHaveTextContent(
      "Milestone!"
    );
  });

  it("celebrates milestone at 100 days", () => {
    render(<StreakDisplay streakCount={5} totalActiveDays={100} />);
    expect(screen.getByTestId("active-days-milestone")).toHaveTextContent(
      "Milestone!"
    );
  });

  it("celebrates milestone at 365 days", () => {
    render(<StreakDisplay streakCount={5} totalActiveDays={365} />);
    expect(screen.getByTestId("active-days-milestone")).toHaveTextContent(
      "Milestone!"
    );
  });

  it("does not show milestone for non-milestone values", () => {
    render(<StreakDisplay streakCount={5} totalActiveDays={42} />);
    expect(
      screen.queryByTestId("active-days-milestone")
    ).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Motivational message on streak reset — Requirement 126.4
// ---------------------------------------------------------------------------
describe("StreakDisplay — Streak reset message", () => {
  it("shows motivational message when streak just reset", () => {
    render(
      <StreakDisplay
        streakCount={0}
        totalActiveDays={50}
        streakJustReset={true}
      />
    );
    expect(screen.getByTestId("streak-reset-message")).toHaveTextContent(
      "Your 50 total active days of learning are still an achievement"
    );
  });

  it("does not show message when streak not reset", () => {
    render(
      <StreakDisplay
        streakCount={5}
        totalActiveDays={50}
        streakJustReset={false}
      />
    );
    expect(
      screen.queryByTestId("streak-reset-message")
    ).not.toBeInTheDocument();
  });

  it("does not show message when totalActiveDays is 0", () => {
    render(
      <StreakDisplay
        streakCount={0}
        totalActiveDays={0}
        streakJustReset={true}
      />
    );
    expect(
      screen.queryByTestId("streak-reset-message")
    ).not.toBeInTheDocument();
  });
});
