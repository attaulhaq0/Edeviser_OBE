// =============================================================================
// notificationPrefs — pure helpers for profiles.notification_preferences
// =============================================================================
// The live column (jsonb) has this shape (verified in the live DB default):
//   { email_new_assignment, email_grade_released, email_streak_risk,
//     email_weekly_summary, quiet_hours: { enabled, start, end },
//     muted_courses: string[] }
// These helpers parse/merge it tolerantly (malformed/legacy rows fall back to
// defaults) so the Me-page card can edit it without `any`.

export interface QuietHours {
  enabled: boolean;
  start: string;
  end: string;
}

export interface NotificationPrefs {
  email_new_assignment: boolean;
  email_grade_released: boolean;
  email_streak_risk: boolean;
  email_weekly_summary: boolean;
  quiet_hours: QuietHours;
  muted_courses: string[];
}

/** Mirrors the live column default (verified via live schema introspection). */
export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  email_new_assignment: true,
  email_grade_released: true,
  email_streak_risk: true,
  email_weekly_summary: true,
  quiet_hours: { enabled: false, start: "22:00", end: "07:00" },
  muted_courses: [],
};

const asBool = (v: unknown, fallback: boolean): boolean =>
  typeof v === "boolean" ? v : fallback;

const asTimeString = (v: unknown, fallback: string): string =>
  typeof v === "string" && /^\d{2}:\d{2}$/.test(v) ? v : fallback;

const asStringArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Tolerantly parse the jsonb column into a full NotificationPrefs shape. */
export function parseNotificationPrefs(value: unknown): NotificationPrefs {
  const raw =
    value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const quiet = (raw.quiet_hours ?? {}) as Record<string, unknown>;
  return {
    email_new_assignment: asBool(
      raw.email_new_assignment,
      DEFAULT_NOTIFICATION_PREFS.email_new_assignment
    ),
    email_grade_released: asBool(
      raw.email_grade_released,
      DEFAULT_NOTIFICATION_PREFS.email_grade_released
    ),
    email_streak_risk: asBool(
      raw.email_streak_risk,
      DEFAULT_NOTIFICATION_PREFS.email_streak_risk
    ),
    email_weekly_summary: asBool(
      raw.email_weekly_summary,
      DEFAULT_NOTIFICATION_PREFS.email_weekly_summary
    ),
    quiet_hours: {
      enabled: asBool(quiet.enabled, false),
      start: asTimeString(quiet.start, "22:00"),
      end: asTimeString(quiet.end, "07:00"),
    },
    muted_courses: asStringArray(raw.muted_courses),
  };
}

/** Immutably merge a partial patch into the current prefs. */
export function mergeNotificationPrefs(
  current: NotificationPrefs,
  patch: Partial<NotificationPrefs>
): NotificationPrefs {
  return {
    ...current,
    ...patch,
    quiet_hours: { ...current.quiet_hours, ...(patch.quiet_hours ?? {}) },
    muted_courses: patch.muted_courses ?? current.muted_courses,
  };
}
