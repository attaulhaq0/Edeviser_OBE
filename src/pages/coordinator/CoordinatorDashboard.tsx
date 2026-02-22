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
import { usePrograms } from '@/hooks/usePrograms';
import {
  Target,
  GraduationCap,
  CheckCircle2,
  ClipboardCheck,
  AlertTriangle,
  Grid3X3,
  ArrowRight,
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
  const { data: kpis, isLoading: kpisLoading } = useCoordinatorKPIs();
  const { data: programs, isLoading: programsLoading } = usePrograms();
  const [selectedProgramId, setSelectedProgramId] = useState<string>('');
  const [selectedCell, setSelectedCell] = useState<SelectedCell | null>(null);

  // Auto-select first program when loaded
  const effectiveProgramId =
    selectedProgramId || (programs && programs.length > 0 ? programs[0].id : '');

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
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Grid3X3 className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold tracking-tight">Curriculum Matrix</h2>
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
                className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors whitespace-nowrap"
              >
                View Full Matrix
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

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
        </Card>

        {/* At-Risk Students (1/3 width) */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">At-Risk Students</h2>
          </div>
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
        </Card>
      </div>

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
