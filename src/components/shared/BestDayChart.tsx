import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { getBestDay } from '@/lib/heatmapUtils';
import type { DayOfWeekData } from '@/types/habits';

export interface BestDayChartProps {
  data: DayOfWeekData[];
}

const BestDayChart = ({ data }: BestDayChartProps) => {
  const bestDay = getBestDay(data);

  if (data.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8" data-testid="best-day-chart-empty">
        No data available
      </p>
    );
  }

  return (
    <div data-testid="best-day-chart">
      {bestDay && (
        <p className="text-sm text-gray-600 mb-3">
          Your best day is <span className="font-bold text-blue-600">{bestDay.day}</span> with an
          average of {bestDay.avgCompletions} habits
        </p>
      )}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 4, bottom: 4, left: 4 }}
        >
          <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            type="category"
            dataKey="day"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={80}
            tickFormatter={(v: string) => v.slice(0, 3)}
          />
          <Tooltip
            formatter={(value: number | undefined) => [(value ?? 0).toFixed(2), 'Avg Habits']}
            contentStyle={{ borderRadius: 8, fontSize: 12 }}
          />
          <Bar dataKey="avgCompletions" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry) => (
              <Cell
                key={entry.day}
                fill={bestDay && entry.day === bestDay.day ? '#2563eb' : '#e2e8f0'}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default BestDayChart;
