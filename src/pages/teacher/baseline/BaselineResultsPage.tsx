import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import { useCourseBaselineStats, useBaselineResults } from '@/hooks/useBaselineTests';
import { useCLOs } from '@/hooks/useCLOs';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { BarChart3, Users, Plus, Settings, ArrowLeft } from 'lucide-react';

const COLORS = ['#3b82f6', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const BaselineResultsPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { data: stats, isLoading: statsLoading } = useCourseBaselineStats(courseId ?? '');
  const { data: results } = useBaselineResults(courseId ?? '');
  const { data: closResult } = useCLOs(courseId);
  const clos = closResult?.data ?? [];

  // Build CLO name lookup
  const cloNames = new Map(clos.map((c) => [c.id, c.title]));

  // Total unique students who completed baseline
  const uniqueStudents = new Set(results?.map((r) => r.student_id) ?? []).size;

  // Chart data
  const chartData = (stats ?? []).map((s, idx) => ({
    name: cloNames.get(s.clo_id) ?? `CLO ${idx + 1}`,
    avgScore: s.avg_score,
    students: s.student_count,
    colorIdx: idx % COLORS.length,
  }));

  return (
    <div className="space-y-6">
      <Button
        variant="ghost"
        onClick={() => navigate('/teacher/dashboard')}
        className="gap-1 text-gray-500"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Dashboard
      </Button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Baseline Results</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(`/teacher/baseline/${courseId}/config`)}
          >
            <Settings className="h-4 w-4" />
            Configure
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(`/teacher/baseline/${courseId}/questions/new`)}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Completion KPI */}
      <Card className="bg-white border-0 shadow-md rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50">
            <Users className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
              Students Completed
            </p>
            <p className="text-2xl font-black">{uniqueStudents}</p>
          </div>
        </div>
      </Card>

      {/* Per-CLO Bar Chart */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Average Scores by CLO</h2>
        </div>
        <div className="p-6">
          {statsLoading ? (
            <Shimmer className="h-64 rounded-lg" />
          ) : chartData.length > 0 ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    angle={-20}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value) => [`${value}%`, 'Avg Score']}
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  />
                  <Bar dataKey="avgScore" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, idx) => (
                      <Cell key={idx} fill={COLORS[entry.colorIdx] ?? COLORS[0]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400">
              <BarChart3 className="h-10 w-10 mb-2" />
              <p className="text-sm">No baseline results yet.</p>
            </div>
          )}
        </div>
      </Card>

      {/* Per-CLO stats table */}
      {chartData.length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl p-6">
          <h3 className="text-sm font-bold text-gray-900 mb-3">CLO Breakdown</h3>
          <div className="space-y-2">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-sm font-medium text-gray-700 truncate max-w-xs">{item.name}</span>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-xs">
                    {item.students} student{item.students !== 1 ? 's' : ''}
                  </Badge>
                  <span className="text-sm font-bold text-gray-900">{item.avgScore}%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default BaselineResultsPage;
