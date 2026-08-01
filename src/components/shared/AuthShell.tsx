// =============================================================================
// AuthShell — shared split-panel background for secondary auth pages
// =============================================================================
//
// Keeps secondary auth screens aligned with LoginPage: localized artwork on
// the left and the working authentication form on the right.
//
// Presentation-only: all auth logic stays in the page components. Light + LTR
// (prototype scope; PARITY §E).
// =============================================================================

import type { ReactNode } from "react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import AuthBrandPanel from "@/components/shared/AuthBrandPanel";

interface AuthShellProps {
  children: ReactNode;
}

const AuthShell = ({ children }: AuthShellProps) => {
  return (
    <div className="auth-page relative grid min-h-dvh w-full grid-cols-1 overflow-x-clip bg-[#f3f6fc] lg:items-stretch">
      {/* Brand / value panel (Left) */}
      <div className="order-2 h-full lg:order-1 lg:self-stretch">
        <AuthBrandPanel />
      </div>

      {/* Form panel (Right) */}
      <div className="auth-form-panel relative order-1 flex flex-col justify-between bg-[#f3f6fc] px-6 py-8 sm:px-10 lg:order-2 lg:h-dvh lg:overflow-hidden lg:px-12 lg:py-4">
        <div className="mb-6 flex w-full justify-end lg:mb-2">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto my-auto w-full max-w-125">
          <div className="rounded-3xl border border-slate-100/90 bg-white p-7 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-9 lg:p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
