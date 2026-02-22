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

import { supabase } from '@/lib/supabase';

describe('logActivity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInsert.mockResolvedValue({ error: null });
  });

  it('inserts into student_activity_log with correct fields', async () => {
    const entry: ActivityLogEntry = {
      student_id: 'student-123',
      event_type: 'login',
      metadata: { ip: '127.0.0.1' },
    };

    await logActivity(entry);

    expect(supabase.from).toHaveBeenCalledWith('student_activity_log');
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

  it('logs error to console on supabase failure without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockInsert.mockResolvedValue({ error: { message: 'RLS violation' } });

    const entry: ActivityLogEntry = {
      student_id: 'student-789',
      event_type: 'submission',
    };

    await expect(logActivity(entry)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ActivityLogger] Failed to log activity:',
      'RLS violation'
    );

    consoleSpy.mockRestore();
  });

  it('catches unexpected exceptions without throwing', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockInsert.mockRejectedValue(new Error('Network down'));

    const entry: ActivityLogEntry = {
      student_id: 'student-000',
      event_type: 'journal',
    };

    await expect(logActivity(entry)).resolves.toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      '[ActivityLogger] Unexpected error:',
      expect.any(Error)
    );

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
