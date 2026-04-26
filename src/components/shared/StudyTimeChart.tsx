import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3 } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { cn } from '@/lib/utils';
import type { WeeklyStudyData } from '@/types/planner';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StudyTimeChartProps {
  data: WeeklyStudyData[];
  average: number;
  courseFilter?: string | null;
  onCourseFilterChange?: (courseId: string | null) => void;
  courses?: Array<{ id: string; name: string }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatWeekLabel = (weekStartDate: string): string => {
  const d = new Date(weekStartDate);
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const formatHours = (minutes: number): string => {
  const h = (minutes / 60).toFixed(1);
  return `${h}h`;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const StudyTimeChart = ({
  data,
  average,
  courseFilter = null,
  onCourseFilterChange,
  courses = [],
}: StudyTimeChartProps) => {
  const [showAll, setShowAll] = useState(courseFilter === null);

  const chartData = data.map((d) => ({
    week: formatWeekLabel(d.weekStartDate),
    minutes: d.totalMinutes,
    hours: Number((d.totalMinutes / 60).toFixed(1)),
  }));

  const averageHours = Number((average / 60).toFixed(1));

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center justify-between"
        style={{
          background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">
            Study Time Trend
          </h2>
        </div>
        <p className="text-xs text-white/70">
          Avg: {formatHours(average)} / week
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Course filter toggle */}
        {courses.length > 0 && onCourseFilterChange && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant={showAll ? 'default' : 'outline'}
              className={cn(
                'rounded-xl text-xs h-7',
                showAll && 'bg-blue-600 text-white',
              )}
              onClick={() => {
                setShowAll(true);
                onCourseFilterChange(null);
              }}
            >
              All Courses
            </Button>
            {courses.map((c) => (
              <Button
                key={c.id}
                size="sm"
                variant={courseFilter === c.id ? 'default' : 'outline'}
                className={cn(
                  'rounded-xl text-xs h-7',
                  courseFilter === c.id && 'bg-blue-600 text-white',
                )}
                onClick={() => {
                  setShowAll(false);
                  onCourseFilterChange(c.id);
                }}
              >
                {c.name}
              </Button>
            ))}
          </div>
        )}

        {/* Chart */}
        {chartData.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="h-8 w-8 mx-auto text-gray-300 mb-2" />
            <p className="text-sm">No study data yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <Tooltip
                formatter={((value: number) => [`${value}h`, 'Study Time'] as const) as never}
                contentStyle={{
                  borderRadius: '8px',
                  border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                }}
              />
              <ReferenceLine
                y={averageHours}
                stroke="#94a3b8"
                strokeDasharray="4 4"
                label={{
                  value: `Avg ${averageHours}h`,
                  position: 'right',
                  fill: '#94a3b8',
                  fontSize: 11,
                }}
              />
              <Bar
                dataKey="hours"
                fill="#3b82f6"
                radius={[6, 6, 0, 0]}
                barSize={32}
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default StudyTimeChart;
