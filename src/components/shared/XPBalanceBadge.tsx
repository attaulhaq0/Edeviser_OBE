// =============================================================================
// XPBalanceBadge — Persistent XP balance indicator for sidebar and marketplace
// =============================================================================

import { Coins, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useXPBalance } from "@/hooks/useXPBalance";
import { cn } from "@/lib/utils";

interface XPBalanceBadgeProps {
  className?: string;
  size?: "sm" | "md" | "lg";
}

const XPBalanceBadge = ({ className, size = "md" }: XPBalanceBadgeProps) => {
  const { user } = useAuth();
  const { data, isLoading } = useXPBalance(user?.id ?? "");

  const sizeClasses = {
    sm: "text-xs px-2 py-1 gap-1",
    md: "text-sm px-3 py-1.5 gap-1.5",
    lg: "text-base px-4 py-2 gap-2",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full bg-amber-50 border border-amber-200 font-semibold text-amber-700",
        sizeClasses[size],
        className
      )}
    >
      <Coins className={cn(iconSizes[size], "text-amber-500")} />
      {isLoading ? (
        <Loader2
          className={cn(iconSizes[size], "animate-spin text-amber-400")}
        />
      ) : (
        <span>{(data?.balance ?? 0).toLocaleString()} XP</span>
      )}
    </div>
  );
};

export default XPBalanceBadge;
