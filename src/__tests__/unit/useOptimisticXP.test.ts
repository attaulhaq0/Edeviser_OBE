// @vitest-environment happy-dom
// =============================================================================
// useOptimisticXP — Unit tests
// Feature: edeviser-platform, Task 54.7
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { useOptimisticXP, useOptimisticStreak } from "@/hooks/useOptimisticXP";
import { queryKeys } from "@/lib/queryKeys";
import type { StudentKPIData } from "@/hooks/useStudentDashboard";
import type { LevelData } from "@/hooks/useLevel";

// Mock the xpClient
vi.mock("@/lib/xpClient", () => ({
  awardXP: vi.fn().mockResolvedValue({
    success: true,
    xp_awarded: 25,
    new_total: 125,
    level_up: false,
    new_level: 2,
  }),
}));

const STUDENT_ID = "student-1";

const createWrapper = (queryClient: QueryClient) => {
  return ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
};

describe("useOptimisticXP", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  it("optimistically updates KPI cache with new XP amount", async () => {
    const kpiKey = queryKeys.studentGamification.detail(STUDENT_ID);
    const initialKPI: StudentKPIData = {
      enrolledCourses: 3,
      completedAssignments: 5,
      avgAttainment: 72,
      currentStreak: 7,
      currentLevel: 2,
      totalXP: 100,
      totalActiveDays: 0,
    };
    queryClient.setQueryData(kpiKey, initialKPI);

    const { result } = renderHook(() => useOptimisticXP(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.awardXPOptimistic({
        studentId: STUDENT_ID,
        xpAmount: 25,
        source: "submission",
      });
    });

    // KPI should have been optimistically updated
    const updatedKPI = queryClient.getQueryData<StudentKPIData>(kpiKey);
    expect(updatedKPI?.totalXP).toBe(125);
  });

  it("optimistically updates Level cache", async () => {
    const levelKey = queryKeys.studentGamification.list({
      scope: "level",
      studentId: STUDENT_ID,
    });
    const initialLevel: LevelData = {
      level: 2,
      title: "Explorer",
      xpTotal: 100,
      xpForCurrentLevel: 100,
      xpForNextLevel: 250,
      progressPercent: 0,
    };
    queryClient.setQueryData(levelKey, initialLevel);

    const { result } = renderHook(() => useOptimisticXP(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.awardXPOptimistic({
        studentId: STUDENT_ID,
        xpAmount: 50,
        source: "submission",
      });
    });

    const updatedLevel = queryClient.getQueryData<LevelData>(levelKey);
    expect(updatedLevel?.xpTotal).toBe(150);
  });

  it("rolls back on failure", async () => {
    const { awardXP } = await import("@/lib/xpClient");
    (awardXP as ReturnType<typeof vi.fn>).mockResolvedValueOnce(null);

    const kpiKey = queryKeys.studentGamification.detail(STUDENT_ID);
    const initialKPI: StudentKPIData = {
      enrolledCourses: 3,
      completedAssignments: 5,
      avgAttainment: 72,
      currentStreak: 7,
      currentLevel: 2,
      totalXP: 100,
      totalActiveDays: 0,
    };
    queryClient.setQueryData(kpiKey, initialKPI);

    const { result } = renderHook(() => useOptimisticXP(), {
      wrapper: createWrapper(queryClient),
    });

    await act(async () => {
      await result.current.awardXPOptimistic({
        studentId: STUDENT_ID,
        xpAmount: 25,
        source: "submission",
      });
    });

    // Should be rolled back to original
    const rolledBackKPI = queryClient.getQueryData<StudentKPIData>(kpiKey);
    expect(rolledBackKPI?.totalXP).toBe(100);
  });
});

describe("useOptimisticStreak", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.useFakeTimers();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("optimistically increments streak counter", () => {
    const kpiKey = queryKeys.studentGamification.detail(STUDENT_ID);
    const initialKPI: StudentKPIData = {
      enrolledCourses: 3,
      completedAssignments: 5,
      avgAttainment: 72,
      currentStreak: 7,
      currentLevel: 2,
      totalXP: 100,
      totalActiveDays: 0,
    };
    queryClient.setQueryData(kpiKey, initialKPI);

    const { result } = renderHook(() => useOptimisticStreak(), {
      wrapper: createWrapper(queryClient),
    });

    act(() => {
      result.current.incrementStreakOptimistic(STUDENT_ID);
    });

    const updatedKPI = queryClient.getQueryData<StudentKPIData>(kpiKey);
    expect(updatedKPI?.currentStreak).toBe(8);
  });
});
