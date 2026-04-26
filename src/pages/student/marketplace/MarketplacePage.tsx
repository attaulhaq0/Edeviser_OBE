import { useState } from 'react';
import { Sparkles, BookOpen, Zap, ShoppingBag, Heart } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { useMarketplaceItems, type MarketplaceItem } from '@/hooks/useMarketplace';
import { useXPBalance } from '@/hooks/useXPBalance';
import { useInventory } from '@/hooks/useInventory';
import { useClassDonations } from '@/hooks/useClassDonations';
import { cn } from '@/lib/utils';
import XPBalanceBadge from '@/components/shared/XPBalanceBadge';
import ClassDonationProgress from '@/components/shared/ClassDonationProgress';
import GradientCardHeader from '@/components/shared/GradientCardHeader';
import ItemCard from '@/pages/student/marketplace/ItemCard';
import PurchaseConfirmDialog from '@/pages/student/marketplace/PurchaseConfirmDialog';

type Category = 'cosmetic' | 'educational_perk' | 'power_up';

const TABS: { key: Category; label: string; icon: typeof Sparkles }[] = [
  { key: 'cosmetic', label: 'Cosmetics', icon: Sparkles },
  { key: 'educational_perk', label: 'Perks', icon: BookOpen },
  { key: 'power_up', label: 'Power-ups', icon: Zap },
];

const MarketplacePage = () => {
  const { user, profile } = useAuth();
  const studentId = user?.id ?? '';
  const studentLevel = ((profile as unknown as Record<string, unknown>)?.level as number) ?? 1;
  const [activeTab, setActiveTab] = useState<Category>('cosmetic');
  const [purchaseItem, setPurchaseItem] = useState<MarketplaceItem | null>(null);

  const courseId = (profile as unknown as Record<string, unknown>)?.course_id as string | undefined;
  const { data: items, isLoading } = useMarketplaceItems(activeTab);
  const { data: balance } = useXPBalance(studentId);
  const { data: inventory } = useInventory(studentId);
  const { data: donations } = useClassDonations(courseId);

  const ownedItemIds = new Set(
    (inventory ?? [])
      .filter((p) => p.status !== 'refunded')
      .map((p) => p.item_id),
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-blue-600" />
          <h1 className="text-2xl font-bold tracking-tight">Marketplace</h1>
        </div>
        <XPBalanceBadge studentId={studentId} />
      </div>

      {/* Category Tabs */}
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

      {/* Item Grid */}
      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i} className="h-56 rounded-xl animate-shimmer" />
          ))}
        </div>
      ) : (items ?? []).length === 0 ? (
        <Card className="bg-white border-0 shadow-md rounded-xl p-12 text-center">
          <ShoppingBag className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-500">No items available in this category yet.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {(items ?? []).map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              studentLevel={studentLevel}
              owned={item.stock_type === 'one_per_student' && ownedItemIds.has(item.id)}
              onBuy={setPurchaseItem}
            />
          ))}
        </div>
      )}

      {/* Class Donations */}
      {(donations ?? []).filter((d) => d.status === 'active').length > 0 && (
        <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
          <GradientCardHeader icon={Heart} title="Class Donations" />
          <div className="p-6 space-y-4">
            {(donations ?? [])
              .filter((d) => d.status === 'active')
              .map((donation) => (
                <ClassDonationProgress key={donation.id} donation={donation} />
              ))}
          </div>
        </Card>
      )}

      {/* Purchase Dialog */}
      <PurchaseConfirmDialog
        item={purchaseItem}
        balance={balance ?? 0}
        open={!!purchaseItem}
        onOpenChange={(open) => { if (!open) setPurchaseItem(null); }}
      />
    </div>
  );
};

export default MarketplacePage;
