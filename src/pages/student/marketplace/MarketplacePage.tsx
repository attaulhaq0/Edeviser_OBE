// =============================================================================
// MarketplacePage — Main marketplace with category tabs, XP balance, item grid
// =============================================================================

import { useState, useMemo } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { ShoppingBag, Palette, GraduationCap, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useXPBalance } from '@/hooks/useXPBalance';
import { useMarketplaceItems, type MarketplaceItem } from '@/hooks/useMarketplace';
import { useInventory } from '@/hooks/useInventory';
import { usePurchaseItem } from '@/hooks/usePurchase';
import { useLevel } from '@/hooks/useLevel';
import XPBalanceBadge from '@/components/shared/XPBalanceBadge';
import ActiveBoostIndicator from '@/components/shared/ActiveBoostIndicator';
import ItemCard from '@/pages/student/marketplace/ItemCard';
import PurchaseConfirmDialog from '@/pages/student/marketplace/PurchaseConfirmDialog';
import Shimmer from '@/components/shared/Shimmer';
import { cn } from '@/lib/utils';

// ─── Category tabs ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'All Items', icon: ShoppingBag },
  { value: 'cosmetic', label: 'Cosmetic', icon: Palette },
  { value: 'educational_perk', label: 'Perks', icon: GraduationCap },
  { value: 'power_up', label: 'Power-ups', icon: Zap },
] as const;

// ─── Component ───────────────────────────────────────────────────────────────

const MarketplacePage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [category, setCategory] = useQueryState('cat', parseAsString.withDefault('all'));
  const [selectedItem, setSelectedItem] = useState<MarketplaceItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data: balanceData } = useXPBalance(userId);
  const { data: items, isLoading: isLoadingItems } = useMarketplaceItems(
    category === 'all' ? undefined : category,
  );
  const { data: inventory } = useInventory(userId);
  const { data: levelData } = useLevel(userId);
  const purchaseMutation = usePurchaseItem();

  const currentBalance = balanceData?.balance ?? 0;
  const studentLevel = levelData?.level ?? 1;

  // Build set of owned item IDs (one_per_student items)
  const ownedItemIds = useMemo(() => {
    const ids = new Set<string>();
    for (const inv of inventory ?? []) {
      if (inv.status !== 'refunded') {
        ids.add(inv.item_id);
      }
    }
    return ids;
  }, [inventory]);

  const handlePurchaseClick = (item: MarketplaceItem) => {
    setSelectedItem(item);
    setDialogOpen(true);
  };

  const handleConfirmPurchase = () => {
    if (!selectedItem) return;
    purchaseMutation.mutate(selectedItem.id, {
      onSuccess: () => {
        setDialogOpen(false);
        setSelectedItem(null);
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        </div>
        <div className="flex items-center gap-3">
          <ActiveBoostIndicator />
          <XPBalanceBadge size="lg" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          return (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={cn(
                'flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-sm font-semibold transition-colors',
                category === cat.value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4" />
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Item Grid */}
      {isLoadingItems ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Shimmer key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      ) : !items || items.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingBag className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No items available in this category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              studentLevel={studentLevel}
              isOwned={
                item.stock_type === 'one_per_student' && ownedItemIds.has(item.id)
              }
              onPurchase={handlePurchaseClick}
            />
          ))}
        </div>
      )}

      {/* Purchase Confirmation Dialog */}
      <PurchaseConfirmDialog
        item={selectedItem}
        currentBalance={currentBalance}
        isPending={purchaseMutation.isPending}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onConfirm={handleConfirmPurchase}
      />
    </div>
  );
};

export default MarketplacePage;
