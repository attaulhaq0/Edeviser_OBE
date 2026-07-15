// =============================================================================
// WelcomeHero — dashboard greeting hero (design system)
// =============================================================================
// Universal welcome hero for all role dashboards: the prototype dark hero
// gradient (135deg slate→blue→indigo, verbatim from shared.css `--hero-gradient`)
// with a personalized greeting + subtitle + optional stats slot. Internalized
// into the design system (P0.4/§A) so screens no longer depend on the legacy
// shared component.
// =============================================================================

import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { getDisplayFirstName } from "@/lib/displayName";
import type { UserRole } from "@/types/app";

export interface WelcomeHeroProps {
  /** User's first name or full name */
  name: string;
  /** User's role (admin, coordinator, teacher, student, parent) */
  userRole: UserRole;
  /** Subtitle/motivational text */
  subtitle: string;
  /** Optional stats section to render on the right (e.g., XP/Level chips for Student) */
  stats?: ReactNode;
}

/**
 * Universal welcome hero card for all role dashboards. Renders the prototype's
 * dark gradient hero with a personalized greeting, role context, and optional
 * stats. Design: ADR-07 §8.1; Requirement 2.21.
 */
const WelcomeHero = ({
  name,
  userRole: _userRole,
  subtitle,
  stats,
}: WelcomeHeroProps) => {
  const { t } = useTranslation("common");

  // Determine greeting based on time of day
  const greeting = (() => {
    const hour = new Date().getHours();
    if (hour < 12) return t("greeting.morning", "Good morning");
    if (hour < 17) return t("greeting.afternoon", "Good afternoon");
    return t("greeting.evening", "Good evening");
  })();

  // Extract a display first name. Seeded names carry honorific titles
  // ("Mr. David Okonkwo", "Dr. Aisha Al-Mansoori"), so the shared helper skips
  // a leading honorific token to avoid greeting users as "Mr."/"Dr.". Empty
  // names fall back to the translated "there".
  const firstName = getDisplayFirstName(name) ?? t("greeting.there", "there");

  return (
    <Card
      role="region"
      aria-label={`${greeting}, ${firstName}`}
      className="border-0 shadow-lg rounded-xl overflow-hidden text-white"
      style={{
        background:
          "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)",
      }}
      data-tour="welcome-hero"
    >
      <div className="p-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}, {firstName} 👋
          </h1>
          <p className="text-sm text-white/70 mt-1">{subtitle}</p>
        </div>
        {stats && (
          <div className="hidden md:flex items-center gap-4">{stats}</div>
        )}
      </div>
    </Card>
  );
};

export default WelcomeHero;
