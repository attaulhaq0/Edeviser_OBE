// =============================================================================
// Unit Tests — TodayTimeline, DailyProgressSummary, TodayViewPage
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@/lib/i18n";
import type {
  StudySession,
  PlannerTask,
  UpcomingDeadline,
  HabitStatus,
} from "@/types/planner";

// ─── Mock hooks ─────────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1" },
    profile: { full_name: "Test Student" },
  }),
}));

vi.mock("@/hooks/useTodayView", () => ({
  useTodayViewData: () => ({
    sessions: [],
    tasks: [],
    deadlines: [],
    habits: { login: false, submit: false, journal: false, read: false },
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useStudySessions", () => ({
  useCreateStudySession: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useUpdateStudySession: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/usePlannerTasks", () => ({
  useCreatePlannerTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useCompleteTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useDeletePlannerTask: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

vi.mock("@/hooks/useReviewSchedule", () => ({
  useWeeklyReviews: () => ({
    data: [],
    isLoading: false,
    isError: false,
  }),
  useCreateReviewSession: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
  useSkipReview: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ data: [], error: null }) }) }),
    }),
  },
}));

// ─── Test Data ──────────────────────────────────────────────────────────────

const mockSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: "session-1",
  studentId: "student-1",
  courseId: "course-1",
  courseName: "Mathematics",
  title: "Study Calculus",
  description: null,
  plannedDate: "2025-06-20",
  plannedStartTime: "09:00",
  plannedDurationMinutes: 25,
  actualStartAt: null,
  actualEndAt: null,
  actualDurationMinutes: null,
  timerMode: "pomodoro",
  status: "planned",
  satisfactionRating: null,
  cloIds: null,
  createdAt: "2025-06-20T00:00:00Z",
  ...overrides,
});

const mockTask = (overrides: Partial<PlannerTask> = {}): PlannerTask => ({
  id: "task-1",
  studentId: "student-1",
  title: "Read Chapter 5",
  description: null,
  dueDate: "2025-06-20",
  priority: "high",
  status: "todo",
  courseId: "course-1",
  courseName: "Mathematics",
  completedAt: null,
  createdAt: "2025-06-20T00:00:00Z",
  ...overrides,
});

const mockDeadline = (
  overrides: Partial<UpcomingDeadline> = {}
): UpcomingDeadline => ({
  id: "deadline-1",
  title: "Assignment 3",
  courseName: "Physics",
  dueDate: "2025-06-21T23:59:00",
  urgency: "yellow",
  ...overrides,
});

const defaultHabits: HabitStatus = {
  login: true,
  submit: false,
  journal: false,
  read: false,
};

// ─── TodayTimeline Tests ────────────────────────────────────────────────────

describe("TodayTimeline", () => {
  // Dynamic import to avoid hoisting issues with mocks
  let TodayTimeline: typeof import("@/components/shared/TodayTimeline").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/components/shared/TodayTimeline");
    TodayTimeline = mod.default;
  });

  it("renders empty state when no items", () => {
    render(
      <TodayTimeline
        sessions={[]}
        tasks={[]}
        deadlines={[]}
        habits={{ login: false, submit: false, journal: false, read: false }}
      />
    );

    expect(screen.getByText("Today's Timeline")).toBeInTheDocument();
    expect(screen.getByText(/Nothing scheduled for today/)).toBeInTheDocument();
  });

  it("renders morning session in Morning section", () => {
    const morningSession = mockSession({
      plannedStartTime: "09:00",
      title: "Morning Calculus",
    });

    render(
      <TodayTimeline
        sessions={[morningSession]}
        tasks={[]}
        deadlines={[]}
        habits={defaultHabits}
      />
    );

    expect(screen.getByText("Morning")).toBeInTheDocument();
    expect(screen.getByText("Morning Calculus")).toBeInTheDocument();
  });

  it("renders afternoon session in Afternoon section", () => {
    const afternoonSession = mockSession({
      plannedStartTime: "14:00",
      title: "Afternoon Physics",
    });

    render(
      <TodayTimeline
        sessions={[afternoonSession]}
        tasks={[]}
        deadlines={[]}
        habits={defaultHabits}
      />
    );

    expect(screen.getByText("Afternoon")).toBeInTheDocument();
    expect(screen.getByText("Afternoon Physics")).toBeInTheDocument();
  });

  it("renders evening session in Evening section", () => {
    const eveningSession = mockSession({
      plannedStartTime: "19:00",
      title: "Evening Review",
    });

    render(
      <TodayTimeline
        sessions={[eveningSession]}
        tasks={[]}
        deadlines={[]}
        habits={defaultHabits}
      />
    );

    expect(screen.getByText("Evening")).toBeInTheDocument();
    expect(screen.getByText("Evening Review")).toBeInTheDocument();
  });

  it("renders tasks in To Do section", () => {
    const task = mockTask({ title: "Read Chapter 5" });

    render(
      <TodayTimeline
        sessions={[]}
        tasks={[task]}
        deadlines={[]}
        habits={defaultHabits}
      />
    );

    expect(screen.getAllByText("To Do").length).toBeGreaterThan(0);
    expect(screen.getByText("Read Chapter 5")).toBeInTheDocument();
  });

  it("renders deadline items", () => {
    const deadline = mockDeadline({ title: "Assignment 3" });

    render(
      <TodayTimeline
        sessions={[]}
        tasks={[]}
        deadlines={[deadline]}
        habits={defaultHabits}
      />
    );

    expect(screen.getByText("Assignment 3")).toBeInTheDocument();
  });

  it("renders habit status section", () => {
    render(
      <TodayTimeline
        sessions={[]}
        tasks={[mockTask()]}
        deadlines={[]}
        habits={defaultHabits}
      />
    );

    expect(screen.getByText("Daily Habits")).toBeInTheDocument();
    expect(screen.getByText("Login")).toBeInTheDocument();
    expect(screen.getByText("Submit")).toBeInTheDocument();
    expect(screen.getByText("Journal")).toBeInTheDocument();
    expect(screen.getByText("Read")).toBeInTheDocument();
  });

  it("shows completed habit with checkmark", () => {
    render(
      <TodayTimeline
        sessions={[]}
        tasks={[mockTask()]}
        deadlines={[]}
        habits={{ login: true, submit: false, journal: false, read: true }}
      />
    );

    // Login and Read should show checkmarks
    const checkmarks = screen.getAllByText("✓");
    expect(checkmarks).toHaveLength(2);
  });

  it("calls onSessionStart when Start button is clicked", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const session = mockSession({ status: "planned", title: "Study Session" });

    render(
      <TodayTimeline
        sessions={[session]}
        tasks={[]}
        deadlines={[]}
        habits={defaultHabits}
        onSessionStart={onStart}
      />
    );

    const startButton = screen.getByRole("button", { name: /start/i });
    await user.click(startButton);

    expect(onStart).toHaveBeenCalledWith(session);
  });

  it("calls onTaskToggle when task checkbox is clicked", async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    const task = mockTask({ title: "My Task" });

    render(
      <TodayTimeline
        sessions={[]}
        tasks={[task]}
        deadlines={[]}
        habits={defaultHabits}
        onTaskToggle={onToggle}
      />
    );

    const checkbox = screen.getByRole("checkbox");
    await user.click(checkbox);

    expect(onToggle).toHaveBeenCalledWith(task);
  });

  it("shows Missed indicator for past sessions", () => {
    // Create a session that was scheduled well in the past (use yesterday to avoid
    // edge cases around midnight / early morning hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split("T")[0] as string;
    const timeStr = "08:00";

    const missedSession = mockSession({
      plannedDate: dateStr,
      plannedStartTime: timeStr,
      plannedDurationMinutes: 25,
      status: "planned",
      title: "Missed Session",
    });

    render(
      <TodayTimeline
        sessions={[missedSession]}
        tasks={[]}
        deadlines={[]}
        habits={defaultHabits}
      />
    );

    expect(screen.getByText("Missed")).toBeInTheDocument();
  });
});

// ─── DailyProgressSummary Tests ─────────────────────────────────────────────

describe("DailyProgressSummary", () => {
  let DailyProgressSummary: typeof import("@/components/shared/DailyProgressSummary").default;

  beforeEach(async () => {
    const mod = await import("@/components/shared/DailyProgressSummary");
    DailyProgressSummary = mod.default;
  });

  it("renders study time in minutes when under 60", () => {
    render(
      <DailyProgressSummary
        studyMinutes={45}
        tasksCompleted={3}
        sessionsCompleted={2}
      />
    );

    expect(screen.getByText("45m")).toBeInTheDocument();
    expect(screen.getByText("Study Time")).toBeInTheDocument();
  });

  it("renders study time in hours when 60+", () => {
    render(
      <DailyProgressSummary
        studyMinutes={90}
        tasksCompleted={0}
        sessionsCompleted={0}
      />
    );

    expect(screen.getByText("1h 30m")).toBeInTheDocument();
  });

  it("renders study time as exact hours when no remainder", () => {
    render(
      <DailyProgressSummary
        studyMinutes={120}
        tasksCompleted={0}
        sessionsCompleted={0}
      />
    );

    expect(screen.getByText("2h")).toBeInTheDocument();
  });

  it("renders tasks completed count", () => {
    render(
      <DailyProgressSummary
        studyMinutes={0}
        tasksCompleted={5}
        sessionsCompleted={0}
      />
    );

    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Tasks Done")).toBeInTheDocument();
  });

  it("renders sessions completed count", () => {
    render(
      <DailyProgressSummary
        studyMinutes={0}
        tasksCompleted={0}
        sessionsCompleted={3}
      />
    );

    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("renders zero values correctly", () => {
    render(
      <DailyProgressSummary
        studyMinutes={0}
        tasksCompleted={0}
        sessionsCompleted={0}
      />
    );

    expect(screen.getByText("0m")).toBeInTheDocument();
    // Two "0" values for tasks and sessions
    const zeros = screen.getAllByText("0");
    expect(zeros).toHaveLength(2);
  });
});

// ─── TodayViewPage Tests ────────────────────────────────────────────────────

describe("TodayViewPage", () => {
  let TodayViewPage: typeof import("@/pages/student/planner/TodayViewPage").default;

  beforeEach(async () => {
    vi.clearAllMocks();
    const mod = await import("@/pages/student/planner/TodayViewPage");
    TodayViewPage = mod.default;
  });

  it("renders page header with Today title", () => {
    render(<TodayViewPage />);

    expect(screen.getByText("Today")).toBeInTheDocument();
  });

  it("renders Add task button", () => {
    render(<TodayViewPage />);

    expect(
      screen.getByRole("button", { name: /add task/i })
    ).toBeInTheDocument();
  });

  it("renders Start session button", () => {
    render(<TodayViewPage />);

    expect(
      screen.getByRole("button", { name: /start session/i })
    ).toBeInTheDocument();
  });

  it("renders DailyProgressSummary KPI cards", () => {
    render(<TodayViewPage />);

    expect(screen.getByText("Study Time")).toBeInTheDocument();
    expect(screen.getByText("Tasks Done")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
  });

  it("renders TodayTimeline", () => {
    render(<TodayViewPage />);

    expect(screen.getByText("Today's Timeline")).toBeInTheDocument();
  });

  it("opens Add task dialog when button is clicked", async () => {
    const user = userEvent.setup();
    render(<TodayViewPage />);

    const quickAddBtn = screen.getByRole("button", { name: /add task/i });
    await user.click(quickAddBtn);

    // Dialog title and submit button both say "Create Task" — use role to target heading
    expect(
      screen.getByRole("heading", { name: /create task/i })
    ).toBeInTheDocument();
  });
});
