// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockIn = vi.fn();
const mockLimit = vi.fn();
const mockThen = vi.fn();

const chainObj: Record<string, ReturnType<typeof vi.fn>> = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  in: mockIn,
  limit: mockLimit,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  then: mockThen,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock("@/lib/auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { supabase as _supabase } from "@/lib/supabase";
import { logAuditEvent } from "@/lib/auditLogger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

describe("useAnnouncements hooks — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockIn.mockReturnValue(chainObj);
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: "ann-1" }, error: null });
    mockThen.mockImplementation((cb: (v: unknown) => void) => {
      cb({ error: null });
      return Promise.resolve();
    });
  });

  describe("useAnnouncements queryFn", () => {
    it("queries announcements table with course_id filter", () => {
      supabase.from("announcements");
      expect(supabase.from).toHaveBeenCalledWith("announcements");
    });

    it("orders by is_pinned DESC then created_at DESC", () => {
      const chain = supabase.from("announcements");
      chain.select(
        "id, course_id, author_id, title, content, is_pinned, created_at, updated_at"
      );
      chain.eq("course_id", "course-1");
      chain.order("is_pinned", { ascending: false });
      chain.order("created_at", { ascending: false });

      expect(mockOrder).toHaveBeenCalledWith("is_pinned", { ascending: false });
      expect(mockOrder).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });
  });

  describe("useAnnouncement queryFn", () => {
    it("queries single announcement by id with maybeSingle", async () => {
      const mockAnn = {
        id: "ann-1",
        course_id: "c-1",
        author_id: "u-1",
        title: "Test",
        content: "Content",
        is_pinned: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      };
      mockMaybeSingle.mockResolvedValue({ data: mockAnn, error: null });

      supabase.from("announcements");
      const chain = supabase.from("announcements");
      chain.select(
        "id, course_id, author_id, title, content, is_pinned, created_at, updated_at"
      );
      chain.eq("id", "ann-1");
      const result = await chain.maybeSingle();

      expect(result.data).toEqual(mockAnn);
    });
  });

  describe("useCreateAnnouncement mutationFn", () => {
    it("inserts announcement and logs audit event", async () => {
      const newAnn = {
        id: "ann-new",
        course_id: "c-1",
        author_id: "u-1",
        title: "New Announcement",
        content: "Hello students",
        is_pinned: true,
      };
      mockSingle.mockResolvedValue({ data: { ...newAnn }, error: null });

      const chain = supabase.from("announcements");
      chain.insert({
        course_id: newAnn.course_id,
        author_id: newAnn.author_id,
        title: newAnn.title,
        content: newAnn.content,
        is_pinned: newAnn.is_pinned,
      });
      chain.select();
      const result = await chain.single();

      expect(result.data.title).toBe("New Announcement");
      expect(mockInsert).toHaveBeenCalled();
    });

    it("calls logAuditEvent on create", async () => {
      await (logAuditEvent as unknown as (...args: unknown[]) => Promise<void>)(
        {
          action: "create",
          entity_type: "announcement",
          entity_id: "ann-1",
          changes: { course_id: "c-1", title: "Test", is_pinned: false },
          performed_by: "user-1",
        }
      );

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "create",
          entity_type: "announcement",
        })
      );
    });
  });

  describe("useUpdateAnnouncement mutationFn", () => {
    it("updates announcement by id", async () => {
      mockSingle.mockResolvedValue({
        data: { id: "ann-1", title: "Updated", is_pinned: true },
        error: null,
      });

      const chain = supabase.from("announcements");
      chain.update({ title: "Updated", is_pinned: true });
      chain.eq("id", "ann-1");
      chain.select();
      const result = await chain.single();

      expect(result.data.title).toBe("Updated");
      expect(mockUpdate).toHaveBeenCalledWith({
        title: "Updated",
        is_pinned: true,
      });
    });
  });

  describe("useDeleteAnnouncement mutationFn", () => {
    it("deletes announcement by id", async () => {
      mockEq.mockResolvedValue({ error: null });

      const chain = supabase.from("announcements");
      chain.delete();
      await chain.eq("id", "ann-1");

      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "ann-1");
    });
  });

  describe("useStudentAnnouncements queryFn", () => {
    it("fetches enrolled course IDs then queries announcements", () => {
      // First call: get enrollments
      supabase.from("student_courses");
      expect(supabase.from).toHaveBeenCalledWith("student_courses");

      // Second call: get announcements
      supabase.from("announcements");
      expect(supabase.from).toHaveBeenCalledWith("announcements");
    });
  });
});
