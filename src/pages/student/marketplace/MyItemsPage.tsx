// =============================================================================
// MyItemsPage — Student inventory grouped by category with equip/use actions
// =============================================================================

import { useMemo } from 'react';
import { parseAsString, useQueryState } from 'nuqs';
import { Package, Palette, GraduationCap, Zap, Check, X } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Shimmer from '@/components/shared/Shimmer';
import CosmeticPreview from '@/components/shared/CosmeticPreview';
import XPBalanceBadge from '@/components/shared/XPBalanceBadge';
import { useAuth } from '@/hooks/useAuth';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { useEquippedItems, useEquipItem, useUnequipItem, type CosmeticSlot } from '@/hooks/useEquippedItems';
import { cn } from '@/lib/utils';

// ─── Category tabs ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: 'all', label: 'All', icon: Package },
  { value: 'cosmetic', label: 'Cosmetic', icon: Palette },
  { value: 'educational_perk', label: 'Perks', icon: GraduationCap },
  { value: 'power_up', label: 'Power-ups', icon: Zap },
] as const;

// ─── Status badge ────────────────────────────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    active: 'bg-green-50 text-green-700 border-green-200',
    consumed: 'bg-gray-50 text-gray-500 border-gray-200',
    expired: 'bg-red-50 text-red-600 border-red-200',
  };

  return (
    <Badge variant="outline" className={styles[status] ?? styles.active}>
      {status}
    </Badge>
  );
};

// ─── Component ───────────────────────────────────────────────────────────────

const MyItemsPage = () => {
  const { user } = useAuth();
  const userId = user?.id ?? '';

  const [category, setCategory] = useQueryState('cat', parseAsString.withDefault('all'));

  const { data: inventory, isLoading } = useInventory(userId);
  const { data: equippedItems } = useEquippedItems(userId);
  const equipMutation = useEquipItem();
  const unequipMutation = useUnequipItem();

  // Build equipped slot map
  const equippedSlotMap = useMemo(() => {
    const map = new Map<string, string>(); // purchaseId → slot
    for (const eq of equippedItems ?? []) {
      map.set(eq.purchase_id, eq.slot);
    }
    return map;
  }, [equippedItems]);

  // Filter items by category
  const filteredItems = useMemo(() => {
    if (!inventory) return [];
    if (category === 'all') return inventory;
    return inventory.filter((item) => item.item_category === category);
  }, [inventory, category]);

  const handleEquip = (item: InventoryItem) => {
    const slot = item.item_sub_category as CosmeticSlot;
    equipMutation.mutate({
      studentId: userId,
      purchaseId: item.purchase_id,
      slot,
    });
  };

  const handleUnequip = (item: InventoryItem) => {
    const slot = item.item_sub_category as CosmeticSlot;
    unequipMutation.mutate({
      studentId: userId,
      slot,
    });
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">My Items</h1>
        </div>
        <XPBalanceBadge size="lg" />
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

      {/* Items List */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No items in your inventory yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const isEquipped = equippedSlotMap.has(item.purchase_id);
            const isCosmetic = item.item_category === 'cosmetic';

            return (
              <Card
                key={item.purchase_id}
                className="bg-white border-0 shadow-md rounded-xl p-4"
              >
                <div className="flex items-center gap-4">
                  {/* Preview */}
                  {isCosmetic ? (
                    <div className="w-16 shrink-0">
                      <CosmeticPreview
                        subCategory={item.item_sub_category}
                        metadata={item.metadata}
                        name={item.item_name}
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 shrink-0 rounded-xl bg-blue-50 flex items-center justify-center">
                      {item.item_category === 'educational_perk' ? (
                        <GraduationCap className="h-6 w-6 text-blue-600" />
                      ) : (
                        <Zap className="h-6 w-6 text-purple-600" />
                      )}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-gray-900 truncate">
                        {item.item_name}
                      </h3>
                      <StatusBadge status={item.status} />
                      {isEquipped && (
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                          <Check className="h-3 w-3 me-1" />
                          Equipped
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Purchased {new Date(item.purchased_at).toLocaleDateString()} · {item.xp_cost} XP
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0">
                    {isCosmetic && item.status === 'active' && (
                      isEquipped ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUnequip(item)}
                          disabled={unequipMutation.isPending}
                        >
                          <X className="h-4 w-4 me-1" />
                          Unequip
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleEquip(item)}
                          disabled={equipMutation.isPending}
                          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
                        >
                          Equip
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyItemsPage;
