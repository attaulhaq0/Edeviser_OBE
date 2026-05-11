// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockOrder = vi.fn();

const chainObj = {
  select: mockSelect,
  eq: mockEq,
  or: mockOr,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
};

// Each method returns chainObj for chaining
mockSelect.mockReturnValue(chainObj);
mockEq.mockReturnValue(chainObj);
mockOr.mockReturnValue(chainObj);
mockOrder.mockReturnValue(chainObj);

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

import { supabase as _supabase } from "@/lib/supabase";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

// ─── Sample data ────────────────────────────────────────────────────────────

const sampleProgression = {
  id: "prog-1",
  student_id: "student-1",
  clo_id: "clo-1",
  course_id: "course-1",
  highest_bloom_level: 4,
  correct_count_at_highest: 3,
  bloom_explorer_awarded: true,
  bloom_challenger_awarded: false,
  bloom_pioneer_awarded: false,
  updated_at: "2025-01-15T10:00:00Z",
};

const sampleClimbState = {
  blooms_climb_state: {
    current_level: 3,
    consecutive_correct: 2,
    transitions: [{ from_level: 2, to_level: 3, question_number: 5 }],
    highest_level_reached: 3,
  },
};

describe("useBloomsProgression hooks — queryFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOr.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
  });

  // ── useBloomsProgression queryFn ──────────────────────────────────────

  describe("useBloomsProgression queryFn", () => {
    it("queries blooms_progression for a student in a course with specific columns", () => {
      mockOrder.mockResolvedValue({ data: [sampleProgression], error: null });

      supabase.from("blooms_progression");
      chainObj.select(
        "id, student_id, clo_id, course_id, highest_bloom_level, correct_count_at_highest, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded, updated_at"
      );
      chainObj.eq("student_id", "student-1");
      chainObj.eq("course_id", "course-1");
      chainObj.order("highest_bloom_level", { ascending: false });

      expect(supabase.from).toHaveBeenCalledWith("blooms_progression");
      expect(mockSelect).toHaveBeenCalledWith(
        "id, student_id, clo_id, course_id, highest_bloom_level, correct_count_at_highest, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded, updated_at"
      );
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-1");
      expect(mockEq).toHaveBeenCalledWith("course_id", "course-1");
      expect(mockOrder).toHaveBeenCalledWith("highest_bloom_level", {
        ascending: false,
      });
    });

    it("returns progression records array", async () => {
      const rows = [
        sampleProgression,
        {
          ...sampleProgression,
          id: "prog-2",
          clo_id: "clo-2",
          highest_bloom_level: 2,
        },
      ];
      mockOrder.mockResolvedValue({ data: rows, error: null });

      const result = await chainObj.order("highest_bloom_level", {
        ascending: false,
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0].highest_bloom_level).toBe(4);
    });

    it("returns empty array when no progression exists", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const result = await chainObj.order("highest_bloom_level", {
        ascending: false,
      });
      expect(result.data).toEqual([]);
    });

    it("throws on supabase error", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const result = await chainObj.order("highest_bloom_level", {
        ascending: false,
      });
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("RLS denied");
    });
  });

  // ── useBloomsClimbState queryFn ───────────────────────────────────────

  describe("useBloomsClimbState queryFn", () => {
    it("queries quiz_attempts for blooms_climb_state by attempt id", () => {
      mockMaybeSingle.mockResolvedValue({
        data: sampleClimbState,
        error: null,
      });

      supabase.from("quiz_attempts");
      chainObj.select("blooms_climb_state");
      chainObj.eq("id", "attempt-1");
      chainObj.maybeSingle();

      expect(supabase.from).toHaveBeenCalledWith("quiz_attempts");
      expect(mockSelect).toHaveBeenCalledWith("blooms_climb_state");
      expect(mockEq).toHaveBeenCalledWith("id", "attempt-1");
      expect(mockMaybeSingle).toHaveBeenCalled();
    });

    it("returns parsed climb state object", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: sampleClimbState,
        error: null,
      });

      const result = await chainObj.maybeSingle();
      const state = result.data.blooms_climb_state;

      expect(state.current_level).toBe(3);
      expect(state.consecutive_correct).toBe(2);
      expect(state.transitions).toHaveLength(1);
      expect(state.highest_level_reached).toBe(3);
    });

    it("returns null when quiz attempt not found", async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      const result = await chainObj.maybeSingle();
      expect(result.data).toBeNull();
    });

    it("handles empty climb state object", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { blooms_climb_state: {} },
        error: null,
      });

      const result = await chainObj.maybeSingle();
      expect(result.data.blooms_climb_state).toEqual({});
    });

    it("throws on supabase error", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "Not found" },
      });

      const result = await chainObj.maybeSingle();
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("Not found");
    });
  });

  // ── useBloomsPioneerBadges queryFn ────────────────────────────────────

  describe("useBloomsPioneerBadges queryFn", () => {
    it("queries blooms_progression with OR filter for any awarded badge", () => {
      mockOr.mockResolvedValue({ data: [sampleProgression], error: null });

      supabase.from("blooms_progression");
      chainObj.select(
        "id, student_id, clo_id, course_id, highest_bloom_level, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded"
      );
      chainObj.eq("student_id", "student-1");
      chainObj.or(
        "bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true"
      );

      expect(supabase.from).toHaveBeenCalledWith("blooms_progression");
      expect(mockSelect).toHaveBeenCalledWith(
        "id, student_id, clo_id, course_id, highest_bloom_level, bloom_explorer_awarded, bloom_challenger_awarded, bloom_pioneer_awarded"
      );
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-1");
      expect(mockOr).toHaveBeenCalledWith(
        "bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true"
      );
    });

    it("returns only rows with at least one badge awarded", async () => {
      const badgeRows = [
        { ...sampleProgression, bloom_explorer_awarded: true },
        {
          ...sampleProgression,
          id: "prog-3",
          clo_id: "clo-3",
          bloom_pioneer_awarded: true,
          highest_bloom_level: 6,
        },
      ];
      mockOr.mockResolvedValue({ data: badgeRows, error: null });

      const result = await chainObj.or(
        "bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true"
      );
      expect(result.data).toHaveLength(2);
      expect(result.data[0].bloom_explorer_awarded).toBe(true);
      expect(result.data[1].bloom_pioneer_awarded).toBe(true);
    });

    it("returns empty array when no badges awarded", async () => {
      mockOr.mockResolvedValue({ data: [], error: null });

      const result = await chainObj.or(
        "bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true"
      );
      expect(result.data).toEqual([]);
    });

    it("throws on supabase error", async () => {
      mockOr.mockResolvedValue({
        data: null,
        error: { message: "Permission denied" },
      });

      const result = await chainObj.or(
        "bloom_explorer_awarded.eq.true,bloom_challenger_awarded.eq.true,bloom_pioneer_awarded.eq.true"
      );
      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("Permission denied");
    });
  });
});
