import { Lock, Check, Coins } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import SaleBadge from '@/components/shared/SaleBadge';
import CosmeticPreview from '@/components/shared/CosmeticPreview';
import { cn } from '@/lib/utils';
import type { MarketplaceItem } from '@/hooks/useMarketplace';

interface ItemCardProps {
  item: MarketplaceItem;
  studentLevel: number;
  owned: boolean;
  onBuy: (item: MarketplaceItem) => void;
}

const ICON_MAP: Record<string, string> = {
  profile_theme: '🎨',
  avatar_frame: '🖼️',
  display_title: '👑',
  extra_quiz_attempt: '🔄',
  deadline_extension: '⏰',
  hint_token: '💡',
  xp_boost: '⚡',
  streak_shield: '🛡️',
};

const ItemCard = ({ item, studentLevel, owned, onBuy }: ItemCardProps) => {
  const isLocked = studentLevel < item.level_requirement;
  const isOutOfStock = item.stock_type === 'limited' && (item.stock_quantity ?? 0) <= 0;
  const hasSale = (item.discount_percentage ?? 0) > 0;
  const hasDynamicPrice = item.dynamic_price_override != null && item.dynamic_price_override > 0;
  const effectivePrice = item.effective_price ?? item.xp_price;
  const isCosmetic = item.category === 'cosmetic';

  return (
    <Card className={cn(
      'bg-white border-0 shadow-md rounded-xl p-4 relative group transition-all hover:shadow-lg',
      (isLocked || isOutOfStock) && 'opacity-60',
    )}>
      {hasSale && (
        <div className="absolute top-2 end-2">
          <SaleBadge discountPercentage={item.discount_percentage ?? 0} />
        </div>
      )}

      <div className="flex flex-col items-center text-center gap-3">
        {isCosmetic ? (
          <CosmeticPreview
            subCategory={item.sub_category as 'profile_theme' | 'avatar_frame' | 'display_title'}
            metadata={item.metadata}
          />
        ) : (
          <span className="text-3xl">{ICON_MAP[item.sub_category] ?? '🎁'}</span>
        )}

        <div className="space-y-1">
          <h3 className="text-sm font-bold tracking-tight line-clamp-1">{item.name}</h3>
          <p className="text-xs text-gray-500 line-clamp-2">{item.description}</p>
        </div>

        {item.level_requirement > 0 && (
          <Badge variant="outline" className="text-[10px]">
            Level {item.level_requirement}+
          </Badge>
        )}

        <div className="flex items-center gap-1.5">
          <Coins className="h-4 w-4 text-amber-500" />
          {hasSale ? (
            <>
              <span className="text-xs text-gray-400 line-through">{item.xp_price}</span>
              <span className="text-sm font-black text-amber-700">{effectivePrice}</span>
            </>
          ) : hasDynamicPrice ? (
            <>
              <span className="text-xs text-gray-400 line-through">{item.xp_price}</span>
              <span className="text-sm font-black text-amber-700">{item.dynamic_price_override}</span>
            </>
          ) : (
            <span className="text-sm font-black text-amber-700">{item.xp_price}</span>
          )}
        </div>

        {item.stock_type === 'limited' && !isOutOfStock && (
          <p className="text-[10px] text-gray-400">{item.stock_quantity} left</p>
        )}

        {isLocked ? (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Lock className="h-3 w-3" />
            <span>Reach Level {item.level_requirement}</span>
          </div>
        ) : owned ? (
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Check className="h-3 w-3 me-1" /> Owned
          </Badge>
        ) : isOutOfStock ? (
          <Badge variant="secondary">Sold Out</Badge>
        ) : (
          <Button
            size="sm"
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 w-full"
            onClick={() => onBuy(item)}
          >
            Buy
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ItemCard;
