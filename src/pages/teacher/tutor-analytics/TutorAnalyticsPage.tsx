import { useState } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MessageSquare, MessagesSquare, ThumbsUp, Target, Loader2 } from 'lucide-react';
import { useTutorAnalytics } from '@/hooks/useTutorAnalytics';
import { useCourses } from '@/hooks/useCourses';
import { useAuth } from '@/hooks/useAuth';

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: typeof MessageSquare;
  label: string;
  value: string | number;
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

// ─── Main Page ──────────────────────────────────────────────────────────────

const TutorAnalyticsPage = () => {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('');

  const { data: courses = [] } = useCourses();
  const teacherCourses = courses.filter(
    (c) => 'teacher_id' in c && (c as Record<string, unknown>).teacher_id === user?.id,
  );

  const { data: analytics, isLoading } = useTutorAnalytics(selectedCourseId);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">AI Tutor Analytics</h1>
        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a course" />
          </SelectTrigger>
          <SelectContent>
            {teacherCourses.map((course) => (
              <SelectItem key={course.id} value={course.id}>
                {course.name ?? course.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!selectedCourseId ? (
        <div className="text-center py-12">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Select a course to view tutor analytics</p>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      ) : analytics ? (
        <>
          {/* KPI Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard
              icon={MessageSquare}
              label="Total Conversations"
              value={analytics.total_conversations}
            />
            <KPICard
              icon={MessagesSquare}
              label="Total Messages"
              value={analytics.total_messages}
            />
            <KPICard
              icon={Target}
              label="Avg Messages/Conv"
              value={analytics.avg_messages_per_conversation}
            />
            <KPICard
              icon={ThumbsUp}
              label="Satisfaction"
              value={`${Math.round(analytics.avg_satisfaction_rating * 100)}%`}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Questioned CLOs */}
            <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
                }}
              >
                <Target className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Top Questioned CLOs
                </h2>
              </div>
              <div className="p-6">
                {analytics.top_questioned_clos.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No CLO data available yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart
                      data={analytics.top_questioned_clos}
                      layout="vertical"
                      margin={{ left: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="clo_title"
                        width={120}
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip />
                      <Bar
                        dataKey="conversation_count"
                        fill="#3b82f6"
                        radius={[0, 4, 4, 0]}
                        name="Conversations"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            {/* Usage Over Time */}
            <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
              <div
                className="px-6 py-4 flex items-center gap-2"
                style={{
                  background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
                }}
              >
                <MessagesSquare className="h-5 w-5 text-white" />
                <h2 className="text-lg font-bold tracking-tight text-white">
                  Usage Over Time
                </h2>
              </div>
              <div className="p-6">
                {analytics.usage_over_time.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No usage data available yet
                  </p>
                ) : (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={analytics.usage_over_time}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 10 }}
                        tickFormatter={(d: string) => d.slice(5)}
                      />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="conversation_count"
                        stroke="#14b8a6"
                        strokeWidth={2}
                        dot={false}
                        name="Conversations"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>
          </div>

          {/* Common Topics */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
              }}
            >
              <MessageSquare className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Common Topics
              </h2>
            </div>
            <div className="p-6">
              {analytics.common_topics.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">
                  No topic data available yet
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analytics.common_topics.map((topic) => (
                    <div
                      key={topic.topic}
                      className="px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 text-sm font-medium"
                    >
                      {topic.topic}
                      <span className="ms-1.5 text-xs text-blue-400">
                        ({topic.frequency})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>

          {/* Coverage Gaps — Requirement 32.1 */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
              }}
            >
              <Target className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Coverage Gaps
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center py-4">
                CLOs where the average RAG similarity score is below 0.75 will appear here,
                indicating insufficient course material coverage. Upload additional materials
                to improve AI tutor effectiveness for these topics.
              </p>
            </div>
          </Card>

          {/* Material Effectiveness — Requirement 32.2 */}
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{
                background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
              }}
            >
              <MessageSquare className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">
                Material Effectiveness
              </h2>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-500 text-center py-4">
                Course materials ranked by citation frequency in tutor responses will appear here.
                Most-cited materials indicate high relevance to student questions.
              </p>
            </div>
          </Card>
        </>
      ) : null}
    </div>
  );
};

export default TutorAnalyticsPage;
