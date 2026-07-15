// =============================================================================
// PCard — prototype `.pcard` surface (design system)
// =============================================================================
// The base card surface: white, borderless, soft shadow, rounded-xl. No padding
// by default (compose with `p-4`/`p-6` or use SectionCard).
// =============================================================================

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface PCardProps {
  children: ReactNode;
  className?: string;
}

const PCard = ({ children, className }: PCardProps) => (
  <div
    className={cn(
      // Prototype `.pcard`: white, 1px hairline border, 20px radius, soft
      // two-layer depth, and a hover-lift (values verbatim from shared.css).
      "rounded-[20px] border border-[#eef2f6] bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] transition-[transform,box-shadow] duration-[180ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_18px_38px_rgba(16,24,40,0.11)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      className
    )}
  >
    {children}
  </div>
);

export default PCard;
