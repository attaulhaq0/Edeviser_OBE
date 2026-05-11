import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockLogActivity = vi.fn();
vi.mock("@/lib/activityLogger", () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      upsert: (...args: unknown[]) => mockUpsert(...args),
    }),
  },
}));

let mockProfile: { id: string; role: string } | null = null;
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: mockProfile }),
}));

const mockInvalidateQueries = vi.fn();
const mockMutate = vi.fn();

vi.mock("@tanstack/react-query", () => ({
  useMutation: (opts: {
    mutationFn: (params: unknown) => Promise<void>;
    onSuccess?: () => void;
    onError?: (e: unknown) => void;
  }) => {
    // Store the mutationFn so mockMutate can call it
    mockMutate.mockImplementation((params: unknown) => {
      opts
        .mutationFn(params)
        .then(() => opts.onSuccess?.())
        .catch((e) => opts.onError?.(e));
    });
    return { mutate: mockMutate, isPending: false };
  },
  useQueryClient: () => ({
    invalidateQueries: mockInvalidateQueries,
  }),
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: {
    habitLogs: { all: ["habitLogs"] },
  },
}));

import { renderHook, act } from "@testing-library/react";
import { useReadHabitTimer } from "@/hooks/useReadHabitTimer";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("useReadHabitTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockProfile = null;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const defaultOptions = {
    pageType: "assignment_detail" as const,
    pageId: "assignment-123",
  };

  it("does not start timer for non-student roles", () => {
    mockProfile = { id: "teacher-1", role: "teacher" };
    const { result } = renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(result.current.isCompleted).toBe(false);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("does not start timer when profile is null", () => {
    mockProfile = null;
    const { result } = renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(35_000);
    });

    expect(result.current.elapsedSeconds).toBe(0);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("increments elapsed seconds each tick", () => {
    mockProfile = { id: "student-1", role: "student" };
    const { result } = renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(result.current.elapsedSeconds).toBe(5);
    expect(result.current.isCompleted).toBe(false);
  });

  it("marks habit as completed and calls mutation at 30 seconds", () => {
    mockProfile = { id: "student-1", role: "student" };
    const { result } = renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(result.current.isCompleted).toBe(true);
    expect(result.current.elapsedSeconds).toBe(30);

    // Should call mutation with student_id and habit_date
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        habit_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      })
    );
  });

  it("logs activity with duration_seconds when habit completes", () => {
    mockProfile = { id: "student-1", role: "student" };
    renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        event_type: "page_view",
        metadata: expect.objectContaining({
          page_type: "assignment_detail",
          page_id: "assignment-123",
          duration_seconds: 30,
          habit_completed: true,
        }),
      })
    );
  });

  it("only fires habit completion once even after continued viewing", () => {
    mockProfile = { id: "student-1", role: "student" };
    renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    // Should only call mutation once
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockLogActivity).toHaveBeenCalledTimes(1);
  });

  it("logs partial duration on unmount if habit not completed", () => {
    mockProfile = { id: "student-1", role: "student" };
    const { unmount } = renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(10_000);
    });

    unmount();

    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        student_id: "student-1",
        event_type: "page_view",
        metadata: expect.objectContaining({
          duration_seconds: 10,
          habit_completed: false,
        }),
      })
    );
  });

  it("does not log partial duration on unmount if habit was completed", () => {
    mockProfile = { id: "student-1", role: "student" };
    const { unmount } = renderHook(() => useReadHabitTimer(defaultOptions));

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    mockLogActivity.mockClear();
    unmount();

    // Should not log again on unmount since habit was already completed
    expect(mockLogActivity).not.toHaveBeenCalled();
  });
});
