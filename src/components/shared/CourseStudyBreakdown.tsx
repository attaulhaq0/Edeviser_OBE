// =============================================================================
// CourseStudyBreakdown — Horizontal bar chart (Recharts) showing study time
// per course for the week
// =============================================================================

import { useId } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { Card } from "@/components/ui/card";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import type { CourseStudyTime } from "@/types/planner";
import { BookOpen } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CourseStudyBreakdownProps {
  data: CourseStudyTime[];
  className?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

interface ChartDatum {
  courseName: string;
  hours: number;
  minutes: number;
}

function toChartData(data: CourseStudyTime[]): ChartDatum[] {
  return data
    .map((d) => ({
      courseName:
        d.courseName.length > 20
          ? `${d.courseName.slice(0, 18)}…`
          : d.courseName,
      hours: Math.round((d.totalMinutes / 60) * 10) / 10,
      minutes: d.totalMinutes,
    }))
    .sort((a, b) => b.minutes - a.minutes);
}

// ─── Component ───────────────────────────────────────────────────────────────

const CourseStudyBreakdown = ({
  data,
  className,
}: CourseStudyBreakdownProps) => {
  const gradientId = `courseBarGradient-${useId()}`;
  const chartData = toChartData(data);

  return (
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
      data-testid="course-study-breakdown"
    >
      <GradientCardHeader icon={BookOpen} title="Study Time by Course" />

      <div className="p-6">
        {chartData.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">
            No study data for this week
          </p>
        ) : (
          <ResponsiveContainer
            width="100%"
            height={Math.max(chartData.length * 50, 150)}
          >
            <BarChart
              data={chartData}
              layout="vertical"
              margin={{ top: 4, right: 20, bottom: 4, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `${v}h`}
              />
              <YAxis
                type="category"
                dataKey="courseName"
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={120}
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
              <Bar
                dataKey="hours"
                fill={`url(#${gradientId})`}
                radius={[0, 4, 4, 0]}
                maxBarSize={24}
              />
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#14B8A6" />
                  <stop offset="100%" stopColor="#0382BD" />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
};

export default CourseStudyBreakdown;
export type { CourseStudyBreakdownProps };
