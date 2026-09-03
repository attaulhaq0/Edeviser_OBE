import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Award,
  Bell,
  BookOpen,
  Bot,
  Building2,
  CalendarDays,
  Camera,
  ChevronRight,
  ClipboardList,
  Edit3,
  FileText,
  Flame,
  GraduationCap,
  HeartPulse,
  LockKeyhole,
  LogOut,
  Palette,
  Settings,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Trophy,
  UserRound,
  UsersRound,
  WalletCards,
  Zap,
} from "lucide-react";
import { Button, PCard, SectionHeader, Shimmer, Switch } from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useAnonymousStatus, useToggleAnonymous } from "@/hooks/useLeaderboard";
import { useEquippedItems } from "@/hooks/useEquippedItems";
import { useHeatmapData } from "@/hooks/useHeatmapData";
import { useLevel } from "@/hooks/useLevel";
import { useStreak } from "@/hooks/useStreak";
import { useStudentProfile } from "@/hooks/useStudentProfile";
import { useStudentAcademicInfo } from "@/hooks/useStudentAcademicInfo";
import { useTieredBadges } from "@/hooks/useTieredBadges";
import { cn } from "@/lib/utils";

const DAY_MS = 24 * 60 * 60 * 1000;

const menuItems = [
  { to: "/student/leaderboard", icon: Trophy, key: "leaderboard" },
  { to: "/student/marketplace", icon: WalletCards, key: "marketplace" },
  { to: "/student/habits", icon: HeartPulse, key: "wellness" },
  { to: "/student/challenges", icon: Target, key: "quests" },
  { to: "/student/portfolio", icon: ClipboardList, key: "portfolio" },
  { to: "/student/journal", icon: BookOpen, key: "journal" },
  { to: "/student/team", icon: UsersRound, key: "team" },
  { to: "/student/calendar", icon: CalendarDays, key: "calendar" },
  { to: "/student/transcript", icon: FileText, key: "transcript" },
  { to: "/student/fees", icon: WalletCards, key: "fees" },
  { to: "/student/surveys", icon: ClipboardList, key: "surveys" },
  { to: "/student/learning-profile", icon: Sparkles, key: "learningProfile" },
  { to: "/student/settings/profile", icon: Settings, key: "settings" },
] as const;

const StudentProfilePage = () => {
  const { t } = useTranslation("student");
  const { user, profile, signOut } = useAuth();
  const studentId = user?.id;

  const level = useLevel(studentId);
  const streak = useStreak();
  const badges = useTieredBadges(studentId);
  const learningProfile = useStudentProfile(studentId ?? "");
  const equipped = useEquippedItems(studentId ?? "");
  // T30 (E3.I): academic info card — program(s)/faculty from real enrollment.
  const academicInfo = useStudentAcademicInfo(studentId);
  const anonymous = useAnonymousStatus();
  const toggleAnonymous = useToggleAnonymous();

  const activityRange = useMemo(() => {
    const end = new Date();
    const start = new Date(end.getTime() - 118 * DAY_MS);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
  }, []);
  const activity = useHeatmapData(studentId, activityRange);

  const levelData = level.data;
  const streakData = streak.data;
  const earnedBadges = badges.data ?? [];
  const activeDays =
    activity.data?.filter((day) => day.totalCount > 0).length ?? 0;
  const xpRemaining = levelData
    ? Math.max(0, levelData.xpForNextLevel - levelData.xpTotal)
    : 0;
  const initials = (profile?.full_name ?? "Student")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  const learningStyle =
    learningProfile.data?.learning_style?.dominant_style ?? null;

  return (
    <div className="space-y-5">
      <SectionHeader
        icon={UserRound}
        title={t("profilePage.title")}
        description={t("profilePage.subtitle")}
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/student/settings/profile">
              <Edit3 className="size-4" aria-hidden="true" />
              {t("profilePage.edit")}
            </Link>
          </Button>
        }
      />

      <PCard className="p-5">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex items-center gap-4">
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="relative size-16 shrink-0 rounded-full bg-gradient-to-br from-teal-500 to-blue-600 text-lg font-black text-white shadow-md hover:text-white"
              >
                <Link
                  to="/student/settings/profile"
                  aria-label={t("profilePage.changePhoto")}
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="size-16 rounded-full object-cover"
                    />
                  ) : (
                    <span>{initials || "S"}</span>
                  )}
                  <span className="absolute -bottom-1 -end-1 flex size-6 items-center justify-center rounded-full border-2 border-white bg-slate-900 text-white">
                    <Camera className="size-3" aria-hidden="true" />
                  </span>
                </Link>
              </Button>
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-black tracking-tight text-slate-950">
                  {profile?.full_name ?? t("profilePage.student")}
                </h1>
                <p className="mt-1 text-sm font-semibold text-slate-600">
                  {t("profilePage.student")}
                </p>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {profile?.email}
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <ProfileStat
                icon={Star}
                value={level.isLoading ? null : levelData?.level ?? 1}
                label={t("profilePage.level")}
                tone="amber"
              />
              <ProfileStat
                icon={Zap}
                value={level.isLoading ? null : levelData?.xpTotal ?? 0}
                label={t("profilePage.totalXp")}
                tone="blue"
              />
              <ProfileStat
                icon={Flame}
                value={streak.isLoading ? null : streakData?.streak_count ?? 0}
                label={t("profilePage.dayStreak")}
                tone="red"
              />
              <ProfileStat
                icon={Award}
                value={badges.isLoading ? null : earnedBadges.length}
                label={t("profilePage.badges")}
                tone="violet"
              />
            </div>
          </div>

          <div className="flex min-w-56 flex-col gap-2 lg:items-stretch">
            <Button asChild variant="outline" size="sm">
              <Link to="/student/settings/profile">
                <Edit3 className="size-4" aria-hidden="true" />
                {t("profilePage.editProfile")}
              </Link>
            </Button>
            <Button asChild variant="tactile" size="sm">
              <Link to="/student/portfolio">
                <UserRound className="size-4" aria-hidden="true" />
                {t("profilePage.viewPortfolio")}
              </Link>
            </Button>
          </div>
        </div>
      </PCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <PCard className="p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="font-black text-slate-900">
              {t("profilePage.levelProgress", {
                current: levelData?.level ?? 1,
                next: (levelData?.level ?? 1) + 1,
              })}
            </p>
            <p className="text-xs font-semibold text-slate-500">
              {levelData
                ? `${levelData.xpTotal.toLocaleString()} / ${levelData.xpForNextLevel.toLocaleString()} XP`
                : "—"}
            </p>
          </div>
          <div
            className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100"
            role="progressbar"
            aria-label={t("profilePage.level")}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={levelData?.progressPercent ?? 0}
          >
            <div
              className="h-full rounded-full bg-[image:var(--brand-gradient)]"
              style={{ width: `${levelData?.progressPercent ?? 0}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {t("profilePage.xpRemaining", { count: xpRemaining })}
          </p>
        </PCard>

        <PCard className="p-4">
          <div className="flex items-center gap-3">
            <span className="flex size-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Flame className="size-6" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-black text-orange-600">
                {streakData?.streak_count ?? 0}
                <span className="ms-2 text-sm font-semibold text-slate-500">
                  {t("profilePage.dayStreak")}
                </span>
              </p>
              <p className="text-xs text-slate-500">
                {t("profilePage.freezes", {
                  count: streakData?.streak_freezes_available ?? 0,
                })}
              </p>
            </div>
          </div>
        </PCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
              {t("profilePage.badgesCount", { count: earnedBadges.length })}
            </p>
            <Link
              to="/student/badges"
              className="text-xs font-bold text-blue-700 hover:underline"
            >
              {t("profilePage.viewAll")}
            </Link>
          </div>
          {badges.isLoading ? (
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, index) => (
                <Shimmer key={index} className="h-20 rounded-xl" />
              ))}
            </div>
          ) : earnedBadges.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {earnedBadges.slice(0, 8).map((badge) => (
                <div
                  key={badge.id}
                  className={cn(
                    "flex min-h-20 flex-col items-center justify-center gap-1 rounded-xl border-2 p-2 text-center",
                    badge.tier === "gold" && "border-amber-400",
                    badge.tier === "silver" && "border-slate-300",
                    badge.tier === "bronze" && "border-orange-300",
                    badge.tier == null && "border-slate-200"
                  )}
                >
                  <Award className="size-6 text-amber-600" aria-hidden="true" />
                  <span className="line-clamp-2 text-[10px] font-black text-slate-800">
                    {badge.name}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-slate-500">
              {t("profilePage.noBadges")}
            </p>
          )}
        </PCard>

        <PCard className="p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
              {t("profilePage.learningActivity")}
            </p>
            <span className="text-[11px] font-semibold text-slate-500">
              {t("profilePage.lastWeeks", { count: 17 })}
            </span>
          </div>
          {activity.isLoading ? (
            <Shimmer className="h-28 rounded-xl" />
          ) : (
            <>
              <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto pb-1">
                {(activity.data ?? []).map((day) => (
                  <span
                    key={day.date}
                    title={`${day.date}: ${day.totalCount}`}
                    className={cn(
                      "size-3 rounded-[3px]",
                      day.totalCount === 0 && "bg-slate-100",
                      day.totalCount === 1 && "bg-emerald-200",
                      day.totalCount === 2 && "bg-emerald-400",
                      day.totalCount === 3 && "bg-emerald-600",
                      day.totalCount >= 4 && "bg-emerald-800"
                    )}
                  />
                ))}
              </div>
              <p className="mt-3 text-xs text-slate-600">
                <strong className="text-slate-900">{activeDays}</strong>{" "}
                {t("profilePage.activeDays")}
              </p>
            </>
          )}
        </PCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <PCard className="overflow-hidden p-0">
          <nav aria-label={t("profilePage.profileLinks")}>
            {menuItems.map(({ to, icon: Icon, key }) => (
              <Link
                key={to}
                to={to}
                className="flex min-h-12 items-center gap-3 border-b border-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors last:border-b-0 hover:bg-slate-50 hover:text-slate-950"
              >
                <Icon className="size-5 text-slate-500" aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  {t(`profilePage.links.${key}`)}
                </span>
                <ChevronRight
                  className="size-4 text-slate-400 rtl:rotate-180"
                  aria-hidden="true"
                />
              </Link>
            ))}
          </nav>
        </PCard>

        <div className="space-y-5">
          <PCard className="overflow-hidden p-0">
            <ProfileCardHeading
              icon={Sparkles}
              title={t("profilePage.learningProfile")}
            />
            <div className="space-y-3 p-4">
              <ProfileValue
                label={t("profilePage.learningStyle")}
                value={
                  learningStyle
                    ? t(`learningProfile.styles.${learningStyle}`)
                    : t("profilePage.notComplete")
                }
              />
              <ProfileValue
                label={t("learningProfile.completeness")}
                value={`${Math.round(
                  learningProfile.data?.profile_completeness ?? 0
                )}%`}
              />
              <div
                className="h-2 overflow-hidden rounded-full bg-slate-100"
                role="progressbar"
                aria-label={t("learningProfile.completeness")}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={learningProfile.data?.profile_completeness ?? 0}
              >
                <div
                  className="h-full rounded-full bg-[image:var(--brand-gradient)]"
                  style={{
                    width: `${
                      learningProfile.data?.profile_completeness ?? 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </PCard>

          <PCard className="overflow-hidden p-0">
            <ProfileCardHeading
              icon={ShieldCheck}
              title={t("profilePage.privacy")}
            />
            <div className="flex items-center justify-between gap-4 p-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  {t("profilePage.anonymous")}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {t("profilePage.anonymousDescription")}
                </p>
              </div>
              <Switch
                checked={anonymous.data?.isAnonymous ?? false}
                disabled={anonymous.isLoading || toggleAnonymous.isPending}
                onCheckedChange={() => toggleAnonymous.mutate()}
                aria-label={t("profilePage.anonymous")}
              />
            </div>
          </PCard>

          <PCard className="overflow-hidden p-0">
            <ProfileCardHeading
              icon={Palette}
              title={t("profilePage.equipped")}
            />
            <div className="divide-y divide-slate-100">
              {equipped.isLoading ? (
                <div className="space-y-2 p-4">
                  <Shimmer className="h-8 rounded-lg" />
                  <Shimmer className="h-8 rounded-lg" />
                </div>
              ) : (equipped.data ?? []).length > 0 ? (
                equipped.data?.map((item) => (
                  <ProfileValue
                    key={item.id}
                    label={t(`profilePage.slots.${item.slot}`)}
                    value={item.item_name}
                    className="px-4 py-3"
                  />
                ))
              ) : (
                <p className="p-4 text-sm text-slate-500">
                  {t("profilePage.noEquipped")}
                </p>
              )}
            </div>
          </PCard>
        </div>
      </div>

      {/* T30 (E3.I): academic info — program(s), faculty, enrolled courses. */}
      <PCard className="overflow-hidden p-0">
        <ProfileCardHeading
          icon={Building2}
          title={t("profilePage.academicInfo")}
        />
        {academicInfo.isLoading ? (
          <div className="space-y-2 p-4">
            <Shimmer className="h-8 rounded-lg" />
            <Shimmer className="h-8 rounded-lg" />
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <ProfileValue
              label={t("profilePage.faculty")}
              value={academicInfo.data?.faculty ?? t("profilePage.unavailable")}
              className="px-4 py-3"
            />
            <ProfileValue
              label={t("profilePage.programs")}
              value={
                (academicInfo.data?.programs ?? []).length > 0
                  ? (academicInfo.data?.programs ?? []).join(", ")
                  : t("profilePage.unavailable")
              }
              className="px-4 py-3"
            />
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <span className="text-sm text-slate-600">
                {t("profilePage.enrolledCourses")}
              </span>
              <strong className="text-end text-sm text-slate-900">
                {academicInfo.data?.courses.length ?? 0}
              </strong>
            </div>
          </div>
        )}
      </PCard>

      {/* T30 (E3.I): preferences — reuse existing surfaces (notifications page
          and AI learning profile) instead of duplicating them. */}
      <PCard className="overflow-hidden p-0">
        <ProfileCardHeading icon={Bell} title={t("profilePage.preferences")} />
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <SecurityLink
            to="/student/notification-preferences"
            icon={Bell}
            title={t("profilePage.notificationPrefs")}
          />
          <SecurityLink
            to="/student/learning-profile"
            icon={Bot}
            title={t("profilePage.aiPrefs")}
          />
        </div>
      </PCard>

      <PCard className="overflow-hidden p-0">
        <ProfileCardHeading
          icon={LockKeyhole}
          title={t("profilePage.security")}
        />
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2">
          <SecurityLink
            to="/update-password"
            icon={LockKeyhole}
            title={t("profilePage.changePassword")}
          />
          <SecurityLink
            to="/student/sessions"
            icon={ShieldCheck}
            title={t("profilePage.activeSessions")}
          />
          <SecurityLink
            to="/student/transcript"
            icon={GraduationCap}
            title={t("profilePage.transcript")}
          />
          <SecurityLink
            to="/student/settings/profile"
            icon={Settings}
            title={t("profilePage.dataControls")}
          />
        </div>
      </PCard>

      <Button
        type="button"
        variant="outline"
        className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 hover:text-red-800"
        onClick={() => void signOut()}
      >
        <LogOut className="size-4" aria-hidden="true" />
        {t("profilePage.signOut")}
      </Button>
    </div>
  );
};

const ProfileStat = ({
  icon: Icon,
  value,
  label,
  tone,
}: {
  icon: typeof Star;
  value: number | null;
  label: string;
  tone: "amber" | "blue" | "red" | "violet";
}) => {
  const tones = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    red: "bg-red-50 text-red-700",
    violet: "bg-violet-50 text-violet-700",
  };

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-100 bg-white p-2.5">
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          tones[tone]
        )}
      >
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <strong className="block text-base font-black text-slate-950">
          {value == null ? "—" : value.toLocaleString()}
        </strong>
        <span className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </span>
    </div>
  );
};

const ProfileCardHeading = ({
  icon: Icon,
  title,
}: {
  icon: typeof Star;
  title: string;
}) => (
  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
    <Icon className="size-4 text-teal-700" aria-hidden="true" />
    <h2 className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
      {title}
    </h2>
  </div>
);

const ProfileValue = ({
  label,
  value,
  className,
}: {
  label: string;
  value: string;
  className?: string;
}) => (
  <div className={cn("flex items-center justify-between gap-4", className)}>
    <span className="text-sm text-slate-600">{label}</span>
    <strong className="text-end text-sm text-slate-900">{value}</strong>
  </div>
);

const SecurityLink = ({
  to,
  icon: Icon,
  title,
}: {
  to: string;
  icon: typeof Star;
  title: string;
}) => (
  <Link
    to={to}
    className="flex min-h-14 items-center gap-3 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
  >
    <Icon className="size-4 text-slate-500" aria-hidden="true" />
    <span className="min-w-0 flex-1">{title}</span>
    <ChevronRight
      className="size-4 text-slate-400 rtl:rotate-180"
      aria-hidden="true"
    />
  </Link>
);

export default StudentProfilePage;
