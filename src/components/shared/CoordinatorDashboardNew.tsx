// =============================================================================
// CoordinatorDashboardNew — redesigned coordinator dashboard (P2, spec task 2.4)
// =============================================================================
//
// Curriculum-health cockpit gated behind `newUiDashboards` (see the wrapper in
// CoordinatorDashboard.tsx). REUSES the existing `useCoordinatorDashboardAggregate`
// (one round-trip, RLS-scoped `get_coordinator_dashboard`, no new writes) and is
// composed from the P0 primitives (WelcomeHero, KPICard, SectionHeader,
// MasteryRing, SeverityIcon, tactile Button, `.card-elevated`). i18n reuses the
// existing `coordinator` namespace keys.
//
// This is an incremental, flag-off-by-default build presenting the core value
// (hero, KPIs, curriculum-coverage mastery, at-risk triage, matrix CTA). The
// richer below-the-fold widgets (full curriculum matrix, recovery pathways, CQI
// plans, section comparison, OBE visualizations) remain on the legacy dashboard
// until this reaches full parity (task 2.6). Flag-off keeps the current
// dashboard byte-identical.
// =============================================================================

import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Grid3X3,
  Target,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import WelcomeHero from "@/components/shared/WelcomeHero";
import KPICard from "@/components/shared/KPICard";
import SectionHeader from "@/components/shared/SectionHeader";
import MasteryRing from "@/components/shared/MasteryRing";
import { SeverityIcon } from "@/components/shared/SeverityIcon";
import Shimmer from "@/components/shared/Shimmer";
import { useAuth } from "@/hooks/useAuth";
import { useCoordinatorDashboardAggregate } from "@/hooks/useCoordinatorDashboardAggregate";
import { attainmentValueClass } from "@/lib/attainmentTone";

const CoordinatorDashboardNew = () => {
  const { t } = useTranslation("coordinator");
  const navigate = useNavigate();
  const { institutionId, profile } = useAuth();

  // The aggregate returns the `CoordinatorKPIData` shape directly.
  const aggregate = useCoordinatorDashboardAggregate(institutionId);
  const kpis = aggregate.data;
  const loading = aggregate.isPending;

  const cloCoverage = kpis?.cloCoveragePercent ?? 0;
  const teacherCompliance = kpis?.teacherCompliancePercent ?? 0;
  const avgAttainment = kpis?.avgAttainmentPercent ?? 0;
  const atRisk = kpis?.atRiskStudents ?? 0;

  return (
    <div className="space-y-6">
      <WelcomeHero
        name={profile?.full_name ?? "Coordinator"}
        userRole="coordinator"
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
            icon={Target}
            label={t("dashboard.totalPLOs")}
            value={kpis?.totalPLOs ?? 0}
          />
          <KPICard
            icon={GraduationCap}
            label={t("dashboard.activeCourses")}
            value={kpis?.totalCourses ?? 0}
          />
          <KPICard
            icon={CheckCircle2}
            label={t("dashboard.cloCoverage")}
            value={`${cloCoverage}%`}
            valueClassName={attainmentValueClass(cloCoverage)}
          />
          <KPICard
            icon={ClipboardCheck}
            label={t("dashboard.teacherCompliance")}
            value={`${teacherCompliance}%`}
            valueClassName={attainmentValueClass(teacherCompliance)}
          />
        </div>
      )}

      {/* Curriculum health (mastery) + At-risk triage */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Average attainment across the program */}
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
                  {t("dashboard.cloCoverage")}:{" "}
                  <span
                    className={`font-semibold ${attainmentValueClass(
                      cloCoverage
                    )}`}
                  >
                    {cloCoverage}%
                  </span>
                </p>
                <Button
                  variant="link"
                  className="mt-1 h-auto p-0 text-sky-700"
                  onClick={() => navigate("/coordinator/matrix")}
                >
                  {t("dashboard.viewFullMatrix")}
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* At-risk students */}
        <Card className="card-elevated overflow-hidden border-0 bg-white">
          <div className="p-6">
            <SectionHeader
              icon={AlertTriangle}
              title={t("dashboard.atRiskStudents")}
            />
            <div className="mt-4 flex items-center gap-4">
              {loading ? (
                <Shimmer className="h-12 w-12 rounded-xl" />
              ) : (
                <SeverityIcon
                  icon={atRisk > 0 ? AlertTriangle : CheckCircle2}
                  severity={atRisk > 0 ? "high" : "low"}
                  size="lg"
                  label={t("dashboard.atRiskStudents")}
                />
              )}
              <div className="min-w-0">
                <p
                  className={`text-3xl font-black ${
                    atRisk > 0 ? "text-red-600" : "text-green-600"
                  }`}
                >
                  {atRisk}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {atRisk > 0
                    ? t("dashboard.atRiskBelowThreshold")
                    : avgAttainment > 0
                    ? t("dashboard.noAtRiskStudents")
                    : t("dashboard.atRiskPending")}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Primary CTA — review the curriculum matrix */}
      <Card className="card-elevated overflow-hidden border-0 bg-white">
        <div className="flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <SeverityIcon
              icon={Grid3X3}
              severity="brand"
              label={t("dashboard.curriculumMatrix")}
            />
            <div>
              <p className="text-sm font-semibold text-gray-900">
                {t("dashboard.curriculumMatrix")}
              </p>
              <p className="text-xs text-gray-500">
                {t("dashboard.cloCoverage")}: {cloCoverage}%
              </p>
            </div>
          </div>
          <Button
            variant="tactile"
            className="shrink-0"
            onClick={() => navigate("/coordinator/matrix")}
          >
            {t("dashboard.viewFullMatrix")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default CoordinatorDashboardNew;
