import { lazy, Suspense } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageViewLogger } from "@/hooks/usePageViewLogger";
import GlobalHeader from "@/components/shared/GlobalHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";
import StudentDashboardRail from "@/features/student/dashboard/StudentDashboardRail";
import StudentLearnRail from "@/features/student/rails/StudentLearnRail";
import StudentProgressRail from "@/features/student/rails/StudentProgressRail";
import StudentJournalRail from "@/features/student/rails/StudentJournalRail";
import StudentAssignmentRail from "@/features/student/rails/StudentAssignmentRail";
import { cn } from "@/lib/utils";

const OnboardingWizard = lazy(
  () => import("@/pages/student/onboarding/OnboardingWizard")
);

// Per-page right rails (prototype shared.js `railHTML()` student cases). Each
// student page whose prototype defines a contextual rail maps its route to a
// rail component here; the layout renders the match and reserves its width so
// the feed sits in a true 3-column shell. Routes with no entry keep the
// rail-less layout. Order doesn't matter (patterns are mutually exclusive).
const STUDENT_RAILS: ReadonlyArray<{
  test: RegExp;
  Rail: React.ComponentType;
}> = [
  { test: /^\/student\/dashboard$/, Rail: StudentDashboardRail },
  { test: /^\/student\/courses(\/[^/]+)?$/, Rail: StudentLearnRail },
  { test: /^\/student\/progress$/, Rail: StudentProgressRail },
  { test: /^\/student\/journal$/, Rail: StudentJournalRail },
  { test: /^\/student\/assignments\/[^/]+$/, Rail: StudentAssignmentRail },
];

const StudentLayout = () => {
  const { profile } = useAuth();
  const location = useLocation();
  const showOnboarding =
    profile?.role === "student" && profile?.onboarding_completed === false;

  usePageViewLogger();

  if (showOnboarding) {
    return (
      <Suspense fallback={<div className="fixed inset-0 z-50 bg-white" />}>
        <OnboardingWizard isDay1 />
      </Suspense>
    );
  }

  // Select the contextual right rail for the current student route (if any) and
  // reserve its width (xl:me-80) so the feed sits in a true 3-column shell
  // (sidebar · feed · rail) instead of stretching under the rail.
  const ActiveRail = STUDENT_RAILS.find((r) =>
    r.test.test(location.pathname)
  )?.Rail;

  return (
    <SidebarProvider>
      <GlobalHeader />
      <div className="flex">
        <Sidebar />
        <div className={cn("flex-1 lg:ms-52", ActiveRail && "xl:me-80")}>
          <EmailVerificationBanner />
          <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 p-6 dark:bg-background">
            <Outlet />
          </main>
        </div>
        {ActiveRail && <ActiveRail />}
      </div>
      <GuidedTour />
    </SidebarProvider>
  );
};

export default StudentLayout;
