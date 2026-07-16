import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GlobalHeader from "@/components/shared/GlobalHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";
import ParentDashboardRail from "@/features/parent/dashboard/ParentDashboardRail";
import { cn } from "@/lib/utils";

const ParentLayout = () => {
  useAuth();
  const location = useLocation();

  // The dashboard is the only parent page whose prototype defines a right rail
  // (shared.js `railHTML()` parent case). Render it there and reserve its width
  // so the feed sits in a true 3-column shell (sidebar · feed · rail) instead of
  // a centered, floating middle. Other parent pages keep the rail-less layout
  // until their own rails are built (per-page, next increment).
  const onDashboard = location.pathname === "/parent/dashboard";

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
        {onDashboard && <ParentDashboardRail />}
      </div>
      <GuidedTour />
    </SidebarProvider>
  );
};

export default ParentLayout;
