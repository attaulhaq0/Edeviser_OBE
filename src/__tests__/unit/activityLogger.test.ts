// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInsert = vi.fn();
const mockGetSession = vi.fn();
const SESSION_UID = "student-session-1";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
    auth: {
      getSession: mockGetSession,
    },
  },
}));

vi.mock("@/lib/offlineQueue", () => ({
  offlineQueue: {
    registerHandler: vi.fn(),
    enqueue: vi.fn(),
  },
}));

import { offlineQueue } from "@/lib/offlineQueue";

describe("logActivity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockInsert.mockResolvedValue({ error: null });
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: SESSION_UID } } },
    });
    // Simulate online
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("buffers entries and flushes as a batch after 30s", async () => {
    // Re-import to get a fresh module instance
    const { logActivity } = await import("@/lib/activityLogger");

    const entry = {
      student_id: "spoofed-id",
      event_type: "login" as const,
      metadata: { ip: "127.0.0.1" },
    };

    await logActivity(entry);

    // Not flushed immediately (buffered)
    expect(mockInsert).not.toHaveBeenCalled();

    // Advance timer to trigger flush
    vi.advanceTimersByTime(30_000);
    await vi.runAllTimersAsync();

    // RLS contract: student_id is ALWAYS re-attributed to the session user
    expect(mockInsert).toHaveBeenCalledWith([
      {
        student_id: SESSION_UID,
        event_type: "login",
        metadata: { ip: "127.0.0.1" },
      },
    ]);
  });

  it("defaults metadata to null when omitted", async () => {
    const { logActivity } = await import("@/lib/activityLogger");

    await logActivity({
      student_id: "student-456",
      event_type: "page_view" as const,
    });

    vi.advanceTimersByTime(30_000);
    await vi.runAllTimersAsync();

    expect(mockInsert).toHaveBeenCalledWith([
      {
        student_id: SESSION_UID,
        event_type: "page_view",
        metadata: null,
      },
    ]);
  });

  it("queues to offlineQueue when navigator is offline", async () => {
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: false },
      writable: true,
      configurable: true,
    });

    const { logActivity } = await import("@/lib/activityLogger");

    const entry = {
      student_id: "student-789",
      event_type: "submission" as const,
    };

    await logActivity(entry);
    expect(offlineQueue.enqueue).toHaveBeenCalledWith("activity_log", {
      ...entry,
      student_id: SESSION_UID,
    });
  });

  it("queues to offlineQueue on flush failure", async () => {
    vi.resetModules();
    // Simulate a Supabase error response (not a throw — the SDK returns {error})
    mockInsert.mockResolvedValue({ error: { message: "Network down" } });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const { logActivity } = await import("@/lib/activityLogger");

    // Fill buffer to MAX_BUFFER_SIZE (20) to trigger immediate flush
    for (let i = 0; i < 20; i++) {
      await logActivity({
        student_id: "student-000",
        event_type: "journal" as const,
      });
    }

    // The flush failure should have queued entries to offline queue
    expect(offlineQueue.enqueue).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it("handles all supported event types", async () => {
    const eventTypes = [
      "login",
      "page_view",
      "submission",
      "journal",
      "streak_break",
      "assignment_view",
    ] as const;

    for (const event_type of eventTypes) {
      // Reset module state by reimporting (each event type gets a clean buffer)
      vi.resetModules();
      vi.clearAllMocks();
      mockInsert.mockResolvedValue({ error: null });

      const { logActivity } = await import("@/lib/activityLogger");

      await logActivity({ student_id: "student-1", event_type });

      // Advance timer and resolve the async flush
      vi.advanceTimersByTime(30_000);
      await vi.runAllTimersAsync();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ event_type })])
      );
    }
  });

  it("drops entries when no session exists (fail-closed)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const { logActivity } = await import("@/lib/activityLogger");

    await logActivity({
      student_id: "whoever",
      event_type: "login" as const,
    });

    vi.advanceTimersByTime(30_000);
    await vi.runAllTimersAsync();

    expect(mockInsert).not.toHaveBeenCalled();
    expect(offlineQueue.enqueue).not.toHaveBeenCalled();
  });

  it("re-attributes offline-queue entries to the session user at flush time", async () => {
    // Re-execute the module so its top-level registerHandler call is recorded
    // again (clearAllMocks in beforeEach wipes prior calls).
    vi.resetModules();
    const { logActivity } = await import("@/lib/activityLogger");

    // Grab the handler registered on the offline queue at import time
    const registerHandler = vi.mocked(offlineQueue.registerHandler);
    const handlerCall = registerHandler.mock.calls.find(
      ([type]) => type === "activity_log"
    );
    expect(handlerCall).toBeDefined();
    const persistActivity = handlerCall![1] as (
      payload: unknown
    ) => Promise<void>;

    await logActivity({
      student_id: "spoofed-id",
      event_type: "journal" as const,
      metadata: { offline: true },
    });

    await persistActivity({
      student_id: "spoofed-id",
      event_type: "journal" as const,
      metadata: { offline: true },
    });

    expect(mockInsert).toHaveBeenCalledWith({
      student_id: SESSION_UID,
      event_type: "journal",
      metadata: { offline: true },
    });
  });

  it("drops offline-queue entries when no session exists at flush time", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    vi.resetModules();
    await import("@/lib/activityLogger");

    const registerHandler = vi.mocked(offlineQueue.registerHandler);
    const handlerCall = registerHandler.mock.calls.find(
      ([type]) => type === "activity_log"
    );
    const persistActivity = handlerCall![1] as (
      payload: unknown
    ) => Promise<void>;

    await expect(
      persistActivity({ student_id: "x", event_type: "login" as const })
    ).resolves.toBeUndefined();
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
