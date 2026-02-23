import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import { useAuth } from '@/hooks/useAuth';
import { useParentKPIs, useLinkedChildren } from '@/hooks/useParentDashboard';
import {
  Users,
  BookOpen,
  TrendingUp,
  CalendarDays,
  GraduationCap,
  Flame,
  type LucideIcon,
} from 'lucide-react';

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

// ─── Parent Dashboard ───────────────────────────────────────────────────────

const ParentDashboard = () => {
  const { user, profile } = useAuth();
  const { data: kpis, isLoading: kpisLoading } = useParentKPIs(user?.id);
  const { data: children, isLoading: childrenLoading } = useLinkedChildren(user?.id);

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="space-y-6">
      {/* Welcome Hero Card */}
      <Card
        className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}
      >
        <div className="p-6">
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Parent'} 👋
          </h1>
          <p className="text-sm text-white/70 mt-1">
            Stay connected with your child's learning journey.
          </p>
        </div>
      </Card>

      {/* KPI Row */}
      {kpisLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard icon={Users} label="Children" value={kpis?.linkedChildren ?? 0} />
          <KPICard icon={BookOpen} label="Total Courses" value={kpis?.totalCourses ?? 0} />
          <KPICard
            icon={TrendingUp}
            label="Avg Attainment"
            value={`${kpis?.avgAttainment ?? 0}%`}
          />
          <KPICard icon={CalendarDays} label="Deadlines" value={kpis?.upcomingDeadlines ?? 0} />
        </div>
      )}

      {/* Children Overview */}
      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <div
          className="px-6 py-4 flex items-center gap-2"
          style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
        >
          <GraduationCap className="h-5 w-5 text-white" />
          <h2 className="text-lg font-bold tracking-tight text-white">Your Children</h2>
        </div>
        <div className="p-6">
          {childrenLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 2 }).map((_, i) => (
                <Shimmer key={i} className="h-20 rounded-lg" />
              ))}
            </div>
          ) : (children ?? []).length > 0 ? (
            <div className="space-y-4">
              {(children ?? []).map((child) => (
                <div
                  key={child.student_id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{child.student_name}</p>
                      <p className="text-xs text-gray-500">
                        Level {child.current_level} · {child.enrolled_courses} courses
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="text-xs">
                      {child.xp_total} XP
                    </Badge>
                    <span className="text-sm font-medium text-red-500 flex items-center gap-1">
                      <Flame className="h-4 w-4" />
                      {child.current_streak}d
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="p-3 rounded-full bg-blue-50 mb-3">
                <Users className="h-8 w-8 text-blue-500" />
              </div>
              <p className="text-sm text-gray-500 max-w-[260px]">
                No linked children yet. Ask your institution's admin to set up the parent-student link.
              </p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ParentDashboard;