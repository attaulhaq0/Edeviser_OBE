import { useNavigate } from "react-router-dom";
import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Shimmer from "@/components/shared/Shimmer";
import RealtimeStatusBanner from "@/components/shared/RealtimeStatusBanner";
import ProfileSummaryCard from "@/components/shared/ProfileSummaryCard";
import MicroAssessmentCard from "@/components/shared/MicroAssessmentCard";
import ProfileCompletenessBar from "@/components/shared/ProfileCompletenessBar";
import StarterWeekHeroCard from "@/components/shared/StarterWeekHeroCard";
import StreakFreezeShop from "@/components/shared/StreakFreezeShop";
import AdaptiveXPDisplay from "@/components/shared/AdaptiveXPDisplay";
import TeamDashboardCard from "@/components/shared/TeamDashboardCard";
import HabitTracker from "@/components/shared/HabitTracker";
import StreakDisplay from "@/components/shared/StreakDisplay";
import ComebackChallengeBanner from "@/components/shared/ComebackChallengeBanner";
import HabitDifficultyIndicator from "@/components/shared/HabitDifficultyIndicator";
import TutorEntryButton from "@/components/shared/TutorEntryButton";
import IndependenceScoreBadge from "@/components/shared/IndependenceScoreBadge";
import ActiveBoostIndicator from "@/components/shared/ActiveBoostIndicator";
import XPBalanceBadge from "@/components/shared/XPBalanceBadge";
import WelcomeHero from "@/components/shared/WelcomeHero";
import { useAuth } from "@/hooks/useAuth";
import {
  useStudentKPIs,
  useUpcomingDeadlines,
} from "@/hooks/useStudentDashboard";
import { useStudentDashboardAggregate } from "@/hooks/useStudentDashboardAggregate";
import { useCLOProgress } from "@/hooks/useCLOProgress";
import { useIndependenceScores } from "@/hooks/useIndependenceScore";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import {
  useTodayMicroAssessment,
  useCompleteMicroAssessment,
  useDismissMicroAssessment,
} from "@/hooks/useMicroAssessments";
import { useProfileCompleteness } from "@/hooks/useProfileCompleteness";
import { useStarterWeekSessions } from "@/hooks/useStarterWeekPlan";
import { useOnboardingProgress } from "@/hooks/useOnboardingProgress";
import { useRealtime } from "@/hooks/useRealtime";
import {
  useStreakFreezeInventory,
  usePurchaseStreakFreeze,
} from "@/hooks/useStreakFreeze";
import {
  useComebackChallenge,
  useCancelComebackChallenge,
} from "@/hooks/useComebackChallenge";
import { useHabitDifficultyLevel } from "@/hooks/useHabitDifficulty";
import { useInstitutionSettings } from "@/hooks/useInstitutionSettings";
import {
  useStudentAnnouncements,
  type Announcement,
} from "@/hooks/useAnnouncements";
import { useStudentAttendance } from "@/hooks/useAttendance";
import { useStudentChallenges } from "@/hooks/useChallenges";
import { useMyTeamId } from "@/hooks/useTeamLeaderboard";
import { useTeams, useTeamGamification } from "@/hooks/useTeams";
import { useBadgeSpotlight, useTieredBadges } from "@/hooks/useTieredBadges";
import { useStudentLeagueTier } from "@/hooks/useLeagueLeaderboard";
import { useDeferredMount } from "@/hooks/useDeferredMount";
import BadgeSpotlightCard from "@/components/shared/BadgeSpotlightCard";
import LeagueTierBadge from "@/components/shared/LeagueTierBadge";
import PrimaryCTA, {
  type PrimaryCtaAction,
} from "@/components/shared/PrimaryCTA";
import { useFirstEnrolledCourseId } from "@/hooks/useFirstEnrolledCourse";
import { queryKeys } from "@/lib/queryKeys";
import { ONBOARDING_XP } from "@/lib/onboardingConstants";
import { getDeadlineUrgency } from "@/hooks/useCalendar";
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Flame,
  Star,
  CalendarClock,
  Coins,
  Megaphone,
  ClipboardCheck,
  Trophy,
  Users,
  UserCircle,
  FileCheck,
  MessageSquare,
  type LucideIcon,
  Target,
} from "lucide-react";
import { formatLocalDate } from "@/lib/formatDate";
import { formatNumber, formatPercent } from "@/lib/formatNumber";
import { differenceInDays } from "date-fns";
import { toast } from "sonner";

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: string;
}

const KPICard = ({ icon: Icon, label, value, accent }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div
        className={`p-2 rounded-lg ${
          accent ?? "bg-blue-50"
        } group-hover:scale-110 transition-transform`}
      >
        <Icon
          className={`h-5 w-5 ${accent ? "text-white" : "text-blue-600"}`}
        />
      </div>
    </div>
  </Card>
);

// ─── Student Dashboard ──────────────────────────────────────────────────────

// ─── Announcements Section ──────────────────────────────────────────────────

const AnnouncementsSection = ({
  studentId,
  announcements: announcementsProp,
  fallbackEnabled,
}: {
  studentId: string;
  announcements: Announcement[] | undefined;
  fallbackEnabled: boolean;
}) => {
  const { t } = useTranslation("student");
  const navigate = useNavigate();
  // PERF (spec: dashboard-and-ux-performance, Req 2): consume the aggregate's
  // announcements (passed as a prop) on the happy path with no request of our
  // own. Fallback only: when the aggregate errored (`fallbackEnabled`), this
  // gated hook fetches exactly as before. The optional `enabled` arg is
  // backward-compatible for every other caller of useStudentAnnouncements.
  const hook = useStudentAnnouncements(studentId, 5, {
    enabled: fallbackEnabled,
  });
  const announcements = announcementsProp ?? hook.data;
  // Shimmer on first paint while the aggregate is still resolving (no prop yet
  // and not yet errored) and while the error-gated fallback hook is fetching —
  // mirrors the prior `useStudentAnnouncements(...).isLoading` shimmer. Guarded
  // by `studentId` so the no-user case renders nothing, exactly as before.
  const isLoading =
    !!studentId &&
    announcements === undefined &&
    (!fallbackEnabled || hook.isLoading);

  if (isLoading) {
    return <Shimmer className="h-32 rounded-xl" />;
  }

  if (!announcements || announcements.length === 0) return null;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: "var(--brand-gradient)",
        }}
      >
        <Megaphone className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          {t("dashboard.recentAnnouncements")}
        </h2>
      </div>
      <div className="p-6 space-y-3">
        {announcements.map((a) => (
          <div
            key={a.id}
            className="flex items-start gap-3 py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
            onClick={() => navigate(`/student/announcements/${a.id}`)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/student/announcements/${a.id}`);
            }}
          >
            <Megaphone
              className={`h-4 w-4 mt-0.5 shrink-0 ${
                a.is_pinned ? "text-amber-500" : "text-gray-400"
              }`}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{a.title}</p>
              <p className="text-xs text-gray-500 line-clamp-1">{a.content}</p>
            </div>
            <span className="text-xs text-gray-400 whitespace-nowrap">
              {formatLocalDate(a.created_at, "MMM d")}
            </span>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

const StudentDashboard = () => {
  const { t } = useTranslation("student");
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const studentId = user?.id ?? "";
  const queryClient = useQueryClient();

  // PERF: Defer non-critical hooks until after first paint to reduce
  // thundering herd of 27 parallel queries on dashboard mount.
  // Critical (above-fold): kpis, deadlines, profile, completeness — these fire immediately.
  // Deferred: micro-assessments, badges, teams, attendance, challenges,
  // announcements, league tier, etc. fire after ~500ms.
  const deferredReady = useDeferredMount(500);
  const deferredStudentId = deferredReady ? studentId : undefined;

  // PERF (spec: dashboard-and-ux-performance, Req 2): ONE aggregate round-trip
  // (`get_student_dashboard`) hydrates the KPI + upcoming-deadlines caches AND
  // drives the critical block directly, so it is a single request — not the
  // aggregate plus the two section requests it was meant to replace. Additive +
  // reversible: the section hooks below remain the fallback path, gated to fetch
  // ONLY if the aggregate errors (cache miss / RPC failure), so behavior and data
  // visibility are unchanged (the RPC is SECURITY INVOKER). This does NOT cover
  // the deferred always-on sections yet, so `useDeferredMount(500)` must stay to
  // avoid re-introducing the ~20-hook thundering herd.
  const aggregate = useStudentDashboardAggregate(studentId);

  // Fallback only: the prior `enabled: !!studentId` made these race the aggregate
  // on every mount (so the request count never dropped). Now they fire only when
  // the aggregate fails. The new optional `enabled` arg is backward-compatible
  // (every other caller still gets the default `enabled: !!studentId`).
  const kpisHook = useStudentKPIs(user?.id, { enabled: aggregate.isError });
  const deadlinesHook = useUpcomingDeadlines(user?.id, 5, {
    enabled: aggregate.isError,
  });

  // Render from the aggregate when present, else the fallback hook.
  const kpis = aggregate.data?.kpis ?? kpisHook.data;
  const deadlines = aggregate.data?.deadlines ?? deadlinesHook.data;
  // Skeleton shows on first paint (aggregate pending) and while the fallback hook
  // loads after an aggregate error; the empty/deadline states render exactly as
  // before once a value (from either source) is available.
  const kpisLoading =
    aggregate.isPending || (aggregate.isError && kpisHook.isLoading);
  const deadlinesLoading =
    aggregate.isPending || (aggregate.isError && deadlinesHook.isLoading);

  // Realtime: invalidate XP/streak/level queries when student_gamification changes
  const handleGamificationPayload = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.studentGamification.detail(studentId),
    });
    queryClient.invalidateQueries({
      queryKey: queryKeys.studentDashboard.lists(),
    });
  }, [queryClient, studentId]);

  const handleGamificationPolling = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.studentGamification.detail(studentId),
    });
  }, [queryClient, studentId]);

  const { isLive, retryCount } = useRealtime({
    table: "student_gamification",
    event: "UPDATE",
    filter: studentId ? `student_id=eq.${studentId}` : undefined,
    onPayload: handleGamificationPayload,
    pollingFn: handleGamificationPolling,
    pollingInterval: 30_000,
  });

  // Onboarding-related hooks
  const onboardingCompleted = profile?.onboarding_completed === true;
  const { data: studentProfile } = useStudentProfile(studentId);
  const { data: todayMicro } = useTodayMicroAssessment(deferredStudentId ?? "");
  const completeMicro = useCompleteMicroAssessment();
  const dismissMicro = useDismissMicroAssessment();
  // Profile completeness (spec: dashboard-and-ux-performance, Req 2).
  // The aggregate RPC now carries `profileCompleteness`, so render from it
  // directly and gate the section hook to a fallback-only fetch (fires only when
  // the aggregate errors). The optional `enabled` arg is backward-compatible for
  // every other caller. `completenessData` keeps its prior shape, so the
  // downstream `profileCompleteness` / `day1Completed` derivations are unchanged.
  const completenessHook = useProfileCompleteness(studentId, {
    enabled: aggregate.isError,
  });
  const completenessData =
    aggregate.data?.profileCompleteness ?? completenessHook.data;
  const { data: starterSessions } = useStarterWeekSessions(
    deferredStudentId ?? ""
  );
  const { data: progress } = useOnboardingProgress(studentId);

  // Streak Freeze hooks (spec: dashboard-and-ux-performance, Req 2).
  // The aggregate RPC now carries `streakFreeze`, so render from it directly and
  // gate the inventory hook to a fallback-only fetch (fires only when the
  // aggregate errors). The optional `enabled` arg is backward-compatible for
  // every other caller. `freezeData` keeps its prior shape, so the downstream
  // StreakDisplay / StreakFreezeShop reads below are unchanged.
  const freezeHook = useStreakFreezeInventory(studentId, {
    enabled: aggregate.isError,
  });
  const freezeData = aggregate.data?.streakFreeze ?? freezeHook.data;
  const purchaseFreeze = usePurchaseStreakFreeze();

  // Comeback Challenge hooks — Requirement 124.5
  const { data: comebackData } = useComebackChallenge(deferredStudentId);
  const cancelComeback = useCancelComebackChallenge();

  // Institution settings for Streak Sabbatical — Requirement 125
  const { data: institutionSettings } = useInstitutionSettings();
  const streakSabbaticalEnabled =
    institutionSettings?.streak_sabbatical_enabled ?? false;

  // Habit Difficulty Level — Requirement 127.6
  const { data: habitDifficultyData } =
    useHabitDifficultyLevel(deferredStudentId);

  // Badge Spotlight — Requirement 134.4
  const { data: spotlightData } = useBadgeSpotlight(
    deferredReady ? profile?.institution_id ?? undefined : undefined
  );
  const { data: tieredBadgesData } = useTieredBadges(deferredStudentId);

  // CLO Progress for "Get Help" buttons — Requirement 10.2
  const { data: cloProgressData } = useCLOProgress(deferredStudentId);

  // Independence scores for CLOs — Requirement 28
  const independenceCourseId = cloProgressData?.[0]?.course_id;
  const { data: independenceScores } = useIndependenceScores(
    deferredStudentId ?? "",
    independenceCourseId ?? ""
  );
  const independenceMap = new Map(
    (independenceScores ?? []).map((s) => [s.clo_id, s.score])
  );

  // League Tier — Requirement 132.3
  const { data: leagueTierData } = useStudentLeagueTier(deferredStudentId);

  const spotlightBadge = tieredBadgesData?.find(
    (b) => b.category === spotlightData?.category
  );
  const spotlightDaysRemaining = (() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    return dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
  })();

  // Attendance data (spec: dashboard-and-ux-performance, Req 2).
  // The aggregate RPC already returns `attendance`, so render from it directly
  // and gate the section hook to a fallback-only fetch (fires only when the
  // aggregate errors). This drops attendance's per-course fan-out from the happy
  // path; the optional `enabled` arg is backward-compatible for other callers.
  const attendanceHook = useStudentAttendance(studentId, {
    enabled: aggregate.isError,
  });
  const attendanceCourses = aggregate.data?.attendance ?? attendanceHook.data;
  // Skeleton on first paint (aggregate pending) and while the fallback loads
  // after an aggregate error; the card/empty (null) states render exactly as
  // before once a value (from either source) is available.
  const attendanceLoading =
    aggregate.isPending || (aggregate.isError && attendanceHook.isLoading);

  // Active challenges for dashboard section
  const { data: studentChallenges } = useStudentChallenges(deferredStudentId);
  const activeChallenges = (studentChallenges ?? []).filter(
    (c) => c.status === "active"
  );

  // Team data for dashboard card — Requirement 112.7
  // First active course is resolved through the shared `useFirstEnrolledCourseId`
  // hook (also consumed by StudentTeamPage); the fetch is deferred until after
  // first paint to match the dashboard's non-critical-query strategy.
  const firstCourseQuery = useFirstEnrolledCourseId(studentId || undefined, {
    enabled: deferredReady,
  });
  const firstCourseId = firstCourseQuery.data ?? undefined;
  const { data: myTeamId } = useMyTeamId(deferredStudentId, firstCourseId);
  const { data: teamsData } = useTeams(firstCourseId);
  const myTeam = (teamsData ?? []).find((t) => t.id === myTeamId);
  const { data: teamGamification } = useTeamGamification(myTeamId ?? undefined);

  const profileCompleteness = completenessData?.profile_completeness ?? 0;
  const day1Completed = completenessData?.day1_completed ?? false;
  const hasSkippedSections = (progress?.skipped_sections?.length ?? 0) > 0;

  // Determine if starter week is post-week (7+ days since first session)
  const isPostWeek = (() => {
    if (!starterSessions || starterSessions.length === 0) return false;
    const firstDate = starterSessions[0]?.suggested_date;
    if (!firstDate) return false;
    return differenceInDays(new Date(), new Date(firstDate)) >= 7;
  })();

  // Determine if student deferred onboarding (not completed, account > 1 day old)
  const showDeferredBanner =
    !onboardingCompleted && profile?.created_at
      ? differenceInDays(new Date(), new Date(profile.created_at)) >= 1
      : false;

  // R16 — Single prioritized dashboard CTA.
  // The previously-stacked "Complete onboarding" and "Complete assessment"
  // banners are now candidate actions fed to `primaryCtaSelector` (via
  // PrimaryCTA), alongside Submit Assignment, Continue Course, and Review
  // Feedback. Only `applicable` candidates are considered; the selector picks
  // the single dominant CTA and orders the rest as subordinate secondaries.
  // When the top candidate stops applying (e.g. profile completed), the next
  // applicable candidate is promoted automatically. Lower priority = higher
  // precedence.
  const nextDeadline = (deadlines ?? [])[0];
  const enrolledCourses = kpis?.enrolledCourses ?? 0;
  const completedAssignments = kpis?.completedAssignments ?? 0;

  // "Complete Profile" covers both the deferred-onboarding case (not yet
  // completed) and the skipped-sections case (completed but sections skipped);
  // the two are mutually exclusive, so a single candidate carries the right
  // destination and copy for whichever applies.
  const profileDeferred = showDeferredBanner;
  const profileHasSkipped =
    onboardingCompleted &&
    hasSkippedSections &&
    !studentProfile?.personality_traits &&
    !studentProfile?.learning_style;
  const profileApplicable = profileDeferred || profileHasSkipped;

  const ctaActions = useMemo<PrimaryCtaAction[]>(
    () => [
      {
        id: "complete-profile",
        priority: 0,
        applicable: profileApplicable,
        icon: UserCircle,
        href: profileDeferred
          ? "/student/onboarding"
          : "/student/onboarding/complete-profile",
        label: profileDeferred
          ? t("dashboard.primaryCta.completeProfile.label")
          : t("dashboard.primaryCta.finishProfile.label"),
        description: profileDeferred
          ? t("dashboard.primaryCta.completeProfile.description")
          : t("dashboard.primaryCta.finishProfile.description"),
        ctaLabel: profileDeferred
          ? t("dashboard.primaryCta.completeProfile.cta")
          : t("dashboard.primaryCta.finishProfile.cta"),
      },
      {
        id: "submit-assignment",
        priority: 1,
        applicable: Boolean(nextDeadline),
        icon: FileCheck,
        href: nextDeadline
          ? `/student/assignments/${nextDeadline.id}`
          : "/student/assignments",
        label: t("dashboard.primaryCta.submitAssignment.label"),
        description: nextDeadline
          ? t("dashboard.primaryCta.submitAssignment.description", {
              title: nextDeadline.title,
            })
          : undefined,
        ctaLabel: t("dashboard.primaryCta.submitAssignment.cta"),
      },
      {
        id: "continue-course",
        priority: 2,
        applicable: enrolledCourses > 0,
        icon: BookOpen,
        href: "/student/courses",
        label: t("dashboard.primaryCta.continueCourse.label"),
        description: t("dashboard.primaryCta.continueCourse.description"),
        ctaLabel: t("dashboard.primaryCta.continueCourse.cta"),
      },
      {
        id: "review-feedback",
        priority: 3,
        applicable: completedAssignments > 0,
        icon: MessageSquare,
        href: "/student/progress",
        label: t("dashboard.primaryCta.reviewFeedback.label"),
        description: t("dashboard.primaryCta.reviewFeedback.description"),
        ctaLabel: t("dashboard.primaryCta.reviewFeedback.cta"),
      },
    ],
    [
      t,
      profileApplicable,
      profileDeferred,
      nextDeadline,
      enrolledCourses,
      completedAssignments,
    ]
  );

  return (
    <div className="space-y-6">
      {/* Live updates status */}
      <RealtimeStatusBanner isLive={isLive} retryCount={retryCount} />

      {/* R16 — Single prioritized dashboard call-to-action.
          Replaces the previously-stacked onboarding/assessment banners with one
          dominant CTA chosen by `primaryCtaSelector`; remaining applicable
          candidates render as visually subordinate secondary actions. */}
      <PrimaryCTA
        actions={ctaActions}
        regionLabel={t("dashboard.primaryCta.region")}
        heading={t("dashboard.primaryCta.heading")}
      />

      {/* 7.3 — Micro-assessment prompt (first 14 days) */}
      {onboardingCompleted && todayMicro && (
        <MicroAssessmentCard
          assessmentType={todayMicro.assessment_type}
          questionCount={todayMicro.question_ids.length}
          dismissalCount={todayMicro.dismissal_count}
          isPending={completeMicro.isPending || dismissMicro.isPending}
          onComplete={() =>
            completeMicro.mutate(
              { id: todayMicro.id, studentId },
              {
                onSuccess: () =>
                  toast.success(
                    t("onboarding.microAssessment.completed", {
                      amount: ONBOARDING_XP.micro_assessment,
                    })
                  ),
                onError: () =>
                  toast.error(t("onboarding.microAssessment.completeError")),
              }
            )
          }
          onDismiss={() =>
            dismissMicro.mutate(
              {
                id: todayMicro.id,
                studentId,
                currentDismissals: todayMicro.dismissal_count,
              },
              {
                onSuccess: () =>
                  toast.success(t("onboarding.microAssessment.remindedLater")),
                onError: () =>
                  toast.error(t("onboarding.microAssessment.dismissError")),
              }
            )
          }
        />
      )}

      {/* 7.5 — Starter Week Hero Card */}
      {onboardingCompleted &&
        day1Completed &&
        starterSessions &&
        starterSessions.length > 0 && (
          <StarterWeekHeroCard
            sessions={starterSessions}
            onViewPlan={() => navigate("/student/planner/starter-week")}
            isPostWeek={isPostWeek}
          />
        )}

      {/* Welcome Hero Card */}
      <WelcomeHero
        name={profile?.full_name ?? "Student"}
        userRole="student"
        subtitle={t("dashboard.momentum")}
        stats={
          <div className="flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black">{kpis?.totalXP ?? 0}</p>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/60">
                {t("dashboard.totalXP")}
              </p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">
                {t("dashboard.level", { level: kpis?.currentLevel ?? 1 })}
              </p>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/60">
                {t("dashboard.levelLabel")}
              </p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <XPBalanceBadge
                size="sm"
                className="bg-white/10 border-white/20 text-white"
              />
              <p className="mt-1 text-[10px] font-black tracking-widest uppercase text-white/60">
                {t("dashboard.xpAvailable", "Available XP")}
              </p>
            </div>
          </div>
        }
      />

      {/* Active XP Boost Indicator — Marketplace Integration */}
      {studentId && <ActiveBoostIndicator className="mx-auto" />}

      {/* 7.4 — Profile Completeness Bar */}
      {onboardingCompleted && profileCompleteness < 100 && (
        <ProfileCompletenessBar completeness={profileCompleteness} />
      )}
      {onboardingCompleted && profileCompleteness >= 100 && (
        <ProfileCompletenessBar completeness={100} />
      )}

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
          data-tour="kpi-row"
        >
          <KPICard
            icon={BookOpen}
            label={t("dashboard.courses")}
            value={formatNumber(kpis?.enrolledCourses ?? 0)}
          />
          <KPICard
            icon={CheckCircle2}
            label={t("dashboard.completed")}
            value={formatNumber(kpis?.completedAssignments ?? 0)}
          />
          <KPICard
            icon={TrendingUp}
            label={t("dashboard.avgAttainment")}
            value={formatPercent(kpis?.avgAttainment ?? 0)}
          />
          <KPICard
            icon={Flame}
            label={t("dashboard.streak")}
            value={`${kpis?.currentStreak ?? 0}d`}
          />
        </div>
      )}

      {/* Comeback Challenge Banner — Requirement 124.5 */}
      {comebackData?.is_active && (
        <ComebackChallengeBanner
          daysCompleted={comebackData.days_completed}
          streakToRestore={comebackData.streak_to_restore}
          onDismiss={() => {
            if (studentId) {
              cancelComeback.mutate(studentId);
            }
          }}
        />
      )}

      {/* Badge Spotlight Card — Requirement 134.4 */}
      {spotlightData && (
        <BadgeSpotlightCard
          category={spotlightData.category}
          currentTier={spotlightBadge?.tier ?? null}
          progress={spotlightBadge?.progress_toward_next ?? 0}
          daysRemaining={spotlightDaysRemaining}
        />
      )}

      {/* Streak Display with Sabbatical range and Total Active Days — Requirements 126.1, 126.2 */}
      <div data-tour="xp-streak">
        <StreakDisplay
          streakCount={kpis?.currentStreak ?? 0}
          streakFreezesAvailable={freezeData?.freezes ?? 0}
          streakSabbaticalEnabled={streakSabbaticalEnabled}
          restDays={0}
          totalActiveDays={kpis?.totalActiveDays ?? 0}
        />
      </div>

      {/* Two-column layout: Upcoming Deadlines + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <CalendarClock className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.upcomingDeadlines")}
            </h2>
          </div>
          <div className="p-6">
            {deadlinesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shimmer key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (deadlines ?? []).length > 0 ? (
              <div className="space-y-3">
                {(deadlines ?? []).map((d) => {
                  const urgency = getDeadlineUrgency(d.due_date);
                  const urgencyStyles = {
                    red: "bg-red-50 text-red-700 border-red-200",
                    yellow: "bg-yellow-50 text-yellow-700 border-yellow-200",
                    green: "bg-green-50 text-green-700 border-green-200",
                  };
                  return (
                    <div
                      key={d.id}
                      className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.title}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {d.course_name}
                        </p>
                      </div>
                      <Badge
                        className={`text-xs whitespace-nowrap ${urgencyStyles[urgency]}`}
                      >
                        {formatLocalDate(d.due_date, "MMM d")}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-green-50 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">
                  {t("dashboard.noDeadlines")}
                </p>
              </div>
            )}
          </div>
        </Card>

        {/* Gamification Summary + Streak Freeze */}
        <div className="space-y-4">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <Star className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t("dashboard.yourProgress")}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {t("dashboard.totalXP")}
                </span>
                <span className="text-sm font-bold text-amber-600">
                  {kpis?.totalXP ?? 0} {t("dashboard.xp")}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {t("dashboard.currentLevel")}
                </span>
                <span className="text-sm font-bold">
                  {t("dashboard.levelLabel")} {kpis?.currentLevel ?? 1}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {t("dashboard.loginStreak")}
                </span>
                <span className="text-sm font-bold text-red-500">
                  {t("dashboard.daysStreak", {
                    count: kpis?.currentStreak ?? 0,
                  })}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-600">
                  {t("dashboard.assignmentsDone")}
                </span>
                <span className="text-sm font-bold">
                  {kpis?.completedAssignments ?? 0}
                </span>
              </div>

              {/* League Tier Badge — Requirement 132.3 */}
              {leagueTierData && (
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-600">
                    {t("dashboard.leagueTier")}
                  </span>
                  <LeagueTierBadge tier={leagueTierData.tier} size="sm" />
                </div>
              )}

              {/* Adaptive XP Multiplier Display — Requirements 120.5, 122.3 */}
              {studentId && (
                <div className="pt-2 border-t border-slate-100">
                  <AdaptiveXPDisplay studentId={studentId} />
                </div>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/student/xp-history")}
                className="w-full mt-2 text-xs font-semibold text-amber-600 border-amber-200 hover:bg-amber-50"
              >
                <Coins className="h-4 w-4 me-1" />
                {t("dashboard.viewXPHistory")}
              </Button>
            </div>
          </Card>

          {/* Streak Freeze Shop */}
          <StreakFreezeShop
            currentXP={freezeData?.xpTotal ?? kpis?.totalXP ?? 0}
            freezesAvailable={freezeData?.freezes ?? 0}
            onPurchase={async () => {
              try {
                await purchaseFreeze.mutateAsync(studentId);
              } catch (err) {
                toast.error(
                  err instanceof Error
                    ? err.message
                    : "Failed to purchase streak freeze"
                );
              }
            }}
          />
        </div>
      </div>

      {/* Recent Announcements */}
      <AnnouncementsSection
        studentId={studentId}
        announcements={aggregate.data?.announcements}
        fallbackEnabled={aggregate.isError}
      />

      {/* CLO Attainment Progress — Requirement 10.2 */}
      {cloProgressData &&
        cloProgressData.length > 0 &&
        (() => {
          const lowCLOs = cloProgressData.flatMap((course) =>
            course.entries
              .filter(
                (e) =>
                  e.attainment_percent !== null && e.attainment_percent < 70
              )
              .map((e) => ({ ...e, course_name: course.course_name }))
          );
          if (lowCLOs.length === 0) return null;
          return (
            <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{
                  background: "var(--brand-gradient)",
                }}
              >
                <Target className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold tracking-tight text-white">
                  {t("dashboard.closNeedingAttention")}
                </h2>
              </div>
              <div className="p-6 space-y-4">
                {lowCLOs.slice(0, 6).map((clo) => (
                  <div key={clo.clo_id} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          {clo.clo_title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {clo.course_name}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-bold text-red-600">
                          {Math.round(clo.attainment_percent ?? 0)}%
                        </span>
                        {independenceMap.has(clo.clo_id) && (
                          <IndependenceScoreBadge
                            score={independenceMap.get(clo.clo_id)!}
                          />
                        )}
                        <TutorEntryButton
                          courseId={clo.course_id}
                          cloIds={[clo.clo_id]}
                          compact
                          label={`Get Help with ${clo.clo_title}`}
                        />
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-red-400 transition-all duration-300"
                        style={{
                          width: `${Math.round(clo.attainment_percent ?? 0)}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })()}

      {/* Team Dashboard Card — Requirement 112.7 */}
      {myTeam && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Users className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.myTeam")}
            </h2>
          </div>
          <div className="p-6">
            <TeamDashboardCard team={myTeam} gamification={teamGamification} />
          </div>
        </Card>
      )}

      {/* Active Challenges — Requirement 113.5 */}
      {activeChallenges.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Trophy className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.challenges")}
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {activeChallenges.slice(0, 3).map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 rounded-lg px-2 -mx-2 transition-colors"
                onClick={() => navigate("/student/challenges")}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter") navigate("/student/challenges");
                }}
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.title}</p>
                  <p className="text-xs text-gray-500">
                    {c.challenge_type === "team"
                      ? t("dashboard.team")
                      : t("dashboard.courseWide")}{" "}
                    · {c.goal_metric}
                  </p>
                </div>
                <Badge className="text-xs bg-amber-50 text-amber-700 border-amber-200 whitespace-nowrap">
                  {t("dashboard.target")}: {c.goal_target}
                </Badge>
              </div>
            ))}
            {activeChallenges.length > 3 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/student/challenges")}
                className="w-full text-xs font-semibold text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {t("dashboard.viewAllChallenges", {
                  count: activeChallenges.length,
                })}
              </Button>
            )}
          </div>
        </Card>
      )}

      {/* Attendance per enrolled course — Requirement 78.5 */}
      {attendanceLoading ? (
        <Shimmer className="h-40 rounded-xl" />
      ) : attendanceCourses && attendanceCourses.length > 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <ClipboardCheck className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.attendance")}
            </h2>
          </div>
          <div className="p-6 space-y-3">
            {attendanceCourses.map((c) => (
              <div
                key={c.courseId}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{c.courseName}</p>
                  <p className="text-xs text-gray-500">
                    {c.attended}/{c.totalSessions} sessions
                  </p>
                </div>
                <Badge
                  className={`text-xs font-bold ${
                    c.attendancePercent < 75
                      ? "bg-red-50 text-red-700 border-red-200"
                      : "bg-green-50 text-green-700 border-green-200"
                  }`}
                >
                  {c.attendancePercent}%
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      ) : null}

      {/* Daily Habit Tracker — 8 habits — Requirement 120.5 */}
      {studentId && (
        <div data-tour="habits-tracker">
          <HabitTracker studentId={studentId} />
        </div>
      )}

      {/* Habit Difficulty Level Indicator — Requirement 127.6 */}
      {studentId && habitDifficultyData && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-4">
          <HabitDifficultyIndicator
            level={habitDifficultyData.level}
            habitLevelStreak={habitDifficultyData.habit_level_streak}
          />
        </Card>
      )}

      {/* 7.2 — Profile Summary Card */}
      {onboardingCompleted && studentProfile && (
        <ProfileSummaryCard
          personalityTraits={studentProfile.personality_traits}
          learningStyle={studentProfile.learning_style}
          selfEfficacy={studentProfile.self_efficacy}
          studyStrategies={studentProfile.study_strategies}
          hasSkippedSections={hasSkippedSections}
          onRetake={() => navigate("/student/settings/reassessment")}
          onCompleteRemaining={() =>
            navigate("/student/onboarding/complete-profile")
          }
        />
      )}
    </div>
  );
};

export default StudentDashboard;
