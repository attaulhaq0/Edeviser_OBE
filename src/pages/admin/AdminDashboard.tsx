import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import { useAdminKPIs, useRecentAuditLogs } from '@/hooks/useAdminDashboard';
import {
  Users,
  UserCheck,
  BookOpen,
  GraduationCap,
  Activity,
  BarChart3,
  type LucideIcon,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

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
  const { data: kpis, isLoading: kpisLoading } = useAdminKPIs();
  const { data: auditLogs, isLoading: logsLoading } = useRecentAuditLogs(10);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Users} label="Total Users" value={kpis?.totalUsers ?? 0} />
          <KPICard icon={UserCheck} label="Active Users" value={kpis?.activeUsers ?? 0} />
          <KPICard icon={BookOpen} label="Programs" value={kpis?.totalPrograms ?? 0} />
          <KPICard icon={GraduationCap} label="Courses" value={kpis?.totalCourses ?? 0} />
        </div>
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
                      {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
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
    </div>
  );
};

export default AdminDashboard;