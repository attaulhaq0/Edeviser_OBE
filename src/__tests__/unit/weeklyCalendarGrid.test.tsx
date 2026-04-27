// =============================================================================
// Unit Tests — WeeklyCalendarGrid
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import WeeklyCalendarGrid from "@/components/shared/WeeklyCalendarGrid";
import type {
  WeekDay,
  StudySession,
  PlannerTask,
  UpcomingDeadline,
} from "@/types/planner";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: "session-1",
  studentId: "student-1",
  courseId: "course-1",
  courseName: "Math 101",
  title: "Review Chapter 5",
  description: null,
  plannedDate: "2025-06-16",
  plannedStartTime: "09:00",
  plannedDurationMinutes: 25,
  actualStartAt: null,
  actualEndAt: null,
  actualDurationMinutes: null,
  timerMode: "pomodoro",
  status: "planned",
  satisfactionRating: null,
  cloIds: null,
  createdAt: "2025-06-15T00:00:00Z",
  ...overrides,
});

const makeTask = (overrides: Partial<PlannerTask> = {}): PlannerTask => ({
  id: "task-1",
  studentId: "student-1",
  title: "Read lecture notes",
  description: null,
  dueDate: "2025-06-16",
  priority: "high",
  status: "pending",
  courseId: "course-1",
  courseName: "Math 101",
  completedAt: null,
  createdAt: "2025-06-15T00:00:00Z",
  ...overrides,
});

const makeDeadline = (
  overrides: Partial<UpcomingDeadline> = {}
): UpcomingDeadline => ({
  id: "deadline-1",
  title: "Assignment 3",
  courseName: "Physics 201",
  dueDate: "2025-06-18T23:59:00Z",
  urgency: "yellow",
  ...overrides,
});

const buildWeekData = (options?: {
  sessions?: StudySession[];
  tasks?: PlannerTask[];
  deadlines?: UpcomingDeadline[];
  todayDate?: string;
}): WeekDay[] => {
  const todayDate = options?.todayDate ?? "2025-06-18";
  const dates = [
    "2025-06-16",
    "2025-06-17",
    "2025-06-18",
    "2025-06-19",
    "2025-06-20",
    "2025-06-21",
    "2025-06-22",
  ];

  return dates.map((date) => ({
    date,
    sessions: (options?.sessions ?? []).filter((s) => s.plannedDate === date),
    tasks: (options?.tasks ?? []).filter((t) => t.dueDate === date),
    deadlines: (options?.deadlines ?? []).filter((d) =>
      d.dueDate.startsWith(date)
    ),
    isToday: date === todayDate,
  }));
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("WeeklyCalendarGrid", () => {
  it("renders 7 day columns on desktop", () => {
    const weekData = buildWeekData();
    const { container } = render(
      <WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />
    );

    // Desktop grid should have 7 children (day columns)
    const desktopGrid = container.querySelector(".md\\:grid");
    expect(desktopGrid).toBeTruthy();
    const dayColumns = desktopGrid?.children;
    expect(dayColumns?.length).toBe(7);
  });

  it("highlights today column with blue-600 header", () => {
    const weekData = buildWeekData({ todayDate: "2025-06-18" });
    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // Both desktop and mobile render today buttons — use getAllBy
    const todayButtons = screen.getAllByLabelText(/Wednesday, Jun 18/i);
    expect(todayButtons.length).toBeGreaterThanOrEqual(1);
    // At least one should have the blue-600 highlight
    const highlighted = todayButtons.some((btn) =>
      btn.className.includes("bg-blue-600")
    );
    expect(highlighted).toBe(true);
  });

  it("renders session cards in the correct day", () => {
    const session = makeSession({
      plannedDate: "2025-06-16",
      title: "Review Chapter 5",
    });
    const weekData = buildWeekData({ sessions: [session] });

    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // Session title appears (at least once — desktop renders it)
    const titles = screen.getAllByText("Review Chapter 5");
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it("renders task items", () => {
    const highTask = makeTask({
      id: "task-high",
      title: "High Priority",
      priority: "high",
      dueDate: "2025-06-16",
    });
    const lowTask = makeTask({
      id: "task-low",
      title: "Low Priority",
      priority: "low",
      dueDate: "2025-06-16",
    });
    const medTask = makeTask({
      id: "task-med",
      title: "Med Priority",
      priority: "medium",
      dueDate: "2025-06-16",
    });

    const weekData = buildWeekData({ tasks: [lowTask, highTask, medTask] });
    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // All tasks should be rendered
    expect(screen.getAllByText("High Priority").length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getAllByText("Med Priority").length).toBeGreaterThanOrEqual(
      1
    );
    expect(screen.getAllByText("Low Priority").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("renders deadline items", () => {
    const deadline = makeDeadline({
      title: "Assignment 3",
      dueDate: "2025-06-18T23:59:00Z",
      urgency: "yellow",
    });
    const weekData = buildWeekData({ deadlines: [deadline] });

    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // Deadline appears (desktop + mobile both show it since today=Jun 18)
    const titles = screen.getAllByText("Assignment 3");
    expect(titles.length).toBeGreaterThanOrEqual(1);
  });

  it("shows empty state for days with no items", () => {
    const weekData = buildWeekData();
    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // Desktop shows 7 "No items", mobile shows 1 "Nothing planned for this day"
    const emptyDesktop = screen.getAllByText("No items");
    expect(emptyDesktop.length).toBe(7);
  });

  it("calls onTaskToggle when checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    // Put task on today so mobile view also shows it
    const task = makeTask({ dueDate: "2025-06-18" });
    const weekData = buildWeekData({ tasks: [task] });

    render(
      <WeeklyCalendarGrid
        weekData={weekData}
        today="2025-06-18"
        onTaskToggle={onToggle}
      />
    );

    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes.length).toBeGreaterThanOrEqual(1);
    await user.click(checkboxes[0]!);
    expect(onToggle).toHaveBeenCalledWith(task);
  });

  it("does not show action buttons in readOnly mode", () => {
    const session = makeSession({ plannedDate: "2025-06-18" });
    const task = makeTask({ dueDate: "2025-06-18" });
    const weekData = buildWeekData({ sessions: [session], tasks: [task] });

    render(
      <WeeklyCalendarGrid weekData={weekData} today="2025-06-18" readOnly />
    );

    // No Start/Edit buttons should be present
    const startButtons = screen.queryAllByRole("button", { name: /start/i });
    expect(startButtons.length).toBe(0);
  });

  it("renders mobile day view with navigation buttons", () => {
    const weekData = buildWeekData({ todayDate: "2025-06-18" });
    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // Mobile navigation buttons
    expect(screen.getByLabelText("Previous day")).toBeTruthy();
    expect(screen.getByLabelText("Next day")).toBeTruthy();
  });

  it("mobile view defaults to today", () => {
    const weekData = buildWeekData({ todayDate: "2025-06-18" });
    render(<WeeklyCalendarGrid weekData={weekData} today="2025-06-18" />);

    // Mobile header shows today's full date
    expect(screen.getByText(/Wednesday, Jun 18/)).toBeTruthy();
    expect(screen.getByText("Today")).toBeTruthy();
  });
});
