import { useState, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { getChecklistForRole } from '@/lib/onboardingChecklist';
import QuickStartChecklist from '@/components/shared/QuickStartChecklist';
import { LayoutDashboard, Users, BookOpen, GraduationCap, Target, ScrollText, Sparkles, FileText, UserCircle, Calendar, Building2, ClipboardList, Settings } from 'lucide-react';

const navItems = [
  { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/admin/users', icon: Users, label: 'Users' },
  { to: '/admin/departments', icon: Building2, label: 'Departments' },
  { to: '/admin/programs', icon: BookOpen, label: 'Programs' },
  { to: '/admin/courses', icon: GraduationCap, label: 'Courses' },
  { to: '/admin/semesters', icon: Calendar, label: 'Semesters' },
  { to: '/admin/outcomes', icon: Target, label: 'ILOs' },
  { to: '/admin/reports', icon: FileText, label: 'Reports' },
  { to: '/admin/audit-log', icon: ScrollText, label: 'Audit Log' },
  { to: '/admin/bonus-events', icon: Sparkles, label: 'Bonus XP' },
  { to: '/admin/surveys', icon: ClipboardList, label: 'Surveys' },
  { to: '/admin/settings/institution', icon: Settings, label: 'Settings' },
  { to: '/admin/settings/profile', icon: UserCircle, label: 'Profile' },
];

const AdminLayout = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: onboardingCompleted } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const showChecklist = profile?.role === 'admin' && onboardingCompleted === false && !checklistDismissed;

  const checklistItems = getChecklistForRole('admin').map((item) => ({
    id: item.id,
    label: item.label,
    isCompleted: false,
    route: item.route,
  }));

  const handleChecklistDismiss = useCallback(() => {
    completeOnboarding.mutate();
    setChecklistDismissed(true);
  }, [completeOnboarding]);

  return (
    <div className="flex h-screen">
      <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-1 flex flex-col">
        <h2 className="text-lg font-bold tracking-tight mb-4 px-3">Admin</h2>
        <div className="flex-1 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-slate-50',
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
      <main className="flex-1 overflow-auto p-6 bg-slate-50">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
