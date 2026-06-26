// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockInsert = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
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
      student_id: "student-123",
      event_type: "login" as const,
      metadata: { ip: "127.0.0.1" },
    };

    await logActivity(entry);

    // Not flushed immediately (buffered)
    expect(mockInsert).not.toHaveBeenCalled();

    // Advance timer to trigger flush
    vi.advanceTimersByTime(30_000);
    await vi.runAllTimersAsync();

    expect(mockInsert).toHaveBeenCalledWith([
      {
        student_id: "student-123",
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
        student_id: "student-456",
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
    expect(offlineQueue.enqueue).toHaveBeenCalledWith("activity_log", entry);
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
});
