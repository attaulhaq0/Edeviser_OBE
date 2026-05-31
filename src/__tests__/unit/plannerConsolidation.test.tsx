// =============================================================================
// Unit Tests — Planner consolidation labels & derived content (Task 23.4)
//
// Covers the page/component surfaces touched by Tasks 23.1 and 23.2:
//   - R18.2: both planner surfaces use the SINGLE canonical action labels
//            ("Add task" / "Start session") routed through the shared i18n
//            keys planner.actions.addTask / planner.actions.startSession, with
//            no legacy duplicate-labelled controls remaining.
//   - R19.1: the weekly planner surfaces per-day derived deadlines drawn from
//            the student's courses instead of a bare "No items" placeholder
//            (page-level integration on top of the pure buildPlannerWeek helper,
//            which is unit-tested in weeklyPlannerContent.test.ts).
//   - R19.4: the weekly goals panel shows example goals when the student has
//            set none, and shows real progress (not examples) once goals exist.
//
// The pure helper (buildPlannerWeek / getExampleGoals / localization gate) is
// covered separately in weeklyPlannerContent.test.ts — these tests verify the
// wiring at the surfaces a student actually reaches.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import type {
  StudySession,
  PlannerTask,
  UpcomingDeadline,
  WeeklyGoal,
  GoalProgress,
} from "@/types/planner";

// ─── Shared auth mock ─────────────────────────────────────────────────────────

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1" },
    profile: { full_name: "Test Student" },
  }),
}));

// react-router-dom is only used for useNavigate on these pages.
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

// ─── Mutable weekly-planner data (overridable per test) ────────────────────────

interface WeeklyPlannerMockData {
  sessions: StudySession[];
  tasks: PlannerTask[];
  deadlines: UpcomingDeadline[];
  goals: WeeklyGoal[];
  isLoading: boolean;
  isError: boolean;
}

const weeklyData = vi.hoisted(
  () =>
    ({
      sessions: [],
      tasks: [],
      deadlines: [],
      goals: [],
      isLoading: false,
      isError: false,
    } as WeeklyPlannerMockData)
);

const enrolledCourses = vi.hoisted(() => ({
  value: [] as Array<{ id: string; name: string }>,
}));

vi.mock("@/hooks/useWeeklyPlanner", () => ({
  useWeeklyPlannerData: () => weeklyData,
}));

vi.mock("@/hooks/useStudentCourses", () => ({
  useStudentCourses: () => ({ data: enrolledCourses.value }),
}));

vi.mock("@/hooks/useWeeklyProgress", () => ({
  useWeeklyProgressSummary: () => ({
    progress: {
      totalStudyMinutes: 0,
      sessionsCompleted: 0,
      tasksCompleted: 0,
      courseBreakdown: [],
      cloBreakdown: [],
    },
    goalProgress: [],
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useStudyTimeAnalytics", () => ({
  useStudyTimeTrend: () => ({
    weeklyData: [],
    averageMinutesPerWeek: 0,
    isLoading: false,
    isError: false,
  }),
}));

vi.mock("@/hooks/useStudySessions", () => ({
  useCreateStudySession: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateStudySession: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/usePlannerTasks", () => ({
  useCreatePlannerTask: () => ({ mutate: vi.fn(), isPending: false }),
  useCompleteTask: () => ({ mutate: vi.fn(), isPending: false }),
  useDeletePlannerTask: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useWeeklyGoals", () => ({
  useSaveWeeklyGoals: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useSessionReflections", () => ({
  useSaveWeeklyReflection: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("@/hooks/useReflectionDigest", () => ({
  useMonthlyDigest: () => ({ data: null }),
  useShareDigest: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeDigestShare: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Today view data (for the TodayViewPage cross-surface consistency check).
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

vi.mock("@/hooks/useReviewSchedule", () => ({
  useWeeklyReviews: () => ({ data: [], isLoading: false, isError: false }),
  useCreateReviewSession: () => ({ mutate: vi.fn(), isPending: false }),
  useSkipReview: () => ({ mutate: vi.fn(), isPending: false }),
}));

// ─── Helpers ───────────────────────────────────────────────────────────────────

const wrap = (ui: React.ReactNode) => (
  <I18nextProvider i18n={i18n}>{ui}</I18nextProvider>
);

const resetWeeklyData = () => {
  weeklyData.sessions = [];
  weeklyData.tasks = [];
  weeklyData.deadlines = [];
  weeklyData.goals = [];
  weeklyData.isLoading = false;
  weeklyData.isError = false;
  enrolledCourses.value = [];
};

// ─── R18.2 — single canonical planner action labels ───────────────────────────

describe("Planner action labels are consolidated (R18.2)", () => {
  // Canonical labels resolved from the shared i18n keys. Both planner surfaces
  // must render exactly these and nothing that duplicates their intent.
  const ADD_TASK = i18n.t("planner.actions.addTask", { ns: "student" });
  const START_SESSION = i18n.t("planner.actions.startSession", {
    ns: "student",
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    resetWeeklyData();
    await i18n.changeLanguage("en");
  });

  it("uses the canonical English labels from the shared i18n keys", () => {
    // Guards against the keys silently resolving to the raw key string.
    expect(ADD_TASK).toBe("Add task");
    expect(START_SESSION).toBe("Start session");
  });

  it("WeeklyPlannerPage renders the single canonical add/start labels", async () => {
    const { default: WeeklyPlannerPage } = await import(
      "@/pages/student/planner/WeeklyPlannerPage"
    );
    render(wrap(<WeeklyPlannerPage />));

    expect(
      screen.getByRole("button", { name: new RegExp(ADD_TASK, "i") })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(START_SESSION, "i") })
    ).toBeInTheDocument();
  });

  it("WeeklyPlannerPage shows no legacy duplicate-labelled controls", async () => {
    const { default: WeeklyPlannerPage } = await import(
      "@/pages/student/planner/WeeklyPlannerPage"
    );
    render(wrap(<WeeklyPlannerPage />));

    // Pre-consolidation the weekly surface exposed bare "Task" / "Session"
    // buttons; those must no longer exist as standalone action buttons.
    expect(
      screen.queryByRole("button", { name: /^task$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^session$/i })
    ).not.toBeInTheDocument();
    // The Today surface's old wording must not leak onto the weekly surface.
    expect(screen.queryByText(/quick add/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/start unplanned session/i)
    ).not.toBeInTheDocument();
  });

  it("TodayViewPage renders the same canonical labels (cross-surface consistency)", async () => {
    const { default: TodayViewPage } = await import(
      "@/pages/student/planner/TodayViewPage"
    );
    render(wrap(<TodayViewPage />));

    expect(
      screen.getByRole("button", { name: new RegExp(ADD_TASK, "i") })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: new RegExp(START_SESSION, "i") })
    ).toBeInTheDocument();
    // Legacy Today labels must be gone.
    expect(screen.queryByText(/quick add/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/start unplanned session/i)
    ).not.toBeInTheDocument();
  });
});

// ─── R19.1 — derived per-day content surfaces on the weekly planner ────────────

describe("Weekly planner surfaces derived per-day content (R19.1)", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetWeeklyData();
    await i18n.changeLanguage("en");
  });

  it("renders a derived deadline on its day instead of a bare 'No items'", async () => {
    // Build a deadline within the currently-rendered week so it lands on a day.
    const { getWeekStartDate } = await import("@/lib/plannerUtils");
    const weekStart = getWeekStartDate(new Date()); // YYYY-MM-DD (Mon)

    weeklyData.deadlines = [
      {
        id: "deadline-1",
        title: "Lab Report Due",
        courseName: "Chemistry 101",
        dueDate: `${weekStart}T23:59:00Z`,
        urgency: "yellow",
      },
    ];
    enrolledCourses.value = [{ id: "course-1", name: "Chemistry 101" }];

    const { default: WeeklyPlannerPage } = await import(
      "@/pages/student/planner/WeeklyPlannerPage"
    );
    render(wrap(<WeeklyPlannerPage />));

    // The derived deadline is surfaced (desktop grid renders all seven days).
    expect(screen.getAllByText("Lab Report Due").length).toBeGreaterThan(0);
  });

  it("offers suggested study sessions so empty days are not blank", async () => {
    enrolledCourses.value = [{ id: "course-1", name: "Chemistry 101" }];

    const { default: WeeklyPlannerPage } = await import(
      "@/pages/student/planner/WeeklyPlannerPage"
    );
    render(wrap(<WeeklyPlannerPage />));

    // With no student-created items, every today-or-future day gets a suggested
    // study session rather than a bare "No items" label. Today is always within
    // the rendered week, so at least one suggestion is surfaced regardless of
    // which weekday the test runs on. (Empty *past* days legitimately keep the
    // "No items" placeholder, since a session cannot be planned in the past.)
    expect(
      screen.getAllByTestId("suggested-session").length
    ).toBeGreaterThanOrEqual(1);
  });
});

// ─── R19.4 — example goals shown when the student has set none ─────────────────

describe("WeeklyGoalPanel example goals when empty (R19.4)", () => {
  let WeeklyGoalPanel: typeof import("@/components/shared/WeeklyGoalPanel").default;

  const exampleGoals = [
    { label: "Study Hours", targetText: "5 hours" },
    { label: "Sessions", targetText: "3 sessions" },
    { label: "Tasks", targetText: "5 tasks" },
  ];
  const exampleGoalsCopy = {
    heading: "Goal ideas to get started",
    hint: "Set a goal below to track your week.",
    cta: "Set goals",
  };

  const makeGoal = (overrides: Partial<WeeklyGoal> = {}): WeeklyGoal => ({
    id: "goal-1",
    studentId: "student-1",
    weekStartDate: "2025-06-16",
    goalType: "study_hours",
    targetValue: 5,
    ...overrides,
  });

  const makeProgress = (goal: WeeklyGoal): GoalProgress => ({
    goal,
    currentValue: 2,
    percentage: 40,
    isMet: false,
  });

  beforeEach(async () => {
    const mod = await import("@/components/shared/WeeklyGoalPanel");
    WeeklyGoalPanel = mod.default;
  });

  it("shows example goals and a set-goals CTA when there are no goals", () => {
    render(
      wrap(
        <WeeklyGoalPanel
          goals={[]}
          progress={[]}
          weekStartDate="2025-06-16"
          onSave={vi.fn()}
          exampleGoals={exampleGoals}
          exampleGoalsCopy={exampleGoalsCopy}
        />
      )
    );

    expect(screen.getByText("Goal ideas to get started")).toBeInTheDocument();
    expect(
      screen.getByText("Set a goal below to track your week.")
    ).toBeInTheDocument();
    // Each example label + target text renders.
    expect(screen.getByText("Study Hours")).toBeInTheDocument();
    expect(screen.getByText("5 hours")).toBeInTheDocument();
    expect(screen.getByText("Sessions")).toBeInTheDocument();
    expect(screen.getByText("3 sessions")).toBeInTheDocument();
    expect(screen.getByText("Tasks")).toBeInTheDocument();
    expect(screen.getByText("5 tasks")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /set goals/i })
    ).toBeInTheDocument();
  });

  it("falls back to the plain empty state when no example goals are provided", () => {
    render(
      wrap(
        <WeeklyGoalPanel
          goals={[]}
          progress={[]}
          weekStartDate="2025-06-16"
          onSave={vi.fn()}
        />
      )
    );

    expect(screen.getByText("No goals set for this week")).toBeInTheDocument();
    expect(
      screen.queryByText("Goal ideas to get started")
    ).not.toBeInTheDocument();
  });

  it("does not show example goals once the student has set goals", () => {
    const goal = makeGoal();
    render(
      wrap(
        <WeeklyGoalPanel
          goals={[goal]}
          progress={[makeProgress(goal)]}
          weekStartDate="2025-06-16"
          onSave={vi.fn()}
          exampleGoals={exampleGoals}
          exampleGoalsCopy={exampleGoalsCopy}
        />
      )
    );

    // Real progress is shown, not the example-goals guidance.
    expect(
      screen.queryByText("Goal ideas to get started")
    ).not.toBeInTheDocument();
    expect(screen.getByText("Study Hours")).toBeInTheDocument();
    expect(screen.getByText("2.0 / 5h")).toBeInTheDocument();
  });
});
