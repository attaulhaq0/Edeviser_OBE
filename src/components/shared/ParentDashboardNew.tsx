// =============================================================================
// ParentDashboardNew — redesigned parent dashboard (P2, spec task 2.3)
// =============================================================================
//
// Growth / wellbeing framing (no raw grades) gated behind `newUiDashboards`
// (see the wrapper in ParentDashboard.tsx). REUSES the existing
// `useParentDashboardAggregate` (one round-trip: KPIs + linked children, no new
// writes). FIRST CUTOVER: this screen now builds entirely from the prototype
// design system (`@/design-system`) — WelcomeHero, KPICard, SectionCard,
// MasteryRing, Shimmer, Badge — instead of the legacy `@/components/shared/*`.
// =============================================================================

import { useTranslation } from "react-i18next";
import {
  BookOpen,
  CalendarDays,
  Flame,
  GraduationCap,
  TrendingUp,
  Users,
} from "lucide-react";

import {
  Badge,
  KPICard,
  MasteryRing,
  SectionCard,
  Shimmer,
  WelcomeHero,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import { attainmentValueClass } from "@/lib/attainmentTone";

const ParentDashboardNew = () => {
  const { t } = useTranslation("common");
  const { user, profile } = useAuth();

  const aggregate = useParentDashboardAggregate(user?.id);
  const kpis = aggregate.data?.kpis;
  const children = aggregate.data?.children ?? [];
  const loading = aggregate.isPending;

  return (
    <div className="space-y-6">
      <WelcomeHero
        name={profile?.full_name ?? "Parent"}
        userRole="parent"
        subtitle={t("parentDashboard.subtitle")}
      />

      {/* KPI row */}
      {loading ? (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KPICard
            icon={Users}
            label={t("parentDashboard.children")}
            value={kpis?.linkedChildren ?? 0}
          />
          <KPICard
            icon={BookOpen}
            label={t("parentDashboard.totalCourses")}
            value={kpis?.totalCourses ?? 0}
          />
          <KPICard
            icon={TrendingUp}
            label={t("parentDashboard.avgAttainment")}
            value={`${kpis?.avgAttainment ?? 0}%`}
            valueClassName={attainmentValueClass(kpis?.avgAttainment ?? 0)}
          />
          <KPICard
            icon={CalendarDays}
            label={t("parentDashboard.deadlines")}
            value={kpis?.upcomingDeadlines ?? 0}
            iconBgClass="bg-amber-50"
            iconColorClass="text-amber-600"
          />
        </div>
      )}

      {/* Children overview */}
      <SectionCard
        icon={GraduationCap}
        title={t("parentDashboard.yourChildren")}
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Shimmer key={i} className="h-20 rounded-xl" />
            ))}
          </div>
        ) : children.length > 0 ? (
          <div className="space-y-3">
            {children.map((child) => (
              <div
                key={child.student_id}
                className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 p-4 transition-colors hover:border-slate-200"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <MasteryRing
                    value={child.avg_attainment}
                    size={52}
                    strokeWidth={6}
                    tone="auto"
                  />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">
                      {child.student_name}
                    </p>
                    <p className="truncate text-xs text-gray-500">
                      {t("parentDashboard.levelLabel")} {child.current_level} ·{" "}
                      {child.enrolled_courses} {t("parentDashboard.coursesLabel")}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {child.xp_total} {t("parentDashboard.xp")}
                  </Badge>
                  <span className="flex items-center gap-1 text-sm font-medium text-orange-500">
                    <Flame className="h-4 w-4" aria-hidden="true" />
                    {child.current_streak}d
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="mb-3 rounded-full bg-blue-50 p-3">
              <Users className="h-8 w-8 text-blue-500" aria-hidden="true" />
            </div>
            <p className="max-w-[260px] text-sm text-gray-500">
              {t("parentDashboard.noChildren")}
            </p>
          </div>
        )}
      </SectionCard>
    </div>
  );
};

export default ParentDashboardNew;
