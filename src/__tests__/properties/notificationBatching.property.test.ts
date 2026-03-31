// Feature: edeviser-platform, Property 43: Notification rate limiting
// Feature: edeviser-platform, Property 44: Notification batching correctness
// **Validates: Requirements 65.1, 65.2, 65.3**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  hasReachedDailyLimit,
  groupNotifications,
  countInWindow,
  PEER_MILESTONE_DAILY_LIMIT,
  GROUPING_THRESHOLD,
  type NotificationRecord,
} from '@/lib/notificationBatcher';

// ─── Arbitraries ────────────────────────────────────────────────────────────

const studentIdArb = fc.uuid();

const notificationTypeArb = fc.constantFrom(
  'grade_released',
  'new_assignment',
  'badge_earned',
  'streak_at_risk',
  'peer_milestone',
  'perfect_day_nudge',
);

// ─── Property 43: Notification rate limiting ────────────────────────────────

describe('Property 43 — Notification rate limiting', () => {
  it('P43a: peer milestone count in 24h window never exceeds daily limit when enforced', () => {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const refTime = new Date('2025-06-15T12:00:00Z');

    fc.assert(
      fc.property(
        studentIdArb,
        fc.integer({ min: 0, max: 10 }),
        (studentId, count) => {
          // Generate `count` peer milestone notifications within 24h
          const notifications: NotificationRecord[] = [];
          for (let i = 0; i < count; i++) {
            notifications.push({
              id: `notif-${i}`,
              user_id: studentId,
              type: 'peer_milestone',
              title: `Milestone ${i}`,
              body: null,
              is_read: false,
              metadata: null,
              created_at: new Date(refTime.getTime() - i * 60_000).toISOString(),
            });
          }

          const inWindow = countInWindow(notifications, studentId, 'peer_milestone', TWENTY_FOUR_HOURS, refTime);
          expect(inWindow).toBe(count);

          // hasReachedDailyLimit should be true when count >= 5
          const limitReached = hasReachedDailyLimit(notifications, studentId, refTime);
          if (count >= PEER_MILESTONE_DAILY_LIMIT) {
            expect(limitReached).toBe(true);
          } else {
            expect(limitReached).toBe(false);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P43b: notifications outside 24h window do not count toward daily limit', () => {
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    const refTime = new Date('2025-06-15T12:00:00Z');

    fc.assert(
      fc.property(
        studentIdArb,
        fc.integer({ min: 1, max: 20 }),
        (studentId, count) => {
          // All notifications are >24h old
          const notifications: NotificationRecord[] = [];
          for (let i = 0; i < count; i++) {
            notifications.push({
              id: `old-${i}`,
              user_id: studentId,
              type: 'peer_milestone',
              title: `Old milestone ${i}`,
              body: null,
              is_read: false,
              metadata: null,
              created_at: new Date(refTime.getTime() - TWENTY_FOUR_HOURS - (i + 1) * 60_000).toISOString(),
            });
          }

          const inWindow = countInWindow(notifications, studentId, 'peer_milestone', TWENTY_FOUR_HOURS, refTime);
          expect(inWindow).toBe(0);
          expect(hasReachedDailyLimit(notifications, studentId, refTime)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 44: Notification batching correctness ─────────────────────────

describe('Property 44 — Notification batching correctness', () => {
  it('P44a: >3 notifications of same type are grouped into a single batched notification', () => {
    fc.assert(
      fc.property(
        notificationTypeArb,
        fc.integer({ min: GROUPING_THRESHOLD + 1, max: 20 }),
        (type, count) => {
          const notifications: NotificationRecord[] = [];
          for (let i = 0; i < count; i++) {
            notifications.push({
              id: `n-${i}`,
              user_id: 'student-1',
              type,
              title: `Notification ${i}`,
              body: `Body ${i}`,
              is_read: false,
              metadata: null,
              created_at: new Date(Date.now() - i * 1000).toISOString(),
            });
          }

          const grouped = groupNotifications(notifications);

          // Should produce exactly 1 grouped entry for this type
          const typeEntries = grouped.filter((g) => g.type === type);
          expect(typeEntries).toHaveLength(1);
          expect(typeEntries[0]!.is_grouped).toBe(true);
          expect(typeEntries[0]!.count).toBe(count);
          // All original items should be preserved
          expect(typeEntries[0]!.items).toHaveLength(count);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P44b: <=3 notifications of same type are NOT grouped (individual entries)', () => {
    fc.assert(
      fc.property(
        notificationTypeArb,
        fc.integer({ min: 1, max: GROUPING_THRESHOLD }),
        (type, count) => {
          const notifications: NotificationRecord[] = [];
          for (let i = 0; i < count; i++) {
            notifications.push({
              id: `n-${i}`,
              user_id: 'student-1',
              type,
              title: `Notification ${i}`,
              body: `Body ${i}`,
              is_read: false,
              metadata: null,
              created_at: new Date(Date.now() - i * 1000).toISOString(),
            });
          }

          const grouped = groupNotifications(notifications);
          const typeEntries = grouped.filter((g) => g.type === type);

          // Each notification should be its own entry
          expect(typeEntries).toHaveLength(count);
          for (const entry of typeEntries) {
            expect(entry.is_grouped).toBe(false);
            expect(entry.count).toBe(1);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P44c: total notification count is preserved after grouping', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            user_id: fc.constant('student-1'),
            type: notificationTypeArb,
            title: fc.string({ minLength: 1, maxLength: 30 }),
            body: fc.string({ minLength: 0, maxLength: 50 }),
            is_read: fc.boolean(),
            metadata: fc.constant(null),
            created_at: fc.integer({ min: 0, max: 364 }).map((offset) => new Date(Date.UTC(2025, 0, 1 + offset)).toISOString()),
          }),
          { minLength: 0, maxLength: 30 },
        ),
        (notifications) => {
          const grouped = groupNotifications(notifications as NotificationRecord[]);
          const totalItems = grouped.reduce((sum, g) => sum + g.items.length, 0);
          expect(totalItems).toBe(notifications.length);
        },
      ),
      { numRuns: 100 },
    );
  });
});
