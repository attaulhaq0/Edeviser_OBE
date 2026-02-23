// Feature: edeviser-platform, Property: Late submission deadline enforcement
// **Validates: Requirements 17.2, 17.3**

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { getDeadlineStatus } from '@/lib/submissionDeadline';
import { addHours } from 'date-fns';

// Constrained date generator that produces valid dates only
const validDate = fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
  .filter((d) => !isNaN(d.getTime()));

describe('getDeadlineStatus — property-based tests', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns consistent deadline status transitions for any due date and late window', () => {
    fc.assert(
      fc.property(
        validDate,
        fc.integer({ min: 1, max: 168 }),
        fc.integer({ min: -200, max: 200 }), // offset hours from due date to simulate "now"
        (dueDate, lateWindowHours, offsetHours) => {
          const now = addHours(dueDate, offsetHours);
          vi.useFakeTimers();
          vi.setSystemTime(now);

          const dueDateStr = dueDate.toISOString();
          const status = getDeadlineStatus(dueDateStr, lateWindowHours);
          const lateDeadline = addHours(dueDate, lateWindowHours);

          // isPast(date) returns true when Date.now() > date.getTime()
          // So: now <= due → open, due < now <= lateDeadline → late_window, now > lateDeadline → closed
          const nowMs = now.getTime();
          const dueMs = dueDate.getTime();
          const lateMs = lateDeadline.getTime();

          if (nowMs <= dueMs) {
            expect(status.window).toBe('open');
            expect(status.canSubmit).toBe(true);
            expect(status.isLate).toBe(false);
          } else if (nowMs <= lateMs) {
            expect(status.window).toBe('late_window');
            expect(status.canSubmit).toBe(true);
            expect(status.isLate).toBe(true);
          } else {
            expect(status.window).toBe('closed');
            expect(status.canSubmit).toBe(false);
            expect(status.isLate).toBe(false);
          }

          // Invariants that always hold
          expect(status.dueDate.getTime()).toBe(dueDate.getTime());
          expect(status.lateDeadline.getTime()).toBe(lateDeadline.getTime());
          expect(typeof status.timeRemaining).toBe('string');
          expect(status.timeRemaining.length).toBeGreaterThan(0);

          vi.useRealTimers();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('canSubmit is true if and only if window is open or late_window', () => {
    fc.assert(
      fc.property(
        validDate,
        fc.integer({ min: 1, max: 168 }),
        fc.integer({ min: -200, max: 200 }),
        (dueDate, lateWindowHours, offsetHours) => {
          const now = addHours(dueDate, offsetHours);
          vi.useFakeTimers();
          vi.setSystemTime(now);

          const status = getDeadlineStatus(dueDate.toISOString(), lateWindowHours);

          if (status.canSubmit) {
            expect(['open', 'late_window']).toContain(status.window);
          } else {
            expect(status.window).toBe('closed');
          }

          vi.useRealTimers();
        },
      ),
      { numRuns: 100 },
    );
  });

  it('isLate is true only when window is late_window', () => {
    fc.assert(
      fc.property(
        validDate,
        fc.integer({ min: 1, max: 168 }),
        fc.integer({ min: -200, max: 200 }),
        (dueDate, lateWindowHours, offsetHours) => {
          const now = addHours(dueDate, offsetHours);
          vi.useFakeTimers();
          vi.setSystemTime(now);

          const status = getDeadlineStatus(dueDate.toISOString(), lateWindowHours);

          if (status.isLate) {
            expect(status.window).toBe('late_window');
          }
          if (status.window === 'late_window') {
            expect(status.isLate).toBe(true);
          }

          vi.useRealTimers();
        },
      ),
      { numRuns: 100 },
    );
  });
});
