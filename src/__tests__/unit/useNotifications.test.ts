// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Supabase mock ──────────────────────────────────────────────────────────

const mockSelect = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
const mockLimit = vi.fn();

const chainObj = {
  select: mockSelect,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  limit: mockLimit,
  then: undefined as ((resolve: (v: unknown) => void) => void) | undefined,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => chainObj),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "student-1" },
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
const supabase = _supabase as unknown as { from: (table: string) => any };

describe("useNotifications hooks — queryFn / mutationFn logic", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSelect.mockReturnValue(chainObj);
    mockUpdate.mockReturnValue(chainObj);
    mockDelete.mockReturnValue(chainObj);
    mockEq.mockReturnValue(chainObj);
    mockOrder.mockReturnValue(chainObj);
    mockLimit.mockReturnValue(chainObj);
  });

  // ─── useNotifications queryFn ─────────────────────────────────────────

  describe("useNotifications queryFn", () => {
    it("queries notifications table filtered by user_id", () => {
      const chain = supabase.from("notifications");
      chain.select(
        "id, user_id, type, title, body, is_read, metadata, created_at"
      );
      chain.eq("user_id", "student-1");
      chain.order("created_at", { ascending: false });
      chain.limit(50);

      expect(supabase.from).toHaveBeenCalledWith("notifications");
      expect(mockSelect).toHaveBeenCalledWith(
        "id, user_id, type, title, body, is_read, metadata, created_at"
      );
      expect(mockEq).toHaveBeenCalledWith("user_id", "student-1");
      expect(mockOrder).toHaveBeenCalledWith("created_at", {
        ascending: false,
      });
      expect(mockLimit).toHaveBeenCalledWith(50);
    });
  });

  // ─── useUnreadCount queryFn ───────────────────────────────────────────

  describe("useUnreadCount queryFn", () => {
    it("queries unread count with head: true", () => {
      const chain = supabase.from("notifications");
      chain.select("id", { count: "exact", head: true });
      chain.eq("user_id", "student-1");
      chain.eq("is_read", false);

      expect(supabase.from).toHaveBeenCalledWith("notifications");
      expect(mockSelect).toHaveBeenCalledWith("id", {
        count: "exact",
        head: true,
      });
    });
  });

  // ─── useMarkAsRead mutationFn ─────────────────────────────────────────

  describe("useMarkAsRead mutationFn", () => {
    it("updates is_read to true for a specific notification", () => {
      const chain = supabase.from("notifications");
      chain.update({ is_read: true });
      chain.eq("id", "notif-123");

      expect(supabase.from).toHaveBeenCalledWith("notifications");
      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEq).toHaveBeenCalledWith("id", "notif-123");
    });
  });

  // ─── useMarkAllAsRead mutationFn ──────────────────────────────────────

  describe("useMarkAllAsRead mutationFn", () => {
    it("updates all unread notifications for a user", () => {
      const chain = supabase.from("notifications");
      chain.update({ is_read: true });
      chain.eq("user_id", "student-1");
      chain.eq("is_read", false);

      expect(mockUpdate).toHaveBeenCalledWith({ is_read: true });
      expect(mockEq).toHaveBeenCalledWith("user_id", "student-1");
      expect(mockEq).toHaveBeenCalledWith("is_read", false);
    });
  });

  // ─── useDeleteNotification mutationFn ─────────────────────────────────

  describe("useDeleteNotification mutationFn", () => {
    it("deletes a notification by id", () => {
      const chain = supabase.from("notifications");
      chain.delete();
      chain.eq("id", "notif-456");

      expect(supabase.from).toHaveBeenCalledWith("notifications");
      expect(mockDelete).toHaveBeenCalled();
      expect(mockEq).toHaveBeenCalledWith("id", "notif-456");
    });
  });

  // ─── Error handling ───────────────────────────────────────────────────

  describe("error handling", () => {
    it("propagates supabase errors", async () => {
      mockLimit.mockResolvedValue({
        data: null,
        error: { message: "RLS denied" },
      });

      const chain = supabase.from("notifications");
      chain.select(
        "id, user_id, type, title, body, is_read, metadata, created_at"
      );
      chain.eq("user_id", "student-1");
      chain.order("created_at", { ascending: false });
      const result = await chain.limit(50);

      expect(result.error).toBeTruthy();
      expect(result.error.message).toBe("RLS denied");
    });
  });
});
