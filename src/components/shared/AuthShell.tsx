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
    <div className="relative grid min-h-[100dvh] grid-cols-1 bg-[#f8fafc] md:grid-cols-[1.1fr_1fr]">
      {/* Language switcher in top-end corner */}
      <div className="absolute end-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      {/* Brand / value panel */}
      <AuthBrandPanel />

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-[26px] md:p-10">
        <div className="mx-auto w-full max-w-[400px] md:max-w-[380px]">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
