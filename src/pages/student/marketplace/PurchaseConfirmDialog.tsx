import { Coins, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { usePurchaseItem } from '@/hooks/usePurchase';
import { toast } from 'sonner';
import type { MarketplaceItem } from '@/hooks/useMarketplace';

const ERROR_MESSAGES: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'Not enough XP to purchase this item.',
  LEVEL_REQUIREMENT: 'You need a higher level to purchase this item.',
  OUT_OF_STOCK: 'This item is sold out.',
  ALREADY_OWNED: 'You already own this item.',
  ITEM_INACTIVE: 'This item is no longer available.',
  SALE_EXPIRED: 'The sale has ended. The price may have changed.',
  MAX_INVENTORY: 'You already have the maximum number of this item.',
};

interface PurchaseConfirmDialogProps {
  item: MarketplaceItem | null;
  balance: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PurchaseConfirmDialog = ({ item, balance, open, onOpenChange }: PurchaseConfirmDialogProps) => {
  const purchase = usePurchaseItem();
  const effectivePrice = item?.effective_price ?? item?.xp_price ?? 0;
  const remaining = balance - effectivePrice;

  const handleConfirm = () => {
    if (!item) return;
    purchase.mutate(item.id, {
      onSuccess: () => {
        toast.success(`Purchased ${item.name}`);
        onOpenChange(false);
      },
      onError: (err) => {
        const code = (err as Error & { code?: string }).code ?? '';
        toast.error(ERROR_MESSAGES[code] ?? err.message);
      },
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm Purchase</DialogTitle>
          <DialogDescription>Review the details before buying.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{item.name}</span>
            <div className="flex items-center gap-1 text-amber-700 font-bold">
              <Coins className="h-4 w-4 text-amber-500" />
              {effectivePrice} XP
            </div>
          </div>

          <div className="border-t border-slate-200 pt-3 space-y-2 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Current Balance</span>
              <span>{balance.toLocaleString()} XP</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>After Purchase</span>
              <span className={remaining < 0 ? 'text-red-500' : 'text-green-600'}>
                {remaining.toLocaleString()} XP
              </span>
            </div>
          </div>

          {remaining < 0 && (
            <p className="text-xs text-red-500">You don't have enough XP for this purchase.</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={purchase.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
            onClick={handleConfirm}
            disabled={purchase.isPending || remaining < 0}
          >
            {purchase.isPending && <Loader2 className="h-4 w-4 animate-spin me-1" />}
            Confirm
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PurchaseConfirmDialog;
