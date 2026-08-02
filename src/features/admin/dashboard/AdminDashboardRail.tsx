// =============================================================================
// AdminDashboardRail — the admin dashboard's right rail (prototype `railHTML()`
// admin case in shared.js). Fixed, laptop-only (xl+):
//   Institution · AI governance · Departments.
//
// Wired to the REAL hooks the admin dashboard already uses (cache hits; no faked
// data R17; no backend change G.1):
//   - useAdminDashboardAggregate → users / active / programs / courses
//   - useDepartmentAnalytics     → departments by mastery
//
// FLAGGED GAPS (prototype shows them; no admin-scope hook — adapted or omitted):
//   - "Weekly active %" and "Retention risk" counts have no source, so the
//     Institution card shows real totals (users / active / programs / courses).
//   - "AI governance" auto-action counts have no source and there is no
//     /admin/governance route; the card states the real A2 autonomy ceiling as
//     static policy chrome (matching the dashboard footer), with no fake counts.
// =============================================================================

import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { RailCard, RailHead, RailRow, Shimmer } from "@/design-system";
import { Button } from "@/components/ui/button";
import WhyThisPopover from "@/components/shared/WhyThisPopover";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { useAdminAnalytics } from "@/hooks/useAdminAnalytics";
import { useDepartmentAnalytics } from "@/hooks/useAdminDashboard";
import { attainmentValueClass } from "@/lib/attainmentTone";
import { formatNumber } from "@/lib/formatNumber";

const RailLink = ({ to, label }: { to: string; label: string }) => {
  const navigate = useNavigate();
  return (
    <Button
      type="button"
      variant="link"
      size="sm"
      onClick={() => navigate(to)}
      className="mt-2 h-auto px-0 text-xs font-extrabold text-blue-600"
    >
      {label}
    </Button>
  );
};

const AdminDashboardRail = () => {
  const { t } = useTranslation("admin");
  const { institutionId } = useAuth();
  const location = useLocation();
  const isAnalyticsRoute = location.pathname === "/admin/analytics";

  const aggregate = useAdminDashboardAggregate(institutionId);
  const analytics = useAdminAnalytics(undefined, undefined, {
    enabled: isAnalyticsRoute,
  });
  const latestAnalyticsPoint =
    analytics.data?.weeklyActiveLearners[
      analytics.data.weeklyActiveLearners.length - 1
    ];
  const departmentsQuery = useDepartmentAnalytics();

  const kpis = aggregate.data;
  const departments = useMemo(
    () =>
      (departmentsQuery.data ?? [])
        .filter((d) => d.avg_plo_attainment > 0)
        .sort((a, b) => b.avg_plo_attainment - a.avg_plo_attainment)
        .slice(0, 3),
    [departmentsQuery.data]
  );

  return (
    <aside
      aria-label={t("dashboard.rail.label", "Institution")}
      className="hidden max-h-[calc(100vh-var(--app-header-h))] overflow-y-auto border-s border-border bg-white px-5 py-4 dark:bg-background xl:sticky xl:top-[var(--app-header-h)] xl:col-start-3 xl:row-start-1 xl:block"
    >
      {/* ── Institution (real totals) ── */}
      <RailCard>
        <RailHead title={t("dashboard.rail.institution", "🏛️ Institution")} />
        <WhyThisPopover
          title={t("dashboard.rail.institution", "🏛️ Institution")}
          reasons={[
            t("common:header.whySignals.admin", {
              users: formatNumber(kpis?.totalUsers ?? 0),
              departments: departments.length,
            }),
          ]}
        />
        {isAnalyticsRoute ? (
          analytics.isPending ? (
            <Shimmer className="h-20 rounded-lg" />
          ) : analytics.isError || !analytics.data ? (
            <p className="text-xs text-slate-500">
              {t("dashboard.rail.unavailable", "Live metrics unavailable.")}
            </p>
          ) : (
            <>
              <RailRow>
                <span className="min-w-0 flex-1">
                  {t("dashboard.rail.activeLearners", "Active learners")}
                </span>
                <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                  {formatNumber(analytics.data.retentionRisk.total)}
                </b>
              </RailRow>
              <RailRow>
                <span className="min-w-0 flex-1">
                  {t("dashboard.rail.weeklyActive", "Weekly active")}
                </span>
                <b className="text-[12px] font-extrabold text-green-700">
                  {latestAnalyticsPoint?.activePercent ?? "—"}
                  {latestAnalyticsPoint ? "%" : null}
                </b>
              </RailRow>
              <RailRow>
                <span className="min-w-0 flex-1">
                  {t("dashboard.rail.retentionRisk", "Retention risk")}
                </span>
                <b className="text-[12px] font-extrabold text-amber-700">
                  {formatNumber(analytics.data.retentionRisk.atRisk)}
                </b>
              </RailRow>
              <RailLink
                to="/admin/analytics"
                label={t("dashboard.rail.analytics", "See analytics →")}
              />
            </>
          )
        ) : aggregate.isPending ? (
          <Shimmer className="h-20 rounded-lg" />
        ) : aggregate.isError || !kpis ? (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.unavailable", "Live metrics unavailable.")}
          </p>
        ) : (
          <>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.users", "Users")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {formatNumber(kpis.totalUsers)}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.active", "Active accounts")}
              </span>
              <b className="text-[12px] font-extrabold text-green-700">
                {formatNumber(kpis.activeUsers)}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.programs", "Programs")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {formatNumber(kpis.totalPrograms)}
              </b>
            </RailRow>
            <RailRow>
              <span className="min-w-0 flex-1">
                {t("dashboard.rail.courses", "Courses")}
              </span>
              <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
                {formatNumber(kpis.totalCourses)}
              </b>
            </RailRow>
            <RailLink
              to="/admin/analytics"
              label={t("dashboard.rail.analytics", "See analytics →")}
            />
          </>
        )}
      </RailCard>

      {/* ── AI governance (real A2 policy — no fabricated counts) ── */}
      <RailCard>
        <RailHead title={t("dashboard.rail.governance", "🛡️ AI governance")} />
        <RailRow>
          <span className="min-w-0 flex-1">
            {t("dashboard.rail.autonomyCeiling", "Autonomy ceiling")}
          </span>
          <b className="text-[12px] font-extrabold text-slate-900 dark:text-slate-100">
            {t("dashboard.rail.a2", "A2 · approve")}
          </b>
        </RailRow>
        <p className="mt-1 text-[11px] text-slate-500">
          {t(
            "dashboard.rail.governanceNote",
            "AI never acts on institution data without human approval."
          )}
        </p>
      </RailCard>

      {/* ── Departments by mastery (real) ── */}
      <RailCard>
        <RailHead title={t("dashboard.rail.departments", "Departments")} />
        {departmentsQuery.isPending ? (
          <Shimmer className="h-16 rounded-lg" />
        ) : departments.length > 0 ? (
          <div className="space-y-0.5">
            {departments.map((d) => (
              <RailRow key={d.department_id}>
                <span className="min-w-0 flex-1 truncate">
                  {d.department_name}
                </span>
                <b
                  className={cn(
                    "text-[12px] font-extrabold",
                    attainmentValueClass(d.avg_plo_attainment)
                  )}
                >
                  {d.avg_plo_attainment}%
                </b>
              </RailRow>
            ))}
            <RailLink
              to="/admin/outcomes"
              label={t("dashboard.rail.allDepartments", "All departments →")}
            />
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {t("dashboard.rail.departmentsEmpty", "No attainment data yet.")}
          </p>
        )}
      </RailCard>
    </aside>
  );
};

export default AdminDashboardRail;
