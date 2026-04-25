import { useId, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { CompletionRateData } from "@/types/habits";

export interface HabitCompletionChartProps {
  weeklyData: CompletionRateData[];
  monthlyData: CompletionRateData[];
  academicOnlyWeeklyData?: CompletionRateData[];
  academicOnlyMonthlyData?: CompletionRateData[];
}

type Period = "weekly" | "monthly";
type View = "all" | "academic";

const HabitCompletionChart = ({
  weeklyData,
  monthlyData,
  academicOnlyWeeklyData,
  academicOnlyMonthlyData,
}: HabitCompletionChartProps) => {
  const [period, setPeriod] = useState<Period>("weekly");
  const [view, setView] = useState<View>("all");
  const gradientId = `barGradient-${useId()}`;

  const getData = (): CompletionRateData[] => {
    if (period === "weekly") {
      return view === "academic" && academicOnlyWeeklyData
        ? academicOnlyWeeklyData
        : weeklyData;
    }
    return view === "academic" && academicOnlyMonthlyData
      ? academicOnlyMonthlyData
      : monthlyData;
  };

  const data = getData();

  return (
    <div className="space-y-3" data-testid="habit-completion-chart">
      {/* Toggle controls */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex gap-1">
          {(["weekly", "monthly"] as const).map((p) => (
            <Button
              key={p}
              variant="outline"
              size="sm"
              onClick={() => setPeriod(p)}
              aria-pressed={period === p}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-xl",
                period === p
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                  : "bg-white text-gray-600 border-gray-200"
              )}
              data-testid={`period-toggle-${p}`}
            >
              {p === "weekly" ? "Weekly" : "Monthly"}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {(["all", "academic"] as const).map((v) => (
            <Button
              key={v}
              variant="outline"
              size="sm"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                "px-3 py-1 text-xs font-semibold rounded-xl",
                view === v
                  ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
                  : "bg-white text-gray-600 border-gray-200"
              )}
              data-testid={`view-toggle-${v}`}
            >
              {v === "all" ? "All Habits" : "Academic Only"}
            </Button>
          ))}
        </div>
      </div>

      {/* Chart */}
      {data.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">
          No data available
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart
            data={data}
            margin={{ top: 4, right: 4, bottom: 4, left: -20 }}
          >
            <XAxis
              dataKey="period"
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              formatter={
                ((value: number | undefined) => [
                  `${value ?? 0}%`,
                  "Completion",
                ]) as never
              }
              contentStyle={{ borderRadius: 8, fontSize: 12 }}
            />
            <Bar
              dataKey="rate"
              fill={`url(#${gradientId})`}
              radius={[4, 4, 0, 0]}
              maxBarSize={32}
            />
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#0382BD" />
              </linearGradient>
            </defs>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default HabitCompletionChart;
