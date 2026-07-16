import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GlobalHeader from "@/components/shared/GlobalHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";
import AdminDashboardRail from "@/features/admin/dashboard/AdminDashboardRail";
import { cn } from "@/lib/utils";

const AdminLayout = () => {
  useAuth();
  const location = useLocation();

  // The dashboard is the only admin page whose prototype defines a right rail
  // (shared.js `railHTML()` admin case). Render it there and reserve its width
  // so the feed sits in a true 3-column shell (sidebar · feed · rail) instead of
  // a centered, floating middle. Other admin pages keep the rail-less layout
  // until their own rails are built (per-page, next increment).
  const onDashboard = location.pathname === "/admin/dashboard";

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
        {onDashboard && <AdminDashboardRail />}
      </div>
      <GuidedTour />
    </SidebarProvider>
  );
};

export default AdminLayout;
