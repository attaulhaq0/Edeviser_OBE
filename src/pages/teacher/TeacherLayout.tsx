import { useState, useCallback, lazy, Suspense } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { getChecklistForRole } from '@/lib/onboardingChecklist';
import QuickStartChecklist from '@/components/shared/QuickStartChecklist';
import { LayoutDashboard, Target, TableProperties, ClipboardList, CheckSquare, FlaskConical, UserCircle, Megaphone, FolderOpen, BookOpen, Calendar, Clock, Trophy, Users } from 'lucide-react';
import { LanguageSwitcher } from '@/components/shared/LanguageSwitcher';

const WelcomeTour = lazy(() => import('@/components/shared/WelcomeTour'));

const navItems = [
  { to: '/teacher/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/teacher/clos', icon: Target, label: 'CLOs' },
  { to: '/teacher/rubrics', icon: TableProperties, label: 'Rubrics' },
  { to: '/teacher/assignments', icon: ClipboardList, label: 'Assignments' },
  { to: '/teacher/grading', icon: CheckSquare, label: 'Grading' },
  { to: '/teacher/gradebook', icon: BookOpen, label: 'Gradebook' },
  { to: '/teacher/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/teacher/modules', icon: FolderOpen, label: 'Modules' },
  { to: '/teacher/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/teacher/timetable', icon: Clock, label: 'Timetable' },
  { to: '/teacher/challenges', icon: Trophy, label: 'Challenges' },
  { to: '/teacher/teams', icon: Users, label: 'Teams' },
  { to: '/teacher/baseline', icon: FlaskConical, label: 'Baseline Tests' },
  { to: '/teacher/settings/profile', icon: UserCircle, label: 'Profile' },
];

const TeacherLayout = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: onboardingCompleted } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();
  const [tourDismissed, setTourDismissed] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const showTour = profile?.role === 'teacher' && onboardingCompleted === false && !tourDismissed;
  const showChecklist = profile?.role === 'teacher' && onboardingCompleted === false && tourDismissed && !checklistDismissed;

  const checklistItems = getChecklistForRole('teacher').map((item) => ({
    id: item.id,
    label: item.label,
    isCompleted: false,
    route: item.route,
  }));

  const handleTourComplete = useCallback(() => {
    setTourDismissed(true);
  }, []);

  const handleChecklistDismiss = useCallback(() => {
    completeOnboarding.mutate(undefined, {
      onSuccess: () => setChecklistDismissed(true),
      onError: (err) => console.error('Failed to complete onboarding:', err),
    });
  }, [completeOnboarding]);

  return (
    <>
      {showTour && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-black/40" />}>
          <WelcomeTour userRole="teacher" onComplete={handleTourComplete} />
        </Suspense>
      )}
      <div className="flex h-screen">
        <aside className="w-64 border-e border-slate-200 bg-white p-4 space-y-1 flex flex-col">
          <h2 className="text-lg font-bold tracking-tight mb-4 px-3">Teacher</h2>
          <div className="flex-1 space-y-1">
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
          </div>
          {showChecklist && (
            <QuickStartChecklist
              items={checklistItems}
              onItemClick={(route) => navigate(route)}
              onDismiss={handleChecklistDismiss}
            />
          )}
        </aside>
        <main className="flex-1 overflow-auto bg-slate-50">
          <div className="flex items-center justify-end px-6 py-2 border-b border-slate-200 bg-white">
            <LanguageSwitcher />
          </div>
          <div className="p-6">
            <Outlet />
          </div>
        </main>
      </div>
    </>
  );
};

export default TeacherLayout;
