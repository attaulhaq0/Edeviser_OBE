import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";
import Shimmer from "@/components/shared/Shimmer";
import WelcomeHero from "@/components/shared/WelcomeHero";
import { useAuth } from "@/hooks/useAuth";
import { useParentKPIs, useLinkedChildren } from "@/hooks/useParentDashboard";
import { useParentDashboardAggregate } from "@/hooks/useParentDashboardAggregate";
import ErrorState from "@/components/shared/ErrorState";
import {
  Users,
  BookOpen,
  TrendingUp,
  CalendarDays,
  GraduationCap,
  Flame,
  type LucideIcon,
} from "lucide-react";

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
}

const KPICard = ({ icon: Icon, label, value }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

// ─── Parent Dashboard ───────────────────────────────────────────────────────

const ParentDashboard = () => {
  const { t } = useTranslation("common");
  const { user, profile } = useAuth();
  // PERF (spec: dashboard-and-ux-performance, Phase 8 Task 36): ONE aggregate
  // round-trip (`get_parent_dashboard`, SECURITY INVOKER / RLS-scoped to the
  // caller's verified-linked children) hydrates both section caches and drives
  // the KPI row + children list directly. Additive + reversible: each section
  // hook falls back to its own fan-out ONLY when the aggregate errors.
  const aggregate = useParentDashboardAggregate(user?.id);
  const kpisHook = useParentKPIs(user?.id, { enabled: aggregate.isError });
  const childrenHook = useLinkedChildren(user?.id, {
    enabled: aggregate.isError,
  });
  const kpis = aggregate.data?.kpis ?? kpisHook.data;
  const children = aggregate.data?.children ?? childrenHook.data;
  const kpisLoading =
    aggregate.isPending || (aggregate.isError && kpisHook.isLoading);
  const childrenLoading =
    aggregate.isPending || (aggregate.isError && childrenHook.isLoading);
  // Task 32: a failed load must show a distinct, retryable error instead of the
  // "no children" empty state. Errored only when the aggregate AND its section-
  // hook fallback both failed (so we genuinely have no data to show).
  const childrenError = aggregate.isError && childrenHook.isError;

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <WelcomeHero
        name={profile?.full_name ?? "Parent"}
        userRole="parent"
        subtitle={t("parentDashboard.subtitle")}
      />

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
          />
          <KPICard
            icon={CalendarDays}
            label={t("parentDashboard.deadlines")}
            value={kpis?.upcomingDeadlines ?? 0}
          />
        </div>
      )}

      {/* Children Overview */}
      <Card
        className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0"
        data-tour="linked-students"
      >
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <GraduationCap className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t("parentDashboard.yourChildren")}
          </h2>
        </div>
        <div className="p-6">
          {childrenLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : childrenError ? (
            <ErrorState
              title={t("errorBoundary.title")}
              message={t("errors.generic")}
              retryLabel={t("actions.retry")}
              onRetry={() => {
                void aggregate.refetch();
                void childrenHook.refetch();
              }}
              className="py-8"
            />
          ) : (children ?? []).length > 0 ? (
            <div className="space-y-4">
              {(children ?? []).map((child) => (
                <div
                  key={child.student_id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">
                        {child.student_name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {t("parentDashboard.levelLabel")} {child.current_level}{" "}
                        · {child.enrolled_courses}{" "}
                        {t("parentDashboard.coursesLabel")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {child.xp_total} {t("parentDashboard.xp")}
                    </Badge>
                    <span className="text-sm font-medium text-red-500 flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      {child.current_streak}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-blue-50 mb-3">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm text-gray-500 max-w-[260px]">
                {t("parentDashboard.noChildren")}
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ParentDashboard;
