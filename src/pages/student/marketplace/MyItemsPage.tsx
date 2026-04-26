import { useState } from 'react';
import { Package, Sparkles, BookOpen, Zap } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useInventory, type InventoryItem } from '@/hooks/useInventory';
import { useEquippedItems, useEquipItem, useUnequipItem } from '@/hooks/useEquippedItems';
import { useActiveBoosts } from '@/hooks/useActiveBoosts';
import ActiveBoostIndicator from '@/components/shared/ActiveBoostIndicator';
import CosmeticPreview from '@/components/shared/CosmeticPreview';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type Tab = 'cosmetic' | 'educational_perk' | 'power_up';

const TABS: { key: Tab; label: string; icon: typeof Sparkles }[] = [
  { key: 'cosmetic', label: 'Cosmetics', icon: Sparkles },
  { key: 'educational_perk', label: 'Perks', icon: BookOpen },
  { key: 'power_up', label: 'Power-ups', icon: Zap },
];

const SLOT_MAP: Record<string, 'profile_theme' | 'avatar_frame' | 'display_title'> = {
  profile_theme: 'profile_theme',
  avatar_frame: 'avatar_frame',
  display_title: 'display_title',
};

const MyItemsPage = () => {
  const { user } = useAuth();
  const studentId = user?.id ?? '';
  const [activeTab, setActiveTab] = useState<Tab>('cosmetic');

  const { data: inventory, isLoading } = useInventory(studentId);
  const { data: equipped } = useEquippedItems(studentId);
  const { data: boosts } = useActiveBoosts(studentId);
  const equipMutation = useEquipItem();
  const unequipMutation = useUnequipItem();

  const equippedPurchaseIds = new Set((equipped ?? []).map((e) => e.purchase_id));

  const filteredItems = (inventory ?? []).filter(
    (item) => item.marketplace_items.category === activeTab && item.status !== 'refunded',
  );

  const handleEquip = (item: InventoryItem) => {
    const slot = SLOT_MAP[item.marketplace_items.sub_category];
    if (!slot) return;
    equipMutation.mutate(
      { studentId, purchaseId: item.id, slot },
      { onSuccess: () => toast.success(`Equipped ${item.marketplace_items.name}`) },
    );
  };

  const handleUnequip = (item: InventoryItem) => {
    const slot = SLOT_MAP[item.marketplace_items.sub_category];
    if (!slot) return;
    unequipMutation.mutate(
      { studentId, slot },
      { onSuccess: () => toast.success(`Unequipped ${item.marketplace_items.name}`) },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold tracking-tight">My Items</h1>
      </div>

      {/* Active Boosts */}
      {(boosts ?? []).length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {(boosts ?? []).map((b) => (
            <ActiveBoostIndicator key={b.id} boost={b} />
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-xl border transition-all',
              activeTab === key
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Items */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="h-32 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <Package className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No items in this category yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const isEquipped = equippedPurchaseIds.has(item.id);
            const isCosmetic = item.marketplace_items.category === 'cosmetic';
            const subCat = item.marketplace_items.sub_category;

            return (
              <Card key={item.id} className="bg-white border-0 shadow-md rounded-xl p-4">
                <div className="flex items-center gap-4">
                  {isCosmetic && (
                    <CosmeticPreview
                      subCategory={subCat as 'profile_theme' | 'avatar_frame' | 'display_title'}
                      metadata={item.marketplace_items.metadata}
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold truncate">{item.marketplace_items.name}</h3>
                    <p className="text-xs text-gray-500 truncate">{item.marketplace_items.description}</p>
                    <Badge variant="outline" className="mt-1 text-[10px]">{item.status}</Badge>
                  </div>
                  {isCosmetic && (
                    <Button
                      size="sm"
                      variant={isEquipped ? 'outline' : 'default'}
                      className={cn(!isEquipped && 'bg-gradient-to-r from-teal-500 to-blue-600 text-white')}
                      onClick={() => isEquipped ? handleUnequip(item) : handleEquip(item)}
                      disabled={equipMutation.isPending || unequipMutation.isPending}
                    >
                      {isEquipped ? 'Unequip' : 'Equip'}
                    </Button>
                  )}
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
