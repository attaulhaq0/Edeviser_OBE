// =============================================================================
// PurchaseConfirmDialog — Confirmation dialog with balance preview
// =============================================================================

import { Coins, Loader2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { MarketplaceItem } from "@/hooks/useMarketplace";

interface PurchaseConfirmDialogProps {
  item: MarketplaceItem | null;
  currentBalance: number;
  isPending: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

const PurchaseConfirmDialog = ({
  item,
  currentBalance,
  isPending,
  open,
  onOpenChange,
  onConfirm,
}: PurchaseConfirmDialogProps) => {
  if (!item) return null;

  const cost = item.effective_price;
  const remainingBalance = currentBalance - cost;
  const canAfford = remainingBalance >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription>
            Review the details below before confirming your purchase.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Item info */}
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">{item.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
            </div>
          </div>

          {/* Balance breakdown */}
          <div className="space-y-2 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Item Cost</span>
              <div className="flex items-center gap-1">
                <Coins className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-amber-600">
                  {item.sale_discount > 0 && (
                    <span className="text-gray-400 line-through me-1.5 font-normal">
                      {item.xp_price.toLocaleString()}
                    </span>
                  )}
                  {cost.toLocaleString()} XP
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Current Balance</span>
              <span className="font-semibold">
                {currentBalance.toLocaleString()} XP
              </span>
            </div>

            <hr className="border-slate-200" />

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Remaining Balance</span>
              <span
                className={`font-bold ${
                  canAfford ? "text-green-600" : "text-red-500"
                }`}
              >
                {remainingBalance.toLocaleString()} XP
              </span>
            </div>
          </div>

          {/* Insufficient balance warning */}
          {!canAfford && (
            <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-xs text-red-700">
                You don't have enough XP for this purchase. You need{" "}
                {Math.abs(remainingBalance).toLocaleString()} more XP.
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!canAfford || isPending}
            className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            Confirm Purchase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseConfirmDialog;
