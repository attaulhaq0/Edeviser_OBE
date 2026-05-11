// =============================================================================
// TeamHealthChart — Recharts line chart showing health score trend over time
// Task 4.14: line chart with health score history
// =============================================================================

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export interface HealthDataPoint {
  date: string;
  healthScore: number;
  giniCoefficient?: number;
}

export interface TeamHealthChartProps {
  data: HealthDataPoint[];
  height?: number;
  className?: string;
}

const TeamHealthChart = ({
  data,
  height = 250,
  className,
}: TeamHealthChartProps) => {
  const chartData = useMemo(
    () =>
      data.map((d) => ({
        ...d,
        label: format(new Date(d.date), "MMM d"),
      })),
    [data]
  );

  if (data.length === 0) {
    return (
      <div
        className={cn(
          "flex items-center justify-center text-sm text-gray-400",
          className
        )}
        style={{ height }}
      >
        No health data available yet
      </div>
    );
  }

  return (
    <div className={cn("w-full", className)}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={{ stroke: "#e2e8f0" }}
            width={35}
          />
          <Tooltip
            contentStyle={{
              borderRadius: "0.75rem",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontSize: "12px",
            }}
            formatter={(value) => [`${value}`, "Health Score"]}
            labelFormatter={(label) => String(label)}
          />
          {/* Threshold lines */}
          <ReferenceLine
            y={70}
            stroke="#22c55e"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{
              value: "Healthy",
              position: "insideTopRight",
              fontSize: 10,
              fill: "#22c55e",
            }}
          />
          <ReferenceLine
            y={40}
            stroke="#ef4444"
            strokeDasharray="4 4"
            strokeOpacity={0.5}
            label={{
              value: "At Risk",
              position: "insideBottomRight",
              fontSize: 10,
              fill: "#ef4444",
            }}
          />
          <Line
            type="monotone"
            dataKey="healthScore"
            stroke="#3b82f6"
            strokeWidth={2.5}
            dot={{ r: 4, fill: "#3b82f6", strokeWidth: 2, stroke: "#fff" }}
            activeDot={{
              r: 6,
              fill: "#3b82f6",
              strokeWidth: 2,
              stroke: "#fff",
            }}
            animationDuration={600}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TeamHealthChart;
