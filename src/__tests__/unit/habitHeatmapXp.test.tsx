// =============================================================================
// HabitHeatmapPage — per-day XP wiring unit tests (Task 16.3)
// Verifies Task 16.2: the heatmap surfaces the day's *recorded* habit XP from
// useHeatmapXpByDate (via the tooltip and the mobile bottom sheet) instead of a
// hardcoded 0 (R7.1, R7.4).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { HeatmapDay, CompletedHabit } from "@/types/habits";

// ---------------------------------------------------------------------------
// Stub ResizeObserver for happy-dom (HeatmapGrid observes its container)
// ---------------------------------------------------------------------------

class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe() {
    this.callback(
      [{ contentRect: { width: 900 } } as unknown as ResizeObserverEntry],
      this as unknown as ResizeObserver
    );
  }
  unobserve() {}
  disconnect() {}
}
vi.stubGlobal("ResizeObserver", MockResizeObserver);

// ---------------------------------------------------------------------------
// Fixtures — a single tracked day with academic habits and recorded XP
// ---------------------------------------------------------------------------

const TRACKED_DATE = "2025-01-06"; // past date → clickable, not future
const RECORDED_XP = 35;

const academicHabit = (type: CompletedHabit["type"]): CompletedHabit => ({
  type,
  category: "academic",
  completedAt: `${TRACKED_DATE}T10:00:00Z`,
});

const mockHeatmapData: HeatmapDay[] = [
  {
    date: TRACKED_DATE,
    academicCount: 2,
    wellnessCount: 0,
    totalCount: 2,
    habits: [academicHabit("login"), academicHabit("submit")],
  },
];

// Per-day recorded XP map returned by useHeatmapXpByDate.
const mockXpByDate: Record<string, number> = { [TRACKED_DATE]: RECORDED_XP };

// ---------------------------------------------------------------------------
// Hook mocks (all data-access hooks used by HabitHeatmapContent)
// ---------------------------------------------------------------------------

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "student-1", role: "student" } }),
}));

vi.mock("@/hooks/useSemesterRange", () => ({
  useSemesterRange: () => ({
    data: { start: "2025-01-01", end: "2025-01-31" },
    isLoading: false,
  }),
}));

vi.mock("@/hooks/useHeatmapData", () => ({
  useHeatmapData: () => ({ data: mockHeatmapData, isLoading: false }),
  useHeatmapSummary: () => ({
    data: { currentStreak: 1, longestStreak: 1, totalActiveDays: 1 },
    isLoading: false,
  }),
  useHeatmapXpByDate: () => ({ data: mockXpByDate }),
}));

vi.mock("@/hooks/useWellnessPreferences", () => ({
  useWellnessPreferences: () => ({
    data: { enabledHabits: [], parentVisibility: false },
  }),
  useUpdateWellnessPreferences: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useWellnessHabits", () => ({
  useWellnessHabitLogs: () => ({ data: [] }),
  useLogWellnessHabit: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useWellnessTips", () => ({
  useCurrentTip: () => ({ tip: null, isOnboarding: false }),
  useDismissOnboardingTip: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useWellnessReminders", () => ({
  useWellnessReminders: () => ({ data: [] }),
  useUpdateWellnessReminder: () => ({ mutate: vi.fn() }),
}));

vi.mock("@/hooks/useWellnessGoals", () => ({
  useWellnessGoals: () => ({ data: [] }),
  useDailyProgress: () => ({}),
  useUpdateWellnessGoal: () => ({ mutate: vi.fn() }),
}));

vi.mock("nuqs", () => ({
  parseAsString: { withDefault: (def: string) => def },
  useQueryState: () => ["all", vi.fn()] as const,
}));

// ---------------------------------------------------------------------------
// Import after mocks
// ---------------------------------------------------------------------------

import HabitHeatmapPage from "@/pages/student/habits/HabitHeatmapPage";

const renderPage = () =>
  render(
    <MemoryRouter>
      <HabitHeatmapPage />
    </MemoryRouter>
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("HabitHeatmapPage per-day XP wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the day's recorded XP in the tooltip on hover (R7.1)", async () => {
    renderPage();

    const cell = screen.getByTestId(`heatmap-cell-${TRACKED_DATE}`);
    fireEvent.mouseEnter(cell);

    const xp = await screen.findByTestId("tooltip-xp");
    expect(xp).toHaveTextContent(`${RECORDED_XP} XP earned`);
    // Guards against the previous hardcoded-zero regression.
    expect(xp).not.toHaveTextContent("0 XP earned");
  });

  it("shows the day's recorded XP in the bottom sheet on click (R7.1, R7.4)", async () => {
    renderPage();

    const cell = screen.getByTestId(`heatmap-cell-${TRACKED_DATE}`);
    fireEvent.click(cell);

    const xp = await screen.findByTestId("bottom-sheet-xp");
    expect(xp).toHaveTextContent(`${RECORDED_XP} XP earned`);
    expect(xp).not.toHaveTextContent("0 XP earned");
  });
});
