import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import HabitDifficultyIndicator from "@/components/shared/HabitDifficultyIndicator";

describe("HabitDifficultyIndicator", () => {
  it("renders level 1 as Seedling", () => {
    render(<HabitDifficultyIndicator level={1} habitLevelStreak={0} />);
    expect(screen.getByText("Level 1")).toBeInTheDocument();
    expect(screen.getByText("Seedling")).toBeInTheDocument();
  });

  it("renders level 2 as Sprout", () => {
    render(<HabitDifficultyIndicator level={2} habitLevelStreak={3} />);
    expect(screen.getByText("Level 2")).toBeInTheDocument();
    expect(screen.getByText("Sprout")).toBeInTheDocument();
  });

  it("renders level 3 as Tree with max level message", () => {
    render(<HabitDifficultyIndicator level={3} habitLevelStreak={0} />);
    expect(screen.getByText("Level 3")).toBeInTheDocument();
    expect(screen.getByText("Tree")).toBeInTheDocument();
    expect(screen.getByText("Max level reached")).toBeInTheDocument();
  });

  it("shows days remaining to next level", () => {
    render(<HabitDifficultyIndicator level={1} habitLevelStreak={5} />);
    expect(screen.getByText("2 days to Level 2")).toBeInTheDocument();
  });

  it("shows 7 days when streak is 0", () => {
    render(<HabitDifficultyIndicator level={1} habitLevelStreak={0} />);
    expect(screen.getByText("7 days to Level 2")).toBeInTheDocument();
  });

  it.each([0, 3, 7, 10])("preserves streak %i progress with the strong-green fill", (streak) => {
    const { container } = render(<HabitDifficultyIndicator level={1} habitLevelStreak={streak} />);
    const fill = container.querySelector<HTMLElement>("[style]");
    expect(fill).toHaveClass("bg-(--success-foreground)");
    expect(fill?.parentElement).toHaveClass("bg-muted");
    expect(fill?.style.width).toBe(`${Math.min((streak / 7) * 100, 100)}%`);
  });

  it("does not render progress at the maximum level", () => {
    const { container } = render(<HabitDifficultyIndicator level={3} habitLevelStreak={10} />);
    expect(container.querySelector("[style]")).toBeNull();
    expect(screen.getByText("Max level reached")).toBeInTheDocument();
  });

  it('shows singular "day" when 1 day remaining', () => {
    render(<HabitDifficultyIndicator level={2} habitLevelStreak={6} />);
    expect(screen.getByText("1 day to Level 3")).toBeInTheDocument();
  });
});
