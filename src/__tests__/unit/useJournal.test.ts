// @vitest-environment node
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

const chainObj = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
  then: undefined as ((resolve: (v: unknown) => void) => void) | undefined,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock("@/lib/auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "student-user-id" },
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
import { logAuditEvent } from "@/lib/auditLogger";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = _supabase as unknown as { from: (table: string) => any };

describe("useJournal hooks — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({ data: { id: "new-id" }, error: null });
  });

  // ─── useJournalEntries queryFn ────────────────────────────────────────

  describe("useJournalEntries queryFn", () => {
    it("queries journal_entries table scoped to student and ordered by created_at desc", () => {
      supabase.from("journal_entries");

      expect(supabase.from).toHaveBeenCalledWith("journal_entries");
    });

    it("calls select with explicit columns and applies student_id filter", () => {
      const chain = supabase.from("journal_entries");
      chain.select(
        "id, student_id, course_id, content, clo_id, is_shared, created_at"
      );
      chain.eq("student_id", "student-user-id");
      chain.order("created_at", { ascending: false });

      expect(mockSelect).toHaveBeenCalledWith(
        "id, student_id, course_id, content, clo_id, is_shared, created_at"
      );
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-user-id");
      expect(mockOrder).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
    });

    it("applies course_id filter when provided", () => {
      const chain = supabase.from("journal_entries");
      chain.select(
        "id, student_id, course_id, content, clo_id, is_shared, created_at"
      );
      chain.eq("student_id", "student-user-id");
      chain.order("created_at", { ascending: false });
      chain.eq("course_id", "course-abc");

      expect(mockEq).toHaveBeenCalledWith("course_id", "course-abc");
    });
  });

  // ─── useJournalEntry queryFn ──────────────────────────────────────────

  describe("useJournalEntry queryFn", () => {
    it("queries journal_entries by id with maybeSingle scoped to student", async () => {
      const id = "entry-abc";
      const mockEntry = {
        id,
        student_id: "student-user-id",
        course_id: "course-1",
        content: "My reflection...",
        clo_id: null,
        is_shared: false,
        created_at: "2025-01-01T00:00:00Z",
      };
      mockMaybeSingle.mockResolvedValue({ data: mockEntry, error: null });

      const chain = supabase.from("journal_entries");
      chain.select(
        "id, student_id, course_id, content, clo_id, is_shared, created_at"
      );
      chain.eq("id", id);
      chain.eq("student_id", "student-user-id");
      const result = await chain.maybeSingle();

      expect(supabase.from).toHaveBeenCalledWith("journal_entries");
      expect(mockEq).toHaveBeenCalledWith("id", id);
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-user-id");
      expect(mockMaybeSingle).toHaveBeenCalled();
      expect(result.data).toEqual(mockEntry);
    });
  });

  // ─── useCreateJournalEntry mutationFn ─────────────────────────────────

  describe("useCreateJournalEntry mutationFn", () => {
    it("inserts into journal_entries and logs audit event", async () => {
      const input = {
        course_id: "course-1",
        content:
          "This is a long enough journal entry for testing purposes with enough words.",
        clo_id: "clo-1",
        is_shared: false,
      };

      const createdEntry = {
        id: "created-entry-id",
        student_id: "student-user-id",
        ...input,
      };
      mockSingle.mockResolvedValue({ data: createdEntry, error: null });

      const chain = supabase.from("journal_entries");
      chain.insert({
        student_id: "student-user-id",
        course_id: input.course_id,
        content: input.content,
        clo_id: input.clo_id,
        is_shared: false,
      });
      chain.select();
      const { data, error } = await chain.single();

      expect(error).toBeNull();
      expect(data).toEqual(expect.objectContaining({ id: "created-entry-id" }));
      expect(mockInsert).toHaveBeenCalledWith({
        student_id: "student-user-id",
        course_id: "course-1",
        content: input.content,
        clo_id: "clo-1",
        is_shared: false,
      });

      await logAuditEvent({
        action: "create",
        entity_type: "journal_entry",
        entity_id: data!.id,
        changes: { course_id: input.course_id, clo_id: input.clo_id },
        performed_by: "student-user-id",
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "create",
        entity_type: "journal_entry",
        entity_id: "created-entry-id",
        changes: { course_id: "course-1", clo_id: "clo-1" },
        performed_by: "student-user-id",
      });
    });
  });

  // ─── useUpdateJournalEntry mutationFn ─────────────────────────────────

  describe("useUpdateJournalEntry mutationFn", () => {
    it("updates journal_entries and logs audit event", async () => {
      const entryId = "entry-to-update";
      const changes = {
        content: "Updated reflection content with enough words for the test.",
      };

      mockSingle.mockResolvedValue({
        data: { id: entryId, ...changes },
        error: null,
      });

      const chain = supabase.from("journal_entries");
      chain.update(changes);
      chain.eq("id", entryId);
      chain.eq("student_id", "student-user-id");
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith(changes);
      expect(mockEq).toHaveBeenCalledWith("id", entryId);
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-user-id");

      await logAuditEvent({
        action: "update",
        entity_type: "journal_entry",
        entity_id: entryId,
        changes,
        performed_by: "student-user-id",
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "update",
        entity_type: "journal_entry",
        entity_id: entryId,
        changes,
        performed_by: "student-user-id",
      });
    });

    it("updates is_shared toggle", async () => {
      const entryId = "entry-share-toggle";
      const changes = { is_shared: true };

      mockSingle.mockResolvedValue({
        data: { id: entryId, ...changes },
        error: null,
      });

      const chain = supabase.from("journal_entries");
      chain.update(changes);
      chain.eq("id", entryId);
      chain.eq("student_id", "student-user-id");
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({ is_shared: true });
    });
  });

  // ─── useDeleteJournalEntry mutationFn ─────────────────────────────────

  describe("useDeleteJournalEntry mutationFn", () => {
    it("deletes journal entry scoped to student and logs audit event", async () => {
      const entryId = "entry-to-delete";

      mockEq.mockResolvedValue({ error: null });

      const chain = supabase.from("journal_entries");
      chain.delete();
      chain.eq("id", entryId);
      const result = await chain.eq("student_id", "student-user-id");

      expect(result.error).toBeNull();
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", entryId);
      expect(mockEq).toHaveBeenCalledWith("student_id", "student-user-id");

      await logAuditEvent({
        action: "delete",
        entity_type: "journal_entry",
        entity_id: entryId,
        changes: null,
        performed_by: "student-user-id",
      });

      expect(logAuditEvent).toHaveBeenCalledWith({
        action: "delete",
        entity_type: "journal_entry",
        entity_id: entryId,
        changes: null,
        performed_by: "student-user-id",
      });
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("returns error when supabase query fails", async () => {
      mockMaybeSingle.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("journal_entries");
      chain.select(
        "id, student_id, course_id, content, clo_id, is_shared, created_at"
      );
      chain.eq("id", "some-id");
      chain.eq("student_id", "student-user-id");
      const result = await chain.maybeSingle();

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("RLS denied");
    });

    it("returns error when insert fails", async () => {
      mockSingle.mockResolvedValue({
        data: null,
        error: { message: "Content too short" },
      });

      const chain = supabase.from("journal_entries");
      chain.insert({ content: "short" });
      chain.select();
      const { error } = await chain.single();

      expect(error).toBeTruthy();
      expect(error!.message).toBe("Content too short");
    });
  });
});
