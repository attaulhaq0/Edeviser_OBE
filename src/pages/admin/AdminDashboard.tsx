import { useNavigate, Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import { useAdminKPIs, useRecentAuditLogs, useOnboardingAnalytics } from '@/hooks/useAdminDashboard';
import { useAIPerformance } from '@/hooks/useAIPerformance';
import {
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  Activity,
  BarChart3,
  ClipboardCheck,
  Brain,
  ThumbsUp,
  Target,
  FileCheck,
  ArrowRight,
  Award,
  Database,
  Network,
  type LucideIcon,
} from 'lucide-react';
import { formatRelativeTime } from '@/lib/formatDate';
import { formatNumber, formatPercent } from '@/lib/formatNumber';

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

// ─── Role badge colors ──────────────────────────────────────────────────────

const roleBadgeStyles: Record<string, string> = {
  admin: 'bg-red-100 text-red-700 border-red-200',
  coordinator: 'bg-blue-100 text-blue-700 border-blue-200',
  teacher: 'bg-green-100 text-green-700 border-green-200',
  student: 'bg-amber-100 text-amber-700 border-amber-200',
  parent: 'bg-purple-100 text-purple-700 border-purple-200',
};


// ─── Admin Dashboard ────────────────────────────────────────────────────────

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { data: kpis, isLoading: kpisLoading } = useAdminKPIs();
  const { data: auditLogs, isLoading: logsLoading } = useRecentAuditLogs(10);
  const { data: onboardingAnalytics } = useOnboardingAnalytics();
  const { data: aiPerformance, isLoading: aiLoading } = useAIPerformance();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KPICard icon={Users} label="Total Users" value={formatNumber(kpis?.totalUsers ?? 0)} />
          <KPICard icon={UserCheck} label="Active Users" value={formatNumber(kpis?.activeUsers ?? 0)} />
          <KPICard icon={BookOpen} label="Programs" value={formatNumber(kpis?.totalPrograms ?? 0)} />
          <KPICard icon={GraduationCap} label="Courses" value={formatNumber(kpis?.totalCourses ?? 0)} />
          <KPICard
            icon={ClipboardCheck}
            label="Onboarding"
            value={formatPercent(onboardingAnalytics?.completionRate ?? 0)}
          />
        </div>
      )}

      {/* Onboarding pending link */}
      {onboardingAnalytics && onboardingAnalytics.completionRate < 100 && (
        <button
          type="button"
          onClick={() => navigate('/admin/onboarding/pending')}
          className="w-full text-start rounded-xl bg-amber-50 p-4 flex items-center justify-between hover:bg-amber-100 transition-colors"
        >
          <div>
            <p className="text-sm font-semibold text-amber-800">
              {onboardingAnalytics.totalStudents - onboardingAnalytics.completedOnboarding} student{onboardingAnalytics.totalStudents - onboardingAnalytics.completedOnboarding !== 1 ? 's' : ''} haven&apos;t completed onboarding
            </p>
            <p className="text-xs text-amber-600">View list and send reminders</p>
          </div>
          <ClipboardCheck className="h-5 w-5 text-amber-600 shrink-0" />
        </button>
      )}

      {/* Two-column layout: Users by Role + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Users by Role */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <Users className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Users by Role</h2>
          </div>
          <div className="p-6">
            {kpisLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-8 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {Object.entries(kpis?.usersByRole ?? {}).map(([role, count]) => (
                  <div key={role} className="flex items-center justify-between">
                    <Badge variant="outline" className={roleBadgeStyles[role] ?? ''}>
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                    <span className="text-sm font-semibold">{count}</span>
                  </div>
                ))}
                {Object.keys(kpis?.usersByRole ?? {}).length === 0 && (
                  <p className="text-sm text-gray-500">No active users yet.</p>
                )}
              </div>
            )}
          </div>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <Activity className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Recent Activity</h2>
          </div>
          <div className="p-6">
            {logsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Shimmer key={i} className="h-10 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {(auditLogs ?? []).map((log) => (
                  <div key={log.id} className="flex items-start justify-between gap-2 py-1">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {log.action} {log.entity_type}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{log.entity_id}</p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                ))}
                {(auditLogs ?? []).length === 0 && (
                  <p className="text-sm text-gray-500">No recent activity.</p>
                )}
              </div>
            )}
          </div>
        </Card>
      </div>


      {/* PLO Heatmap Placeholder */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <BarChart3 className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">PLO Attainment Heatmap</h2>
        </div>
        <div className="flex items-center justify-center py-12 px-6 text-gray-400">
          <p className="text-sm">
            PLO attainment heatmap will appear here once outcome data is available.
          </p>
        </div>
      </Card>

      {/* AI Co-Pilot Performance */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <Brain className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">AI Co-Pilot Performance</h2>
        </div>
        <div className="p-6">
          {aiLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Shimmer key={i} className="h-24 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-green-50">
                  <ThumbsUp className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Suggestion Acceptance
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {aiPerformance?.suggestionAcceptanceRate ?? 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {aiPerformance?.suggestionTotal ?? 0} total suggestions
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Target className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Prediction Accuracy
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {aiPerformance?.predictionAccuracyRate ?? 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {aiPerformance?.predictionTotal ?? 0} validated predictions
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 p-4 flex items-center gap-4">
                <div className="p-2 rounded-lg bg-amber-50">
                  <FileCheck className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
                    Draft Acceptance
                  </p>
                  <p className="text-2xl font-black mt-1">
                    {aiPerformance?.draftAcceptanceRate ?? 0}%
                  </p>
                  <p className="text-xs text-gray-500">
                    {aiPerformance?.draftTotal ?? 0} feedback drafts
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Card>


      {/* OBE Management Quick Access — Requirements 104.5, 111.1, 105.1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Graduate Attribute Overview */}
        <Link to="/admin/graduate-attributes" className="block">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow h-full">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <Award className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Graduate Attributes</h2>
            </div>
            <div className="p-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-teal-50 mb-3">
                <Award className="h-8 w-8 text-teal-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Attribute Attainment</p>
              <p className="text-xs text-gray-500 mt-1">
                View and manage graduate attribute mappings and attainment overview.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">
                Manage <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Historical Evidence Dashboard */}
        <Link to="/admin/historical-evidence" className="block">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow h-full">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <Database className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Historical Evidence</h2>
            </div>
            <div className="p-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-blue-50 mb-3">
                <Database className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Evidence Dashboard</p>
              <p className="text-xs text-gray-500 mt-1">
                Browse historical evidence records across semesters and programs.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">
                View <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>

        {/* Competency Framework */}
        <Link to="/admin/competency-frameworks" className="block">
          <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden hover:shadow-lg transition-shadow h-full">
            <div
              className="px-6 py-4 flex items-center gap-2"
              style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
            >
              <Network className="h-5 w-5 text-white" />
              <h2 className="text-lg font-bold tracking-tight text-white">Competency Frameworks</h2>
            </div>
            <div className="p-6 flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-purple-50 mb-3">
                <Network className="h-8 w-8 text-purple-500" />
              </div>
              <p className="text-sm font-semibold text-gray-700">Framework Management</p>
              <p className="text-xs text-gray-500 mt-1">
                Define competency hierarchies and map to outcome chains.
              </p>
              <span className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 mt-3">
                Manage <ArrowRight className="h-4 w-4" />
              </span>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  );
};

export default AdminDashboard;
