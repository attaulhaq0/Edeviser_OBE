// =============================================================================
// TeacherDashboardNew — redesigned teacher dashboard (P2, spec task 2.2)
// =============================================================================
//
// At-a-glance teaching cockpit gated behind `newUiDashboards` (see the wrapper
// in TeacherDashboard.tsx). REUSES the existing `useTeacherDashboardAggregate`
// (one round-trip: KPIs + Bloom's distribution, no new writes) and is composed
// from the P0 primitives (WelcomeHero, KPICard, SectionHeader, MasteryRing,
// SeverityIcon, tactile Button, `.card-elevated`). i18n reuses the existing
// `teacher` namespace keys. Flag-off keeps the current dashboard unchanged.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  CheckSquare,
  ClipboardList,
  Layers,
  TrendingUp,
} from "lucide-react";

import {
  Button,
  Card,
  KPICard,
  MasteryRing,
  SectionHeader,
  SeverityIcon,
  Shimmer,
  WelcomeHero,
} from "@/design-system";
import { useAuth } from "@/hooks/useAuth";
import { useTeacherDashboardAggregate } from "@/hooks/useTeacherDashboardAggregate";
import { attainmentValueClass } from "@/lib/attainmentTone";

/** Canonical Bloom's-level dot colors (design system domain coding). */
const BLOOM_DOT: Record<string, string> = {
  remembering: "bg-purple-500",
  understanding: "bg-blue-500",
  applying: "bg-green-500",
  analyzing: "bg-yellow-500",
  evaluating: "bg-orange-500",
  creating: "bg-red-500",
};

const TeacherDashboardNew = () => {
  const { t } = useTranslation("teacher");
  const navigate = useNavigate();
  const { user, profile } = useAuth();

  const aggregate = useTeacherDashboardAggregate(user?.id);
  const kpis = aggregate.data?.kpis;
  const blooms = aggregate.data?.bloomsDistribution ?? [];
  const loading = aggregate.isPending;

  const avgAttainment = kpis?.avgAttainment ?? 0;
  const atRisk = kpis?.atRiskCount ?? 0;

  return (
    <div className="space-y-6">
      <WelcomeHero
        name={profile?.full_name ?? "Teacher"}
        userRole="teacher"
        subtitle={t("dashboard.welcome.subtitle")}
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
            icon={ClipboardList}
            label={t("dashboard.pendingSubmissions")}
            value={kpis?.pendingSubmissions ?? 0}
          />
          <KPICard
            icon={CheckSquare}
            label={t("dashboard.gradedThisWeek")}
            value={kpis?.gradedThisWeek ?? 0}
            iconBgClass="bg-green-50"
            iconColorClass="text-green-600"
          />
          <KPICard
            icon={TrendingUp}
            label={t("dashboard.avgAttainment")}
            value={`${avgAttainment}%`}
            valueClassName={attainmentValueClass(avgAttainment)}
          />
          <KPICard
            icon={AlertTriangle}
            label={t("dashboard.atRiskStudents")}
            value={atRisk}
            valueClassName={atRisk > 0 ? "text-red-600" : "text-sky-700"}
            iconBgClass={atRisk > 0 ? "bg-red-50" : "bg-blue-50"}
            iconColorClass={atRisk > 0 ? "text-red-600" : "text-blue-600"}
          />
        </div>
      )}

      {/* Mastery snapshot + Bloom's coverage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="card-elevated overflow-hidden border-0 bg-white">
          <div className="p-6">
            <SectionHeader
              icon={TrendingUp}
              title={t("dashboard.avgAttainment")}
            />
            <div className="mt-4 flex items-center gap-5">
              {loading ? (
                <Shimmer className="h-24 w-24 rounded-full" />
              ) : (
                <MasteryRing value={avgAttainment} size={96} tone="auto" />
              )}
              <div className="min-w-0">
                <p className="text-sm text-gray-600">
                  {t("dashboard.totalStudents", "Students")}:{" "}
                  <span className="font-semibold text-gray-900">
                    {kpis?.totalStudents ?? 0}
                  </span>
                </p>
                <Button
                  variant="link"
                  className="mt-1 h-auto p-0 text-sky-700"
                  onClick={() => navigate("/teacher/grading")}
                >
                  {t("dashboard.pendingSubmissions")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="card-elevated overflow-hidden border-0 bg-white">
          <div className="p-6">
            <SectionHeader
              icon={Layers}
              title={t("dashboard.bloomsDistribution")}
            />
            <div className="mt-4">
              {loading ? (
                <Shimmer className="h-24 rounded-xl" />
              ) : blooms.length > 0 ? (
                <ul className="space-y-2">
                  {blooms.map((row) => (
                    <li
                      key={row.level}
                      className="flex items-center gap-3 text-sm"
                    >
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          BLOOM_DOT[row.level] ?? "bg-slate-400"
                        }`}
                        aria-hidden="true"
                      />
                      <span className="flex-1 capitalize text-gray-700">
                        {row.level}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {row.count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-6 text-center text-sm text-gray-500">
                  {t("dashboard.noClosDefined", "No CLOs defined yet")}
                </p>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Triage CTA */}
      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SeverityIcon
              icon={AlertTriangle}
              severity={atRisk > 0 ? "high" : "low"}
              label={t("dashboard.atRiskStudents")}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {atRisk} · {t("dashboard.atRiskStudents")}
              </p>
              <p className="text-xs text-gray-500">
                {t("dashboard.gradedThisWeek")}: {kpis?.gradedThisWeek ?? 0}
              </p>
            </div>
          </div>
          <Button
            variant="tactile"
            className="shrink-0"
            onClick={() => navigate("/teacher/grading")}
          >
            {t("dashboard.pendingSubmissions")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default TeacherDashboardNew;
