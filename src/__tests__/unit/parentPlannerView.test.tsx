// =============================================================================
// Unit Tests — ParentPlannerView
// Read-only weekly planner for parents viewing linked student's study plan.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type {
  StudySession,
  PlannerTask,
  WeeklyGoal,
  UpcomingDeadline,
} from "@/types/planner";

// ─── Hoisted mock state — mutable across tests ──────────────────────────────

const plannerData = vi.hoisted(() => ({
  sessions: [] as StudySession[],
  tasks: [] as PlannerTask[],
  deadlines: [] as UpcomingDeadline[],
  goals: [] as WeeklyGoal[],
  isLoading: false,
}));

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useWeeklyPlanner", () => ({
  useWeeklyPlannerData: () => plannerData,
}));

// ─── Test data factories ────────────────────────────────────────────────────

const completedSession = (
  overrides: Partial<StudySession> = {}
): StudySession => ({
  id: "session-1",
  studentId: "student-1",
  courseId: "course-1",
  courseName: "Mathematics",
  title: "Calculus Practice",
  description: null,
  plannedDate: "2026-04-27",
  plannedStartTime: "09:00",
  plannedDurationMinutes: 60,
  actualStartAt: "2026-04-27T09:00:00Z",
  actualEndAt: "2026-04-27T10:00:00Z",
  actualDurationMinutes: 60,
  timerMode: "pomodoro",
  status: "completed",
  satisfactionRating: 4,
  cloIds: null,
  createdAt: "2026-04-27T00:00:00Z",
  ...overrides,
});

const completedTask = (overrides: Partial<PlannerTask> = {}): PlannerTask => ({
  id: "task-1",
  studentId: "student-1",
  title: "Read Chapter 5",
  description: null,
  dueDate: "2026-04-27",
  priority: "high",
  status: "completed",
  courseId: "course-1",
  courseName: "Mathematics",
  completedAt: "2026-04-27T10:30:00Z",
  createdAt: "2026-04-27T00:00:00Z",
  ...overrides,
});

const studyHoursGoal = (overrides: Partial<WeeklyGoal> = {}): WeeklyGoal => ({
  id: "goal-1",
  studentId: "student-1",
  weekStartDate: "2026-04-27",
  goalType: "study_hours",
  targetValue: 10,
  ...overrides,
});

// ─── Helper: render with route param ────────────────────────────────────────

const renderAtPath = async (path: string) => {
  const { default: ParentPlannerView } = await import(
    "@/pages/parent/planner/ParentPlannerView"
  );
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="/parent/planner/:studentId"
          element={<ParentPlannerView />}
        />
        <Route path="/parent/planner" element={<ParentPlannerView />} />
      </Routes>
    </MemoryRouter>
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("ParentPlannerView", () => {
  beforeEach(() => {
    plannerData.sessions = [];
    plannerData.tasks = [];
    plannerData.deadlines = [];
    plannerData.goals = [];
    plannerData.isLoading = false;
  });

  it("shows empty state when no studentId in URL", async () => {
    await renderAtPath("/parent/planner");
    expect(screen.getByText(/No student selected/)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Go to Children/ })
    ).toBeInTheDocument();
  });

  it("renders Study Plan heading and week navigation", async () => {
    await renderAtPath("/parent/planner/student-1");
    expect(screen.getByText("Study Plan")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous week/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next week/i })
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Today" })).toBeInTheDocument();
  });

  it("renders KPI cards: Study Hours, Sessions, Tasks Done", async () => {
    await renderAtPath("/parent/planner/student-1");
    expect(screen.getByText("Study Hours")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("Tasks Done")).toBeInTheDocument();
  });

  it("computes total study hours from completed sessions only", async () => {
    plannerData.sessions = [
      completedSession({ id: "s1", actualDurationMinutes: 60 }),
      completedSession({ id: "s2", actualDurationMinutes: 90 }),
      completedSession({
        id: "s3",
        status: "planned",
        actualDurationMinutes: null,
      }),
    ];
    await renderAtPath("/parent/planner/student-1");
    // 60 + 90 = 150 min = 2.5h (planned session excluded)
    expect(screen.getByText("2.5h")).toBeInTheDocument();
  });

  it("counts only completed sessions", async () => {
    plannerData.sessions = [
      completedSession({ id: "s1" }),
      completedSession({ id: "s2" }),
      completedSession({ id: "s3", status: "planned" }),
      completedSession({ id: "s4", status: "cancelled" }),
    ];
    await renderAtPath("/parent/planner/student-1");
    const sessionsLabel = screen.getByText("Sessions");
    // Value paragraph is the next sibling element after the label
    const valueEl = sessionsLabel.parentElement?.querySelector(
      "p.text-2xl"
    ) as HTMLElement | null;
    expect(valueEl?.textContent).toBe("2");
  });

  it("counts only completed tasks", async () => {
    plannerData.tasks = [
      completedTask({ id: "t1" }),
      completedTask({ id: "t2", status: "pending", completedAt: null }),
    ];
    await renderAtPath("/parent/planner/student-1");
    const tasksLabel = screen.getByText("Tasks Done");
    const valueEl = tasksLabel.parentElement?.querySelector(
      "p.text-2xl"
    ) as HTMLElement | null;
    expect(valueEl?.textContent).toBe("1");
  });

  it("renders Weekly Schedule calendar grid", async () => {
    await renderAtPath("/parent/planner/student-1");
    expect(screen.getByText("Weekly Schedule")).toBeInTheDocument();
  });

  it("renders Weekly Goals panel even when goals are empty", async () => {
    await renderAtPath("/parent/planner/student-1");
    expect(screen.getByText(/Weekly Goals/i)).toBeInTheDocument();
  });

  it("renders weekly goals when present", async () => {
    plannerData.goals = [studyHoursGoal({ targetValue: 10 })];
    await renderAtPath("/parent/planner/student-1");
    expect(screen.getByText(/Weekly Goals/i)).toBeInTheDocument();
  });

  it("does NOT render any Save / Add Goal / Edit affordances (read-only)", async () => {
    plannerData.goals = [studyHoursGoal()];
    await renderAtPath("/parent/planner/student-1");
    expect(
      screen.queryByRole("button", { name: /save goals/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /add goal/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /edit goals/i })
    ).not.toBeInTheDocument();
  });

  it("does NOT render session create / edit / start affordances", async () => {
    plannerData.sessions = [completedSession()];
    await renderAtPath("/parent/planner/student-1");
    expect(
      screen.queryByRole("button", { name: /create session/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^start$/i })
    ).not.toBeInTheDocument();
  });

  it("shows loading shimmers when isLoading is true", async () => {
    plannerData.isLoading = true;
    const { container } = await renderAtPath("/parent/planner/student-1");
    // Shimmer renders animated placeholders — check for any element with the shimmer class
    const shimmers = container.querySelectorAll('[class*="animate-shimmer"]');
    expect(shimmers.length).toBeGreaterThan(0);
  });
});
