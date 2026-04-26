import { Card } from '@/components/ui/card';
import { BookOpen } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { CourseStudyTime } from '@/types/planner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CourseStudyBreakdownProps {
  data: CourseStudyTime[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS = [
  '#3b82f6', // blue-500
  '#14b8a6', // teal-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ef4444', // red-500
  '#22c55e', // green-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
];

const formatMinutes = (minutes: number): string => {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const CourseStudyBreakdown = ({ data }: CourseStudyBreakdownProps) => {
  if (data.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <div className="text-center py-6 text-gray-500">
          <BookOpen className="h-8 w-8 mx-auto text-gray-300 mb-2" />
          <p className="text-sm">No study time recorded this week</p>
        </div>
      </Card>
    );
  }

  const chartData = data
    .sort((a, b) => b.totalMinutes - a.totalMinutes)
    .map((d) => ({
      name: d.courseName.length > 20 ? `${d.courseName.slice(0, 18)}…` : d.courseName,
      fullName: d.courseName,
      minutes: d.totalMinutes,
      label: formatMinutes(d.totalMinutes),
    }));

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <BookOpen className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Study Time by Course
        </h2>
      </div>
      <div className="p-6">
        <ResponsiveContainer width="100%" height={Math.max(data.length * 48, 120)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 0, right: 40 }}>
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tick={{ fontSize: 12, fill: '#64748b' }}
            />
            <Tooltip
              formatter={((value: number) => [formatMinutes(value), 'Study Time'] as const) as never}
              labelFormatter={((label: string) => {
                const item = chartData.find((d) => d.name === label);
                return item?.fullName ?? label;
              }) as never}
              contentStyle={{
                borderRadius: '8px',
                border: 'none',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar dataKey="minutes" radius={[0, 6, 6, 0]} barSize={24}>
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};

export default CourseStudyBreakdown;
