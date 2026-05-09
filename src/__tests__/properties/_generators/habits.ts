// Feature: pre-deployment-e2e-audit
// Shared generator for daily-habit timelines used by Property 12
// (Perfect Day gating). Our perfectDayCheck is boolean-scoped rather than
// time-scoped, so the arbitrary generates the habit record directly.

import fc from "fast-check";

export interface DailyHabits {
  readonly login: boolean;
  readonly submit: boolean;
  readonly journal: boolean;
  readonly read: boolean;
}

export const arbitraryDailyHabits = (): fc.Arbitrary<DailyHabits> =>
  fc.record<DailyHabits>({
    login: fc.boolean(),
    submit: fc.boolean(),
    journal: fc.boolean(),
    read: fc.boolean(),
  });
