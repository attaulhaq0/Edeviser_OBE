import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import CurriculumMatrix from '@/components/shared/CurriculumMatrix';
import CellDetailSheet from '@/components/shared/CellDetailSheet';
import { useCoordinatorKPIs } from '@/hooks/useCoordinatorDashboard';
import { useRecoveryMetrics } from '@/hooks/useMasteryRecovery';
import { useCQIPlanSummary, useCQIPlans } from '@/hooks/useCQIPlans';
import CQIStatusBadge from '@/components/shared/CQIStatusBadge';
import type { CQIStatus } from '@/components/shared/CQIStatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { usePrograms } from '@/hooks/usePrograms';
import { useCourses } from '@/hooks/useCourses';
import { useCourseSections } from '@/hooks/useCourseSections';
import SectionComparisonChart from '@/components/shared/SectionComparisonChart';
import {
  Target,
  GraduationCap,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Grid3X3,
  ArrowRight,
  RotateCcw,
  Clock,
  TrendingUp,
  Columns3,
  FileCheck2,
  GitBranch,
  Search,
  LayoutGrid,
  BarChart3,
  Users,
  type LucideIcon,
} from 'lucide-react';

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

// ─── Selected Cell State ────────────────────────────────────────────────────

interface SelectedCell {
  ploId: string;
  courseId: string;
}

// ─── Coordinator Dashboard ──────────────────────────────────────────────────

const CoordinatorDashboard = () => {
  const { institutionId } = useAuth();
  const { data: kpis, isLoading: kpisLoading } = useCoordinatorKPIs();
  const { data: recoveryMetrics, isLoading: recoveryLoading } = useRecoveryMetrics(institutionId ?? '');
  const { data: paginatedPrograms, isLoading: programsLoading } = usePrograms();
  const programs = paginatedPrograms?.data;
  const { data: paginatedCourses } = useCourses();
  const courses = paginatedCourses?.data ?? [];
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);
  const [comparisonCourseId, setComparisonCourseId] = useState<string>('');

  // CQI plan summary for the first program
  const effectiveProgramIdForCQI =
    selectedProgramId || (programs && programs.length > 0 ? (programs[0]?.id ?? '') : '');
  const { data: cqiSummary, isLoading: cqiLoading } = useCQIPlanSummary(
    effectiveProgramIdForCQI || undefined,
  );
  const { data: recentCQIPlans } = useCQIPlans(
    effectiveProgramIdForCQI ? { program_id: effectiveProgramIdForCQI } : {},
  );

  // Sections for the selected comparison course
  const { data: comparisonSections, isLoading: sectionsLoading } = useCourseSections(
    comparisonCourseId || undefined,
  );

  // Auto-select first program when loaded
  const effectiveProgramId =
    selectedProgramId || (programs && programs.length > 0 ? (programs[0]?.id ?? '') : '');

  const handleCellClick = (ploId: string, courseId: string) => {
    setSelectedCell({ ploId, courseId });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Target} label="Total PLOs" value={kpis?.totalPLOs ?? 0} />
          <KPICard
            icon={GraduationCap}
            label="Active Courses"
            value={kpis?.totalCourses ?? 0}
          />
          <KPICard
            icon={CheckCircle2}
            label="CLO Coverage"
            value={`${kpis?.cloCoveragePercent ?? 0}%`}
          />
          <KPICard
            icon={ClipboardCheck}
            label="Teacher Compliance"
            value={`${kpis?.teacherCompliancePercent ?? 0}%`}
          />
        </div>
      )}

      {/* Two-column layout: Matrix + At-Risk */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Curriculum Matrix (2/3 width) */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden lg:col-span-2">
          <div
            className="px-6 py-4 flex items-center justify-between"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Curriculum Matrix</h2>
            </div>
            <div className="flex items-center gap-3">
              {programsLoading ? (
                <Shimmer className="h-9 w-48" />
              ) : (
                <Select
                  value={effectiveProgramId}
                  onValueChange={setSelectedProgramId}
                >
                  <SelectTrigger className="w-48 bg-white">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    {programs?.map((program) => (
                      <SelectItem key={program.id} value={program.id}>
                        {program.code} — {program.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Link
                to="/coordinator/matrix"
                className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
              >
                View Full Matrix
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
          <div className="p-6">
            {effectiveProgramId ? (
              <CurriculumMatrix
                programId={effectiveProgramId}
                onCellClick={handleCellClick}
              />
            ) : (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-gray-500">
                No programs available. Create a program to view the curriculum matrix.
              </div>
            )}
          </div>
        </Card>

        {/* At-Risk Students (1/3 width) */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <AlertTriangle className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">At-Risk Students</h2>
          </div>
          <div className="p-6">
            {kpisLoading ? (
              <Shimmer className="h-32 rounded-xl" />
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-amber-50 mb-3">
                  <AlertTriangle className="h-8 w-8 text-amber-500" />
                </div>
                <p className="text-sm text-gray-500 max-w-[220px]">
                  At-risk student detection will be available once attainment data is
                  collected.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Recovery Pathway Metrics */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <RotateCcw className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Recovery Pathways</h2>
        </div>
        <div className="p-6">
          {recoveryLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KPICard
                icon={RotateCcw}
                label="Total Activations"
                value={recoveryMetrics?.total_activations ?? 0}
              />
              <KPICard
                icon={CheckCircle2}
                label="Completion Rate"
                value={`${Math.round((recoveryMetrics?.completion_rate ?? 0) * 100)}%`}
              />
              <KPICard
                icon={Clock}
                label="Avg Completion Time"
                value={`${(recoveryMetrics?.avg_completion_time_hours ?? 0).toFixed(1)}h`}
              />
              <KPICard
                icon={TrendingUp}
                label="Retry Success Rate"
                value={`${Math.round((recoveryMetrics?.retry_success_rate ?? 0) * 100)}%`}
              />
            </div>
          )}
        </div>
      </Card>

      {/* CQI Action Plans Section */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">CQI Action Plans</h2>
          </div>
          <Link
            to="/coordinator/cqi"
            className="inline-flex items-center gap-1 text-sm font-medium text-white/90 hover:text-white transition-colors whitespace-nowrap"
          >
            View All
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="p-6">
          {cqiLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KPICard icon={ClipboardCheck} label="Planned" value={cqiSummary?.planned ?? 0} />
                <KPICard icon={Clock} label="In Progress" value={cqiSummary?.in_progress ?? 0} />
                <KPICard icon={CheckCircle2} label="Completed" value={cqiSummary?.completed ?? 0} />
                <KPICard icon={FileCheck2} label="Evaluated" value={cqiSummary?.evaluated ?? 0} />
              </div>
              {recentCQIPlans && recentCQIPlans.length > 0 ? (
                <div className="space-y-2">
                  {recentCQIPlans.slice(0, 5).map((plan) => (
                    <div
                      key={plan.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50"
                    >
                      <div className="flex-1 min-w-0 space-y-0.5">
                        <div className="flex items-center gap-2">
                          <CQIStatusBadge status={plan.status as CQIStatus} />
                          <span className="text-xs text-gray-400 uppercase">{plan.outcome_type}</span>
                        </div>
                        <p className="text-sm truncate">{plan.action_description}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 ml-4 shrink-0">
                        <span>{plan.baseline_attainment}%</span>
                        <ArrowRight className="h-3 w-3" />
                        <span>{plan.target_attainment}%</span>
                        {plan.result_attainment !== null && (
                          <>
                            <ArrowRight className="h-3 w-3" />
                            <span className={plan.result_attainment >= plan.target_attainment ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                              {plan.result_attainment}%
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-gray-500">
                  No CQI action plans yet. Create one from the CQI Plans page.
                </div>
              )}
            </>
          )}
        </div>
      </Card>

      {/* Section Comparison */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <div className="flex items-center gap-2">
            <Columns3 className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Section Comparison</h2>
          </div>
          <Select value={comparisonCourseId} onValueChange={setComparisonCourseId}>
            <SelectTrigger className="w-48 bg-white">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.code} — {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="p-6">
          {!comparisonCourseId ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-gray-500">
              Select a course to compare section attainment metrics.
            </div>
          ) : sectionsLoading ? (
            <Shimmer className="h-32 rounded-xl" />
          ) : !comparisonSections || comparisonSections.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-gray-500">
              No sections found for this course.
            </div>
          ) : (
            <SectionComparisonChart
              sections={comparisonSections.map((s) => ({
                sectionCode: s.section_code,
                attainmentPercent: 0, // Attainment data populated once evidence exists
                studentCount: s.capacity,
              }))}
            />
          )}
        </div>
      </Card>

      {/* OBE Visualization Quick Access — Requirement 106.1, 107.1, 108.1, 109.2, 110.6 */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">OBE Visualizations</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            to="/coordinator/sankey"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center group"
          >
            <div className="p-2 rounded-lg bg-blue-100 group-hover:scale-110 transition-transform">
              <GitBranch className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Sankey Diagram</span>
            <span className="text-xs text-gray-500">ILO → PLO → CLO flow</span>
          </Link>
          <Link
            to="/coordinator/gap-analysis"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center group"
          >
            <div className="p-2 rounded-lg bg-amber-100 group-hover:scale-110 transition-transform">
              <Search className="h-5 w-5 text-amber-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Gap Analysis</span>
            <span className="text-xs text-gray-500">Unmapped outcomes</span>
          </Link>
          <Link
            to="/coordinator/coverage-heatmap"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center group"
          >
            <div className="p-2 rounded-lg bg-green-100 group-hover:scale-110 transition-transform">
              <LayoutGrid className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Coverage Heatmap</span>
            <span className="text-xs text-gray-500">CLO coverage density</span>
          </Link>
          <Link
            to="/coordinator/trends"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center group"
          >
            <div className="p-2 rounded-lg bg-purple-100 group-hover:scale-110 transition-transform">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Semester Trends</span>
            <span className="text-xs text-gray-500">Attainment over time</span>
          </Link>
          <Link
            to="/coordinator/cohort-comparison"
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors text-center group"
          >
            <div className="p-2 rounded-lg bg-red-100 group-hover:scale-110 transition-transform">
              <Users className="h-5 w-5 text-red-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Cohort Comparison</span>
            <span className="text-xs text-gray-500">Cross-cohort metrics</span>
          </Link>
        </div>
      </Card>

      {/* Cell Detail Sheet */}
      <CellDetailSheet
        ploId={selectedCell?.ploId}
        courseId={selectedCell?.courseId}
        open={selectedCell !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedCell(null);
        }}
      />
    </div>
  );
};

export default CoordinatorDashboard;
