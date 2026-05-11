import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";
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
 * Universal welcome hero card for all role dashboards.
 * Renders a dark gradient hero with personalized greeting, role context, and optional stats.
 *
 * Design: ADR-07, §8.1
 * Requirements: 2.21
 *
 * @example
 * <WelcomeHero
 *   name="John"
 *   userRole="student"
 *   subtitle="Keep up the momentum!"
 *   stats={<div>XP: 1500</div>}
 * />
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

  // Extract first name if full name is provided; fall back to translated 'there' for empty names
  const firstName = name?.split(" ")[0] || t("greeting.there", "there");

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
