import { Card } from "@/components/ui/card";
import Shimmer from "@/components/shared/Shimmer";
import { useGradingStats } from "@/hooks/useGradingStats";
import {
  CheckSquare,
  Clock,
  Inbox,
  Flame,
  type LucideIcon,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatGradingTime(seconds: number): string {
  if (seconds === 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
}

const StatCard = ({ icon: Icon, label, value }: StatCardProps) => (
  <div className="flex items-center gap-3">
    <div className="p-2 rounded-lg bg-blue-50">
      <Icon className="h-4 w-4 text-blue-600" />
    </div>
    <div>
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
        {label}
      </p>
      <p className="text-2xl font-black">{value}</p>
    </div>
  </div>
);

// ─── Custom Tooltip ─────────────────────────────────────────────────────────

interface VelocityTooltipProps {
  active?: boolean;
  payload?: Array<{ value: number; payload: { date: string } }>;
}

const VelocityTooltip = ({ active, payload }: VelocityTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="text-gray-500">{item.payload.date}</p>
      <p className="font-black mt-1">{item.value} graded</p>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────

interface GradingStatsProps {
  teacherId: string;
}

const GradingStats = ({ teacherId }: GradingStatsProps) => {
  const { data, isLoading, error } = useGradingStats(teacherId);

  if (isLoading) {
    return <Shimmer className="h-64 rounded-xl" />;
  }

  if (error) {
    return (
      <Card className="bg-white border-0 shadow-md rounded-xl p-6">
        <p className="text-sm text-red-500">Failed to load grading stats.</p>
      </Card>
    );
  }

  if (!data) return null;

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-5">
      <h2 className="text-lg font-bold tracking-tight">Grading Stats</h2>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={CheckSquare}
          label="Graded This Week"
          value={data.gradedThisWeek}
        />
        <StatCard
          icon={Clock}
          label="Avg Time"
          value={formatGradingTime(data.avgGradingTimeSeconds)}
        />
        <StatCard icon={Inbox} label="Pending" value={data.pendingCount} />
        <StatCard
          icon={Flame}
          label="Grading Streak"
          value={`${data.gradingStreak}d`}
        />
      </div>

      {/* Velocity Trend Chart */}
      {data.velocityTrend?.length > 0 ? (
        <div>
          <p className="text-[10px] font-black tracking-widest uppercase text-gray-500 mb-3">
            Grading Velocity (Last 30 Days)
          </p>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={data.velocityTrend}
              margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
              <Tooltip content={<VelocityTooltip />} />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={{ r: 3, fill: "#3b82f6" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-sm text-gray-500 text-center py-4">
          No grading activity in the last 30 days.
        </p>
      )}
    </Card>
  );
};

export default GradingStats;
