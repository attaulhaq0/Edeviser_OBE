// =============================================================================
// StreakFreezeShop — Streak freeze purchase UI (costs 200 XP)
// =============================================================================

import { Snowflake, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { cn } from "@/lib/utils";

interface StreakFreezeShopProps {
  currentXP: number;
  freezesAvailable: number;
  onPurchase: () => Promise<void>;
  className?: string;
}

const FREEZE_COST = 200;
const MAX_FREEZES = 3;

const StreakFreezeShop = ({
  currentXP,
  freezesAvailable,
  onPurchase,
  className,
}: StreakFreezeShopProps) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const canPurchase =
    currentXP >= FREEZE_COST && freezesAvailable < MAX_FREEZES;

  const handleConfirmedPurchase = async () => {
    setIsPurchasing(true);
    try {
      await onPurchase();
      setShowConfirm(false);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 space-y-3",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <Snowflake className="h-5 w-5 text-blue-500" />
        <span className="text-sm font-bold">Streak Freeze</span>
      </div>
      <p className="text-xs text-gray-500">
        Protect your streak for one missed day. Max {MAX_FREEZES} in inventory.
      </p>
      <div className="flex items-center gap-2">
        {Array.from({ length: MAX_FREEZES }).map((_, i) => (
          <Snowflake
            key={i}
            className={cn(
              "h-6 w-6",
              i < freezesAvailable ? "text-blue-500" : "text-gray-200"
            )}
          />
        ))}
        <span className="text-xs text-gray-400 ms-1">
          {freezesAvailable}/{MAX_FREEZES}
        </span>
      </div>
      <Button
        onClick={() => setShowConfirm(true)}
        disabled={!canPurchase || isPurchasing}
        variant="outline"
        className="w-full"
      >
        {isPurchasing && <Loader2 className="h-4 w-4 animate-spin" />}
        Buy for {FREEZE_COST} XP
      </Button>
      {currentXP < FREEZE_COST && (
        <p className="text-xs text-red-500">
          Not enough XP ({currentXP}/{FREEZE_COST})
        </p>
      )}

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Purchase Streak Freeze?"
        description={`This will deduct ${FREEZE_COST} XP from your balance. You currently have ${currentXP} XP. The freeze will protect your streak for one missed day.`}
        confirmLabel="Buy Freeze"
        isPending={isPurchasing}
        onConfirm={handleConfirmedPurchase}
      />
    </div>
  );
};

export default StreakFreezeShop;
export { FREEZE_COST, MAX_FREEZES };
export type { StreakFreezeShopProps };
