// =============================================================================
// ActiveBoostIndicator — Boost countdown timer with pulse animation
// =============================================================================

import { useState, useEffect } from "react";
import { Zap } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useActiveBoosts } from "@/hooks/useActiveBoosts";
import { cn } from "@/lib/utils";

interface ActiveBoostIndicatorProps {
  className?: string;
}

const ActiveBoostIndicator = ({ className }: ActiveBoostIndicatorProps) => {
  const { user } = useAuth();
  const { data: boosts } = useActiveBoosts(user?.id ?? "");
  const activeBoost = boosts?.[0];
  const [timeLeft, setTimeLeft] = useState(() => (activeBoost ? "" : ""));

  useEffect(() => {
    if (!activeBoost) return;

    const updateTimer = () => {
      const now = Date.now();
      const expiresAt = new Date(activeBoost.expires_at).getTime();
      const diff = expiresAt - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60_000);
      const seconds = Math.floor((diff % 60_000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeBoost]);

  if (!activeBoost || timeLeft === "Expired") return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full bg-purple-50 border border-purple-200 px-3 py-1.5 text-sm font-semibold text-purple-700 animate-xp-pulse",
        className
      )}
    >
      <Zap className="h-4 w-4 text-purple-500" />
      <span>{activeBoost.multiplier}x XP</span>
      <span className="text-purple-500">·</span>
      <span className="tabular-nums">{timeLeft}</span>
    </div>
  );
};

export default ActiveBoostIndicator;
