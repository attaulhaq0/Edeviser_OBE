// =============================================================================
// Unit tests for ProgressSummaryPanel
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ProgressSummaryPanel from "@/components/shared/ProgressSummaryPanel";
import type {
  WeeklyProgressData,
  GoalProgress,
  WeeklyGoal,
} from "@/types/planner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeSummary(
  overrides: Partial<WeeklyProgressData> = {}
): WeeklyProgressData {
  return {
    totalStudyMinutes: 180,
    sessionsCompleted: 5,
    tasksCompleted: 8,
    courseBreakdown: [],
    cloBreakdown: [],
    ...overrides,
  };
}

function makeGoal(overrides: Partial<WeeklyGoal> = {}): WeeklyGoal {
  return {
    id: "goal-1",
    studentId: "student-1",
    weekStartDate: "2025-06-16",
    goalType: "study_hours",
    targetValue: 10,
    ...overrides,
  };
}

function makeGoalProgress(
  goalOverrides: Partial<WeeklyGoal> = {},
  progressOverrides: Partial<GoalProgress> = {}
): GoalProgress {
  const goal = makeGoal(goalOverrides);
  return {
    goal,
    currentValue: 5,
    percentage: 50,
    isMet: false,
    ...progressOverrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ProgressSummaryPanel", () => {
  it("renders the panel with correct test id", () => {
    render(<ProgressSummaryPanel summary={makeSummary()} goals={[]} />);
    expect(screen.getByTestId("progress-summary-panel")).toBeInTheDocument();
  });

  it("displays total study hours correctly", () => {
    render(
      <ProgressSummaryPanel
        summary={makeSummary({ totalStudyMinutes: 150 })}
        goals={[]}
      />
    );
    // 150 min = 2.5h
    expect(screen.getByTestId("study-hours")).toHaveTextContent("2.5h");
  });

  it("displays sessions completed count", () => {
    render(
      <ProgressSummaryPanel
        summary={makeSummary({ sessionsCompleted: 7 })}
        goals={[]}
      />
    );
    expect(screen.getByTestId("sessions-completed")).toHaveTextContent("7");
  });

  it("displays tasks completed count", () => {
    render(
      <ProgressSummaryPanel
        summary={makeSummary({ tasksCompleted: 12 })}
        goals={[]}
      />
    );
    expect(screen.getByTestId("tasks-completed")).toHaveTextContent("12");
  });

  it("renders goal progress items when goals are provided", () => {
    const goals: GoalProgress[] = [
      makeGoalProgress({ id: "g1", goalType: "study_hours" }),
      makeGoalProgress({ id: "g2", goalType: "sessions_completed" }),
    ];
    render(<ProgressSummaryPanel summary={makeSummary()} goals={goals} />);
    const items = screen.getAllByTestId("goal-progress-item");
    expect(items).toHaveLength(2);
  });

  it("shows success indicator when goal is met", () => {
    const goals: GoalProgress[] = [
      makeGoalProgress(
        { id: "g1", goalType: "study_hours", targetValue: 5 },
        { currentValue: 6, percentage: 100, isMet: true }
      ),
    ];
    render(<ProgressSummaryPanel summary={makeSummary()} goals={goals} />);
    expect(screen.getByTestId("goal-met-indicator")).toBeInTheDocument();
  });

  it("does not show success indicator when goal is not met", () => {
    const goals: GoalProgress[] = [
      makeGoalProgress(
        { id: "g1", goalType: "study_hours", targetValue: 10 },
        { currentValue: 3, percentage: 30, isMet: false }
      ),
    ];
    render(<ProgressSummaryPanel summary={makeSummary()} goals={goals} />);
    expect(screen.queryByTestId("goal-met-indicator")).not.toBeInTheDocument();
  });

  it("shows empty state when no goals are set", () => {
    render(<ProgressSummaryPanel summary={makeSummary()} goals={[]} />);
    expect(screen.getByText("No goals set for this week")).toBeInTheDocument();
  });

  it("renders progress bars with correct aria attributes", () => {
    const goals: GoalProgress[] = [
      makeGoalProgress(
        { id: "g1", goalType: "study_hours" },
        { percentage: 75 }
      ),
    ];
    render(<ProgressSummaryPanel summary={makeSummary()} goals={goals} />);
    const progressBar = screen.getByRole("progressbar");
    expect(progressBar).toHaveAttribute("aria-valuenow", "75");
    expect(progressBar).toHaveAttribute("aria-valuemin", "0");
    expect(progressBar).toHaveAttribute("aria-valuemax", "100");
  });

  it("displays goal type labels correctly", () => {
    const goals: GoalProgress[] = [
      makeGoalProgress({ id: "g1", goalType: "study_hours" }),
      makeGoalProgress({ id: "g2", goalType: "sessions_completed" }),
      makeGoalProgress({ id: "g3", goalType: "tasks_completed" }),
    ];
    render(<ProgressSummaryPanel summary={makeSummary()} goals={goals} />);
    expect(screen.getByText("Study Hours")).toBeInTheDocument();
    // "Sessions" appears in both KPI row and goal progress
    expect(screen.getAllByText("Sessions")).toHaveLength(2);
    expect(screen.getByText("Tasks")).toBeInTheDocument();
  });

  it("displays zero study hours correctly", () => {
    render(
      <ProgressSummaryPanel
        summary={makeSummary({ totalStudyMinutes: 0 })}
        goals={[]}
      />
    );
    expect(screen.getByTestId("study-hours")).toHaveTextContent("0.0h");
  });
});
