// =============================================================================
// Shimmer — skeleton loading block (design system)
// =============================================================================
// A sized placeholder for loading states. Uses the canonical `animate-shimmer`
// gradient-sweep utility (defined in index.css) — the prototype's loading
// treatment, and reduced-motion + dark-mode aware there. Compose several for
// skeleton grids/lists.
// =============================================================================

import { cn } from "@/lib/utils";

export interface ShimmerProps {
  className?: string;
}

const Shimmer = ({ className }: ShimmerProps) => (
  <div aria-hidden="true" className={cn("animate-shimmer rounded-xl", className)} />
);

export default Shimmer;
