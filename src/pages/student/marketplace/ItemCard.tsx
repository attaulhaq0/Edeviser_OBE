// =============================================================================
// ItemCard — Marketplace item card with locked/owned/sale/out-of-stock states
// =============================================================================

import { Lock, Check, Coins, Package } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import SaleBadge from "@/components/shared/SaleBadge";
import CosmeticPreview from "@/components/shared/CosmeticPreview";
import type { MarketplaceItem } from "@/hooks/useMarketplace";
import { cn } from "@/lib/utils";

// ─── Icon map ────────────────────────────────────────────────────────────────

import {
  Palette,
  Frame,
  Crown,
  Brain,
  Clock,
  MessageCircle,
  Zap,
  Shield,
  Sparkles,
} from "lucide-react";

const ICON_MAP: Record<string, React.ElementType> = {
  palette: Palette,
  frame: Frame,
  crown: Crown,
  brain: Brain,
  clock: Clock,
  message_circle: MessageCircle,
  zap: Zap,
  shield: Shield,
  sparkles: Sparkles,
  package: Package,
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface ItemCardProps {
  item: MarketplaceItem;
  studentLevel: number;
  isOwned: boolean;
  onPurchase: (item: MarketplaceItem) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const ItemCard = ({
  item,
  studentLevel,
  isOwned,
  onPurchase,
}: ItemCardProps) => {
  const isLocked = item.level_requirement > studentLevel;
  const isOutOfStock =
    item.stock_type === "limited" && (item.stock_quantity ?? 0) <= 0;
  const hasSale = item.sale_discount > 0;
  const isCosmetic = item.category === "cosmetic";

  const IconComponent = ICON_MAP[item.icon_identifier] ?? Sparkles;

  return (
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden relative transition-transform hover:scale-[1.02]",
        isLocked && "opacity-60"
      )}
    >
      {/* Sale badge */}
      {hasSale && (
        <div className="absolute top-3 end-3 z-10">
          <SaleBadge discountPercentage={item.sale_discount} />
        </div>
      )}

      {/* Owned badge */}
      {isOwned && (
        <div className="absolute top-3 end-3 z-10">
          <Badge className="bg-green-100 text-green-700 border-green-200">
            <Check className="h-3 w-3 me-1" />
            Owned
          </Badge>
        </div>
      )}

      {/* Preview area */}
      <div className="p-4 flex items-center justify-center min-h-[100px] bg-slate-50">
        {isCosmetic ? (
          <CosmeticPreview
            subCategory={item.sub_category}
            metadata={item.metadata}
            name={item.name}
            className="w-full"
          />
        ) : (
          <div className="p-3 rounded-xl bg-blue-50">
            <IconComponent className="h-8 w-8 text-blue-600" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        <div>
          <h3 className="text-sm font-bold text-gray-900 truncate">
            {item.name}
          </h3>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Price */}
        <div className="flex items-center gap-2">
          <Coins className="h-4 w-4 text-amber-500" />
          {hasSale ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-400 line-through">
                {item.xp_price.toLocaleString()}
              </span>
              <span className="text-sm font-bold text-amber-600">
                {item.effective_price.toLocaleString()} XP
              </span>
            </div>
          ) : (
            <span className="text-sm font-bold text-amber-600">
              {item.xp_price.toLocaleString()} XP
            </span>
          )}
        </div>

        {/* Stock info */}
        {item.stock_type === "limited" && !isOutOfStock && (
          <p className="text-xs text-gray-500">
            {item.stock_quantity} remaining
          </p>
        )}

        {/* Level requirement */}
        {isLocked && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock className="h-3 w-3" />
            <span>Requires Level {item.level_requirement}</span>
          </div>
        )}

        {/* Action button */}
        {isOutOfStock ? (
          <Button disabled className="w-full" variant="outline" size="sm">
            Out of Stock
          </Button>
        ) : isOwned ? (
          <Button disabled className="w-full" variant="outline" size="sm">
            Already Owned
          </Button>
        ) : isLocked ? (
          <Button disabled className="w-full" variant="outline" size="sm">
            <Lock className="h-4 w-4 me-1" />
            Locked
          </Button>
        ) : (
          <Button
            onClick={() => onPurchase(item)}
            className="w-full bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
            size="sm"
          >
            Buy Now
          </Button>
        )}
      </div>
    </Card>
  );
};

export default ItemCard;
