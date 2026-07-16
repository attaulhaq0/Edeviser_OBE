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
import { cn } from "@/lib/utils";

const OnboardingWizard = lazy(
  () => import("@/pages/student/onboarding/OnboardingWizard")
);

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

  // The dashboard is the only student page whose prototype defines a right rail
  // (shared.js `railHTML()` dashboard case). Render it there and reserve its
  // width so the feed sits in a true 3-column shell (sidebar · feed · rail)
  // instead of a centered, floating middle. Other student pages keep the
  // rail-less layout until their own rails are built (per-page, next increment).
  const onDashboard = location.pathname === "/student/dashboard";

  return (
    <SidebarProvider>
      <GlobalHeader />
      <div className="flex">
        <Sidebar />
        <div className={cn("flex-1 lg:ms-52", onDashboard && "xl:me-80")}>
          <EmailVerificationBanner />
          <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 p-6 dark:bg-background">
            <Outlet />
          </main>
        </div>
        {onDashboard && <StudentDashboardRail />}
      </div>
      <GuidedTour />
    </SidebarProvider>
  );
};

export default StudentLayout;
