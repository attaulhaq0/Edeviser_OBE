// Task 19.3: Current/next-class context for the student timetable (pure logic)
// Requirements: 12.4, 13.2, 21.3
//
// Given the student's section timetable slots and the current moment, decide
// whether a class is happening *now* or which class is *next*, and how much
// time remains until the relevant transition. Kept as a pure, side-effect-free
// module in `src/lib/` so it is unit-testable independently of the timetable
// view, the data hook, and the wall clock.

import type { TimetableSlot } from "@/hooks/useTimetable";

/** Minutes in a single day. */
const MINUTES_PER_DAY = 24 * 60;
/** Minutes in a full week — the modulus for week-wrapping arithmetic. */
const MINUTES_PER_WEEK = 7 * MINUTES_PER_DAY;

/**
 * Discriminated status of the timetable "now" context.
 * - `in_class`   — a slot is currently in progress.
 * - `upcoming`   — no slot is in progress, but at least one starts later.
 * - `none`       — there are no (parseable) slots to anchor a context to.
 */
export type TimetableNowStatus = "in_class" | "upcoming" | "none";

export interface TimetableNowContext {
  /** Which case applies right now. */
  status: TimetableNowStatus;
  /** The relevant slot (current class or next class); `null` when `none`. */
  slot: TimetableSlot | null;
  /**
   * Whole minutes until the relevant transition:
   * - for `in_class`: minutes until the current class ends,
   * - for `upcoming`: minutes until the next class starts (week-wrapping),
   * - for `none`: `null`.
   * Always a non-negative integer when present.
   */
  minutes: number | null;
}

export interface DurationParts {
  days: number;
  hours: number;
  minutes: number;
}

/**
 * Parse a `HH:MM` / `HH:MM:SS` time-of-day string into minutes since midnight.
 * Returns `null` for anything that is not a valid 24-hour time so callers can
 * skip malformed slots instead of producing nonsensical contexts.
 */
export function parseTimeToMinutes(
  time: string | null | undefined
): number | null {
  if (typeof time !== "string") return null;
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const mins = Number(match[2]);
  if (hours > 23 || mins > 59) return null;
  return hours * 60 + mins;
}

/**
 * Convert a `Date` to "minutes elapsed since the start of the week" using the
 * same 0=Sunday … 6=Saturday convention as `timetable_slots.day_of_week`.
 * Uses the local clock because timetable times are stored as local wall-clock
 * times for the section.
 */
function nowWeekMinute(now: Date): number {
  return (
    now.getDay() * MINUTES_PER_DAY + now.getHours() * 60 + now.getMinutes()
  );
}

interface ResolvedSlot {
  slot: TimetableSlot;
  startWeekMin: number;
  endWeekMin: number;
}

/**
 * Resolve a slot into absolute week-minute start/end bounds, discarding slots
 * with an unparseable day or time, or with a non-positive duration.
 */
function resolveSlot(slot: TimetableSlot): ResolvedSlot | null {
  const day = slot.day_of_week;
  if (!Number.isInteger(day) || day < 0 || day > 6) return null;
  const start = parseTimeToMinutes(slot.start_time);
  const end = parseTimeToMinutes(slot.end_time);
  if (start === null || end === null || end <= start) return null;
  const base = day * MINUTES_PER_DAY;
  return { slot, startWeekMin: base + start, endWeekMin: base + end };
}

/**
 * Compute the current-or-next class context for a set of timetable slots.
 *
 * Resolution rules:
 * 1. If a slot is in progress (`start <= now < end`), report `in_class` with
 *    the minutes remaining until it ends. When several overlap, the one ending
 *    soonest is chosen so the countdown reflects the nearest transition.
 * 2. Otherwise, report `upcoming` with the slot whose start is the smallest
 *    positive distance ahead of `now`, wrapping across the week boundary so a
 *    Friday-evening "now" can point at a Sunday-morning class.
 * 3. With no parseable slots, report `none`.
 *
 * The function is total and pure: identical inputs always yield identical
 * output, and `now` is injected for deterministic testing.
 */
export function computeTimetableNow(
  slots: readonly TimetableSlot[],
  now: Date
): TimetableNowContext {
  const resolved = slots
    .map(resolveSlot)
    .filter((r): r is ResolvedSlot => r !== null);

  if (resolved.length === 0) {
    return { status: "none", slot: null, minutes: null };
  }

  const nowMin = nowWeekMinute(now);

  // 1) In-progress slot, preferring the one that ends soonest.
  let current: ResolvedSlot | null = null;
  for (const r of resolved) {
    if (r.startWeekMin <= nowMin && nowMin < r.endWeekMin) {
      if (current === null || r.endWeekMin < current.endWeekMin) {
        current = r;
      }
    }
  }
  if (current !== null) {
    return {
      status: "in_class",
      slot: current.slot,
      minutes: current.endWeekMin - nowMin,
    };
  }

  // 2) Nearest upcoming slot, wrapping around the week.
  let next: ResolvedSlot | null = null;
  let bestDelta = Number.POSITIVE_INFINITY;
  for (const r of resolved) {
    const rawDelta = r.startWeekMin - nowMin;
    // Positive distance ahead; a slot starting "now" or earlier maps to its
    // occurrence next week via the modulus.
    const delta =
      ((rawDelta % MINUTES_PER_WEEK) + MINUTES_PER_WEEK) % MINUTES_PER_WEEK;
    const forwardDelta = delta === 0 ? MINUTES_PER_WEEK : delta;
    if (forwardDelta < bestDelta) {
      bestDelta = forwardDelta;
      next = r;
    }
  }

  if (next !== null) {
    return { status: "upcoming", slot: next.slot, minutes: bestDelta };
  }

  // Unreachable given resolved.length > 0, but keeps the function total.
  return { status: "none", slot: null, minutes: null };
}

/**
 * Break a non-negative minute count into `{ days, hours, minutes }`.
 * Negative or non-finite inputs collapse to all-zero so presentation never
 * shows a negative countdown.
 */
export function formatDurationParts(totalMinutes: number): DurationParts {
  if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) {
    return { days: 0, hours: 0, minutes: 0 };
  }
  const whole = Math.floor(totalMinutes);
  const days = Math.floor(whole / MINUTES_PER_DAY);
  const hours = Math.floor((whole % MINUTES_PER_DAY) / 60);
  const minutes = whole % 60;
  return { days, hours, minutes };
}
