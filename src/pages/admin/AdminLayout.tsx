import { Outlet } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import GlobalHeader from "@/components/shared/GlobalHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";

const AdminLayout = () => {
  useAuth();

  return (
    <SidebarProvider>
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

export default AdminLayout;
