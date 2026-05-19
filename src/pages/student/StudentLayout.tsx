import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageViewLogger } from "@/hooks/usePageViewLogger";
import GlobalHeader from "@/components/shared/GlobalHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";

const OnboardingWizard = lazy(
  () => import("@/pages/student/onboarding/OnboardingWizard")
);

const StudentLayout = () => {
  const { profile } = useAuth();
  const showOnboarding =
    profile?.role === "student" && profile?.onboarding_completed === false;

  usePageViewLogger();

  return (
    <SidebarProvider>
      {showOnboarding && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-white" />}>
          <OnboardingWizard isDay1 />
        </Suspense>
      )}
      <GlobalHeader />
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ms-52">
          <EmailVerificationBanner />
          <main className="min-h-[calc(100vh-3.5rem)] bg-slate-50 p-6 dark:bg-background">
            <Outlet />
          </main>
        </div>
      </div>
      <GuidedTour />
    </SidebarProvider>
  );
};

export default StudentLayout;
