import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { usePageViewLogger } from "@/hooks/usePageViewLogger";
import GlobalHeader from "@/components/shared/GlobalHeader";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";

const OnboardingWizard = lazy(
  () => import("@/pages/student/onboarding/OnboardingWizard")
);

const StudentLayout = () => {
  const { profile } = useAuth();
  const showOnboarding =
    profile?.role === "student" && profile?.onboarding_completed === false;

  // Log page_view events on every student route change
  usePageViewLogger();

  return (
    <>
      {showOnboarding && (
        <Suspense fallback={<div className="fixed inset-0 z-50 bg-white" />}>
          <OnboardingWizard isDay1 />
        </Suspense>
      )}
      <GlobalHeader />
      <EmailVerificationBanner />
      <main className="w-full bg-slate-50 dark:bg-background min-h-screen p-6">
        <Outlet />
      </main>
      <GuidedTour />
    </>
  );
};

export default StudentLayout;
