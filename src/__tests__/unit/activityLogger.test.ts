// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logActivity, type ActivityLogEntry } from '@/lib/activityLogger';

const mockInsert = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: mockInsert,
    })),
  },
}));

vi.mock('@/lib/offlineQueue', () => ({
  offlineQueue: {
    registerHandler: vi.fn(),
    enqueue: vi.fn(),
  },
}));

import { offlineQueue } from '@/lib/offlineQueue';

describe('logActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
    // Simulate online
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      writable: true,
      configurable: true,
    });
  });

  it('calls persistActivity which inserts into student_activity_log', async () => {
    const entry: ActivityLogEntry = {
      student_id: 'student-123',
      event_type: 'login',
      metadata: { ip: '127.0.0.1' },
    };

    await logActivity(entry);

    // persistActivity is called internally — it uses supabase.from().insert()
    expect(mockInsert).toHaveBeenCalledWith({
      student_id: 'student-123',
      event_type: 'login',
      metadata: { ip: '127.0.0.1' },
    });
  });

  it('defaults metadata to null when omitted', async () => {
    const entry: ActivityLogEntry = {
      student_id: 'student-456',
      event_type: 'page_view',
    };

    await logActivity(entry);

    expect(mockInsert).toHaveBeenCalledWith({
      student_id: 'student-456',
      event_type: 'page_view',
      metadata: null,
    });
  });

  it('queues to offlineQueue on supabase failure', async () => {
    mockInsert.mockResolvedValue({ error: { message: 'RLS violation' } });
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const entry: ActivityLogEntry = {
      student_id: 'student-789',
      event_type: 'submission',
    };

    await expect(logActivity(entry)).resolves.toBeUndefined();
    expect(offlineQueue.enqueue).toHaveBeenCalledWith('activity_log', entry);

    consoleSpy.mockRestore();
  });

  it('queues to offlineQueue on unexpected exceptions', async () => {
    mockInsert.mockRejectedValue(new Error('Network down'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const entry: ActivityLogEntry = {
      student_id: 'student-000',
      event_type: 'journal',
    };

    await expect(logActivity(entry)).resolves.toBeUndefined();
    expect(offlineQueue.enqueue).toHaveBeenCalledWith('activity_log', entry);

    consoleSpy.mockRestore();
  });

  it('handles all supported event types', async () => {
    const eventTypes = [
      'login', 'page_view', 'submission', 'journal',
      'streak_break', 'assignment_view',
    ] as const;

    for (const event_type of eventTypes) {
      vi.clearAllMocks();
      mockInsert.mockResolvedValue({ error: null });

      await logActivity({ student_id: 'student-1', event_type });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({ event_type })
      );
    }
  });
});
