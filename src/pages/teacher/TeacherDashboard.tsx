import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Shimmer from '@/components/shared/Shimmer';
import { useAuth } from '@/providers/AuthProvider';
import { useCourses } from '@/hooks/useCourses';
import { usePendingSubmissions } from '@/hooks/useSubmissions';
import {
  useTeacherKPIs,
  useTeacherCLOAttainment,
  useTeacherBloomsDistribution,
  useStudentPerformanceHeatmap,
} from '@/hooks/useTeacherDashboard';
import type { BloomsLevel } from '@/types/app';
import {
  ClipboardList,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  BarChart3,
  PieChart as PieChartIcon,
  Grid3X3,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { formatDistanceToNow } from 'date-fns';

// ─── Bloom's Color Map ──────────────────────────────────────────────────────

const BLOOMS_COLORS: Record<BloomsLevel, string> = {
  Remembering: '#a855f7',   // purple-500
  Understanding: '#3b82f6', // blue-500
  Applying: '#22c55e',      // green-500
  Analyzing: '#eab308',     // yellow-500
  Evaluating: '#f97316',    // orange-500
  Creating: '#ef4444',      // red-500
};



// ─── Attainment color helpers ───────────────────────────────────────────────

const getAttainmentColor = (percent: number): string => {
  if (percent < 0) return '#e5e7eb';   // gray-200 — no data
  if (percent >= 85) return '#22c55e'; // green-500
  if (percent >= 70) return '#3b82f6'; // blue-500
  if (percent >= 50) return '#eab308'; // yellow-500
  return '#ef4444';                    // red-500
};

const getAttainmentLabel = (percent: number): string => {
  if (percent < 0) return '—';
  if (percent >= 85) return 'Excellent';
  if (percent >= 70) return 'Satisfactory';
  if (percent >= 50) return 'Developing';
  return 'Not Yet';
};

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

// ─── Custom Tooltip for Bar Chart ───────────────────────────────────────────

interface BarTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { clo_title: string; blooms_level: BloomsLevel } }>;
}

const CLOBarTooltip = ({ active, payload }: BarTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold truncate max-w-[200px]">{item.payload.clo_title}</p>
      <p className="text-gray-500">{item.payload.blooms_level}</p>
      <p className="font-black mt-1">{item.value}%</p>
    </div>
  );
};

// ─── Teacher Dashboard ──────────────────────────────────────────────────────

const TeacherDashboard = () => {
  const { user } = useAuth();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  // Filter to teacher's own courses
  const teacherCourses = useMemo(
    () => (courses ?? []).filter((c) => c.teacher_id === user?.id),
    [courses, user?.id],
  );

  const effectiveCourseId = selectedCourseId || (teacherCourses.length > 0 ? teacherCourses[0]!.id : '');

  const { data: kpis, isLoading: kpisLoading } = useTeacherKPIs();
  const { data: cloAttainment, isLoading: cloLoading } = useTeacherCLOAttainment(effectiveCourseId);
  const { data: bloomsDist, isLoading: bloomsLoading } = useTeacherBloomsDistribution();
  const { data: heatmapData, isLoading: heatmapLoading } = useStudentPerformanceHeatmap(effectiveCourseId);
  const { data: pendingSubmissions, isLoading: pendingLoading } = usePendingSubmissions();

  // Derive unique students and CLOs for heatmap grid
  const heatmapGrid = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) return { students: [] as string[], clos: [] as string[], lookup: new Map<string, number>() };
    const students = [...new Set(heatmapData.map((c) => c.student_name))];
    const clos = [...new Set(heatmapData.map((c) => c.clo_title))];
    const lookup = new Map<string, number>();
    for (const cell of heatmapData) {
      lookup.set(`${cell.student_name}:${cell.clo_title}`, cell.attainment_percent);
    }
    return { students, clos, lookup };
  }, [heatmapData]);

  // Recent pending submissions (top 5)
  const recentPending = useMemo(
    () => (pendingSubmissions ?? []).slice(0, 5),
    [pendingSubmissions],
  );

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
          <KPICard icon={ClipboardList} label="Pending Submissions" value={kpis?.pendingSubmissions ?? 0} />
          <KPICard icon={CheckSquare} label="Graded This Week" value={kpis?.gradedThisWeek ?? 0} />
          <KPICard icon={TrendingUp} label="Avg Attainment" value={`${kpis?.avgAttainment ?? 0}%`} />
          <KPICard icon={AlertTriangle} label="At-Risk Students" value={kpis?.atRiskCount ?? 0} />
        </div>
      )}

      {/* Course Selector */}
      <div className="flex items-center gap-3">
        {coursesLoading ? (
          <Shimmer className="h-9 w-56" />
        ) : (
          <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger className="w-56 bg-white">
              <SelectValue placeholder="Select course" />
            </SelectTrigger>
            <SelectContent>
              {teacherCourses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} — {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Charts Row: CLO Attainment (2/3) + Bloom's Distribution (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CLO Attainment Chart */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">CLO Attainment</h2>
          </div>
          {cloLoading ? (
            <Shimmer className="h-[300px] rounded-xl" />
          ) : !cloAttainment || cloAttainment.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
              No CLO attainment data available for this course.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={cloAttainment} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="clo_title"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => v.length > 15 ? `${v.slice(0, 15)}…` : v}
                />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
                <Tooltip content={<CLOBarTooltip />} />
                <Bar dataKey="avg_attainment" radius={[4, 4, 0, 0]}>
                  {cloAttainment.map((entry, idx) => (
                    <Cell key={idx} fill={BLOOMS_COLORS[entry.blooms_level] ?? '#64748b'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Bloom's Distribution */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChartIcon className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">Bloom's Distribution</h2>
          </div>
          {bloomsLoading ? (
            <Shimmer className="h-[300px] rounded-xl" />
          ) : !bloomsDist || bloomsDist.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
              No CLOs defined yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={bloomsDist}
                  dataKey="count"
                  nameKey="level"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ name, value }) => `${String(name ?? '')}: ${value}`}
                  labelLine={false}
                >
                  {bloomsDist.map((entry, idx) => (
                    <Cell key={idx} fill={BLOOMS_COLORS[entry.level] ?? '#64748b'} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* Student Performance Heatmap */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="flex items-center gap-2 mb-4">
          <Grid3X3 className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-bold tracking-tight">Student Performance Heatmap</h2>
        </div>
        {heatmapLoading ? (
          <Shimmer className="h-48 rounded-xl" />
        ) : heatmapGrid.students.length === 0 ? (
          <div className="flex items-center justify-center py-12 text-sm text-gray-500">
            No student performance data available for this course.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left py-2 px-3 text-xs font-semibold text-gray-500 sticky left-0 bg-white">
                    Student
                  </th>
                  {heatmapGrid.clos.map((clo) => (
                    <th
                      key={clo}
                      className="py-2 px-2 text-xs font-semibold text-gray-500 text-center max-w-[100px] truncate"
                      title={clo}
                    >
                      {clo.length > 12 ? `${clo.slice(0, 12)}…` : clo}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapGrid.students.map((student) => (
                  <tr key={student} className="border-t border-slate-100">
                    <td className="py-2 px-3 font-medium text-gray-700 sticky left-0 bg-white whitespace-nowrap">
                      {student}
                    </td>
                    {heatmapGrid.clos.map((clo) => {
                      const val = heatmapGrid.lookup.get(`${student}:${clo}`) ?? -1;
                      return (
                        <td key={clo} className="py-2 px-2 text-center">
                          <div
                            className="inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold text-white"
                            style={{ backgroundColor: getAttainmentColor(val) }}
                            title={`${val >= 0 ? `${val}% — ${getAttainmentLabel(val)}` : 'No data'}`}
                          >
                            {val >= 0 ? `${val}%` : '—'}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Legend */}
            <div className="flex items-center gap-4 mt-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#22c55e' }} />
                <span>Excellent (≥85%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#3b82f6' }} />
                <span>Satisfactory (70-84%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#eab308' }} />
                <span>Developing (50-69%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#ef4444' }} />
                <span>Not Yet (&lt;50%)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: '#e5e7eb' }} />
                <span>No data</span>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Bottom Row: Grading Queue + At-Risk Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grading Queue */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-blue-600" />
              <h2 className="text-lg font-bold tracking-tight">Grading Queue</h2>
            </div>
            <Link
              to="/teacher/grading"
              className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
            >
              View All
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          {pendingLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-12 rounded-lg" />
              ))}
            </div>
          ) : recentPending.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-sm text-gray-500">
              No pending submissions. You're all caught up!
            </div>
          ) : (
            <div className="space-y-3">
              {recentPending.map((sub) => (
                <div
                  key={sub.id}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      {sub.profiles?.full_name ?? 'Unknown Student'}
                    </p>
                    <p className="text-xs text-gray-500 truncate">
                      {sub.assignments?.title ?? 'Unknown Assignment'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {sub.is_late && (
                      <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200 text-xs">
                        Late
                      </Badge>
                    )}
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatDistanceToNow(new Date(sub.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* At-Risk Students Placeholder (Task 18.3) */}
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold tracking-tight">At-Risk Students</h2>
          </div>
          {kpisLoading ? (
            <Shimmer className="h-32 rounded-xl" />
          ) : (kpis?.atRiskCount ?? 0) > 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-amber-50 mb-3">
                <AlertTriangle className="h-8 w-8 text-amber-500" />
              </div>
              <p className="text-2xl font-black text-amber-600">{kpis?.atRiskCount}</p>
              <p className="text-sm text-gray-500 mt-1">
                students need attention
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Detailed list with nudge actions coming soon.
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-green-50 mb-3">
                <CheckSquare className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-sm text-gray-500">
                No at-risk students detected. Great work!
              </p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TeacherDashboard;
