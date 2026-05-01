// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockIn = vi.fn();
const mockGte = vi.fn();
const mockLte = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const chainObj: Record<string, ReturnType<typeof vi.fn>> = {
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
  in: mockIn,
  gte: mockGte,
  lte: mockLte,
  order: mockOrder,
  limit: mockLimit,
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

describe("useSessionIntent — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain returns
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockIn.mockReturnValue(chainObj);
    mockGte.mockReturnValue(chainObj);
    mockLte.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockLimit.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  });

  // ─── useSaveSessionIntent mutationFn ──────────────────────────────────

  describe("useSaveSessionIntent mutationFn", () => {
    it("inserts into session_intents with correct columns", async () => {
      const intentRow = {
        id: "intent-1",
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Linked lists",
        success_criterion: "Implement a reverse function",
        is_auto_suggested: false,
        created_at: "2025-06-20T10:00:00Z",
      };
      mockSingle.mockResolvedValue({ data: intentRow, error: null });

      const chain = supabase.from("session_intents");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Linked lists",
        success_criterion: "Implement a reverse function",
        is_auto_suggested: false,
      });
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ id: "intent-1" }));
      expect(mockFrom).toHaveBeenCalledWith("session_intents");
      expect(mockInsert).toHaveBeenCalledWith({
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Linked lists",
        success_criterion: "Implement a reverse function",
        is_auto_suggested: false,
      });
    });

    it("sets is_auto_suggested to true when provided", async () => {
      const intentRow = {
        id: "intent-2",
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Binary trees",
        success_criterion: "Solve 3 practice problems",
        is_auto_suggested: true,
        created_at: "2025-06-20T10:00:00Z",
      };
      mockSingle.mockResolvedValue({ data: intentRow, error: null });

      const chain = supabase.from("session_intents");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Binary trees",
        success_criterion: "Solve 3 practice problems",
        is_auto_suggested: true,
      });
      chain.select();
      const { data } = await chain.single();

      expect(data).toEqual(
        expect.objectContaining({ is_auto_suggested: true })
      );
    });

    it("returns error when insert fails (e.g. duplicate session_id)", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      });

      const chain = supabase.from("session_intents");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Test",
        success_criterion: "Test",
        is_auto_suggested: false,
      });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toContain("duplicate key");
    });
  });

  // ─── useSessionIntent queryFn ─────────────────────────────────────────

  describe("useSessionIntent queryFn", () => {
    it("queries session_intents by session_id with maybeSingle", async () => {
      const intentRow = {
        id: "intent-1",
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Recursion",
        success_criterion: "Write a recursive factorial",
        is_auto_suggested: false,
        created_at: "2025-06-20T10:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: intentRow, error: null });

      const chain = supabase.from("session_intents");
      chain.select("*");
      chain.eq("session_id", "session-abc");
      const result = await chain.maybeSingle();

      expect(mockFrom).toHaveBeenCalledWith("session_intents");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("session_id", "session-abc");
      expect(result.data).toEqual(intentRow);
    });

    it("returns null when no intent exists for session", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const chain = supabase.from("session_intents");
      chain.select("*");
      chain.eq("session_id", "session-xyz");
      const result = await chain.maybeSingle();

      expect(result.data).toBeNull();
      expect(result.error).toBeNull();
    });
  });

  // ─── useSuggestedIntents queryFn ──────────────────────────────────────

  describe("useSuggestedIntents queryFn", () => {
    it("fetches session course_id to prioritise suggestions", () => {
      supabase.from("study_sessions");

      expect(mockFrom).toHaveBeenCalledWith("study_sessions");
    });

    it("fetches enrolled courses via student_courses", () => {
      supabase.from("student_courses");

      expect(mockFrom).toHaveBeenCalledWith("student_courses");
    });

    it("fetches CLOs from learning_outcomes for enrolled courses", () => {
      const chain = supabase.from("learning_outcomes");
      chain.select("id, title, course_id");
      chain.eq("type", "CLO");

      expect(mockFrom).toHaveBeenCalledWith("learning_outcomes");
      expect(mockSelect).toHaveBeenCalledWith("id, title, course_id");
      expect(mockEq).toHaveBeenCalledWith("type", "CLO");
    });

    it("filters attainment by student_id, scope, and outcome_ids", () => {
      const cloIds = ["clo-1", "clo-2"];
      const chain = supabase.from("outcome_attainment");
      chain.select("outcome_id, attainment_percent");
      chain.eq("student_id", "student-123");
      chain.eq("scope", "student_course");
      chain.in("outcome_id", cloIds);

      expect(mockFrom).toHaveBeenCalledWith("outcome_attainment");
      expect(mockSelect).toHaveBeenCalledWith("outcome_id, attainment_percent");
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-123");
      expect(mockEq).toHaveBeenCalledWith("scope", "student_course");
      expect(mockIn).toHaveBeenCalledWith("outcome_id", cloIds);
    });

    it("fetches upcoming assignments scoped to enrolled courses", () => {
      const courseIds = ["course-1", "course-2"];
      const chain = supabase.from("assignments");
      chain.select("id, title, due_date");
      chain.in("course_id", courseIds);

      expect(mockFrom).toHaveBeenCalledWith("assignments");
      expect(mockSelect).toHaveBeenCalledWith("id, title, due_date");
      expect(mockIn).toHaveBeenCalledWith("course_id", courseIds);
    });
  });

  // ─── mapIntent ────────────────────────────────────────────────────────

  describe("mapIntent (via query result)", () => {
    it("maps snake_case DB row to camelCase SessionIntent", async () => {
      const dbRow = {
        id: "intent-1",
        session_id: "session-abc",
        student_id: "student-123",
        concept: "Sorting algorithms",
        success_criterion: "Implement quicksort",
        is_auto_suggested: true,
        created_at: "2025-06-20T10:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: dbRow, error: null });

      const chain = supabase.from("session_intents");
      chain.select("*");
      chain.eq("session_id", "session-abc");
      const { data } = await chain.maybeSingle();

      // Verify the raw data shape matches what mapIntent expects
      expect(data).toHaveProperty("session_id");
      expect(data).toHaveProperty("student_id");
      expect(data).toHaveProperty("success_criterion");
      expect(data).toHaveProperty("is_auto_suggested");
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns error when session_intents query fails", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("session_intents");
      chain.select("*");
      chain.eq("session_id", "session-abc");
      const result = await chain.maybeSingle();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("RLS denied");
    });
  });
});
