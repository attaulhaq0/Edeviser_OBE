// =============================================================================
// AuthShell — shared split-panel background for secondary auth pages
// =============================================================================
//
// Reproduces the prototype `auth.html` layout (a light #f8fafc canvas split
// into a hero-gradient brand/value panel + a form panel) so the secondary auth
// screens (Reset / Update password) share the exact same treatment as the
// rebuilt `LoginPage`. The page's form is slotted into the form panel via
// `children`.
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
    <div className="auth-page relative grid min-h-dvh w-full grid-cols-1 bg-[#f3f6fc] overflow-x-clip lg:grid-cols-[1.35fr_1fr]">
      {/* Brand / value panel (Left) */}
      <div className="order-2 lg:order-1 h-full">
        <AuthBrandPanel />
      </div>

      {/* Form panel (Right) */}
      <div className="relative order-1 lg:order-2 flex flex-col justify-between px-6 py-8 sm:px-10 lg:px-12 lg:py-10">
        <div className="flex justify-end w-full mb-6">
          <LanguageSwitcher />
        </div>

        <div className="mx-auto w-full max-w-125 my-auto">
          <div className="rounded-3xl border border-slate-100/90 bg-white p-7 sm:p-9 shadow-[0_20px_50px_rgba(15,23,42,0.08)] backdrop-blur-xl">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
