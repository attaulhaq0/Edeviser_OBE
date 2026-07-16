// =============================================================================
// StudentDashboardRail — the dashboard's right rail (prototype `railHTML()`
// dashboard case in shared.js). Fixed, laptop-only (xl+) companion column that
// mirrors the prototype's per-page "Today" widget stack:
//   Daily Goal · Daily Quests · Gold League · Coming up · Streak protection ·
//   Edu's tip.
//
// Every card is wired to a REAL existing hook (no faked data, R17; no backend
// changes, G.1). Where the prototype card has no backing source it is adapted
// to the nearest real signal and the gap is called out inline:
//   - "Daily Goal" (prototype = per-day XP target, e.g. "35 XP to go today")
//     has NO daily-XP-goal backend, so it is bound to today's habit completion
//     (useTodayViewData) — the closest real daily signal — and framed as such.
//
// Styling reproduces `prototype/shared.css` 1:1: `.rail-card` (radius-16 border
// #e2e8f0), `.rail-h` (11px 800 uppercase slate-400 + optional `.rail-r`),
// `.rail-row`, `.rail-btn` (brand-gradient), `.mini-bar`.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  addDays,
  format,
  isSameDay,
  isWithinInterval,
  startOfDay,
} from "date-fns";

import { Shimmer } from "@/design-system";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useStudentDashboardAggregate } from "@/hooks/useStudentDashboardAggregate";
import { useTodayViewData } from "@/hooks/useTodayView";
import { useKnowledgeQuests } from "@/hooks/useKnowledgeQuests";
import {
  useLeagueLeaderboard,
  useStudentLeagueTier,
  useStudentPercentileBand,
} from "@/hooks/useLeagueLeaderboard";
import { formatPercentileBand } from "@/lib/percentileBand";

/** Compact relative label for a deadline date (Today / Tomorrow / weekday / MMM d). */
const dueLabel = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = startOfDay(new Date());
  const day = startOfDay(d);
  if (isSameDay(day, today)) return "Today";
  if (isSameDay(day, addDays(today, 1))) return "Tomorrow";
  if (isWithinInterval(day, { start: today, end: addDays(today, 6) }))
    return format(d, "EEEE");
  return format(d, "MMM d");
};

/** `.rail-card` — white, 1px slate-200 border, radius-16, p-4, 14px bottom gap. */
const RailCard = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={cn(
      "mb-3.5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card",
      className
    )}
    style={style}
  >
    {children}
  </div>
);

/** `.rail-h` — uppercase 11px/800 slate-400 header with an optional right note. */
const RailHead = ({
  title,
  right,
  onLight = true,
}: {
  title: string;
  right?: string;
  onLight?: boolean;
}) => (
  <div
    className={cn(
      "mb-2.5 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.08em]",
      onLight ? "text-slate-400" : "text-white/60"
    )}
  >
    <span>{title}</span>
    {right ? (
      <span className="text-[10px] font-bold normal-case tracking-normal text-slate-400">
        {right}
      </span>
    ) : null}
  </div>
);

/** `.rail-row` — 13px slate-700 row; bold value renders 12px/800 slate-900. */
const RailRow = ({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) => (
  <div
    className={cn(
      "flex items-center gap-2.5 py-[5px] text-[13px] text-slate-700 dark:text-slate-300",
      className
    )}
    style={style}
  >
    {children}
  </div>
);

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      onClick={() => navigate(to)}
      className="mt-2 block text-xs font-extrabold text-blue-600 hover:underline"
    >
      {label}
    </button>
  );
};

const StudentDashboardRail = () => {
  const { t } = useTranslation("student");
  const { user } = useAuth();
  const studentId = user?.id ?? "";

  const aggregate = useStudentDashboardAggregate(studentId);
  const today = useTodayViewData(studentId);
  const quests = useKnowledgeQuests("active");
  const leagueTier = useStudentLeagueTier(studentId);
  const tier = leagueTier.data?.tier;
  const leaderboard = useLeagueLeaderboard(undefined, tier);
  const percentile = useStudentPercentileBand(studentId);

  // ── Daily Goal → today's habits (real daily signal; see file header note) ──
  const habits = today.habits;
  const habitsDone = [
    habits.login,
    habits.submit,
    habits.journal,
    habits.read,
  ].filter(Boolean).length;
  const goalPercent = (habitsDone / 4) * 100;

  // ── Gold League: my row from the tier leaderboard, else percentile band ──
  const leagueRows = leaderboard.data ?? [];
  const me = useMemo(
    () => (leaderboard.data ?? []).find((r) => r.student_id === studentId),
    [leaderboard.data, studentId]
  );
  const leader = leagueRows[0];
  const tierLabel = tier
    ? `${tier.charAt(0).toUpperCase()}${tier.slice(1)}`
    : "";

  const deadlines = (aggregate.data?.deadlines ?? []).slice(0, 3);
  const freezes = aggregate.data?.streakFreeze?.freezes ?? 0;
  const streakAtRisk = !habits.login;

  const activeQuests = (quests.data ?? []).slice(0, 3);

  return (
    <aside
      aria-label={t("dashboard.rail.label", "Today")}
      className="fixed bottom-0 end-0 top-14 z-30 hidden w-80 overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:block"
    >
      {/* ── Daily Goal (habit completion ring) ── */}
      <RailCard>
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 shrink-0">
            <svg className="h-14 w-14 -rotate-90" viewBox="0 0 36 36">
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#eef2f6"
                strokeWidth="3.5"
              />
              <circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="#14b8a6"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="100"
                strokeDashoffset={100 - goalPercent}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold text-teal-700">
              {habitsDone}/4
            </div>
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">
              {t("dashboard.rail.dailyGoal", "Daily Goal")}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-500">
              {habitsDone >= 4
                ? t("dashboard.rail.perfectDay", "Perfect Day complete 🎉")
                : t("dashboard.rail.habitsToGo", {
                    defaultValue: "{{n}} more for a Perfect Day",
                    n: 4 - habitsDone,
                  })}
            </p>
          </div>
        </div>
      </RailCard>

      {/* ── Daily Quests ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.quests", "⚔️ Daily Quests")}
          right={
            activeQuests.length > 0
              ? t("dashboard.rail.questsActive", {
                  defaultValue: "{{n}} active",
                  n: activeQuests.length,
                })
              : undefined
          }
        />
        {quests.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : activeQuests.length > 0 ? (
          <div className="space-y-0.5">
            {activeQuests.map((q) => (
              <RailRow key={q.id}>
                <span aria-hidden="true">🎯</span>
                <span className="min-w-0 flex-1 truncate">{q.title}</span>
                {q.reward_type === "xp" && q.reward_xp_amount ? (
                  <b className="text-[12px] font-extrabold text-amber-600">
                    +{q.reward_xp_amount}
                  </b>
                ) : null}
              </RailRow>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.questsEmpty", "No active quests right now.")}
          </p>
        )}
      </RailCard>

      {/* ── League standing ── */}
      <RailCard>
        <RailHead
          title={
            tierLabel
              ? t("dashboard.rail.league", {
                  defaultValue: "🏅 {{tier}} League",
                  tier: tierLabel,
                })
              : t("dashboard.rail.leagueGeneric", "🏅 League")
          }
        />
        {leagueTier.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : tier ? (
          <div className="space-y-0.5">
            {leader && (
              <RailRow>
                <span className="w-4 text-xs font-extrabold text-amber-500">
                  1
                </span>
                <span className="min-w-0 flex-1 truncate">
                  {leader.full_name}
                </span>
                <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                  {leader.weekly_xp.toLocaleString()}
                </b>
              </RailRow>
            )}
            {me ? (
              <RailRow className="-mx-1.5 rounded-lg bg-blue-50 px-1.5 dark:bg-blue-950/40">
                <span className="w-4 text-xs font-extrabold text-slate-500">
                  {me.rank}
                </span>
                <span className="min-w-0 flex-1 truncate font-extrabold text-blue-700 dark:text-blue-300">
                  {t("dashboard.rail.you", "You")}
                </span>
                <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                  {me.weekly_xp.toLocaleString()}
                </b>
              </RailRow>
            ) : percentile.data ? (
              <RailRow className="-mx-1.5 rounded-lg bg-blue-50 px-1.5 dark:bg-blue-950/40">
                <span className="min-w-0 flex-1 truncate font-extrabold text-blue-700 dark:text-blue-300">
                  {t("dashboard.rail.you", "You")}
                </span>
                <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                  {formatPercentileBand(percentile.data.band)}
                </b>
              </RailRow>
            ) : null}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t(
              "dashboard.rail.leagueEmpty",
              "Earn XP to join a weekly league."
            )}
          </p>
        )}
      </RailCard>

      {/* ── Coming up (deadlines) ── */}
      <RailCard>
        <RailHead title={t("dashboard.rail.comingUp", "📅 Coming up")} />
        {aggregate.isPending ? (
          <Shimmer className="h-12 rounded-lg" />
        ) : deadlines.length > 0 ? (
          <>
            {deadlines.map((d) => (
              <RailRow key={d.id}>
                <span className="min-w-0 flex-1 truncate">{d.title}</span>
                <b className="text-[12px] font-extrabold text-amber-700">
                  {dueLabel(d.due_date)}
                </b>
              </RailRow>
            ))}
            <RailLink
              to="/student/planner"
              label={t("dashboard.rail.openCalendar", "Open calendar →")}
            />
          </>
        ) : (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.comingUpEmpty", "Nothing due in the next days.")}
          </p>
        )}
      </RailCard>

      {/* ── Streak protection ── */}
      <RailCard>
        <RailHead
          title={t("dashboard.rail.streakProtection", "❄️ Streak protection")}
        />
        <RailRow>
          <span className="min-w-0 flex-1">
            {t("dashboard.rail.freezes", "Freezes in inventory")}
          </span>
          <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
            {freezes}
          </b>
        </RailRow>
        <RailRow>
          <span className="min-w-0 flex-1">
            {t("dashboard.rail.todaysStreak", "Today's streak")}
          </span>
          <b
            className={cn(
              "text-[12px] font-extrabold",
              streakAtRisk ? "text-red-600" : "text-green-600"
            )}
          >
            {streakAtRisk
              ? t("dashboard.rail.atRisk", "At risk")
              : t("dashboard.rail.safe", "Safe")}
          </b>
        </RailRow>
        <RailLink
          to="/student/marketplace"
          label={t("dashboard.rail.getFreezes", "Get more freezes →")}
        />
      </RailCard>

      {/* ── Edu's tip (AI coach) ── */}
      <RailCard
        className="border-0 text-white"
        style={{ background: "linear-gradient(135deg,#0f172a,#1e3a8a)" }}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden="true">
            🤖
          </span>
          <p className="text-xs font-extrabold">
            {t("dashboard.rail.eduTip", "Edu's tip")}
          </p>
        </div>
        <p className="mt-1.5 text-xs text-white/80">
          {t(
            "dashboard.rail.eduTipBody",
            "Review your weakest outcomes first — small, focused reps move attainment the fastest."
          )}
        </p>
      </RailCard>
    </aside>
  );
};

export default StudentDashboardRail;
