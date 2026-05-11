// =============================================================================
// CooperationScoreDisplay — Cooperation score gauge with color coding
// Task 4.9: visual gauge showing cooperation score 0-100
// =============================================================================

import { cn } from "@/lib/utils";
import { Handshake } from "lucide-react";

export interface CooperationScoreDisplayProps {
  score: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

function getScoreColor(score: number): {
  text: string;
  bg: string;
  ring: string;
} {
  if (score >= 80)
    return {
      text: "text-green-600",
      bg: "bg-green-500",
      ring: "ring-green-200",
    };
  if (score >= 60)
    return { text: "text-blue-600", bg: "bg-blue-500", ring: "ring-blue-200" };
  if (score >= 40)
    return {
      text: "text-yellow-600",
      bg: "bg-yellow-500",
      ring: "ring-yellow-200",
    };
  return { text: "text-red-600", bg: "bg-red-500", ring: "ring-red-200" };
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excellent";
  if (score >= 60) return "Good";
  if (score >= 40) return "Fair";
  return "Needs Improvement";
}

const CooperationScoreDisplay = ({
  score,
  size = "md",
  showLabel = true,
  className,
}: CooperationScoreDisplayProps) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const colors = getScoreColor(clampedScore);
  const label = getScoreLabel(clampedScore);

  const sizeClasses = {
    sm: {
      wrapper: "gap-2",
      icon: "h-4 w-4",
      value: "text-lg font-black",
      gauge: "h-1.5",
    },
    md: {
      wrapper: "gap-3",
      icon: "h-5 w-5",
      value: "text-2xl font-black",
      gauge: "h-2",
    },
    lg: {
      wrapper: "gap-4",
      icon: "h-6 w-6",
      value: "text-3xl font-black",
      gauge: "h-2.5",
    },
  }[size];

  return (
    <div
      className={cn("flex flex-col", sizeClasses.wrapper, className)}
      aria-label={`Cooperation score: ${clampedScore} out of 100, ${label}`}
    >
      <div className="flex items-center gap-2">
        <Handshake className={cn(sizeClasses.icon, colors.text)} />
        <span className={cn(sizeClasses.value, colors.text, "tabular-nums")}>
          {clampedScore}
        </span>
        <span className="text-[10px] font-black tracking-widest uppercase text-gray-500">
          / 100
        </span>
      </div>

      {/* Gauge bar */}
      <div
        className={cn(
          "w-full rounded-full bg-gray-100 overflow-hidden",
          sizeClasses.gauge
        )}
      >
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500 ease-out",
            colors.bg
          )}
          style={{ width: `${clampedScore}%` }}
        />
      </div>

      {showLabel && (
        <span className={cn("text-xs font-medium", colors.text)}>{label}</span>
      )}
    </div>
  );
};

export default CooperationScoreDisplay;
