import type { ReactNode } from "react";
import GlobalHeader from "@/components/shared/GlobalHeader";
import Sidebar from "@/components/shared/Sidebar";
import { SidebarProvider } from "@/components/shared/SidebarContext";
import GuidedTour from "@/components/shared/GuidedTour";
import EmailVerificationBanner from "@/components/shared/EmailVerificationBanner";
import type { UserRole } from "@/types/app";
import { cn } from "@/lib/utils";
import { usePageViewLogger } from "@/hooks/usePageViewLogger";

interface RoleAppShellProps {
  userRole: UserRole;
  children: ReactNode;
  rail?: ReactNode;
}

/**
 * Shared role shell for the Path-A frontend rebuild.
 *
 * The layout contract is defined by the `--app-*` tokens: a desktop three-column
 * grid (sidebar, start-aligned content, optional rail), a two-column laptop
 * layout, and a single-column mobile layout with its navigation supplied by the
 * existing bottom bar. Feature routes provide only their content and optional rail.
 */
const RoleAppShell = ({ userRole, children, rail }: RoleAppShellProps) => {
  const hasRail = rail != null;

  // Keep route analytics attached to the shared shell so every standard role
  // layout follows the same lifecycle. The logger itself scopes persistence to
  // student profiles and therefore does not emit unsupported staff events.
  usePageViewLogger();

  return (
    <SidebarProvider>
      <div
        data-role={userRole}
        data-norail={hasRail ? undefined : "true"}
        className="role-app-shell min-h-screen bg-slate-50 dark:bg-background"
      >
        <GlobalHeader />
        <div
          className={cn(
            "grid min-h-[calc(100vh-var(--app-header-h))] grid-cols-1 px-(--app-gutter-mobile) pb-[calc(3.25rem+env(safe-area-inset-bottom))]",
            "min-[640px]:grid-cols-[var(--app-sidebar-w)_minmax(0,1fr)] min-[640px]:gap-(--app-gutter) min-[640px]:px-0 min-[640px]:pb-0",
            hasRail &&
              "xl:grid-cols-[var(--app-sidebar-w)_minmax(0,1fr)_var(--app-rail-w)]"
          )}
        >
          <Sidebar />
          <div className="min-w-0 min-[640px]:col-start-2 min-[640px]:row-start-1">
            <EmailVerificationBanner />
            <main
              id="main-content"
              tabIndex={-1}
              className="min-h-[calc(100vh-var(--app-header-h))] py-4 min-[640px]:ps-(--app-gutter) min-[640px]:pe-(--app-gutter)"
            >
              <div
                className={cn(
                  "w-full min-w-0",
                  hasRail && "max-w-(--app-content-max) mx-auto"
                )}
              >
                {children}
              </div>
            </main>
          </div>
          {rail}
        </div>
        <GuidedTour />
      </div>
    </SidebarProvider>
  );
};

export default RoleAppShell;
