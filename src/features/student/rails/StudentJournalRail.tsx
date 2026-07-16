// =============================================================================
// StudentJournalRail — right rail for the student Journal page (prototype
// `railHTML()` `page==='journal'` case in shared.js):
//   Journal streak · Prompt ideas.
//
// Wired to the REAL journal hook (no faked data R17; no backend change G.1):
//   - useJournalEntries → entries; the streak (consecutive journaling days) is
//     DERIVED from entry `created_at` dates (no dedicated streak backend, so it
//     is computed from real data rather than fabricated).
// The prompt ideas are static reflective coaching copy (matching the prototype).
// =============================================================================

import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { useJournalEntries } from "@/hooks/useJournal";

/** UTC YYYY-MM-DD for a Date. */
const isoDay = (d: Date): string => d.toISOString().slice(0, 10);

/**
 * Consecutive-day journaling streak derived from entry timestamps. Counts back
 * from today (or yesterday, so a not-yet-written today doesn't zero it out).
 */
const computeJournalStreak = (createdAts: string[]): number => {
  const days = new Set(createdAts.map((iso) => iso.slice(0, 10)));
  if (days.size === 0) return 0;
  const cursor = new Date();
  if (!days.has(isoDay(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!days.has(isoDay(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(isoDay(cursor))) {
    streak += 1;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
};

const StudentJournalRail = () => {
  const { t } = useTranslation("student");
  const entries = useJournalEntries();

  const streak = useMemo(
    () => computeJournalStreak((entries.data ?? []).map((e) => e.created_at)),
    [entries.data]
  );

  const prompts = [
    t("journal.rail.prompt1", "What clicked for you today?"),
    t("journal.rail.prompt2", "What would you explain differently?"),
    t("journal.rail.prompt3", "What mistake taught you the most?"),
  ];

  return (
    <aside
      aria-label={t("journal.rail.label", "Journal")}
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── Journal streak (derived from real entries) ── */}
      <RailCard>
        <RailHead
          title={t("journal.rail.streak", "📖 Journal streak")}
          right={
            entries.isPending
              ? undefined
              : t("journal.rail.days", {
                  defaultValue: "{{n}} days",
                  n: streak,
                })
          }
        />
        {entries.isPending ? (
          <Shimmer className="h-10 rounded-lg" />
        ) : (
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {t(
              "journal.rail.streakNote",
              "Writing regularly builds reflection habits linked to stronger recall."
            )}
          </p>
        )}
      </RailCard>

      {/* ── Prompt ideas (static reflective coaching) ── */}
      <RailCard>
        <RailHead title={t("journal.rail.prompts", "💭 Prompt ideas")} />
        <div className="space-y-0.5">
          {prompts.map((p) => (
            <RailRow key={p}>
              <span className="min-w-0 flex-1">{p}</span>
            </RailRow>
          ))}
        </div>
      </RailCard>
    </aside>
  );
};

export default StudentJournalRail;
