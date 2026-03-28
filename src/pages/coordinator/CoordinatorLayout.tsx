import { useState, useCallback, lazy, Suspense } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useOnboardingStatus, useCompleteOnboarding } from '@/hooks/useOnboarding';
import { getChecklistForRole } from '@/lib/onboardingChecklist';
import QuickStartChecklist from '@/components/shared/QuickStartChecklist';
import { LayoutDashboard, Target, Grid3X3, UserCircle, ClipboardCheck } from 'lucide-react';

const WelcomeTour = lazy(() => import('@/components/shared/WelcomeTour'));

const navItems = [
  { to: '/coordinator/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/coordinator/plos', icon: Target, label: 'PLOs' },
  { to: '/coordinator/matrix', icon: Grid3X3, label: 'Matrix' },
  { to: '/coordinator/cqi', icon: ClipboardCheck, label: 'CQI Plans' },
  { to: '/coordinator/settings/profile', icon: UserCircle, label: 'Profile' },
];

const CoordinatorLayout = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { data: onboardingCompleted } = useOnboardingStatus();
  const completeOnboarding = useCompleteOnboarding();
  const [tourDismissed, setTourDismissed] = useState(false);
  const [checklistDismissed, setChecklistDismissed] = useState(false);

  const showTour = profile?.role === 'coordinator' && onboardingCompleted === false && !tourDismissed;
  const showChecklist = profile?.role === 'coordinator' && onboardingCompleted === false && tourDismissed && !checklistDismissed;

  const checklistItems = getChecklistForRole('coordinator').map((item) => ({
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
          <WelcomeTour userRole="coordinator" onComplete={handleTourComplete} />
        </Suspense>
      )}
      <div className="flex h-screen">
        <aside className="w-64 border-r border-slate-200 bg-white p-4 space-y-1 flex flex-col">
          <h2 className="text-lg font-bold tracking-tight mb-4 px-3">Coordinator</h2>
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
    </>
  );
};

export default CoordinatorLayout;
