import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HeatmapTooltip from "@/components/shared/HeatmapTooltip";
import type { CompletedHabit } from "@/types/habits";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeHabit(
  type: CompletedHabit["type"],
  category: CompletedHabit["category"]
): CompletedHabit {
  return { type, category, completedAt: "2025-03-15T10:00:00Z" };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HeatmapTooltip", () => {
  it("renders formatted date", () => {
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={[]}
        xpEarned={0}
        streakActive={false}
      />
    );
    expect(screen.getByTestId("tooltip-date")).toHaveTextContent(
      "March 15, 2025"
    );
  });

  it('shows "No habits completed" for empty day', () => {
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={[]}
        xpEarned={0}
        streakActive={false}
      />
    );
    expect(screen.getByTestId("tooltip-empty")).toHaveTextContent(
      "No habits completed"
    );
  });

  it("renders academic habits with checkmarks", () => {
    const habits: CompletedHabit[] = [
      makeHabit("login", "academic"),
      makeHabit("submit", "academic"),
    ];
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={habits}
        xpEarned={35}
        streakActive={true}
      />
    );
    expect(screen.getByTestId("tooltip-academic-section")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-habit-login")).toHaveTextContent("✓");
    expect(screen.getByTestId("tooltip-habit-login")).toHaveTextContent(
      "Login"
    );
    expect(screen.getByTestId("tooltip-habit-submit")).toHaveTextContent(
      "Submit"
    );
  });

  it("renders wellness habits in separate section", () => {
    const habits: CompletedHabit[] = [
      makeHabit("meditation", "wellness"),
      makeHabit("exercise", "wellness"),
    ];
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={habits}
        xpEarned={10}
        streakActive={false}
      />
    );
    expect(screen.getByTestId("tooltip-wellness-section")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-habit-meditation")).toHaveTextContent(
      "Meditation"
    );
    expect(screen.getByTestId("tooltip-habit-exercise")).toHaveTextContent(
      "Exercise"
    );
  });

  it("renders both academic and wellness sections when mixed", () => {
    const habits: CompletedHabit[] = [
      makeHabit("login", "academic"),
      makeHabit("meditation", "wellness"),
    ];
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={habits}
        xpEarned={15}
        streakActive={true}
      />
    );
    expect(screen.getByTestId("tooltip-academic-section")).toBeInTheDocument();
    expect(screen.getByTestId("tooltip-wellness-section")).toBeInTheDocument();
  });

  it("displays XP earned", () => {
    const habits: CompletedHabit[] = [makeHabit("login", "academic")];
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={habits}
        xpEarned={50}
        streakActive={true}
      />
    );
    expect(screen.getByTestId("tooltip-xp")).toHaveTextContent("50 XP earned");
  });

  it("shows streak active status", () => {
    const habits: CompletedHabit[] = [makeHabit("login", "academic")];
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={habits}
        xpEarned={10}
        streakActive={true}
      />
    );
    expect(screen.getByTestId("tooltip-streak")).toHaveTextContent(
      "🔥 Streak active"
    );
  });

  it("shows streak broken status", () => {
    const habits: CompletedHabit[] = [makeHabit("login", "academic")];
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={habits}
        xpEarned={10}
        streakActive={false}
      />
    );
    expect(screen.getByTestId("tooltip-streak")).toHaveTextContent(
      "Streak broken"
    );
  });

  it('has role="tooltip"', () => {
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={[]}
        xpEarned={0}
        streakActive={false}
      />
    );
    expect(screen.getByRole("tooltip")).toBeInTheDocument();
  });

  it("does not show XP/streak footer for empty day", () => {
    render(
      <HeatmapTooltip
        date="2025-03-15"
        habits={[]}
        xpEarned={0}
        streakActive={false}
      />
    );
    expect(screen.queryByTestId("tooltip-xp")).not.toBeInTheDocument();
    expect(screen.queryByTestId("tooltip-streak")).not.toBeInTheDocument();
  });
});
