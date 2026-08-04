// =============================================================================
// StudentDashboardScreen — prototype rebuild (prototype-frontend-rebuild P2.1)
// =============================================================================
//
// Rebuilds `prototype/dashboard.html` on `@/design-system` + tokens, wired to
// the REAL existing hooks (no faked data, R17; no backend changes, G.1):
//   - useStudentDashboardAggregate → kpis (XP/level/streak) + next deadline
//   - computeLevelData(kpis.totalXP) → level ring + XP-to-go (pure, no fetch)
//   - useCLOProgress               → weakest outcome (lowest attained CLO)
//   - useStudentCourses            → My Courses strip (per-course mastery ring)
//   - useTodayViewData             → Today's Habits (login/submit/journal/read)
//
// Pixel parity vs the prototype is proven by the owner's `npm run test:visual`
// gate (visual/screen-map.ts `auth`/`student-dashboard`), then refined.
//
// NOTE (incremental): the hero carousel's secondary slides (leaderboard rank
// movement, "badge 1 session away") and the Daily-Review / Weekly-Activity /
// Continue-Path / Announcements sections land in the next increment — several
// need a rank-delta / badge-progress source that the backend-parity audit
// flagged as a gap; they will be wired to real hooks or flagged, never faked.
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  ChevronRight,
  Megaphone,
  ShieldQuestion,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import {
  Button,
  HeroCarousel,
  MascotCharacter,
  PCard,
  Shimmer,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useStudentDashboardAggregate } from "@/hooks/useStudentDashboardAggregate";
import { computeLevelData } from "@/hooks/useLevel";
import { useStudentCourses } from "@/hooks/useStudentCourses";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useTodayViewData } from "@/hooks/useTodayView";
import { useWeeklyReviews } from "@/hooks/useReviewSchedule";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import {
  useStudentLeagueTier,
  useStudentPercentileBand,
} from "@/hooks/useLeagueLeaderboard";
import { cn } from "@/lib/utils";

/** Prototype brand gradient token (93.65deg teal→blue) as an inline value. */
const BRAND_GRADIENT = "var(--brand-gradient)";
const HERO_GRADIENT = "var(--hero-gradient)";

/** SVG progress ring matching the prototype `.ring-mini` / hero ring. */
const ProgressRing = ({
  percent,
  size,
  stroke,
  track = "#eef2f6",
  color = "#3b82f6",
  children,
}: {
  percent: number;
  size: number;
  stroke: number;
  track?: string;
  color?: string;
  children?: React.ReactNode;
}) => {
  const clamped = Math.max(0, Math.min(100, percent));
  return (
    <div
      className="relative shrink-0"
      style={{ width: size, height: size }}
      role="img"
      aria-label={`${Math.round(clamped)}%`}
    >
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox="0 0 36 36"
      >
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <circle
          cx="18"
          cy="18"
          r="15.9"
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray="100"
          strokeDashoffset={100 - clamped}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

/** Heat colors (0=none … 4=most) + Mon-first labels for the weekly grid. */
const HEAT = ["#eef2f6", "#a7f3d0", "#34d399", "#10b981", "#047857"];
const DOW = ["M", "T", "W", "T", "F", "S", "S"];

/** Current week (Mon–Sun) as local ISO date strings. */
const currentWeekRange = () => {
  const now = new Date();
  const dow = (now.getDay() + 6) % 7;
  const monday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - dow
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(
      monday.getFullYear(),
      monday.getMonth(),
      monday.getDate() + i
    );
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
      2,
      "0"
    )}-${String(d.getDate()).padStart(2, "0")}`;
  });
  return { start: days[0] ?? "", end: days[6] ?? "", days };
};

/** Time-of-day greeting bucket, matching the prototype's `timeGreeting`. */
const greetingTimeOfDay = (): "morning" | "afternoon" | "evening" => {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
};

/** Keep real CLO titles readable in the compact Daily Review chips. */
const compactReviewLabel = (title: string): string => {
  const appliedProcedures = title.match(
    /^Apply (.+?) procedures to new problems$/i
  );
  if (appliedProcedures?.[1]) return `${appliedProcedures[1]} procedures`;

  const evaluatedArguments = title.match(
    /^Evaluate arguments and solutions in (.+)$/i
  );
  if (evaluatedArguments?.[1]) return `${evaluatedArguments[1]} evaluation`;

  return title;
};

const StudentDashboardScreen = () => {
  const { t } = useTranslation("student");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const studentId = user?.id ?? "";

  const aggregate = useStudentDashboardAggregate(studentId);
  const courses = useStudentCourses(studentId);
  const cloProgress = useCLOProgress(studentId);
  const today = useTodayViewData(studentId);
  const leagueTier = useStudentLeagueTier(studentId);
  const percentile = useStudentPercentileBand(studentId);

  const kpis = aggregate.data?.kpis;
  const level = computeLevelData(kpis?.totalXP ?? 0);
  const xpToGo = Math.max(0, level.xpForNextLevel - level.xpTotal);
  const streak = kpis?.currentStreak ?? 0;
  const nextDeadline = aggregate.data?.deadlines?.[0];
  const firstName = (profile?.full_name ?? "Student").split(" ")[0];

  // Weakest outcome = lowest attained CLO across enrolled courses (real data).
  const weakest = useMemo(() => {
    const entries = (cloProgress.data ?? [])
      .flatMap((c) => c.entries)
      .filter((e) => e.attainment_percent != null);
    if (entries.length === 0) return null;
    return entries.reduce((min, e) =>
      (e.attainment_percent as number) < (min.attainment_percent as number)
        ? e
        : min
    );
  }, [cloProgress.data]);

  const habits = today.habits;
  const habitList = [
    { key: "login", label: t("dashboard.habits.login", "Login"), emoji: "🔑" },
    {
      key: "submit",
      label: t("dashboard.habits.submit", "Submit"),
      emoji: "📤",
    },
    {
      key: "journal",
      label: t("dashboard.habits.journal", "Journal"),
      emoji: "📝",
    },
    { key: "read", label: t("dashboard.habits.read", "Read"), emoji: "📖" },
  ] as const;
  const habitsDone = habitList.filter((h) => habits[h.key]).length;

  const courseList = (courses.data ?? []).slice(0, 6);

  // ── Increment 2 sections: continue-path, daily-review, weekly-activity, announcements ──
  const week = useMemo(() => currentWeekRange(), []);
  const reviews = useWeeklyReviews(studentId, week.start);
  const heatmap = useHeatmapData(studentId, {
    start: week.start,
    end: week.end,
  });
  const announcements = aggregate.data?.announcements ?? [];

  const cloTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of cloProgress.data ?? [])
      for (const e of c.entries) m.set(e.clo_id, e.clo_title);
    return m;
  }, [cloProgress.data]);

  const pendingReviews = (reviews.data ?? []).filter(
    (r) => r.status === "pending"
  );
  const reviewCounts = new Map<string, number>();
  for (const r of pendingReviews)
    reviewCounts.set(r.cloId, (reviewCounts.get(r.cloId) ?? 0) + 1);
  const reviewChips = [...reviewCounts.entries()]
    .map(([cloId, n]) => ({
      id: cloId,
      label: compactReviewLabel(
        cloTitleById.get(cloId) ?? t("dashboard.review.card", "Review")
      ),
      sourceLabel:
        cloTitleById.get(cloId) ?? t("dashboard.review.card", "Review"),
      count: n,
    }))
    .slice(0, 4);

  const todayStr = week.days[(new Date().getDay() + 6) % 7] ?? "";
  const heatByDate = new Map(
    (heatmap.data ?? []).map((d) => [d.date, d.totalCount])
  );

  // ── Hero carousel slides ──────────────────────────────────────────────────
  // Slide 1 (living greeting) always renders. Slides 2 (streak) and 3 (league
  // standing) render only when their REAL data exists (R17 — never faked). The
  // prototype's 4th "badge 1 session away" slide needs a badge-progress source
  // the backend-parity audit flagged as a gap, so it is omitted, not fabricated.
  const streakAtRisk = !habits.login;
  const leagueRank = percentile.data?.rank;
  const leagueTotal = percentile.data?.totalStudents ?? 0;
  const tierName = leagueTier.data?.tier;
  const tierLabel = tierName
    ? `${tierName.charAt(0).toUpperCase()}${tierName.slice(1)}`
    : "";

  const heroSlides: React.ReactNode[] = [
    <div
      key="greeting"
      className="relative flex min-h-29 items-center overflow-hidden p-3.5"
    >
      <div
        className="pointer-events-none absolute -right-8 -top-11 h-32.5 w-32.5"
        style={{
          background:
            "radial-gradient(circle,rgba(20,184,166,.45),transparent 70%)",
        }}
      />
      <div className="relative flex w-full items-center gap-3">
        <ProgressRing
          percent={level.progressPercent}
          size={52}
          stroke={2.5}
          track="rgba(255,255,255,.15)"
          color="#2dd4bf"
        >
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-[6px] font-black tracking-[0.16em] text-teal-200">
              {t("dashboard.levelLabel", "LEVEL")}
            </span>
            <span className="-mt-0.5 text-base font-black">{level.level}</span>
          </div>
        </ProgressRing>
        <div className="min-w-0 flex-1 pe-12">
          <h1 className="truncate text-sm font-bold tracking-tight">
            {t(`dashboard.greeting.${greetingTimeOfDay()}`, "Good day")},{" "}
            {firstName} 👋
          </h1>
          <p className="truncate text-[10px] text-white/60">
            {t("dashboard.momentum", "Keep your momentum going")}
          </p>
          <div className="mt-1.5">
            <div className="mb-0.5 flex items-baseline justify-between">
              <span className="text-[10px] font-bold text-white/90">
                {t("dashboard.levelProgress", "Level {{a}} → {{b}}", {
                  a: level.level,
                  b: level.level + 1,
                })}
              </span>
              <span className="text-[9px] font-bold text-amber-300">
                {t("dashboard.xpToGo", "{{xp}} XP to go", { xp: xpToGo })}
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-linear-to-r from-teal-400 to-blue-400"
                style={{ width: `${level.progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>
      <MascotCharacter
        character="foxi"
        emotion="happy"
        size="md"
        animation="float"
        decorative
        className="pointer-events-none absolute bottom-0 end-1"
      />
    </div>,
  ];

  if (streak > 0) {
    heroSlides.push(
      <div key="streak" className="flex min-h-29 items-center gap-3 p-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-xl"
          aria-hidden="true"
        >
          🔥
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-amber-300">
            {t("dashboard.hero.streakEyebrow", "Streak · day {{n}}", {
              n: streak,
            })}
          </p>
          <h2 className="mt-0.5 text-sm font-bold tracking-tight">
            {streakAtRisk
              ? t("dashboard.hero.streakRiskTitle", "Don't lose it today")
              : t("dashboard.hero.streakSafeTitle", "Your streak is alive")}
          </h2>
          <p className="mt-0.5 truncate text-[10px] text-white/65">
            {streakAtRisk
              ? t(
                  "dashboard.hero.streakRiskBody",
                  "You haven't logged today's activity yet — a short review keeps it going."
                )
              : t(
                  "dashboard.hero.streakSafeBody",
                  "Keep showing up daily to grow your streak."
                )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/student/today")}
          className="shrink-0 rounded-xl px-2.5 py-1.5 text-xs font-bold text-white shadow-[0_3px_0_rgba(0,0,0,.15)] transition-transform active:scale-95"
          style={{ background: "linear-gradient(90deg,#2dd4bf,#38bdf8)" }}
        >
          {t("dashboard.hero.streakCta", "Protect it →")}
        </button>
      </div>
    );
  }

  if (leagueRank && leagueTotal > 0) {
    heroSlides.push(
      <div key="league" className="flex min-h-29 items-center gap-3 p-3.5">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/20 bg-white/15 text-xl"
          aria-hidden="true"
        >
          📈
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[9px] font-black uppercase tracking-widest text-teal-300">
            {t("dashboard.hero.leagueEyebrow", "Leaderboard")}
          </p>
          <h2 className="mt-0.5 text-sm font-bold tracking-tight">
            {t("dashboard.hero.leagueTitle", "You're #{{rank}} of {{total}}", {
              rank: leagueRank,
              total: leagueTotal,
            })}
          </h2>
          <p className="mt-0.5 text-[10px] text-white/65">
            {tierLabel
              ? t("dashboard.hero.leagueBody", "{{tier}} League this week", {
                  tier: tierLabel,
                })
              : t("dashboard.hero.leagueBodyGeneric", "Your weekly standing")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/student/leaderboard")}
          className="shrink-0 rounded-xl border border-white/20 bg-white/[.14] px-2.5 py-1.5 text-xs font-bold text-white transition-transform active:scale-95"
        >
          {t("dashboard.hero.leagueCta", "View →")}
        </button>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* ── Hero carousel (living greeting · streak · league standing) ── */}
      <HeroCarousel
        slides={heroSlides}
        className="rounded-2xl text-white shadow-lg"
        style={{ background: HERO_GRADIENT }}
        ariaLabel={t("dashboard.hero.label", "Highlights")}
      />

      {/* ── Weakest outcome + Next step ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Weakest outcome (OBE drives the next action) */}
        <button
          type="button"
          onClick={() => navigate("/student/progress")}
          className="block overflow-hidden rounded-2xl text-start text-white shadow-md transition-transform active:scale-[.99]"
          style={{ background: "linear-gradient(135deg,#0f766e,#0382bd)" }}
        >
          <div className="p-3.5">
            <p className="text-[9px] font-black uppercase tracking-widest text-white/70">
              {t("dashboard.weakest.eyebrow", "Today · weakest outcome")}
            </p>
            {cloProgress.isPending ? (
              <Shimmer className="mt-2 h-12 rounded-lg bg-white/20" />
            ) : weakest ? (
              <>
                <div className="mt-1.5 flex items-center gap-3">
                  <ProgressRing
                    percent={weakest.attainment_percent ?? 0}
                    size={40}
                    stroke={3.5}
                    track="rgba(255,255,255,.2)"
                    color="#fff"
                  >
                    <span className="text-[11px] font-black">
                      {Math.round(weakest.attainment_percent ?? 0)}%
                    </span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-bold leading-tight">
                      {weakest.clo_title}
                    </h3>
                    <p className="truncate text-[11px] text-white/75">
                      {weakest.course_name}
                    </p>
                  </div>
                  <MascotCharacter
                    character="foxi"
                    emotion="encouraging"
                    size="xs"
                    animation="nudge"
                    decorative
                  />
                </div>
                <span className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-xl bg-white py-2 text-sm font-bold text-teal-800">
                  🎯 {t("dashboard.weakest.cta", "Improve this outcome")}
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </span>
              </>
            ) : (
              <p className="mt-2 text-sm text-white/80">
                {t(
                  "dashboard.weakest.empty",
                  "No outcome data yet — submit work to see your focus area."
                )}
              </p>
            )}
          </div>
        </button>

        {/* Next step (nearest deadline) */}
        <div className="overflow-hidden rounded-2xl border-l-4 border-amber-400 bg-white shadow-md">
          <div className="p-3.5">
            {aggregate.isPending ? (
              <Shimmer className="h-20 rounded-lg" />
            ) : nextDeadline ? (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-slate-200/60 shadow-2xs backdrop-blur-xs text-lg">
                    📝
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                      {t("dashboard.nextStep.eyebrow", "Next step")}
                    </p>
                    <h3 className="truncate text-sm font-black leading-tight text-gray-900">
                      {nextDeadline.title}
                    </h3>
                    <p className="truncate text-[11px] text-gray-500">
                      {nextDeadline.course_name}
                    </p>
                  </div>
                </div>
                <div className="mt-2.5 flex gap-2">
                  <Button
                    variant="tactile"
                    className="h-9 flex-1"
                    onClick={() =>
                      navigate(`/student/assignments/${nextDeadline.id}`)
                    }
                  >
                    {t("dashboard.nextStep.start", "Start now")}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Button>
                  <Button
                    variant="outline"
                    className="h-9"
                    onClick={() => navigate("/student/tutor")}
                  >
                    <Bot className="h-4 w-4" aria-hidden="true" />
                    {t("dashboard.nextStep.tutor", "Tutor")}
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-3 py-2">
                <ShieldQuestion
                  className="h-8 w-8 shrink-0 text-gray-300"
                  aria-hidden="true"
                />
                <p className="text-sm text-gray-500">
                  {t("dashboard.nextStep.empty", "No upcoming deadlines.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── My Courses section (responsive fluid grid) ── */}
      <section className="my-courses-section w-full min-w-0 max-w-none">
        <div className="my-courses-header mb-3 flex w-full items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-transparent text-sm">
              📚
            </span>
            <p className="text-[13px] font-black tracking-tight text-slate-900">
              {t("dashboard.myCourses", "My Courses")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/student/courses")}
            className="text-xs font-bold text-sky-700 hover:underline"
          >
            {t("dashboard.seeAll", "See all →")}
          </button>
        </div>
        {courses.isPending ? (
          <div className="my-courses-grid grid w-full min-w-0 gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {Array.from({ length: 4 }).map((_, i) => (
              <Shimmer key={i} className="h-19 w-full min-w-0 rounded-xl" />
            ))}
          </div>
        ) : courseList.length > 0 ? (
          <div className="my-courses-grid grid w-full min-w-0 gap-3 grid-cols-[repeat(auto-fit,minmax(min(100%,220px),1fr))]">
            {courseList.map((c) => {
              const ring = c.attainment_percent ?? c.progress_percent;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => navigate(`/student/courses/${c.id}`)}
                  className="course-card flex h-full w-full min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-white p-3 text-start shadow-xs transition-all hover:border-slate-200 hover:shadow-md active:scale-[.99]"
                >
                  <div className="course-card-progress shrink-0">
                    <ProgressRing percent={ring} size={48} stroke={3}>
                      <span className="text-[11px] font-black text-blue-600">
                        {Math.round(ring)}%
                      </span>
                    </ProgressRing>
                  </div>
                  <div className="course-card-details min-w-0 flex-1">
                    <span className="text-[9px] font-bold tracking-wide text-gray-400 uppercase">
                      {c.code}
                    </span>
                    <p className="truncate text-[13px] font-bold leading-tight text-gray-900">
                      {c.name}
                    </p>
                    <p className="mt-0.5 text-[10px] text-gray-500">
                      {t("dashboard.courseProgress", "{{p}}% complete", {
                        p: Math.round(c.progress_percent),
                      })}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <p className="w-full rounded-xl bg-white p-4 text-center text-sm text-gray-500 shadow-xs">
            {t(
              "dashboard.noCourses",
              "You are not enrolled in any courses yet."
            )}
          </p>
        )}
      </section>

      {/* ── Today's Habits & Continue Your Path (Side by Side Grid) ── */}
      <div className="grid gap-3 min-[640px]:grid-cols-2">
        {/* Today's Habits */}
        <section className="flex flex-col justify-between rounded-2xl bg-white p-3.5 shadow-md">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-transparent text-xs">
                🔥
              </span>
              <p className="text-xs font-black tracking-tight text-slate-900">
                {t("dashboard.habits.title", "Today's Habits")}
              </p>
              <span className="ms-auto rounded-full bg-green-50 px-2 py-0.5 text-[9px] font-bold text-green-600">
                {habitsDone}/4
              </span>
            </div>
            <div className="flex justify-around py-1">
              {habitList.map((h) => {
                const done = habits[h.key];
                return (
                  <div key={h.key} className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full transition-all",
                        done
                          ? "bg-green-500 text-white shadow-sm"
                          : "border-2 border-dashed border-gray-300 bg-gray-100 text-gray-400"
                      )}
                    >
                      {done ? (
                        <Check
                          className="h-4 w-4 stroke-[2.5]"
                          aria-hidden="true"
                        />
                      ) : (
                        <span className="text-xs">{h.emoji}</span>
                      )}
                    </div>
                    <span
                      className={cn(
                        "text-[9px] font-semibold",
                        done ? "text-gray-600" : "text-gray-400"
                      )}
                    >
                      {h.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          {habitsDone < 4 && (
            <div className="mt-2 flex items-center gap-2 rounded-lg border border-amber-100 bg-amber-50 px-2.5 py-1.5">
              <MascotCharacter
                character="penguin"
                emotion="default"
                size="sm"
                decorative
              />
              <p className="text-[11px] font-medium leading-tight text-amber-700">
                {t("dashboard.habits.nudge", {
                  defaultValue: "Just {{n}} more for a Perfect Day (+50 XP)",
                  n: 4 - habitsDone,
                })}
              </p>
            </div>
          )}
        </section>

        {/* Continue Your Path */}
        <button
          type="button"
          onClick={() => navigate("/student/today")}
          className="flex flex-col justify-between rounded-2xl border border-slate-100 bg-white p-3.5 text-start shadow-md transition-transform active:scale-[.99]"
        >
          <div className="w-full">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-transparent text-xs">
                🗺️
              </span>
              <p className="text-xs font-black tracking-tight text-slate-900">
                {t("dashboard.continuePath.title", "Continue Your Path")}
              </p>
              <span className="ms-auto rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-600">
                {t("dashboard.continuePath.unit", "Unit 3")}
              </span>
            </div>
            <div className="flex items-center gap-3 py-1">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/80 border border-slate-200/60 shadow-2xs backdrop-blur-xs text-slate-800">
                <span className="text-base">📝</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-gray-900">
                  {weakest
                    ? weakest.clo_title
                    : t("dashboard.continuePath.topic", "Normalization")}
                </p>
                <p className="text-[11px] text-gray-500">
                  {t(
                    "dashboard.continuePath.progressText",
                    "Applying level · 3 of 5 lessons"
                  )}
                </p>
              </div>
              <ChevronRight
                className="h-4 w-4 shrink-0 text-gray-300"
                aria-hidden="true"
              />
            </div>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: "60%", background: BRAND_GRADIENT }}
            />
          </div>
        </button>
      </div>

      {/* ── Daily Review + Weekly Activity ── */}
      <div className="grid gap-3 lg:grid-cols-2">
        {/* Daily Review (spaced repetition) */}
        <PCard className="p-4">
          <div className="mb-2 flex items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-[9px] border border-slate-200/80 bg-white/80 text-sm backdrop-blur-xs"
              aria-hidden="true"
            >
              🔁
            </span>
            <p className="text-[13px] font-black tracking-tight text-slate-900">
              {t("dashboard.review.title", "Daily Review")}
            </p>
            {streak > 0 && (
              <span className="ms-auto rounded-full border border-orange-100 bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-600">
                🔥{" "}
                {t("dashboard.review.streak", "{{n}}-day streak", {
                  n: streak,
                })}
              </span>
            )}
          </div>
          {reviews.isPending ? (
            <Shimmer className="h-16 rounded-lg" />
          ) : reviews.isError ? (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-xs text-red-700">
              <span>
                {t(
                  "dashboard.review.error",
                  "Daily review is temporarily unavailable."
                )}
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto shrink-0 p-0 font-bold text-red-700 underline underline-offset-2"
                onClick={() => void reviews.refetch()}
              >
                {t("common.retry", "Retry")}
              </Button>
            </div>
          ) : pendingReviews.length > 0 ? (
            <>
              <p className="-mt-1 mb-2.5 text-xs text-gray-500">
                {t("dashboard.review.due", {
                  defaultValue:
                    "{{n}} cards due · adaptive spacing strengthens your weakest CLOs",
                  n: pendingReviews.length,
                })}
              </p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {reviewChips.map((chip, index) => (
                  <span
                    key={chip.id}
                    title={chip.sourceLabel}
                    className={cn(
                      "inline-block max-w-[12rem] truncate rounded-full border px-2 py-1 text-[10px] font-bold",
                      index % 3 === 0 &&
                        "border-red-100 bg-red-50 text-red-700",
                      index % 3 === 1 &&
                        "border-blue-100 bg-blue-50 text-blue-700",
                      index % 3 === 2 &&
                        "border-purple-100 bg-purple-50 text-purple-700"
                    )}
                  >
                    {chip.label} ×{chip.count}
                  </span>
                ))}
              </div>
              <Button
                variant="tactile"
                className="h-9 w-full justify-between px-3.5 text-xs font-black"
                onClick={() => navigate("/student/today")}
              >
                <span>{t("dashboard.review.start", "Start Review")}</span>
                <b className="font-black">+15 XP</b>
              </Button>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">
              {t(
                "dashboard.review.empty",
                "No reviews due — you're all caught up."
              )}
            </p>
          )}
        </PCard>

        {/* This Week's Activity (habit heatmap) */}
        <div className="rounded-2xl bg-white p-4 shadow-md">
          <div className="mb-3 flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-transparent text-slate-700">
              <BarChart3 className="h-4 w-4" aria-hidden="true" />
            </span>
            <p className="text-[13px] font-black tracking-tight text-slate-900">
              {t("dashboard.activity.title", "This Week's Activity")}
            </p>
            <button
              type="button"
              onClick={() => navigate("/student/progress")}
              className="ms-auto text-xs font-bold text-sky-700 hover:underline"
            >
              {t("dashboard.activity.trends", "Trends →")}
            </button>
          </div>
          <div className="flex justify-between gap-1.5">
            {week.days.map((date, i) => {
              const count = heatByDate.get(date) ?? 0;
              const isToday = date === todayStr;
              const isFuture = date > todayStr;
              const lvl =
                count >= 5
                  ? 4
                  : count >= 4
                  ? 3
                  : count >= 2
                  ? 2
                  : count >= 1
                  ? 1
                  : 0;
              const bg = isFuture ? "#f1f5f9" : HEAT[lvl] ?? "#eef2f6";
              return (
                <div
                  key={date}
                  className="flex flex-1 flex-col items-center gap-1"
                >
                  <span className="text-[10px] font-semibold text-gray-400">
                    {DOW[i] ?? ""}
                  </span>
                  <span
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-md text-[10px] font-bold",
                      lvl >= 3 ? "text-white" : "text-gray-600",
                      isToday && "ring-2 ring-sky-400"
                    )}
                    style={{ background: bg }}
                    title={`${date} · ${count} ${
                      count === 1 ? "activity" : "activities"
                    }`}
                  >
                    {isFuture ? "–" : isToday ? "·" : count || "–"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Announcements ── */}
      <section className="rounded-2xl bg-white p-4 shadow-md">
        <div className="mb-3 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-transparent text-slate-700">
            <Megaphone className="h-4 w-4" aria-hidden="true" />
          </span>
          <p className="text-[13px] font-black tracking-tight text-slate-900">
            {t("dashboard.announcements.title", "Announcements")}
          </p>
        </div>
        {announcements.length > 0 ? (
          <ul className="space-y-3">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{a.title}</p>
                  <p className="truncate text-xs text-gray-500">{a.content}</p>
                  <p className="mt-1 text-[10px] text-gray-400">
                    {formatDistanceToNow(new Date(a.created_at), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="py-2 text-center text-sm text-gray-500">
            {t("dashboard.announcements.empty", "No announcements right now.")}
          </p>
        )}
      </section>
    </div>
  );
};

export default StudentDashboardScreen;
