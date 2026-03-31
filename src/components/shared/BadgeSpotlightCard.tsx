// Task 151.2: Badge Spotlight Card component

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Sparkles } from 'lucide-react';

interface BadgeSpotlightCardProps {
  category: string;
  currentTier: 'bronze' | 'silver' | 'gold' | null;
  progress: number;
  daysRemaining: number;
}

const tierColors = {
  bronze: 'border-amber-600',
  silver: 'border-gray-400',
  gold: 'border-yellow-400',
};

const BadgeSpotlightCard = ({
  category,
  currentTier,
  progress,
  daysRemaining,
}: BadgeSpotlightCardProps) => {
  return (
    <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 shadow-md rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-purple-100">
          <Sparkles className="h-5 w-5 text-purple-600" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-purple-800">Badge Spotlight</p>
            <Badge className="text-[10px] bg-amber-100 text-amber-700 border-amber-200">
              2x XP Bonus
            </Badge>
          </div>
          <p className="text-xs text-purple-600 mt-0.5 capitalize">{category}</p>

          {currentTier && (
            <div className={`inline-block mt-2 px-2 py-0.5 rounded border-2 ${tierColors[currentTier]} text-xs font-bold capitalize`}>
              {currentTier}
            </div>
          )}

          <div className="mt-2">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>Progress to next tier</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-purple-500 transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          <p className="text-[10px] text-gray-400 mt-1.5">
            {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
          </p>
        </div>
      </div>
    </Card>
  );
};

export default BadgeSpotlightCard;
