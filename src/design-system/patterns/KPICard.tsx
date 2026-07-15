// =============================================================================
// KPICard — prototype `.kpi` metric tile (design system)
// =============================================================================
// Metric card: tiny uppercase label + black value + icon in a soft rounded
// surface with a group-hover scale. Matches the prototype KPI treatment.
// =============================================================================

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface KPICardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconBgClass?: string;
  iconColorClass?: string;
  /** Value color; defaults to deep brand blue (not near-black). */
  valueClassName?: string;
  className?: string;
}

const KPICard = ({
  icon: Icon,
  label,
  value,
  iconBgClass = "bg-blue-50",
  iconColorClass = "text-blue-600",
  valueClassName = "text-sky-700",
  className,
}: KPICardProps) => (
  <div
    className={cn(
      // Prototype `.pcard` surface holding a `.kpi` layout (values verbatim
      // from shared.css: 20px radius, hairline border, two-layer depth + lift).
      "rounded-[20px] border border-[#eef2f6] bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04),0_10px_26px_rgba(16,24,40,0.05)] transition-[transform,box-shadow] duration-[180ms] ease-out hover:-translate-y-[3px] hover:shadow-[0_18px_38px_rgba(16,24,40,0.11)] motion-reduce:transition-none motion-reduce:hover:translate-y-0",
      className
    )}
  >
    <div className="flex items-start justify-between gap-2.5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">
          {label}
        </p>
        <p className={cn("mt-1 text-2xl font-black", valueClassName)}>{value}</p>
      </div>
      {/* Prototype `.kpi-ic`: fixed 38px tile, 11px radius. */}
      <div
        className={cn(
          "flex size-[38px] shrink-0 items-center justify-center rounded-[11px]",
          iconBgClass
        )}
      >
        <Icon
          className={cn("h-[18px] w-[18px]", iconColorClass)}
          aria-hidden="true"
        />
      </div>
    </div>
  </div>
);

export default KPICard;
