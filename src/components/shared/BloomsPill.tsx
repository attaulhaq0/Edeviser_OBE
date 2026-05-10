// =============================================================================
// BloomsPill — Badge/pill showing Bloom's taxonomy level with color coding
// Remember purple, Understand blue, Apply green, Analyze yellow, Evaluate orange, Create red
// =============================================================================

import { cn } from "@/lib/utils";
import type { BloomsLevel } from "@/types/app";

interface BloomsPillProps {
  level: BloomsLevel;
  className?: string;
}

const BLOOMS_PILL_STYLES: Record<
  BloomsLevel,
  { bg: string; text: string; label: string }
> = {
  remembering: { bg: "bg-purple-700", text: "text-white", label: "Remember" },
  understanding: { bg: "bg-blue-700", text: "text-white", label: "Understand" },
  applying: { bg: "bg-green-700", text: "text-white", label: "Apply" },
  analyzing: { bg: "bg-yellow-700", text: "text-white", label: "Analyze" },
  evaluating: { bg: "bg-orange-700", text: "text-white", label: "Evaluate" },
  creating: { bg: "bg-red-700", text: "text-white", label: "Create" },
};

const BloomsPill = ({ level, className }: BloomsPillProps) => {
  const style = BLOOMS_PILL_STYLES[level];

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide uppercase",
        style.bg,
        style.text,
        className
      )}
    >
      {style.label}
    </span>
  );
};

export default BloomsPill;
export { BLOOMS_PILL_STYLES };
export type { BloomsPillProps };
