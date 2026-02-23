import { isPast, addHours, formatDistanceToNow } from 'date-fns';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeadlineStatus {
  window: 'open' | 'late_window' | 'closed';
  isLate: boolean;
  canSubmit: boolean;
  dueDate: Date;
  lateDeadline: Date;
  timeRemaining: string;
}

// ─── getDeadlineStatus ──────────────────────────────────────────────────────

/**
 * Pure function that computes the current deadline status for an assignment.
 *
 * - `open`: before due date → canSubmit true, isLate false
 * - `late_window`: after due date but before late deadline → canSubmit true, isLate true
 * - `closed`: after late deadline → canSubmit false, isLate false
 */
export function getDeadlineStatus(
  dueDate: string,
  lateWindowHours: number,
): DeadlineStatus {
  const due = new Date(dueDate);
  const lateDeadline = addHours(due, lateWindowHours);

  if (!isPast(due)) {
    return {
      window: 'open',
      isLate: false,
      canSubmit: true,
      dueDate: due,
      lateDeadline,
      timeRemaining: formatDistanceToNow(due, { addSuffix: true }),
    };
  }

  if (!isPast(lateDeadline)) {
    return {
      window: 'late_window',
      isLate: true,
      canSubmit: true,
      dueDate: due,
      lateDeadline,
      timeRemaining: formatDistanceToNow(lateDeadline, { addSuffix: true }),
    };
  }

  return {
    window: 'closed',
    isLate: false,
    canSubmit: false,
    dueDate: due,
    lateDeadline,
    timeRemaining: 'Closed',
  };
}
