// =============================================================================
// Rail primitives — prototype right-rail building blocks (shared.css
// `.rail-card` / `.rail-h` / `.rail-row`). Shared by every per-role dashboard
// rail (student, teacher, parent, coordinator, admin) so the rail treatment is
// defined once and stays 1:1 with the prototype. Pure presentational — no
// data, no router — the feature rails compose these with real hooks.
// =============================================================================

import { cn } from "@/lib/utils";

export interface RailCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** `.rail-card` — white, 1px slate-200 border, radius-16, p-4, 14px bottom gap. */
export const RailCard = ({ children, className, style }: RailCardProps) => (
  <div
    className={cn(
      "mb-3.5 rounded-2xl border border-slate-200 bg-white p-4 dark:border-border dark:bg-card",
      className
    )}
    style={style}
  >
    {children}
  </div>
);

export interface RailHeadProps {
  title: string;
  /** Optional right-aligned note (`.rail-r`), e.g. a count or "3d left". */
  right?: string;
  /** false when rendered on a dark card (white text) instead of a light one. */
  onLight?: boolean;
}

/** `.rail-h` — uppercase 11px/800 slate-400 header with an optional right note. */
export const RailHead = ({ title, right, onLight = true }: RailHeadProps) => (
  <div
    className={cn(
      "mb-2.5 flex items-center justify-between text-[11px] font-extrabold uppercase tracking-[0.08em]",
      onLight ? "text-slate-600" : "text-white/60"
    )}
  >
    <span>{title}</span>
    {right ? (
      <span className="text-[10px] font-bold normal-case tracking-normal text-slate-600">
        {right}
      </span>
    ) : null}
  </div>
);

export interface RailRowProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

/** `.rail-row` — 13px slate-700 row; bold values render 12px/800 slate-900. */
export const RailRow = ({ children, className, style }: RailRowProps) => (
  <div
    className={cn(
      "flex items-center gap-2.5 py-[5px] text-[13px] text-slate-700 dark:text-slate-300",
      className
    )}
    style={style}
  >
    {children}
  </div>
);
