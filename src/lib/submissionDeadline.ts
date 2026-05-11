import { isPast, addHours, formatDistanceToNow } from "date-fns";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface DeadlineStatus {
  window: "open" | "late_window" | "closed";
  isLate: boolean;
  canSubmit: boolean;
  dueDate: Date;
  lateDeadline: Date;
  timeRemaining: string;
  isExtended: boolean;
}

// ─── getDeadlineStatus ──────────────────────────────────────────────────────

/**
 * Pure function that computes the current deadline status for an assignment.
 *
 * - `open`: before due date → canSubmit true, isLate false
 * - `late_window`: after due date but before late deadline → canSubmit true, isLate true
 * - `closed`: after late deadline → canSubmit false, isLate false
 *
 * If an extendedDueDate is provided (from deadline_extensions table),
 * it replaces the original due date for the student.
 */
export function getDeadlineStatus(
  dueDate: string,
  lateWindowHours: number,
  extendedDueDate?: string | null
): DeadlineStatus {
  const isExtended = !!extendedDueDate;
  const effectiveDueDate = extendedDueDate ?? dueDate;
  const due = new Date(effectiveDueDate);
  const lateDeadline = addHours(due, lateWindowHours);

  if (!isPast(due)) {
    return {
      window: "open",
      isLate: false,
      canSubmit: true,
      dueDate: due,
      lateDeadline,
      timeRemaining: formatDistanceToNow(due, { addSuffix: true }),
      isExtended,
    };
  }

  if (!isPast(lateDeadline)) {
    return {
      window: "late_window",
      isLate: true,
      canSubmit: true,
      dueDate: due,
      lateDeadline,
      timeRemaining: formatDistanceToNow(lateDeadline, { addSuffix: true }),
      isExtended,
    };
  }

  return {
    window: "closed",
    isLate: false,
    canSubmit: false,
    dueDate: due,
    lateDeadline,
    timeRemaining: "Closed",
    isExtended,
  };
}
