// =============================================================================
// journalInsights — presentation-safe journal metrics derived from real entries
// =============================================================================

export interface JournalInsightEntry {
  created_at: string;
  content: string;
}

export interface JournalDay {
  date: Date;
  hasEntry: boolean;
}

/** A UTC calendar-day key keeps the timeline and right rail deterministic. */
export const journalDayKey = (date: Date): string =>
  date.toISOString().slice(0, 10);

const wordCount = (content: string): number =>
  content.trim().split(/\s+/).filter(Boolean).length;

const startOfUtcWeek = (now: Date): Date => {
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const daysSinceMonday = (start.getUTCDay() + 6) % 7;
  start.setUTCDate(start.getUTCDate() - daysSinceMonday);
  return start;
};

export const computeJournalStreak = (
  createdAts: string[],
  now = new Date()
): number => {
  const entryDays = new Set(
    createdAts.map((createdAt) => createdAt.slice(0, 10))
  );
  if (entryDays.size === 0) return 0;

  const cursor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  if (!entryDays.has(journalDayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!entryDays.has(journalDayKey(cursor))) return 0;
  }

  let streak = 0;
  while (entryDays.has(journalDayKey(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
};

export const getJournalWeekDays = (
  entries: JournalInsightEntry[],
  now = new Date()
): JournalDay[] => {
  const entryDays = new Set(
    entries.map((entry) => entry.created_at.slice(0, 10))
  );
  const start = startOfUtcWeek(now);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setUTCDate(start.getUTCDate() + index);
    return { date, hasEntry: entryDays.has(journalDayKey(date)) };
  });
};

export const getJournalInsights = (
  entries: JournalInsightEntry[],
  now = new Date()
) => {
  const weekStart = journalDayKey(startOfUtcWeek(now));
  const weekEntries = entries.filter(
    (entry) => entry.created_at.slice(0, 10) >= weekStart
  );

  return {
    entriesThisWeek: weekEntries.length,
    totalEntries: entries.length,
    substantiveThisWeek: weekEntries.filter(
      (entry) => wordCount(entry.content) >= 50
    ).length,
    streak: computeJournalStreak(
      entries.map((entry) => entry.created_at),
      now
    ),
    days: getJournalWeekDays(entries, now),
  };
};
