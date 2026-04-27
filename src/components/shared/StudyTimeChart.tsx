// =============================================================================
// StudyTimeChart — Recharts BarChart showing weekly study hours for last 8
// weeks with average line, course filter toggle
// =============================================================================

import { useState, useMemo, useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import type { WeeklyStudyData } from "@/types/planner";
import { TrendingUp } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudyTimeChartProps {
  data: WeeklyStudyData[];
  averageMinutesPerWeek: number;
  courseFilter?: string | null;
  courseOptions?: Array<{ id: string; name: string }>;
  onCourseFilterChange?: (courseId: string | null) => void;
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ChartDatum {
  weekLabel: string;
  hours: number;
}

function formatWeekLabel(weekStartDate: string): string {
  try {
    const [, month, day] = weekStartDate.split("-").map(Number) as [
      number,
      number,
      number
    ];
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return `${monthNames[month - 1]} ${day}`;
  } catch {
    return weekStartDate;
  }
}

function toChartData(data: WeeklyStudyData[]): ChartDatum[] {
  return data.map((d) => ({
    weekLabel: formatWeekLabel(d.weekStartDate),
    hours: Math.round((d.totalMinutes / 60) * 10) / 10,
  }));
}

// ─── Component ───────────────────────────────────────────────────────────────

const StudyTimeChart = ({
  data,
  averageMinutesPerWeek,
  courseFilter = null,
  courseOptions = [],
  onCourseFilterChange,
  className,
}: StudyTimeChartProps) => {
  const [localFilter, setLocalFilter] = useState<string | null>(courseFilter);
  const gradientId = `studyTimeGradient-${useId()}`;

  const chartData = useMemo(() => toChartData(data), [data]);
  const averageHours = Math.round((averageMinutesPerWeek / 60) * 10) / 10;

  const handleFilterChange = (courseId: string | null) => {
    setLocalFilter(courseId);
    onCourseFilterChange?.(courseId);
  };

  return (
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
      data-testid="study-time-chart"
    >
      <GradientCardHeader icon={TrendingUp} title="Study Time Trends" />

      <div className="p-6 space-y-4">
        {/* Course filter toggle */}
        {courseOptions.length > 0 && (
          <div
            className="flex items-center gap-1 flex-wrap"
            data-testid="course-filter-toggles"
          >
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleFilterChange(null)}
              aria-pressed={localFilter === null}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-xl",
                localFilter === null
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                  : "bg-white text-gray-600 border-gray-200"
              )}
            >
              All Courses
            </Button>
            {courseOptions.map((course) => (
              <Button
                key={course.id}
                variant="outline"
                size="sm"
                onClick={() => handleFilterChange(course.id)}
                aria-pressed={localFilter === course.id}
                className={cn(
                  "px-3 py-1 text-xs font-semibold rounded-xl",
                  localFilter === course.id
                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                    : "bg-white text-gray-600 border-gray-200"
                )}
              >
                {course.name}
              </Button>
            ))}
          </div>
        )}

        {/* Chart */}
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No study data available
          </p>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={chartData}
                margin={{ top: 10, right: 10, bottom: 4, left: -10 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="weekLabel"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v: number) => `${v}h`}
                />
                <Tooltip
                  formatter={
                    ((value: number | undefined) => [
                      `${value ?? 0}h`,
                      "Study Time",
                    ]) as never
                  }
                  contentStyle={{ borderRadius: 8, fontSize: 12 }}
                />
                {averageHours > 0 && (
                  <ReferenceLine
                    y={averageHours}
                    stroke="#9ca3af"
                    strokeDasharray="6 4"
                    label={{
                      value: `Avg: ${averageHours}h`,
                      position: "insideTopRight",
                      fill: "#9ca3af",
                      fontSize: 11,
                    }}
                  />
                )}
                <Bar
                  dataKey="hours"
                  fill={`url(#${gradientId})`}
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#2563eb" />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>

            {/* Average summary */}
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="h-3 w-3 rounded-sm bg-blue-500" />
                <span>Weekly Hours</span>
              </div>
              {averageHours > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-4 border-t-2 border-dashed border-gray-400" />
                  <span>Average ({averageHours}h/week)</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </Card>
  );
};

export default StudyTimeChart;
export type { StudyTimeChartProps };
