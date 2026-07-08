import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Shared "key" legend for matrix-style heatmaps (labeled color swatches).
//
// This is the categorical/key legend shared by the attainment-style heatmaps
// (teacher student-performance, coordinator coverage). It is intentionally NOT
// used by the student habits heatmap: that one is a sequential Less→More
// *scale* legend (a different dataviz pattern with its own test contract), and
// folding both shapes into one component would require variant flags — the
// "wrong abstraction" this component deliberately avoids.
// ---------------------------------------------------------------------------

export interface HeatmapLegendItem {
  /** Swatch background color (any valid CSS color / hex). */
  color: string;
  /** Human-readable meaning of the color. Conveys the info (not color alone). */
  label: string;
}

export interface HeatmapLegendProps {
  items: HeatmapLegendItem[];
  /** Optional leading caption, e.g. "Attainment" or "Evidence count". */
  title?: string;
  className?: string;
  "data-testid"?: string;
}

/**
 * Renders a wrap-friendly row of labeled swatches. Swatches are decorative
 * (aria-hidden) — the adjacent text label carries the meaning, so the legend
 * is not color-dependent. A faint border keeps light/white swatches visible.
 */
const HeatmapLegend = ({
  items,
  title,
  className,
  "data-testid": testId,
}: HeatmapLegendProps) => (
  <div
    className={cn(
      "flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground",
      className
    )}
    data-testid={testId}
  >
    {title && <span className="font-semibold text-foreground/80">{title}</span>}
    {items.map((item) => (
      <span key={item.label} className="inline-flex items-center gap-1.5">
        <span
          aria-hidden="true"
          className="h-3 w-3 shrink-0 rounded-sm border border-black/10"
          style={{ backgroundColor: item.color }}
        />
        {item.label}
      </span>
    ))}
  </div>
);

export default HeatmapLegend;
