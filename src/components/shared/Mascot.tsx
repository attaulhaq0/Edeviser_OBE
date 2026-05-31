// =============================================================================
// Mascot — coaching companion shown at key journey moments (R35)
// =============================================================================
//
// A purely additive, non-blocking coaching surface. Given a key moment, it
// resolves bilingual guidance via `useMascotGuidance` and renders an
// encouraging title + message in the student's language. When mascot guidance
// is disabled, or no key moment is active, it renders nothing so the host
// surface is unaffected (R35.4, R35.5).
//
// Copy is routed through i18next (`common` namespace, `mascot.*`) so it is
// always available in English and Arabic (R35.3). The entrance animation uses
// the `animate-fade-in-up` utility, which the design system disables globally
// under `prefers-reduced-motion: reduce` (see src/index.css), so motion is
// honored without coupling this additive surface to a motion library.

import { useTranslation } from "react-i18next";
import { PartyPopper, Sparkles, Lightbulb } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMascotGuidance } from "@/hooks/useMascotGuidance";
import type { MascotMomentId, MascotTone } from "@/lib/mascotGuidance";

export interface MascotProps {
  /** The active key moment, or `null` when no moment is active. */
  moment: MascotMomentId | null;
  /** Optional extra classes for layout placement by the host surface. */
  className?: string;
}

// Tone → icon mapping keeps the visual concern in the presentation layer while
// the pure logic only carries the abstract tone.
const TONE_ICON: Record<MascotTone, LucideIcon> = {
  cheer: PartyPopper,
  guide: Lightbulb,
  encourage: Sparkles,
};

const Mascot = ({ moment, className }: MascotProps) => {
  const { t } = useTranslation("common");
  const guidance = useMascotGuidance(moment);

  // Disabled or no active moment → render nothing (R35.4, R35.5).
  if (!guidance) return null;

  const Icon = TONE_ICON[guidance.tone];
  const title = t(`${guidance.i18nKey}.title`);
  const message = t(`${guidance.i18nKey}.message`);

  return (
    <aside
      // Role + label expose the mascot as a complementary coaching region to
      // assistive tech without stealing focus from the host surface.
      aria-label={t("mascot.regionLabel")}
      className={cn(
        "animate-fade-in-up flex items-start gap-3 rounded-xl border-0 bg-blue-50 p-4 text-start shadow-none",
        className
      )}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-blue-600">
        <Icon className="h-5 w-5 text-white" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-sm text-gray-600">{message}</p>
      </div>
    </aside>
  );
};

export default Mascot;
