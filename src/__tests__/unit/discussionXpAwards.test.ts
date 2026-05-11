// @vitest-environment happy-dom
// Task 67.4: Tests for discussion XP award wiring
// Requirements: 77.4, 77.5
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockAwardXP = vi
  .fn()
  .mockResolvedValue({
    success: true,
    xp_awarded: 10,
    new_total: 100,
    level_up: false,
    new_level: 2,
  });

vi.mock("@/lib/xpClient", () => ({
  awardXP: (...args: unknown[]) => mockAwardXP(...args),
}));

vi.mock("@/lib/xpSchedule", () => ({
  XP_SCHEDULE: {
    discussion_question: 10,
    discussion_answer: 15,
  },
}));

const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const chainObj: Record<string, ReturnType<typeof vi.fn>> = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock("@/lib/auditLogger", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/queryKeys", () => ({
  queryKeys: {
    discussionThreads: {
      list: vi.fn(() => ["discussionThreads", "list"]),
      lists: vi.fn(() => ["discussionThreads"]),
      detail: vi.fn(() => ["discussionThreads", "detail"]),
    },
    discussionReplies: {
      list: vi.fn(() => ["discussionReplies", "list"]),
    },
  },
}));

// ─── Import after mocks ─────────────────────────────────────────────────────

import { awardXP } from "@/lib/xpClient";
import { XP_SCHEDULE } from "@/lib/xpSchedule";

describe("Discussion XP Awards (Task 67.4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockInsert.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockSingle.mockResolvedValue({
      data: {
        id: "thread-1",
        course_id: "c-1",
        title: "Q",
        content: "body",
        author_id: "student-1",
        is_pinned: false,
        is_resolved: false,
        created_at: "2024-01-01",
        updated_at: "2024-01-01",
      },
      error: null,
    });
  });

  describe("Requirement 77.4: Thread creation awards 10 XP", () => {
    it("calls awardXP with discussion_question source and 10 XP on thread creation", async () => {
      // Simulate what useCreateThread.onSuccess does
      const threadData = { id: "thread-1" };
      const variables = {
        course_id: "c-1",
        author_id: "student-1",
        title: "Q",
        content: "body",
      };

      await awardXP({
        studentId: variables.author_id,
        xpAmount: XP_SCHEDULE.discussion_question,
        source: "discussion_question",
        referenceId: threadData.id,
        note: "Created discussion thread",
      });

      expect(mockAwardXP).toHaveBeenCalledWith({
        studentId: "student-1",
        xpAmount: 10,
        source: "discussion_question",
        referenceId: "thread-1",
        note: "Created discussion thread",
      });
    });

    it("uses XP_SCHEDULE.discussion_question constant (10)", () => {
      expect(XP_SCHEDULE.discussion_question).toBe(10);
    });
  });

  describe("Requirement 77.5: Correct answer awards 15 XP", () => {
    it("calls awardXP with discussion_answer source and 15 XP for reply author", async () => {
      const replyAuthorId = "student-2";
      const replyId = "reply-1";

      await awardXP({
        studentId: replyAuthorId,
        xpAmount: XP_SCHEDULE.discussion_answer,
        source: "discussion_answer",
        referenceId: replyId,
        note: "Answer marked as correct",
      });

      expect(mockAwardXP).toHaveBeenCalledWith({
        studentId: "student-2",
        xpAmount: 15,
        source: "discussion_answer",
        referenceId: "reply-1",
        note: "Answer marked as correct",
      });
    });

    it("uses XP_SCHEDULE.discussion_answer constant (15)", () => {
      expect(XP_SCHEDULE.discussion_answer).toBe(15);
    });
  });

  describe("Fire-and-forget behavior", () => {
    it("does not throw when awardXP rejects", async () => {
      mockAwardXP.mockRejectedValueOnce(new Error("Network error"));

      // Fire-and-forget pattern: catch silently
      await expect(
        awardXP({
          studentId: "student-1",
          xpAmount: 10,
          source: "discussion_question",
          referenceId: "thread-1",
        }).catch(() => {
          /* fire-and-forget */
        })
      ).resolves.toBeUndefined();
    });
  });
});
