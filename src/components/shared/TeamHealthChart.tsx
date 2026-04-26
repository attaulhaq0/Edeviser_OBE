// =============================================================================
// TeamHealthChart — Task 4.14
// Recharts line chart showing health score trend over time
// =============================================================================

import { Card } from '@/components/ui/card';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { format } from 'date-fns';
import type { TeamHealthSnapshot } from '@/hooks/useTeamHealth';

interface TeamHealthChartProps {
  snapshots: TeamHealthSnapshot[];
  className?: string;
  height?: number;
}

const TeamHealthChart = ({ snapshots, className, height }: TeamHealthChartProps) => {
  const chartData = [...snapshots]
    .sort(
      (a, b) =>
        new Date(a.computed_at).getTime() - new Date(b.computed_at).getTime(),
    )
    .map((s) => ({
      date: format(new Date(s.computed_at), 'MMM d'),
      health: s.health_score,
      gini: Math.round(s.gini_coefficient * 100),
    }));

  if (chartData.length === 0) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6 text-center text-sm text-gray-400">
        No health data available yet.
      </Card>
    );
  }

  return (
    <Card className={className ?? 'bg-white border-0 shadow-md rounded-xl p-4'}>
      <h3 className="text-sm font-bold text-gray-700 mb-3">Health Score Trend</h3>
      <ResponsiveContainer width="100%" height={height ?? 200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              borderRadius: '8px',
              border: 'none',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
          />
          <ReferenceLine
            y={70}
            stroke="#22c55e"
            strokeDasharray="3 3"
            label={{ value: 'Healthy', fontSize: 10, fill: '#22c55e' }}
          />
          <ReferenceLine
            y={40}
            stroke="#ef4444"
            strokeDasharray="3 3"
            label={{ value: 'At Risk', fontSize: 10, fill: '#ef4444' }}
          />
          <Line
            type="monotone"
            dataKey="health"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ r: 3, fill: '#3b82f6' }}
            activeDot={{ r: 5 }}
            name="Health Score"
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default TeamHealthChart;
