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
  HeroCarousel,
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
import { AgentTaskInbox, EdeviserAssistantPanel } from "@/ai/components";
import {
  AgentAutonomyControl,
  AgentChatSurface,
  InsightCardsSurface,
} from "@/ai/components";
import AgentGovernanceCard from "@/ai/components/AgentGovernanceCard";
import { isAiSurfaceEnabled } from "@/ai/lib/featureGate";

// Experimental AI surfaces (Production & Delivery Safety): the governance
// card and the assistant panel mount ONLY when the deployment opted into the
// experimental AI feature — same gate as the RoleAppShell intelligence panel.
const aiSurfacesEnabled = isAiSurfaceEnabled();

/**
 * approval-inbox surface host: binds the shared inbox to the authenticated
 * dashboard actor. `viewer` gates display only — the orchestrator re-derives
 * identity from the JWT and revalidates every decision server-side.
 */
const DashboardApprovalInbox = () => {
  const { user, role } = useAuth();
  if (!user || !role) return null;
  return <AgentTaskInbox viewer={{ role, userId: user.id }} />;
};

/** Prototype `.pcard` surface. */
const CARD =
  "rounded-[20px] border-0 bg-card shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)]";

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
  const displayMetric = (value: number | null | undefined) =>
    aggregate.isError || value == null ? "—" : formatNumber(value);
  const totalUsers = kpis?.totalUsers;
  const activeUsers = kpis?.activeUsers;
  const totalCourses = kpis?.totalCourses;
  const totalPrograms = kpis?.totalPrograms;

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
        : null,
    [measuredDepts]
  );
  const lowestDept =
    measuredDepts.length > 0 ? measuredDepts[measuredDepts.length - 1] : null;

  const kpiLoading = aggregate.isPending;

  return (
    <div className="w-full space-y-4">
      {/* ── Institution carousel (overview + real executive watch item) ── */}
      <HeroCarousel
        ariaLabel={t("dashboard.hero.carouselLabel", "Institution highlights")}
        className="rounded-2xl border border-border/60 bg-white/80 text-slate-900 shadow-sm backdrop-blur-xs"
        theme="light"
        slides={[
          <div key="overview" className="min-h-[126px] p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-transparent text-sky-600">
                <Building2 className="h-6 w-6" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg font-bold tracking-tight text-slate-900">
                  {t("dashboard.hero.title", "Your institution, this week")}
                </h1>
                <p className="text-[12px] text-muted-foreground">
                  {t(
                    "dashboard.hero.subtitle",
                    "De-identified, institution-wide signals — no individual student data."
                  )}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/admin/users")}
                className="h-auto rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground/80 hover:bg-muted/50 hover:text-slate-900"
              >
                <Users className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dashboard.hero.users", {
                  defaultValue: "{{n}} users",
                  n: displayMetric(totalUsers),
                })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/admin/users")}
                className="h-auto rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground/80 hover:bg-muted/50 hover:text-slate-900"
              >
                <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dashboard.hero.active", {
                  defaultValue: "{{n}} active",
                  n: displayMetric(activeUsers),
                })}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => navigate("/admin/programs")}
                className="h-auto rounded-full border border-border bg-card px-3 py-1.5 text-[12px] font-semibold text-foreground/80 hover:bg-muted/50 hover:text-slate-900"
              >
                <BookOpen className="h-3.5 w-3.5" aria-hidden="true" />
                {t("dashboard.hero.programs", {
                  defaultValue: "{{n}} programs",
                  n: displayMetric(totalPrograms),
                })}
              </Button>
            </div>
          </div>,
          ...(lowestDept
            ? [
                <div
                  key="watch-item"
                  className="flex min-h-[126px] items-center gap-4 p-5"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-transparent text-sky-600">
                    <Lightbulb className="h-6 w-6" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">
                      {t("dashboard.hero.watchEyebrow", "Executive watch item")}
                    </p>
                    <h2 className="mt-0.5 truncate text-lg font-bold text-slate-900">
                      {lowestDept.department_name}
                    </h2>
                    <p className="mt-1 text-[12px] text-muted-foreground">
                      {t("dashboard.hero.watchBody", {
                        defaultValue:
                          "{{percent}}% average PLO attainment · lowest measured department",
                        percent: Math.round(lowestDept.avg_plo_attainment),
                      })}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => navigate("/admin/analytics")}
                    className="shrink-0 rounded-xl border border-border bg-card px-3 text-xs font-bold text-foreground/80 hover:bg-muted/50 hover:text-slate-900"
                  >
                    {t("dashboard.hero.openAnalytics", "Review")}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>,
              ]
            : []),
        ]}
      />

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
            value={displayMetric(totalUsers)}
            valueState={totalUsers != null ? "available" : "unavailable"}
          />
          <KPICard
            icon={UserCheck}
            label={t("dashboard.activeUsers", "Active users")}
            value={displayMetric(activeUsers)}
            valueState={activeUsers != null ? "available" : "unavailable"}
          />
          <KPICard
            icon={TrendingUp}
            label={t("dashboard.avgMastery", "Avg mastery")}
            value={avgMastery != null ? `${avgMastery}%` : "—"}
            valueState={avgMastery != null ? "available" : "unavailable"}
          />
          <KPICard
            icon={GraduationCap}
            label={t("dashboard.courses", "Courses")}
            value={displayMetric(totalCourses)}
            valueState={totalCourses != null ? "available" : "unavailable"}
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
        ) : aggregate.isError ? (
          <p className="text-sm text-muted-foreground">
            {t(
              "dashboard.insight.unavailable",
              "Live institution metrics are unavailable."
            )}
          </p>
        ) : (
          <>
            <p className="text-sm leading-relaxed text-foreground/80">
              {t("dashboard.insight.body", {
                defaultValue:
                  "Your institution has {{users}} users ({{active}} active) across {{programs}} programs and {{courses}} courses.",
                users: displayMetric(totalUsers),
                active: displayMetric(activeUsers),
                programs: displayMetric(totalPrograms),
                courses: displayMetric(totalCourses),
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
                onClick={() => navigate("/admin/analytics")}
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
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => navigate("/admin/outcomes")}
                className="h-auto p-0 text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.departments.all", "All →")}
              </Button>
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
                    <span className="truncate text-sm font-medium text-foreground">
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
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${d.avg_plo_attainment}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
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
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={() => navigate("/admin/users")}
                className="h-auto p-0 text-xs font-bold text-sky-700 hover:underline"
              >
                {t("dashboard.manage", "Manage →")}
              </Button>
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
                  <span className="text-sm font-semibold text-foreground">
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("dashboard.noActiveUsers", "No active users yet.")}
            </p>
          )}
        </section>
      </div>

      {/* ── Autonomy footer (static policy chrome — A2) ── */}
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3">
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
          className="hidden shrink-0 rounded-lg bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground sm:inline"
        >
          {t("dashboard.autonomy.tag", "Governed")}
        </span>
      </div>

      {/* ── AI governance & cost snapshot (tasks.md 6.3): admin-only aggregate
          read through the bounded get_governance_summary channel. Gated behind
          the experimental AI feature flag (Production & Delivery Safety). ── */}
      {aiSurfacesEnabled ? <AgentGovernanceCard /> : null}

      {/* ── Institution autonomy control (tasks.md 7.2): admin-only write
          under the institution_autonomy_settings_admin_write RLS policy;
          enforced by the orchestrator on the next run. ── */}
      {aiSurfacesEnabled ? <AgentAutonomyControl /> : null}

      {/* ── Ask-Edeviser assistant (tasks.md 3.3): page-context aware shell.
          Gated behind the experimental AI feature flag. Surfaces are granted
          fail-closed by the page capability registry for this role/route. ── */}
      {aiSurfacesEnabled ? (
        <EdeviserAssistantPanel
          surfaceHosts={{
            "approval-inbox": DashboardApprovalInbox,
            "insight-cards": InsightCardsSurface,
            conversation: AgentChatSurface,
          }}
        />
      ) : null}
    </div>
  );
};

export default AdminDashboardScreen;
