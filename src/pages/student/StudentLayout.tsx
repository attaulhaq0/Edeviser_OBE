import { lazy, Suspense } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { usePageViewLogger } from '@/hooks/usePageViewLogger';
import { LayoutDashboard, BookOpen, ClipboardList, TrendingUp, Trophy, PenLine, Star, Grid3X3, UserCircle, FileQuestion, Calendar, Clock, Swords } from 'lucide-react';

const OnboardingWizard = lazy(() => import('@/pages/student/onboarding/OnboardingWizard'));

const navItems = [
  { to: '/student/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/student/courses', icon: BookOpen, label: 'Courses' },
  { to: '/student/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/student/progress', icon: TrendingUp, label: 'Progress' },
  { to: '/student/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/student/challenges', icon: Swords, label: 'Challenges' },
  { to: '/student/habits', icon: Grid3X3, label: 'Habits' },
  { to: '/student/journal', icon: PenLine, label: 'Journal' },
  { to: '/student/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/student/timetable', icon: Clock, label: 'Timetable' },
  { to: '/student/portfolio', icon: Star, label: 'Portfolio' },
  { to: '/student/surveys', icon: FileQuestion, label: 'Surveys' },
  { to: '/student/settings/profile', icon: UserCircle, label: 'Profile' },
];

const StudentLayout = () => {
  const { profile } = useAuth();
  const showOnboarding = profile?.role === 'student' && profile?.onboarding_completed === false;

  // Log page_view events on every student route change
  usePageViewLogger();

  return (
    <>
      {showOnboarding && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-white" />}>
          <OnboardingWizard isDay1 />
        </Suspense>
      )}
      <div className="flex h-screen">
        <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-1 hidden md:block">
          <h2 className="text-lg font-bold tracking-tight mb-4 px-3">Student</h2>
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-slate-50',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {label}
            </NavLink>
          ))}
        </aside>
        <main className="flex-1 overflow-auto p-6 bg-slate-50">
          <Outlet />
        </main>
      </div>
    </>
  );
};

export default StudentLayout;
