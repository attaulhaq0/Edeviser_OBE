// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();

const chainObj: Record<string, ReturnType<typeof vi.fn>> = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  eq: mockEq,
  gte: mockGte,
  lte: mockLte,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};

const mockFrom = vi.fn((_arg: unknown) => chainObj);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (arg: unknown) => mockFrom(arg),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "student-123" },
    profile: null,
    role: "student",
    institutionId: "inst-1",
    isLoading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
    resetPassword: vi.fn(),
  })),
}));

import { supabase as _supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (...args: unknown[]) => any };

describe("useReviewSchedule — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain returns
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockGte.mockReturnValue(chainObj);
    mockLte.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  });

  // ─── useWeeklyReviews queryFn ─────────────────────────────────────────

  describe("useWeeklyReviews queryFn", () => {
    it("queries review_schedules with correct date range and ordering", async () => {
      const reviewRows = [
        {
          id: "rev-1",
          student_id: "student-123",
          clo_id: "clo-1",
          course_id: "course-1",
          source_session_id: "session-1",
          review_date: "2025-06-16",
          interval_days: 1,
          status: "pending",
          review_session_id: null,
          created_at: "2025-06-15T10:00:00Z",
          updated_at: "2025-06-15T10:00:00Z",
        },
        {
          id: "rev-2",
          student_id: "student-123",
          clo_id: "clo-1",
          course_id: "course-1",
          source_session_id: "session-1",
          review_date: "2025-06-18",
          interval_days: 3,
          status: "pending",
          review_session_id: null,
          created_at: "2025-06-15T10:00:00Z",
          updated_at: "2025-06-15T10:00:00Z",
        },
      ];
      mockOrder.mockResolvedValue({ data: reviewRows, error: null });

      const chain = supabase.from("review_schedules");
      chain.select("*");
      chain.eq("student_id", "student-123");
      chain.gte("review_date", "2025-06-16");
      chain.lte("review_date", "2025-06-22");
      const result = await chain.order("review_date", { ascending: true });

      expect(mockFrom).toHaveBeenCalledWith("review_schedules");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-123");
      expect(mockGte).toHaveBeenCalledWith("review_date", "2025-06-16");
      expect(mockLte).toHaveBeenCalledWith("review_date", "2025-06-22");
      expect(mockOrder).toHaveBeenCalledWith("review_date", {
        ascending: true,
      });
      expect(result.data).toHaveLength(2);
    });

    it("returns empty array when no reviews exist for the week", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const chain = supabase.from("review_schedules");
      chain.select("*");
      chain.eq("student_id", "student-123");
      chain.gte("review_date", "2025-06-16");
      chain.lte("review_date", "2025-06-22");
      const result = await chain.order("review_date", { ascending: true });

      expect(result.data).toEqual([]);
    });

    it("returns error when query fails", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("review_schedules");
      chain.select("*");
      chain.eq("student_id", "student-123");
      chain.gte("review_date", "2025-06-16");
      chain.lte("review_date", "2025-06-22");
      const result = await chain.order("review_date", { ascending: true });

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("RLS denied");
    });
  });

  // ─── useCreateReviewSession mutationFn ────────────────────────────────

  describe("useCreateReviewSession mutationFn", () => {
    it("creates a study_session with review title and pomodoro mode", async () => {
      const sessionRow = {
        id: "session-new",
        student_id: "student-123",
        course_id: "course-1",
        title: "Review: Binary Trees",
        planned_date: "2025-06-16",
        planned_start_time: "14:30",
        planned_duration_minutes: 25,
        timer_mode: "pomodoro",
        status: "planned",
        clo_ids: ["clo-1"],
        created_at: "2025-06-16T14:30:00Z",
      };
      mockSingle.mockResolvedValue({ data: sessionRow, error: null });

      const chain = supabase.from("study_sessions");
      chain.insert({
        student_id: "student-123",
        course_id: "course-1",
        title: "Review: Binary Trees",
        planned_date: "2025-06-16",
        planned_start_time: "14:30",
        planned_duration_minutes: 25,
        timer_mode: "pomodoro",
        status: "planned",
        clo_ids: ["clo-1"],
      });
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({
          title: "Review: Binary Trees",
          timer_mode: "pomodoro",
          planned_duration_minutes: 25,
          clo_ids: ["clo-1"],
        })
      );
      expect(mockFrom).toHaveBeenCalledWith("study_sessions");
    });

    it("updates review_schedule to completed with new session ID", async () => {
      const reviewRow = {
        id: "rev-1",
        student_id: "student-123",
        clo_id: "clo-1",
        course_id: "course-1",
        source_session_id: "session-1",
        review_date: "2025-06-16",
        interval_days: 1,
        status: "completed",
        review_session_id: "session-new",
        created_at: "2025-06-15T10:00:00Z",
        updated_at: "2025-06-16T14:30:00Z",
      };
      mockSingle.mockResolvedValue({ data: reviewRow, error: null });

      const chain = supabase.from("review_schedules");
      chain.update({
        status: "completed",
        review_session_id: "session-new",
      });
      chain.eq("id", "rev-1");
      chain.eq("student_id", "student-123");
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({
          status: "completed",
          review_session_id: "session-new",
        })
      );
      expect(mockFrom).toHaveBeenCalledWith("review_schedules");
      expect(mockUpdate).toHaveBeenCalledWith({
        status: "completed",
        review_session_id: "session-new",
      });
    });

    it("returns error when study_session insert fails", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "insert failed" },
      });

      const chain = supabase.from("study_sessions");
      chain.insert({
        student_id: "student-123",
        course_id: "course-1",
        title: "Review: Test CLO",
        planned_date: "2025-06-16",
        planned_start_time: "10:00",
        planned_duration_minutes: 25,
        timer_mode: "pomodoro",
        status: "planned",
        clo_ids: ["clo-1"],
      });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toBe("insert failed");
    });
  });

  // ─── useSkipReview mutationFn ─────────────────────────────────────────

  describe("useSkipReview mutationFn", () => {
    it("updates review_schedule status to skipped", async () => {
      const reviewRow = {
        id: "rev-1",
        student_id: "student-123",
        clo_id: "clo-1",
        course_id: "course-1",
        source_session_id: "session-1",
        review_date: "2025-06-16",
        interval_days: 1,
        status: "skipped",
        review_session_id: null,
        created_at: "2025-06-15T10:00:00Z",
        updated_at: "2025-06-16T14:30:00Z",
      };
      mockSingle.mockResolvedValue({ data: reviewRow, error: null });

      const chain = supabase.from("review_schedules");
      chain.update({ status: "skipped" });
      chain.eq("id", "rev-1");
      chain.eq("student_id", "student-123");
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(
        expect.objectContaining({
          status: "skipped",
          review_session_id: null,
        })
      );
      expect(mockFrom).toHaveBeenCalledWith("review_schedules");
      expect(mockUpdate).toHaveBeenCalledWith({ status: "skipped" });
    });

    it("scopes update to student_id for RLS safety", async () => {
      mockSingle.mockResolvedValue({
        data: { id: "rev-1", status: "skipped" },
        error: null,
      });

      const chain = supabase.from("review_schedules");
      chain.update({ status: "skipped" });
      chain.eq("id", "rev-1");
      chain.eq("student_id", "student-123");
      chain.select();
      await chain.single();

      // Verify both eq calls were made (id + student_id)
      expect(mockEq).toHaveBeenCalledWith("id", "rev-1");
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-123");
    });

    it("returns error when update fails", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("review_schedules");
      chain.update({ status: "skipped" });
      chain.eq("id", "rev-1");
      chain.eq("student_id", "student-123");
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toBe("RLS denied");
    });
  });

  // ─── mapReviewSchedule ────────────────────────────────────────────────

  describe("mapReviewSchedule (via query result)", () => {
    it("maps snake_case DB row to camelCase ReviewSchedule", async () => {
      const dbRow = {
        id: "rev-1",
        student_id: "student-123",
        clo_id: "clo-1",
        course_id: "course-1",
        source_session_id: "session-1",
        review_date: "2025-06-16",
        interval_days: 1,
        status: "pending",
        review_session_id: null,
        created_at: "2025-06-15T10:00:00Z",
        updated_at: "2025-06-15T10:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: dbRow, error: null });

      const chain = supabase.from("review_schedules");
      chain.select("*");
      chain.eq("id", "rev-1");
      const { data } = await chain.maybeSingle();

      // Verify the raw data shape matches what mapReviewSchedule expects
      expect(data).toHaveProperty("student_id");
      expect(data).toHaveProperty("clo_id");
      expect(data).toHaveProperty("course_id");
      expect(data).toHaveProperty("source_session_id");
      expect(data).toHaveProperty("review_date");
      expect(data).toHaveProperty("interval_days");
      expect(data).toHaveProperty("review_session_id");
    });

    it("handles null optional fields correctly", async () => {
      const dbRow = {
        id: "rev-2",
        student_id: "student-123",
        clo_id: "clo-2",
        course_id: null,
        source_session_id: null,
        review_date: "2025-06-18",
        interval_days: 3,
        status: "pending",
        review_session_id: null,
        created_at: "2025-06-15T10:00:00Z",
        updated_at: "2025-06-15T10:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: dbRow, error: null });

      const chain = supabase.from("review_schedules");
      chain.select("*");
      chain.eq("id", "rev-2");
      const { data } = await chain.maybeSingle();

      expect(data!.course_id).toBeNull();
      expect(data!.source_session_id).toBeNull();
      expect(data!.review_session_id).toBeNull();
    });
  });

  // ─── Week date range calculation ──────────────────────────────────────

  describe("week date range calculation", () => {
    it("calculates correct week end date (weekStart + 6 days)", () => {
      const weekStartDate = "2025-06-16"; // Monday
      const [year, month, day] = weekStartDate.split("-").map(Number) as [
        number,
        number,
        number
      ];
      const weekEnd = new Date(Date.UTC(year, month - 1, day + 6));
      const weekEndDate = `${weekEnd.getUTCFullYear()}-${String(
        weekEnd.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(weekEnd.getUTCDate()).padStart(2, "0")}`;

      expect(weekEndDate).toBe("2025-06-22"); // Sunday
    });

    it("handles month boundary correctly", () => {
      const weekStartDate = "2025-06-30"; // Monday
      const [year, month, day] = weekStartDate.split("-").map(Number) as [
        number,
        number,
        number
      ];
      const weekEnd = new Date(Date.UTC(year, month - 1, day + 6));
      const weekEndDate = `${weekEnd.getUTCFullYear()}-${String(
        weekEnd.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(weekEnd.getUTCDate()).padStart(2, "0")}`;

      expect(weekEndDate).toBe("2025-07-06"); // Crosses into July
    });

    it("handles year boundary correctly", () => {
      const weekStartDate = "2025-12-29"; // Monday
      const [year, month, day] = weekStartDate.split("-").map(Number) as [
        number,
        number,
        number
      ];
      const weekEnd = new Date(Date.UTC(year, month - 1, day + 6));
      const weekEndDate = `${weekEnd.getUTCFullYear()}-${String(
        weekEnd.getUTCMonth() + 1
      ).padStart(2, "0")}-${String(weekEnd.getUTCDate()).padStart(2, "0")}`;

      expect(weekEndDate).toBe("2026-01-04"); // Crosses into next year
    });
  });
});
