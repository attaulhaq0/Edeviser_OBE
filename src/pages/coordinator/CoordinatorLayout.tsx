import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GlobalHeader from "@/components/shared/GlobalHeader";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";

const CoordinatorLayout = () => {
  useAuth();

  return (
    <>
      <GlobalHeader />
      <EmailVerificationBanner />
      <main className="w-full bg-slate-50 dark:bg-background min-h-screen p-6">
        <Outlet />
      </main>
      <GuidedTour />
    </>
  );
};

export default CoordinatorLayout;
