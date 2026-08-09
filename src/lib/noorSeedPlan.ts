export const NOOR_INSTITUTION_ID =
  "4de6a0a2-758b-47f3-ab7e-984bb974d88b" as const;
export const NOOR_INSTITUTION_NAME = "Noor International School" as const;
export const NOOR_INSTITUTION_SLUG = "noor-international" as const;

export type NoorSeedOperation = "insert" | "update" | "unchanged" | "blocked";

export interface NoorSeedSnapshot {
  institution: { id: string; name: string; slug: string };
  counts: {
    currentCalendarEvents: number;
    upcomingReviewSchedules: number;
    parentReminders: number;
    recentActivity: number;
    notifications: number;
    todayHabitLogs: number;
    journalEntries: number;
    upcomingAssignments: number;
    invitations: number;
  };
}

export interface NoorSeedPlanEntry {
  table: string;
  entityId: string;
  operation: NoorSeedOperation;
  reason: string;
  values?: Readonly<Record<string, string | number | boolean>>;
}

export interface NoorSeedPlan {
  institutionId: typeof NOOR_INSTITUTION_ID;
  generatedAt: string;
  entries: readonly NoorSeedPlanEntry[];
  totals: Readonly<Record<NoorSeedOperation, number>>;
}

const DAY_MS = 24 * 60 * 60 * 1_000;

const atUtcHour = (now: Date, daysFromNow: number, hour: number): string => {
  const value = new Date(now.getTime() + daysFromNow * DAY_MS);
  value.setUTCHours(hour, 0, 0, 0);
  return value.toISOString();
};

const identityMatches = (snapshot: NoorSeedSnapshot): boolean =>
  snapshot.institution.id === NOOR_INSTITUTION_ID &&
  snapshot.institution.name === NOOR_INSTITUTION_NAME &&
  snapshot.institution.slug === NOOR_INSTITUTION_SLUG;

const unchanged = (
  table: string,
  entityId: string,
  reason: string
): NoorSeedPlanEntry => ({ table, entityId, operation: "unchanged", reason });

export const buildNoorSeedPlan = (
  snapshot: NoorSeedSnapshot,
  now: Date
): NoorSeedPlan => {
  if (!identityMatches(snapshot)) {
    throw new Error("Noor institution identity mismatch; seed plan aborted");
  }
  if (Number.isNaN(now.getTime())) {
    throw new Error("A valid planning timestamp is required");
  }

  const entries: NoorSeedPlanEntry[] = [];

  const calendarNeeded = Math.max(0, 4 - snapshot.counts.currentCalendarEvents);
  for (let index = 0; index < calendarNeeded; index += 1) {
    entries.push({
      table: "academic_calendar_events",
      entityId: `f1000000-0000-4000-8000-00000000000${index + 1}`,
      operation: "insert",
      reason:
        "Fill missing current/future calendar coverage with seed-owned data",
      values: {
        title:
          ["Noor Learning Showcase", "Parent Progress Forum", "CLO Review Day"][
            index
          ] ?? `Noor Current Event ${index + 1}`,
        start_date: atUtcHour(now, 7 + index * 7, 7),
        end_date: atUtcHour(now, 7 + index * 7, 9),
      },
    });
  }
  if (calendarNeeded === 0) {
    entries.push(
      unchanged(
        "academic_calendar_events",
        "current-calendar-coverage",
        "At least four current/future events already exist"
      )
    );
  }

  const reviewNeeded = Math.max(0, 3 - snapshot.counts.upcomingReviewSchedules);
  for (let index = 0; index < reviewNeeded; index += 1) {
    entries.push({
      table: "review_schedules",
      entityId: `f2000000-0000-4000-8000-00000000000${index + 1}`,
      operation: "insert",
      reason: "Provide meaningful upcoming spaced-review coverage",
      values: { next_review_at: atUtcHour(now, index + 1, 15) },
    });
  }

  const reminderNeeded = Math.max(0, 2 - snapshot.counts.parentReminders);
  for (let index = 0; index < reminderNeeded; index += 1) {
    entries.push({
      table: "parent_reminders",
      entityId: `f3000000-0000-4000-8000-00000000000${index + 1}`,
      operation: "insert",
      reason: "Fill the empty linked-parent reminders feature",
      values: {
        title:
          index === 0
            ? "Review upcoming assignment"
            : "Discuss weekly progress",
        remind_at: atUtcHour(now, 2 + index * 3, 16),
        seed_owned: true,
      },
    });
  }

  const adequateCoverage: ReadonlyArray<{
    table: string;
    id: string;
    count: number;
    minimum: number;
  }> = [
    {
      table: "student_activity_log",
      id: "recent-activity-coverage",
      count: snapshot.counts.recentActivity,
      minimum: 5,
    },
    {
      table: "notifications",
      id: "notification-coverage",
      count: snapshot.counts.notifications,
      minimum: 5,
    },
    {
      table: "wellness_habit_logs",
      id: "today-habit-coverage",
      count: snapshot.counts.todayHabitLogs,
      minimum: 1,
    },
    {
      table: "journal_entries",
      id: "journal-coverage",
      count: snapshot.counts.journalEntries,
      minimum: 2,
    },
    {
      table: "assignments",
      id: "upcoming-assignment-coverage",
      count: snapshot.counts.upcomingAssignments,
      minimum: 4,
    },
  ];

  for (const coverage of adequateCoverage) {
    entries.push(
      coverage.count >= coverage.minimum
        ? unchanged(
            coverage.table,
            coverage.id,
            `Existing meaningful rows (${coverage.count}) meet coverage; preserve them`
          )
        : {
            table: coverage.table,
            entityId: coverage.id,
            operation: "blocked",
            reason:
              "Coverage is incomplete, but a connected owner/foreign-key row must be resolved before insertion",
          }
    );
  }

  entries.push({
    table: "invitations",
    entityId: "invitation-workflow",
    operation: "blocked",
    reason:
      "Do not seed operational invitations or tokens; verify this flow locally with email capture",
  });

  const totals: Record<NoorSeedOperation, number> = {
    insert: 0,
    update: 0,
    unchanged: 0,
    blocked: 0,
  };
  for (const entry of entries) totals[entry.operation] += 1;

  return {
    institutionId: NOOR_INSTITUTION_ID,
    generatedAt: now.toISOString(),
    entries,
    totals,
  };
};
