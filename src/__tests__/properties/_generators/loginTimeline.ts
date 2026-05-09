// Feature: pre-deployment-e2e-audit
// Shared generator for login timelines used by Property 10 (streak state
// machine). A timeline is an ordered list of calendar-day login events
// with optional freeze applications.

import fc from "fast-check";

export interface LoginDay {
  /** Days since day zero, 0-indexed. */
  readonly dayIndex: number;
  /** Whether the user logged in on that day. */
  readonly loggedIn: boolean;
  /** Whether a streak freeze was applied on that day (only meaningful when loggedIn=false). */
  readonly freezeApplied: boolean;
}

/**
 * Generates a login timeline spanning 2..60 calendar days. Each day gets
 * an independent login boolean. Freeze applications only matter on skipped
 * days so we generate the freeze flag independently and let the reducer
 * decide whether to consume it.
 */
export const arbitraryLoginTimeline = (): fc.Arbitrary<
  ReadonlyArray<LoginDay>
> =>
  fc
    .integer({ min: 2, max: 60 })
    .chain((span) =>
      fc.array(
        fc.record<Omit<LoginDay, "dayIndex">>({
          loggedIn: fc.boolean(),
          freezeApplied: fc.boolean(),
        }),
        { minLength: span, maxLength: span }
      )
    )
    .map((days) =>
      days.map((day, dayIndex) => ({
        dayIndex,
        loggedIn: day.loggedIn,
        freezeApplied: day.freezeApplied,
      }))
    );

/** Convert a dayIndex offset to a YYYY-MM-DD string anchored at a base date. */
export const dateStringFor = (
  dayIndex: number,
  baseISO: string = "2026-01-01"
): string => {
  const base = new Date(`${baseISO}T00:00:00Z`);
  const target = new Date(base.getTime() + dayIndex * 86_400_000);
  return target.toISOString().slice(0, 10);
};
