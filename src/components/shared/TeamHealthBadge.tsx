// =============================================================================
// TeamHealthBadge — Color-coded health score badge
// Task 4.13: green ≥70, yellow 40-69, red <40
// =============================================================================

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Heart } from "lucide-react";

export interface TeamHealthBadgeProps {
  score: number;
  size?: "sm" | "md";
  showIcon?: boolean;
  className?: string;
}

function getHealthConfig(score: number): {
  label: string;
  classes: string;
  status: string;
} {
  if (score >= 70) {
    return {
      label: "Healthy",
      classes: "bg-green-100 text-green-700 border-green-200",
      status: "healthy",
    };
  }
  if (score >= 40) {
    return {
      label: "Needs Attention",
      classes: "bg-yellow-100 text-yellow-700 border-yellow-200",
      status: "needs_attention",
    };
  }
  return {
    label: "At Risk",
    classes: "bg-red-100 text-red-700 border-red-200",
    status: "at_risk",
  };
}

const TeamHealthBadge = ({
  score,
  size = "md",
  showIcon = true,
  className,
}: TeamHealthBadgeProps) => {
  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));
  const config = getHealthConfig(clampedScore);

  return (
    <Badge
      className={cn(
        "font-bold gap-1",
        size === "sm" ? "text-[10px] px-1.5 py-0" : "text-xs px-2 py-0.5",
        config.classes,
        className
      )}
      aria-label={`Health score: ${clampedScore}, ${config.label}`}
      data-testid="team-health-badge"
      data-status={config.status}
    >
      {showIcon && (
        <Heart className={cn(size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5")} />
      )}
      {clampedScore}
    </Badge>
  );
};

export default TeamHealthBadge;
