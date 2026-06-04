import { useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Shimmer from "@/components/shared/Shimmer";
import WelcomeHero from "@/components/shared/WelcomeHero";
import { NoData } from "@/components/shared/EmptyState";
import PLODrillDownDialog from "@/components/shared/PLODrillDownDialog";
import {
  useAdminPLOHeatmap,
  PLO_ATTAINMENT_UNMEASURED,
  type AdminPLOHeatmapRow,
} from "@/hooks/useAdminPLOHeatmap";
import {
  useAdminKPIs,
  useRecentAuditLogs,
  useOnboardingAnalytics,
} from "@/hooks/useAdminDashboard";
import { useAIPerformance } from "@/hooks/useAIPerformance";
import { useAuth } from "@/hooks/useAuth";
import { useDeferredMount } from "@/hooks/useDeferredMount";
import { getAttainmentColor } from "@/lib/attainmentClassifier";
import {
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  Activity,
  BarChart3,
  ClipboardCheck,
  Brain,
  ThumbsUp,
  Target,
  FileCheck,
  ArrowRight,
  Award,
  Database,
  Network,
  AlertTriangle,
  type LucideIcon,
} from "lucide-react";
import { formatRelativeTime } from "@/lib/formatDate";
import { formatNumber, formatPercent } from "@/lib/formatNumber";

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

// ─── Role badge colors ──────────────────────────────────────────────────────

const roleBadgeStyles: Record<string, string> = {
  admin: "bg-red-100 text-red-700 border-red-200",
  coordinator: "bg-blue-100 text-blue-700 border-blue-200",
  teacher: "bg-green-100 text-green-700 border-green-200",
  student: "bg-amber-100 text-amber-700 border-amber-200",
  parent: "bg-purple-100 text-purple-700 border-purple-200",
};

// ─── Admin Dashboard ────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const { t } = useTranslation("admin");
  const { profile } = useAuth();
  const navigate = useNavigate();
  const deferredReady = useDeferredMount(500);
  const { data: kpis, isLoading: kpisLoading } = useAdminKPIs();
  const { data: auditLogs, isLoading: logsLoading } = useRecentAuditLogs(10, {
    enabled: deferredReady,
  });
  const { data: onboardingAnalytics } = useOnboardingAnalytics({
    enabled: deferredReady,
  });
  const { data: aiPerformance, isLoading: aiLoading } = useAIPerformance({
    enabled: deferredReady,
  });
  const {
    data: ploHeatmap,
    isLoading: ploLoading,
    isError: ploIsError,
  } = useAdminPLOHeatmap();
  const [selectedPLO, setSelectedPLO] = useState<AdminPLOHeatmapRow | null>(
    null
  );
  const [drillDownOpen, setDrillDownOpen] = useState(false);

  const openDrillDown = (plo: AdminPLOHeatmapRow) => {
    setSelectedPLO(plo);
    setDrillDownOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <WelcomeHero
        name={profile?.full_name ?? "Admin"}
        userRole="admin"
        subtitle={t("dashboard.welcome.subtitle")}
        stats={
          kpisLoading ? null : (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-xs font-semibold text-white/70">
                  {t("dashboard.totalUsers")}
                </p>
                <p className="text-xl font-black text-white">
                  {formatNumber(kpis?.totalUsers ?? 0)}
                </p>
              </div>
              <div className="h-8 w-px bg-white/20" />
              <div className="text-right">
                <p className="text-xs font-semibold text-white/70">
                  {t("dashboard.activeCourses")}
                </p>
                <p className="text-xl font-black text-white">
                  {formatNumber(kpis?.totalCourses ?? 0)}
                </p>
              </div>
            </div>
          )
        }
      />

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className="grid grid-cols-2 md:grid-cols-5 gap-4"
          data-tour="kpi-row"
        >
          <KPICard
            icon={Users}
            label={t("dashboard.totalUsers")}
            value={formatNumber(kpis?.totalUsers ?? 0)}
          />
          <KPICard
            icon={UserCheck}
            label={t("dashboard.activeUsers")}
            value={formatNumber(kpis?.activeUsers ?? 0)}
          />
          <KPICard
            icon={BookOpen}
            label={t("dashboard.programs")}
            value={formatNumber(kpis?.totalPrograms ?? 0)}
          />
          <KPICard
            icon={GraduationCap}
            label={t("dashboard.courses")}
            value={formatNumber(kpis?.totalCourses ?? 0)}
          />
          <KPICard
            icon={ClipboardCheck}
            label={t("dashboard.onboarding")}
            value={formatPercent(onboardingAnalytics?.completionRate ?? 0)}
          />
        </div>
      )}

      {/* Onboarding pending link */}
      {onboardingAnalytics && onboardingAnalytics.completionRate < 100 && (
        <button
          type="button"
          onClick={() => navigate("/admin/onboarding/pending")}
          className="w-full text-start rounded-xl bg-amber-50 p-4 flex items-center justify-between hover:bg-amber-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {t("dashboard.onboardingPending", {
                count:
                  onboardingAnalytics.totalStudents -
                  onboardingAnalytics.completedOnboarding,
              })}
            </p>
            <p className="text-xs text-amber-600">
              {t("dashboard.onboardingPendingAction")}
            </p>
          </div>
          <ClipboardCheck className="h-5 w-5 text-amber-600 shrink-0" />
        </button>
      )}

      {/* Two-column layout: Users by Role + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card
          className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0"
          data-tour="section-card"
        >
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Users className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.usersByRole")}
            </h2>
          </div>
          <div className="p-6">
            {kpisLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(kpis?.usersByRole ?? {}).map(
                  ([role, count]) => (
                    <div
                      key={role}
                      className="flex items-center justify-between"
                    >
                      <Badge
                        variant="outline"
                        className={roleBadgeStyles[role] ?? ""}
                      >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                      </Badge>
                      <span className="text-sm font-semibold">{count}</span>
                    </div>
                  )
                )}
                {Object.keys(kpis?.usersByRole ?? {}).length === 0 && (
                  <p className="text-sm text-gray-500">
                    {t("dashboard.noActiveUsers")}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{
              background: "var(--brand-gradient)",
            }}
          >
            <Activity className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">
              {t("dashboard.recentActivity")}
            </h2>
          </div>
          <div className="p-6">
            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(auditLogs ?? []).map((log) => (
                  <div
                    key={log.id}
                    className="flex items-start justify-between gap-2 py-1"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.action} {log.entity_type}
                      </p>
                      <p className="text-xs text-gray-500 truncate">
                        {log.entity_id}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="text-sm text-gray-500">
                    {t("dashboard.noRecentActivity")}
                  </p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* PLO Attainment Heatmap — Req 7 */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t("dashboard.ploHeatmap")}
          </h2>
        </div>
        <div className="p-6">
          {ploLoading ? (
            // State 1 — loading
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : ploIsError ? (
            // State 2 — error (must be visually distinct from no-data)
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <AlertTriangle className="h-8 w-8 text-red-500 mb-3" />
              <p className="text-sm font-semibold text-red-600">
                {t("dashboard.ploHeatmapError")}
              </p>
            </div>
          ) : !ploHeatmap || ploHeatmap.length === 0 ? (
            // State 3 — resolved but empty
            <NoData className="py-8" />
          ) : (
            // State 4 — data
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {ploHeatmap.map((plo) => {
                  const measured =
                    plo.attainment_percent !== PLO_ATTAINMENT_UNMEASURED;
                  const bgColor = measured
                    ? getAttainmentColor(plo.attainment_percent)
                    : "#e5e7eb";
                  return (
                    <button
                      key={plo.plo_id}
                      type="button"
                      onClick={() => openDrillDown(plo)}
                      className="text-start rounded-xl p-4 text-white transition-transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      style={{ backgroundColor: bgColor }}
                      title={plo.plo_title}
                    >
                      <p
                        className={`text-2xl font-black ${
                          measured ? "text-white" : "text-gray-600"
                        }`}
                      >
                        {measured
                          ? `${Math.round(plo.attainment_percent)}%`
                          : t("dashboard.ploHeatmapUnmeasured")}
                      </p>
                      <p
                        className={`text-xs font-semibold mt-1 line-clamp-2 ${
                          measured ? "text-white/90" : "text-gray-500"
                        }`}
                      >
                        {plo.plo_title}
                      </p>
                      <p
                        className={`text-[10px] mt-1 ${
                          measured ? "text-white/70" : "text-gray-400"
                        }`}
                      >
                        {t("dashboard.totalContributors", {
                          count: plo.contributing_count,
                        })}
                      </p>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </Card>

      <PLODrillDownDialog
        plo={selectedPLO}
        open={drillDownOpen}
        onOpenChange={setDrillDownOpen}
      />

      {/* AI Co-Pilot Performance */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden gap-0 py-0">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{
            background: "var(--brand-gradient)",
          }}
        >
          <Brain className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            {t("dashboard.aiCoPilot")}
          </h2>
        </div>
        <div className="p-6">
          {aiLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-50">
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    {t("dashboard.suggestionAcceptance")}
                  </p>
                  {(aiPerformance?.suggestionTotal ?? 0) > 0 ? (
                    <p className="text-2xl font-black mt-1">
                      {aiPerformance?.suggestionAcceptanceRate ?? 0}%
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-400 mt-1">
                      {t("dashboard.aiNoFeedback")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {t("dashboard.totalSuggestions", {
                      count: aiPerformance?.suggestionTotal ?? 0,
                    })}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    {t("dashboard.predictionAccuracy")}
                  </p>
                  {(aiPerformance?.predictionTotal ?? 0) > 0 ? (
                    <p className="text-2xl font-black mt-1">
                      {aiPerformance?.predictionAccuracyRate ?? 0}%
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-400 mt-1">
                      {t("dashboard.aiNoFeedback")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {t("dashboard.validatedPredictions", {
                      count: aiPerformance?.predictionTotal ?? 0,
                    })}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-amber-50">
                  <FileCheck className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    {t("dashboard.draftAcceptance")}
                  </p>
                  {(aiPerformance?.draftTotal ?? 0) > 0 ? (
                    <p className="text-2xl font-black mt-1">
                      {aiPerformance?.draftAcceptanceRate ?? 0}%
                    </p>
                  ) : (
                    <p className="text-sm font-semibold text-gray-400 mt-1">
                      {t("dashboard.aiNoFeedback")}
                    </p>
                  )}
                  <p className="text-xs text-gray-500">
                    {t("dashboard.feedbackDrafts", {
                      count: aiPerformance?.draftTotal ?? 0,
                    })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* OBE Management Quick Access — Requirements 104.5, 111.1, 105.1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graduate Attribute Overview */}
        <Link to="/admin/graduate-attributes" className="block">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow h-full gap-0 py-0">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <Award className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t("dashboard.graduateAttributes")}
              </h2>
            </div>
            <div className="p-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-teal-50 mb-3">
                <Award className="h-8 w-8 text-teal-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {t("dashboard.attributeAttainment")}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t("dashboard.attributeAttainmentDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">
                {t("dashboard.manage")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Historical Evidence Dashboard */}
        <Link to="/admin/historical-evidence" className="block">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow h-full gap-0 py-0">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <Database className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t("dashboard.historicalEvidence")}
              </h2>
            </div>
            <div className="p-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-blue-50 mb-3">
                <Database className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {t("dashboard.evidenceDashboard")}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t("dashboard.evidenceDashboardDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">
                {t("dashboard.view")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Competency Framework */}
        <Link to="/admin/competency-frameworks" className="block">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow h-full gap-0 py-0">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: "var(--brand-gradient)",
              }}
            >
              <Network className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                {t("dashboard.competencyFrameworks")}
              </h2>
            </div>
            <div className="p-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-purple-50 mb-3">
                <Network className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">
                {t("dashboard.frameworkManagement")}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {t("dashboard.frameworkManagementDesc")}
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">
                {t("dashboard.manage")} <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
