// =============================================================================
// AuthShell — shared full-screen background + logo for auth pages
// =============================================================================
//
// Extracts the exact auth backdrop used by `LoginPage`/`SignUpPage` (dark slate
// gradient + doodle overlay, top-end `LanguageSwitcher`, centered logo +
// tagline) so the secondary auth screens (Reset / Update password) share the
// identical treatment instead of a plain slate background (spec P1b, task 1.8).
//
// Presentation-only: it renders a background + centered column and slots the
// page's card via `children`. All auth logic stays in the page components.
// =============================================================================

import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";

interface AuthShellProps {
  children: ReactNode;
}

const AuthShell = ({ children }: AuthShellProps) => {
  const { t } = useTranslation("auth");

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#1e293b] via-[#0f172a] to-[#020617]">
      {/* Doodle pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: "url('/doodle-background.jpg')",
          backgroundSize: "1200px",
          backgroundRepeat: "repeat",
          filter: "invert(1)",
        }}
      />

      {/* Language switcher in top-end corner */}
      <div className="absolute end-4 top-4 z-20">
        <LanguageSwitcher />
      </div>

      {/* Main container */}
      <div className="relative flex min-h-screen flex-col items-center justify-center p-4">
        <div className="-mt-10 w-full max-w-md space-y-6">
          {/* Logo */}
          <div className="space-y-2 text-center">
            <div className="flex w-full items-center justify-center">
              <img
                src="/edeviser-logo-final.png"
                alt="Edeviser"
                className="h-32 w-auto object-contain drop-shadow-2xl"
              />
            </div>
            <p className="text-xl font-medium tracking-wide text-blue-400 drop-shadow-md">
              {t("brand.tagline")}
            </p>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
};

export default AuthShell;
