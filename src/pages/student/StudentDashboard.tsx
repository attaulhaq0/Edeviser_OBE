import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Shimmer from '@/components/shared/Shimmer';
import { useAuth } from '@/hooks/useAuth';
import { useStudentKPIs, useUpcomingDeadlines } from '@/hooks/useStudentDashboard';
import {
  BookOpen,
  CheckCircle2,
  TrendingUp,
  Flame,
  Star,
  CalendarClock,
  type LucideIcon,
} from 'lucide-react';
import { format } from 'date-fns';

// ─── KPI Card ───────────────────────────────────────────────────────────────

interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: number | string;
  accent?: string;
}

const KPICard = ({ icon: Icon, label, value, accent }: KPICardProps) => (
  <Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          {label}
        </p>
        <p className="text-2xl font-black mt-1">{value}</p>
      </div>
      <div className={`p-2 rounded-lg ${accent ?? 'bg-blue-50'} group-hover:scale-110 transition-transform`}>
        <Icon className={`h-5 w-5 ${accent ? 'text-white' : 'text-blue-600'}`} />
      </div>
    </div>
  </Card>
);

// ─── Student Dashboard ──────────────────────────────────────────────────────

const StudentDashboard = () => {
  const { user, profile } = useAuth();
  const { data: kpis, isLoading: kpisLoading } = useStudentKPIs(user?.id);
  const { data: deadlines, isLoading: deadlinesLoading } = useUpcomingDeadlines(user?.id, 5);

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
        <div className="p-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {greeting()}, {profile?.full_name?.split(' ')[0] ?? 'Student'} 👋
            </h1>
            <p className="text-sm text-white/70 mt-1">
              Keep up the momentum — every step counts.
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="text-center">
              <p className="text-2xl font-black">{kpis?.totalXP ?? 0}</p>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/60">XP</p>
            </div>
            <div className="w-px h-10 bg-white/20" />
            <div className="text-center">
              <p className="text-2xl font-black">Lv {kpis?.currentLevel ?? 1}</p>
              <p className="text-[10px] font-black tracking-widest uppercase text-white/60">Level</p>
            </div>
          </div>
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
          <KPICard icon={BookOpen} label="Courses" value={kpis?.enrolledCourses ?? 0} />
          <KPICard icon={CheckCircle2} label="Completed" value={kpis?.completedAssignments ?? 0} />
          <KPICard
            icon={TrendingUp}
            label="Avg Attainment"
            value={`${kpis?.avgAttainment ?? 0}%`}
          />
          <KPICard icon={Flame} label="Streak" value={`${kpis?.currentStreak ?? 0}d`} />
        </div>
      )}

      {/* Two-column layout: Upcoming Deadlines + Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <CalendarClock className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Upcoming Deadlines</h2>
          </div>
          <div className="p-6">
            {deadlinesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Shimmer key={i} className="h-12 rounded-lg" />
                ))}
              </div>
            ) : (deadlines ?? []).length > 0 ? (
              <div className="space-y-3">
                {(deadlines ?? []).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.title}</p>
                      <p className="text-xs text-gray-500 truncate">{d.course_name}</p>
                    </div>
                    <Badge variant="outline" className="text-xs whitespace-nowrap">
                      {format(new Date(d.due_date), 'MMM d')}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="p-3 rounded-full bg-green-50 mb-3">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-sm text-gray-500">No upcoming deadlines. Enjoy the break.</p>
              </div>
            )}
          </div>
        </Card>

        {/* Gamification Summary */}
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <div
            className="px-6 py-4 flex items-center gap-2"
            style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}
          >
            <Star className="h-5 w-5 text-white" />
            <h2 className="text-lg font-bold tracking-tight text-white">Your Progress</h2>
          </div>
          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Total XP</span>
              <span className="text-sm font-bold text-amber-600">{kpis?.totalXP ?? 0} XP</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Current Level</span>
              <span className="text-sm font-bold">Level {kpis?.currentLevel ?? 1}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Login Streak</span>
              <span className="text-sm font-bold text-red-500">
                🔥 {kpis?.currentStreak ?? 0} days
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Assignments Done</span>
              <span className="text-sm font-bold">{kpis?.completedAssignments ?? 0}</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default StudentDashboard;