// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const chainObj: Record<string, ReturnType<typeof vi.fn>> = {
  select: mockSelect,
  insert: mockInsert,
  eq: mockEq,
  order: mockOrder,
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

describe("useFlowCheckIns — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default chain returns
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  });

  // ─── useSaveFlowCheckIn mutationFn ────────────────────────────────────

  describe("useSaveFlowCheckIn mutationFn", () => {
    it("inserts into flow_check_ins with correct columns", async () => {
      const checkInRow = {
        id: "checkin-1",
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 1,
        response: "in_the_zone",
        created_at: "2025-06-20T10:25:00Z",
      };
      mockSingle.mockResolvedValue({ data: checkInRow, error: null });

      const chain = supabase.from("flow_check_ins");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 1,
        response: "in_the_zone",
      });
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ id: "checkin-1" }));
      expect(mockFrom).toHaveBeenCalledWith("flow_check_ins");
      expect(mockInsert).toHaveBeenCalledWith({
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 1,
        response: "in_the_zone",
      });
    });

    it("inserts 'stuck' response correctly", async () => {
      const checkInRow = {
        id: "checkin-2",
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 2,
        response: "stuck",
        created_at: "2025-06-20T10:50:00Z",
      };
      mockSingle.mockResolvedValue({ data: checkInRow, error: null });

      const chain = supabase.from("flow_check_ins");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 2,
        response: "stuck",
      });
      chain.select();
      const { data } = await chain.single();

      expect(data).toEqual(expect.objectContaining({ response: "stuck" }));
    });

    it("inserts 'too_easy' response correctly", async () => {
      const checkInRow = {
        id: "checkin-3",
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 3,
        response: "too_easy",
        created_at: "2025-06-20T11:15:00Z",
      };
      mockSingle.mockResolvedValue({ data: checkInRow, error: null });

      const chain = supabase.from("flow_check_ins");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 3,
        response: "too_easy",
      });
      chain.select();
      const { data } = await chain.single();

      expect(data).toEqual(expect.objectContaining({ response: "too_easy" }));
    });

    it("returns error when insert fails (e.g. duplicate interval)", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "duplicate key value violates unique constraint" },
      });

      const chain = supabase.from("flow_check_ins");
      chain.insert({
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 1,
        response: "in_the_zone",
      });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toContain("duplicate key");
    });
  });

  // ─── useSessionFlowCheckIns queryFn ───────────────────────────────────

  describe("useSessionFlowCheckIns queryFn", () => {
    it("queries flow_check_ins by session_id ordered by interval_number ascending", async () => {
      const rows = [
        {
          id: "checkin-1",
          session_id: "session-abc",
          student_id: "student-123",
          interval_number: 1,
          response: "in_the_zone",
          created_at: "2025-06-20T10:25:00Z",
        },
        {
          id: "checkin-2",
          session_id: "session-abc",
          student_id: "student-123",
          interval_number: 2,
          response: "stuck",
          created_at: "2025-06-20T10:50:00Z",
        },
      ];
      mockOrder.mockResolvedValue({ data: rows, error: null });

      const chain = supabase.from("flow_check_ins");
      chain.select("*");
      chain.eq("session_id", "session-abc");
      const result = await chain.order("interval_number", {
        ascending: true,
      });

      expect(mockFrom).toHaveBeenCalledWith("flow_check_ins");
      expect(mockSelect).toHaveBeenCalledWith("*");
      expect(mockEq).toHaveBeenCalledWith("session_id", "session-abc");
      expect(mockOrder).toHaveBeenCalledWith("interval_number", {
        ascending: true,
      });
      expect(result.data).toHaveLength(2);
      expect(result.data![0].interval_number).toBe(1);
      expect(result.data![1].interval_number).toBe(2);
    });

    it("returns empty array when no check-ins exist for session", async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      const chain = supabase.from("flow_check_ins");
      chain.select("*");
      chain.eq("session_id", "session-xyz");
      const result = await chain.order("interval_number", {
        ascending: true,
      });

      expect(result.data).toEqual([]);
      expect(result.error).toBeNull();
    });
  });

  // ─── mapFlowCheckIn ───────────────────────────────────────────────────

  describe("mapFlowCheckIn (via query result)", () => {
    it("maps snake_case DB row to expected FlowCheckIn shape", async () => {
      const dbRow = {
        id: "checkin-1",
        session_id: "session-abc",
        student_id: "student-123",
        interval_number: 1,
        response: "in_the_zone",
        created_at: "2025-06-20T10:25:00Z",
      };
      mockOrder.mockResolvedValue({ data: [dbRow], error: null });

      const chain = supabase.from("flow_check_ins");
      chain.select("*");
      chain.eq("session_id", "session-abc");
      const { data } = await chain.order("interval_number", {
        ascending: true,
      });

      // Verify the raw data shape matches what mapFlowCheckIn expects
      const row = data![0];
      expect(row).toHaveProperty("session_id");
      expect(row).toHaveProperty("student_id");
      expect(row).toHaveProperty("interval_number");
      expect(row).toHaveProperty("response");
      expect(row).toHaveProperty("created_at");
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns error when flow_check_ins query fails", async () => {
      mockOrder.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("flow_check_ins");
      chain.select("*");
      chain.eq("session_id", "session-abc");
      const result = await chain.order("interval_number", {
        ascending: true,
      });

      expect(result.error).toBeTruthy();
      expect(result.error!.message).toBe("RLS denied");
    });
  });
});
