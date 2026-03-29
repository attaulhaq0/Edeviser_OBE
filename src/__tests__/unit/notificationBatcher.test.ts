// =============================================================================
// NotificationBatcher — Unit tests
// Validates: Requirements 65.1, 65.2, 65.3
// =============================================================================

import { describe, it, expect } from 'vitest';
import {
  countInWindow,
  shouldBatch,
  hasReachedDailyLimit,
  canCreatePeerMilestone,
  groupNotifications,
  createBatchedPeerMilestonePayload,
  PEER_MILESTONE_BATCH_WINDOW_MS,
  PEER_MILESTONE_DAILY_LIMIT,
  GROUPING_THRESHOLD,
  type NotificationRecord,
} from '@/lib/notificationBatcher';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeNotification(
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord {
  return {
    id: crypto.randomUUID(),
    user_id: 'student-1',
    type: 'peer_milestone',
    title: 'Classmate Leveled Up',
    body: 'Alice hit Level 5!',
    is_read: false,
    metadata: null,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

function makeNotifications(
  count: number,
  overrides: Partial<NotificationRecord> = {},
): NotificationRecord[] {
  return Array.from({ length: count }, () => makeNotification(overrides));
}

// ─── countInWindow ───────────────────────────────────────────────────────────

describe('countInWindow', () => {
  it('counts notifications within the time window', () => {
    const now = new Date();
    const notifications = [
      makeNotification({ created_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString() }),
      makeNotification({ created_at: new Date(now.getTime() - 90 * 60 * 1000).toISOString() }),
    ];

    const count = countInWindow(
      notifications,
      'student-1',
      'peer_milestone',
      PEER_MILESTONE_BATCH_WINDOW_MS,
      now,
    );
    expect(count).toBe(1);
  });

  it('returns 0 for empty notifications', () => {
    expect(countInWindow([], 'student-1', 'peer_milestone', PEER_MILESTONE_BATCH_WINDOW_MS)).toBe(0);
  });

  it('filters by student ID', () => {
    const now = new Date();
    const notifications = [
      makeNotification({ user_id: 'student-1', created_at: now.toISOString() }),
      makeNotification({ user_id: 'student-2', created_at: now.toISOString() }),
    ];

    expect(
      countInWindow(notifications, 'student-1', 'peer_milestone', PEER_MILESTONE_BATCH_WINDOW_MS, now),
    ).toBe(1);
  });

  it('filters by notification type', () => {
    const now = new Date();
    const notifications = [
      makeNotification({ type: 'peer_milestone', created_at: now.toISOString() }),
      makeNotification({ type: 'grade_released', created_at: now.toISOString() }),
    ];

    expect(
      countInWindow(notifications, 'student-1', 'peer_milestone', PEER_MILESTONE_BATCH_WINDOW_MS, now),
    ).toBe(1);
  });
});

// ─── shouldBatch ─────────────────────────────────────────────────────────────

describe('shouldBatch', () => {
  it('returns true when peer milestone notifications exist in window', () => {
    const now = new Date();
    const notifications = [
      makeNotification({ created_at: new Date(now.getTime() - 10 * 60 * 1000).toISOString() }),
    ];

    expect(shouldBatch(notifications, 'student-1', 'peer_milestone', PEER_MILESTONE_BATCH_WINDOW_MS, now)).toBe(true);
  });

  it('returns false when no notifications exist in window', () => {
    expect(shouldBatch([], 'student-1', 'peer_milestone')).toBe(false);
  });

  it('returns false for non-peer_milestone types', () => {
    const notifications = [makeNotification({ type: 'grade_released' })];
    expect(shouldBatch(notifications, 'student-1', 'grade_released')).toBe(false);
  });
});

// ─── hasReachedDailyLimit ────────────────────────────────────────────────────

describe('hasReachedDailyLimit', () => {
  it('returns false when under the limit', () => {
    const notifications = makeNotifications(PEER_MILESTONE_DAILY_LIMIT - 1);
    expect(hasReachedDailyLimit(notifications, 'student-1')).toBe(false);
  });

  it('returns true when at the limit', () => {
    const notifications = makeNotifications(PEER_MILESTONE_DAILY_LIMIT);
    expect(hasReachedDailyLimit(notifications, 'student-1')).toBe(true);
  });

  it('returns true when over the limit', () => {
    const notifications = makeNotifications(PEER_MILESTONE_DAILY_LIMIT + 2);
    expect(hasReachedDailyLimit(notifications, 'student-1')).toBe(true);
  });

  it('ignores notifications older than 24 hours', () => {
    const now = new Date();
    const oldNotifications = makeNotifications(PEER_MILESTONE_DAILY_LIMIT, {
      created_at: new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString(),
    });
    expect(hasReachedDailyLimit(oldNotifications, 'student-1', now)).toBe(false);
  });
});

// ─── canCreatePeerMilestone ──────────────────────────────────────────────────

describe('canCreatePeerMilestone', () => {
  it('returns true when under the daily limit', () => {
    expect(canCreatePeerMilestone([], 'student-1')).toBe(true);
  });

  it('returns false when at the daily limit', () => {
    const notifications = makeNotifications(PEER_MILESTONE_DAILY_LIMIT);
    expect(canCreatePeerMilestone(notifications, 'student-1')).toBe(false);
  });
});

// ─── groupNotifications ──────────────────────────────────────────────────────

describe('groupNotifications', () => {
  it('groups notifications when count exceeds threshold', () => {
    const notifications = makeNotifications(GROUPING_THRESHOLD + 1, {
      type: 'grade_released',
      title: 'Grade Released',
    });

    const grouped = groupNotifications(notifications);
    expect(grouped).toHaveLength(1);
    const first = grouped[0]!;
    expect(first.is_grouped).toBe(true);
    expect(first.count).toBe(GROUPING_THRESHOLD + 1);
    expect(first.title).toContain(`${GROUPING_THRESHOLD + 1}`);
    expect(first.title).toContain('new grades released');
  });

  it('keeps individual notifications when at or below threshold', () => {
    const notifications = makeNotifications(GROUPING_THRESHOLD, {
      type: 'grade_released',
      title: 'Grade Released',
    });

    const grouped = groupNotifications(notifications);
    expect(grouped).toHaveLength(GROUPING_THRESHOLD);
    expect(grouped.every((g) => !g.is_grouped)).toBe(true);
  });

  it('groups different types independently', () => {
    const grades = makeNotifications(4, { type: 'grade_released', title: 'Grade' });
    const badges = makeNotifications(4, { type: 'badge_earned', title: 'Badge' });
    const assignments = makeNotifications(2, { type: 'new_assignment', title: 'Assignment' });

    const grouped = groupNotifications([...grades, ...badges, ...assignments]);

    const gradeGroup = grouped.find((g) => g.type === 'grade_released');
    const badgeGroup = grouped.find((g) => g.type === 'badge_earned');
    const assignmentItems = grouped.filter((g) => g.type === 'new_assignment');

    expect(gradeGroup?.is_grouped).toBe(true);
    expect(gradeGroup?.count).toBe(4);
    expect(badgeGroup?.is_grouped).toBe(true);
    expect(badgeGroup?.count).toBe(4);
    expect(assignmentItems).toHaveLength(2);
    expect(assignmentItems.every((a) => !a.is_grouped)).toBe(true);
  });

  it('returns empty array for empty input', () => {
    expect(groupNotifications([])).toEqual([]);
  });

  it('sorts grouped notifications by most recent item', () => {
    const now = new Date();
    const older = makeNotifications(4, {
      type: 'grade_released',
      created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
    });
    const newer = makeNotifications(4, {
      type: 'badge_earned',
      created_at: now.toISOString(),
    });

    const grouped = groupNotifications([...older, ...newer]);
    expect(grouped[0]!.type).toBe('badge_earned');
    expect(grouped[1]!.type).toBe('grade_released');
  });
});

// ─── createBatchedPeerMilestonePayload ───────────────────────────────────────

describe('createBatchedPeerMilestonePayload', () => {
  it('creates a single-milestone payload', () => {
    const payload = createBatchedPeerMilestonePayload('student-1', ['Alice hit Level 5!']);

    expect(payload.user_id).toBe('student-1');
    expect(payload.type).toBe('peer_milestone');
    expect(payload.title).toBe('Classmate Milestone');
    expect(payload.body).toBe('Alice hit Level 5!');
    expect(payload.is_read).toBe(false);
    expect(payload.metadata.is_batched).toBe(true);
    expect(payload.metadata.milestone_count).toBe(1);
  });

  it('creates a multi-milestone payload', () => {
    const descriptions = ['Alice hit Level 5!', 'Bob earned Speed Demon!', 'Carol hit Level 10!'];
    const payload = createBatchedPeerMilestonePayload('student-1', descriptions);

    expect(payload.title).toBe('3 Classmate Milestones');
    expect(payload.body).toBe('3 classmates achieved milestones recently!');
    expect(payload.metadata.milestone_count).toBe(3);
    expect(payload.metadata.descriptions).toEqual(descriptions);
  });
});
