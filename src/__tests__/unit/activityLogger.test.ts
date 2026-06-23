// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { logActivity, type ActivityLogEntry } from "@/lib/activityLogger";

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
    const entry: ActivityLogEntry = {
      student_id: "student-123",
      event_type: "login",
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
    const entry: ActivityLogEntry = {
      student_id: "student-456",
      event_type: "page_view",
    };

    await logActivity(entry);
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

    const entry: ActivityLogEntry = {
      student_id: "student-789",
      event_type: "submission",
    };

    await logActivity(entry);
    expect(offlineQueue.enqueue).toHaveBeenCalledWith("activity_log", entry);
  });

  it("queues to offlineQueue on unexpected exceptions", async () => {
    mockInsert.mockRejectedValue(new Error("Network down"));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    // Fill buffer to MAX_BUFFER_SIZE to trigger immediate flush
    for (let i = 0; i < 20; i++) {
      await logActivity({
        student_id: "student-000",
        event_type: "journal",
      });
    }

    // The flush should have failed and queued entries
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
      vi.clearAllMocks();
      mockInsert.mockResolvedValue({ error: null });

      await logActivity({ student_id: "student-1", event_type });

      // Trigger flush
      vi.advanceTimersByTime(30_000);
      await vi.runAllTimersAsync();

      expect(mockInsert).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ event_type })])
      );
    }
  });
});
