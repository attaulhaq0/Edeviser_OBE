// Task 23.3: Read-only calendar deadline view — consistent, deduplicated deadlines
// Requirements: 21.1, 21.2, 21.4
//
// The Calendar is one of four overlapping time-management surfaces (Planner,
// Today, Calendar, Timetable). It is a read-only, deadline-focused view that
// must present a deadline the *same* way it appears elsewhere (R21.4): a single
// logical deadline must never be listed twice, even when it is surfaced from
// more than one source (e.g. an assignment and a quiz sharing a title/day, or
// the same item arriving from two queries).
//
// This module keeps the dedup logic pure and side-effect-free in `src/lib/` so
// it is unit-testable independently of the data hook and the calendar view.

/**
 * Minimal shape required to deduplicate a deadline. `CalendarEvent` from
 * `useCalendar` is structurally compatible with this interface.
 */
export interface DeduplicableDeadline {
  /** Stable source identifier, used only as a fallback key. */
  id: string;
  /** Human-readable deadline title. */
  title?: string | null;
  /** ISO date or date-time string (`yyyy-mm-dd` or `yyyy-mm-ddTHH:MM:SS...`). */
  date?: string | null;
  /** Owning course, when known — distinguishes same-titled deadlines. */
  course_id?: string | null;
}

/**
 * Reduce a date or date-time string to its calendar-day portion (`yyyy-mm-dd`).
 * A deadline that falls on a given day is "the same deadline" regardless of the
 * exact time-of-day a particular source records, so the day is the unit of
 * identity. Non-string input collapses to an empty string.
 */
export function normalizeDeadlineDay(date: string | null | undefined): string {
  if (typeof date !== "string") return "";
  const trimmed = date.trim();
  if (trimmed === "") return "";
  // Split on the ISO date/time separator; fall back to the whole string.
  const [dayPart] = trimmed.split("T");
  return dayPart ?? trimmed;
}

/**
 * Normalize a deadline title for comparison: trimmed, lower-cased, and with
 * internal whitespace collapsed, so cosmetic differences ("Essay  1" vs
 * "Essay 1") do not defeat deduplication. Non-string input collapses to "".
 */
export function normalizeDeadlineTitle(
  title: string | null | undefined
): string {
  if (typeof title !== "string") return "";
  return title.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Compute the canonical identity of a deadline. Two deadlines that share a
 * calendar day, course, and normalized title are treated as the same logical
 * deadline (R21.4) — this is what keeps the calendar consistent with the other
 * surfaces. When a deadline carries neither a day nor a title to anchor on, it
 * falls back to its source `id` so genuinely distinct-but-empty entries are not
 * incorrectly merged.
 */
export function deadlineIdentityKey(event: DeduplicableDeadline): string {
  const day = normalizeDeadlineDay(event.date);
  const title = normalizeDeadlineTitle(event.title);
  if (day === "" && title === "") {
    return `id:${event.id}`;
  }
  const course = event.course_id ?? "";
  return `${day}|${course}|${title}`;
}

/**
 * Deduplicate a list of deadlines by their canonical identity, preserving input
 * order with first-occurrence-wins semantics. The function is pure and total:
 * identical input always yields identical output, the result is a subset of the
 * input, and applying it twice yields the same list (idempotent).
 */
export function dedupeCalendarEvents<T extends DeduplicableDeadline>(
  events: readonly T[]
): T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const event of events) {
    const key = deadlineIdentityKey(event);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(event);
  }
  return result;
}
