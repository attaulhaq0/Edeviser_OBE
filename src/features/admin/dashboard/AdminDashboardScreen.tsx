// =============================================================================
// AdminDashboardScreen — prototype rebuild (prototype-frontend-rebuild P2.5)
// =============================================================================
//
// Rebuilds `prototype/admin-dashboard.html` on `@/design-system` + tokens as a
// SINGLE-COLUMN institution feed, wired to the REAL existing hooks only (no
// faked data R17, no backend changes G.1):
//   - useAdminDashboardAggregate → AdminKPIData (users / active / programs /
//                                  courses / usersByRole)
//   - useDepartmentAnalytics     → "Departments by mastery" (real per-dept
//                                  avg PLO attainment) + institution avg mastery
//
// DEFERRED / FLAGGED GAPS (prototype shows them; no admin-scope hook — adapted
// to real signals or omitted, never fabricated):
//   - Hero carousel slides → single primary slide (greeting + real chips).
//   - "Weekly active" login % and "Retention risk" count → no such metric in
//     AdminKPIData; the KPI row shows real Users / Active accounts / Avg mastery
//     / Courses instead.
//   - "Executive insight" is an AI-generated narrative in the mock → replaced by
//     a FACTUAL real-data institution summary (no AI-generated claim).
//   - "AI Governance" metrics (214 suggestions/wk, 0 unapproved) have no hook
//     and no `/admin/governance` route → replaced by a real "Users by role"
//     card + a static A2 autonomy footer (policy chrome, matching teacher/parent).
// =============================================================================

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  BookOpen,
  Building2,
  GraduationCap,
  Lightbulb,
  School,
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";

import {
  Badge,
  Button,
  KPICard,
  SectionHeader,
  Shimmer,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useAdminDashboardAggregate } from "@/hooks/useAdminDashboardAggregate";
import { useDepartmentAnalytics } from "@/hooks/useAdminDashboard";
import { attainmentValueClass } from "@/lib/attainmentTone";
import { formatNumber } from "@/lib/formatNumber";
import { cn } from "@/lib/utils";

const BRAND_GRADIENT = "var(--brand-gradient)";
const HERO_GRADIENT = "var(--hero-gradient)";

/** Prototype `.pcard` surface. */
const CARD =
  "rounded-[20px] border border-[#eef2f6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]";

/** Outcome-type role badge colors (design-system domain coding). */
const ROLE_BADGE: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  coordinator: "bg-blue-100 text-blue-700 border-blue-200",
  teacher: "bg-green-100 text-green-700 border-green-200",
  student: "bg-amber-100 text-amber-700 border-amber-200",
  parent: "bg-purple-100 text-purple-700 border-purple-200",
};
const ROLE_ORDER = ["admin", "coordinator", "teacher", "student", "parent"];

const AdminDashboardScreen = () => {
  const { t } = useTranslation("admin");
  const navigate = useNavigate();
  const { institutionId } = useAuth();

  const aggregate = useAdminDashboardAggregate(institutionId);
  const kpis = aggregate.data;
  const totalUsers = kpis?.totalUsers ?? 0;
  const activeUsers = kpis?.activeUsers ?? 0;
  const totalCourses = kpis?.totalCourses ?? 0;
  const totalPrograms = kpis?.totalPrograms ?? 0;

  const roleEntries = useMemo(() => {
    const byRole = kpis?.usersByRole ?? {};
    return Object.entries(byRole).sort(
      (a, b) =>
        (ROLE_ORDER.indexOf(a[0]) + 1 || 99) -
        (ROLE_ORDER.indexOf(b[0]) + 1 || 99)
    );
  }, [kpis]);

  const departmentsQuery = useDepartmentAnalytics();
  const departments = useMemo(
    () =>
      (departmentsQuery.data ?? [])
        .slice()
        .sort((a, b) => b.avg_plo_attainment - a.avg_plo_attainment),
    [departmentsQuery.data]
  );
  const measuredDepts = useMemo(
    () => departments.filter((d) => d.avg_plo_attainment > 0),
    [departments]
  );
  const avgMastery = useMemo(
    () =>
      measuredDepts.length > 0
        ? Math.round(
            measuredDepts.reduce((s, d) => s + d.avg_plo_attainment, 0) /
              measuredDepts.length
          )
        : 0,
    [measuredDepts]
  );
  const lowestDept =
    measuredDepts.length > 0 ? measuredDepts[measuredDepts.length - 1] : null;

  const kpiLoading = aggregate.isPending;

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      {/* ── Institution hero (greeting + real status chips) ── */}
      <section
        className="relative overflow-hidden rounded-2xl p-5 text-white shadow-lg"
        style={{ background: HERO_GRADIENT }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/20 bg-white/15">
            <Building2 className="h-6 w-6" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight">
              {t("dashboard.hero.title", "Your institution, this week")}
            </h1>
            <p className="text-[12px] text-white/75">
              {t(
                "dashboard.hero.subtitle",
                "De-identified, institution-wide signals — no individual student data."
              )}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/users")}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/25"
          >
            <Users className="h-3.5 w-3.5" aria-hidden="true" />
            {t("dashboard.hero.users", {
              defaultValue: "{{n}} users",
              n: formatNumber(totalUsers),
            })}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/reports")}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/25"
          >
            <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
            {t("dashboard.hero.active", {
              defaultValue: "{{n}} active",
              n: formatNumber(activeUsers),
            })}
          </button>
          <button
            type="button"
            onClick={() => navigate("/admin/programs")}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/15 px-3 py-1.5 text-[12px] font-semibold transition-colors hover:bg-white/25"
          >
            <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
            {t("dashboard.hero.programs", {
              defaultValue: "{{n}} programs",
              n: formatNumber(totalPrograms),
            })}
          </button>
        </div>
      </section>

      {/* ── KPI row (real aggregate metrics) ── */}
      {kpiLoading ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-[92px] rounded-[20px]" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <KPICard
            icon={Users}
            label={t("dashboard.totalUsers", "Users")}
            value={formatNumber(totalUsers)}
          />
          <KPICard
            icon={UserCheck}
            label={t("dashboard.activeUsers", "Active users")}
            value={formatNumber(activeUsers)}
            iconBgClass="bg-green-50"
            iconColorClass="text-green-600"
          />
          <KPICard
            icon={TrendingUp}
            label={t("dashboard.avgMastery", "Avg mastery")}
            value={`${avgMastery}%`}
            valueClassName={attainmentValueClass(avgMastery)}
          />
          <KPICard
            icon={GraduationCap}
            label={t("dashboard.courses", "Courses")}
            value={formatNumber(totalCourses)}
          />
        </div>
      )}

      {/* ── Institution insight (factual real-data summary) ── */}
      <section className={cn(CARD, "p-5")} id="exec-sec">
        <SectionHeader
          icon={Lightbulb}
          title={t("dashboard.insight.title", "Institution insight")}
          className="mb-2"
        />
        {kpiLoading ? (
          <Shimmer className="h-16 rounded-lg" />
        ) : (
          <>
            <p className="text-sm leading-relaxed text-gray-700">
              {t("dashboard.insight.body", {
                defaultValue:
                  "Your institution has {{users}} users ({{active}} active) across {{programs}} programs and {{courses}} courses.",
                users: formatNumber(totalUsers),
                active: formatNumber(activeUsers),
                programs: formatNumber(totalPrograms),
                courses: formatNumber(totalCourses),
              })}
              {lowestDept && (
                <>
                  {" "}
                  {t("dashboard.insight.lowest", {
                    defaultValue:
                      "{{dept}} currently has the lowest outcome attainment at {{pct}}% — a candidate for targeted support.",
                    dept: lowestDept.department_name,
                    pct: lowestDept.avg_plo_attainment,
                  })}
                </>
              )}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="tactile"
                onClick={() => navigate("/admin/reports")}
              >
                {t("dashboard.insight.analytics", "See analytics")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin/outcomes")}
              >
                {t("dashboard.insight.outcomes", "Outcomes")}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ── Departments by mastery + Users by role ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Departments by mastery (real useDepartmentAnalytics) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={School}
            title={t("dashboard.departments.title", "Departments by mastery")}
            action={
              <button
                type="button"
                onClick={() => navigate("/admin/outcomes")}
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.departments.all", "All →")}
              </button>
            }
            className="mb-3"
          />
          {departmentsQuery.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-10 rounded-lg" />
              ))}
            </div>
          ) : measuredDepts.length > 0 ? (
            <div className="space-y-2.5">
              {measuredDepts.slice(0, 6).map((d) => (
                <div key={d.department_id}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {d.department_name}
                    </span>
                    <b
                      className={cn(
                        "text-sm",
                        attainmentValueClass(d.avg_plo_attainment)
                      )}
                    >
                      {d.avg_plo_attainment}%
                    </b>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${d.avg_plo_attainment}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-500">
              {t(
                "dashboard.departments.empty",
                "No department attainment data yet."
              )}
            </p>
          )}
        </section>

        {/* Users by role (real usersByRole breakdown) */}
        <section className={cn(CARD, "p-4")}>
          <SectionHeader
            icon={Users}
            title={t("dashboard.usersByRole", "Users by role")}
            action={
              <button
                type="button"
                onClick={() => navigate("/admin/users")}
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.manage", "Manage →")}
              </button>
            }
            className="mb-3"
          />
          {kpiLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Shimmer key={i} className="h-8 rounded-lg" />
              ))}
            </div>
          ) : roleEntries.length > 0 ? (
            <div className="space-y-2.5">
              {roleEntries.map(([role, count]) => (
                <div
                  key={role}
                  className="flex items-center justify-between gap-2"
                >
                  <Badge variant="outline" className={ROLE_BADGE[role] ?? ""}>
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                  </Badge>
                  <span className="text-sm font-semibold text-gray-900">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-gray-500">
              {t("dashboard.noActiveUsers", "No active users yet.")}
            </p>
          )}
        </section>
      </div>

      {/* ── Autonomy footer (static policy chrome — A2) ── */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3">
        <p className="flex items-center gap-2 text-xs text-gray-600">
          <ShieldCheck
            className="h-4 w-4 shrink-0 text-sky-600"
            aria-hidden="true"
          />
          {t(
            "dashboard.autonomy.note",
            "AI autonomy ceiling: A2 — Suggest & approve. AI never acts on institution data without human approval."
          )}
        </p>
        <span
          className="hidden shrink-0 rounded-lg px-2 py-1 text-[10px] font-bold text-white sm:inline"
          style={{ background: BRAND_GRADIENT }}
        >
          {t("dashboard.autonomy.tag", "Governed")}
        </span>
      </div>
    </div>
  );
};

export default AdminDashboardScreen;
