// =============================================================================
// HeroCard — dark gradient hero surface (design system)
// =============================================================================
// The dashboard/hero card: slate→blue→indigo gradient with white text, matching
// the prototype hero treatment. Content is supplied by the caller.
// =============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const HERO_GRADIENT =
  "linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)";

export interface HeroCardProps {
  children: ReactNode;
  /** When set, exposes the card as a labeled region to assistive tech. */
  ariaLabel?: string;
  className?: string;
}

const HeroCard = ({ children, ariaLabel, className }: HeroCardProps) => (
  <div
    role={ariaLabel ? "region" : undefined}
    aria-label={ariaLabel}
    className={cn(
      "overflow-hidden rounded-xl border-0 text-white shadow-lg",
      className
    )}
    style={{ background: HERO_GRADIENT }}
  >
    {children}
  </div>
);

export default HeroCard;
