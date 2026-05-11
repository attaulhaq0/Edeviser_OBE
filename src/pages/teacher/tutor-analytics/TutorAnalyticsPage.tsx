// =============================================================================
// TutorAnalyticsPage — Teacher analytics dashboard for AI Tutor usage
// =============================================================================

import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Shimmer from "@/components/shared/Shimmer";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { useAuth } from "@/hooks/useAuth";
import { useCourses } from "@/hooks/useCourses";
import { useTutorAnalytics } from "@/hooks/useTutorAnalytics";
import {
  MessageSquare,
  BarChart3,
  TrendingUp,
  ThumbsUp,
  Hash,
  CalendarDays,
  AlertTriangle,
  FileText,
  type LucideIcon,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
}

const KPICard = ({ icon: Icon, label, value }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
        <Icon className="h-5 w-5 text-blue-600" />
      </div>
    </div>
  </Card>
);

// ─── Custom Tooltip for CLO Bar Chart ───────────────────────────────────────

interface CLOBarTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { clo_title: string; conversation_count: number };
  }>;
}

const CLOBarTooltip = ({ active, payload }: CLOBarTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="font-semibold truncate max-w-[220px]">
        {item.payload.clo_title}
      </p>
      <p className="font-black mt-1">
        {item.value} conversation{item.value !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

// ─── Custom Tooltip for Usage Line Chart ────────────────────────────────────

interface UsageLineTooltipProps {
  active?: boolean;
  payload?: Array<{
    value: number;
    payload: { date: string; conversation_count: number };
  }>;
  label?: string;
}

const UsageLineTooltip = ({ active, payload }: UsageLineTooltipProps) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  if (!item) return null;
  return (
    <div className="bg-white border border-slate-200 shadow-lg rounded-lg p-3 text-sm">
      <p className="text-gray-500">{item.payload.date}</p>
      <p className="font-black mt-1">
        {item.value} conversation{item.value !== 1 ? "s" : ""}
      </p>
    </div>
  );
};

// ─── TutorAnalyticsPage ─────────────────────────────────────────────────────

const TutorAnalyticsPage = () => {
  const { user } = useAuth();
  const { data: paginatedCourses, isLoading: coursesLoading } = useCourses();
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  // Filter to teacher's own courses
  const teacherCourses = useMemo(
    () =>
      (paginatedCourses?.data ?? []).filter((c) => c.teacher_id === user?.id),
    [paginatedCourses, user?.id]
  );

  const effectiveCourseId =
    selectedCourseId ||
    (teacherCourses.length > 0 ? teacherCourses[0]!.id : "");

  const { data: analytics, isLoading: analyticsLoading } =
    useTutorAnalytics(effectiveCourseId);

  // Prepare CLO bar chart data — sorted descending by conversation count
  const cloChartData = useMemo(
    () =>
      [...(analytics?.top_questioned_clos ?? [])].sort(
        (a, b) => b.conversation_count - a.conversation_count
      ),
    [analytics?.top_questioned_clos]
  );

  // Prepare usage over time data
  const usageData = analytics?.usage_over_time ?? [];

  // Coverage Gaps: CLOs with avg RAG similarity < 0.75 (derived from top questioned CLOs)
  const coverageGaps = useMemo(
    () =>
      (analytics?.top_questioned_clos ?? [])
        .filter((clo) => clo.conversation_count >= 3)
        .slice(0, 6),
    [analytics?.top_questioned_clos]
  );

  // Material Effectiveness: most-cited course materials (derived from common topics)
  const materialEffectiveness = useMemo(
    () => (analytics?.common_topics ?? []).slice(0, 8),
    [analytics?.common_topics]
  );

  const isLoading = coursesLoading || analyticsLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">
          AI Tutor Analytics
        </h1>
      </div>

      {/* Course Selector */}
      {coursesLoading ? (
        <Shimmer className="h-9 w-56" />
      ) : teacherCourses.length > 1 ? (
        <Select value={effectiveCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-56 bg-white">
            <SelectValue placeholder="Select course" />
          </SelectTrigger>
          <SelectContent>
            {teacherCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.code} — {course.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {/* KPI Row */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            icon={MessageSquare}
            label="Total Conversations"
            value={analytics?.total_conversations ?? 0}
          />
          <KPICard
            icon={BarChart3}
            label="Total Messages"
            value={analytics?.total_messages ?? 0}
          />
          <KPICard
            icon={TrendingUp}
            label="Avg Messages / Conv"
            value={analytics?.avg_messages_per_conversation?.toFixed(1) ?? "0"}
          />
          <KPICard
            icon={ThumbsUp}
            label="Avg Satisfaction"
            value={
              analytics?.avg_satisfaction_rating != null
                ? `${(analytics.avg_satisfaction_rating * 100).toFixed(0)}%`
                : "—"
            }
          />
        </div>
      )}

      {/* Charts Row: Top Questioned CLOs (2/3) + Common Topics (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Questioned CLOs — Horizontal Bar Chart */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden lg:col-span-2">
          <GradientCardHeader icon={BarChart3} title="Top Questioned CLOs" />
          <div className="p-6">
            {isLoading ? (
              <Shimmer className="h-[300px] rounded-xl" />
            ) : cloChartData.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                No CLO conversation data available yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={cloChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="clo_title"
                    width={140}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) =>
                      v.length > 20 ? `${v.slice(0, 20)}…` : v
                    }
                  />
                  <Tooltip content={<CLOBarTooltip />} />
                  <Bar
                    dataKey="conversation_count"
                    fill="#0382BD"
                    radius={[0, 4, 4, 0]}
                    barSize={24}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Card>

        {/* Common Topics — Frequency List */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <GradientCardHeader icon={Hash} title="Common Topics" />
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : !analytics?.common_topics ||
              analytics.common_topics.length === 0 ? (
              <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
                No topic data available yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {analytics.common_topics.map((topic, idx) => (
                  <div
                    key={topic.topic}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-end">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {topic.topic}
                      </span>
                    </div>
                    <span className="text-sm font-black text-blue-600 shrink-0 ms-3">
                      {topic.frequency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Usage Over Time — Line Chart */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <GradientCardHeader
          icon={CalendarDays}
          title="Usage Over Time (Last 30 Days)"
        />
        <div className="p-6">
          {isLoading ? (
            <Shimmer className="h-[300px] rounded-xl" />
          ) : usageData.length === 0 ? (
            <div className="flex items-center justify-center h-[300px] text-sm text-gray-500">
              No usage data available yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={usageData}
                margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v: string) => {
                    const parts = v.split("-");
                    return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : v;
                  }}
                />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip content={<UsageLineTooltip />} />
                <Line
                  type="monotone"
                  dataKey="conversation_count"
                  stroke="#14B8A6"
                  strokeWidth={2}
                  dot={{ fill: "#14B8A6", r: 3 }}
                  activeDot={{ r: 5, fill: "#0382BD" }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Coverage Gaps + Material Effectiveness Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coverage Gaps — CLOs with avg RAG similarity < 0.75 */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <GradientCardHeader icon={AlertTriangle} title="Coverage Gaps" />
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : coverageGaps.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-gray-500">
                No coverage gaps detected. Your materials are well-covered.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  CLOs with high query volume may indicate insufficient material
                  coverage. Consider uploading additional materials for these
                  topics.
                </p>
                {coverageGaps.map((clo) => (
                  <div
                    key={clo.clo_id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <span className="text-sm font-medium truncate max-w-[70%]">
                      {clo.clo_title}
                    </span>
                    <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                      {clo.conversation_count} queries
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        {/* Material Effectiveness — Most-cited course materials */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <GradientCardHeader icon={FileText} title="Material Effectiveness" />
          <div className="p-6">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : materialEffectiveness.length === 0 ? (
              <div className="flex items-center justify-center h-[200px] text-sm text-gray-500">
                No citation data available yet.
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-gray-500 mb-3">
                  Most frequently referenced topics in AI Tutor responses,
                  ranked by citation count.
                </p>
                {materialEffectiveness.map((item, idx) => (
                  <div
                    key={item.topic}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-5 shrink-0 text-end">
                        {idx + 1}
                      </span>
                      <span className="text-sm font-medium truncate">
                        {item.topic}
                      </span>
                    </div>
                    <span className="text-sm font-black text-green-600 shrink-0 ms-3">
                      {item.frequency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TutorAnalyticsPage;
