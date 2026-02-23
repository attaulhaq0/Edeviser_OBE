import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  BADGE_DEFINITIONS,
  getBadgesByCategory,
  type BadgeCategory,
  type BadgeDef,
} from '@/lib/badgeDefinitions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';


interface BadgeCollectionProps {
  earnedBadgeIds: string[];
  earnedBadgeMap?: Record<string, string>; // badge_id → awarded_at ISO string
  compact?: boolean;
}

const CATEGORIES: { value: 'all' | BadgeCategory; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'streak', label: 'Streak' },
  { value: 'academic', label: 'Academic' },
  { value: 'engagement', label: 'Engagement' },
  { value: 'mystery', label: 'Mystery' },
];

interface BadgeCardProps {
  badge: BadgeDef;
  isEarned: boolean;
  awardedAt?: string;
}

const BadgeCard = ({ badge, isEarned, awardedAt }: BadgeCardProps) => {
  const showMysteryPlaceholder = badge.isMystery && !isEarned;

  return (
    <Card
      data-testid={`badge-card-${badge.id}`}
      className={cn(
        'bg-white border-0 shadow-md rounded-xl p-4 flex flex-col items-center text-center gap-2 transition-all',
        isEarned
          ? 'border-l-4 border-l-amber-400'
          : 'opacity-30 grayscale',
      )}
    >
      <span className="text-3xl" aria-hidden="true" data-testid={`badge-icon-${badge.id}`}>
        {showMysteryPlaceholder ? '❓' : badge.icon}
      </span>
      <span className="text-xs font-bold tracking-wide" data-testid={`badge-name-${badge.id}`}>
        {showMysteryPlaceholder ? 'Mystery' : badge.name}
      </span>
      {isEarned && awardedAt && (
        <span className="text-[10px] text-gray-500">
          {format(new Date(awardedAt), 'MMM d, yyyy')}
        </span>
      )}
    </Card>
  );
};

const BadgeCollection = ({
  earnedBadgeIds,
  earnedBadgeMap = {},
  compact = false,
}: BadgeCollectionProps) => {
  const [activeTab, setActiveTab] = useState<string>('all');

  const earnedSet = useMemo(() => new Set(earnedBadgeIds), [earnedBadgeIds]);

  const earnedCount = earnedBadgeIds.length;
  const totalCount = BADGE_DEFINITIONS.length;

  const filteredBadges = useMemo(() => {
    if (activeTab === 'all') return BADGE_DEFINITIONS;
    return getBadgesByCategory(activeTab as BadgeCategory);
  }, [activeTab]);

  if (compact) {
    const earned = BADGE_DEFINITIONS.filter((b) => earnedSet.has(b.id));
    return (
      <div data-testid="badge-collection-compact">
        <p className="text-xs text-gray-500 mb-2">
          {earnedCount} / {totalCount} badges earned
        </p>
        <div className="flex gap-3 pb-2 overflow-x-auto">
          {earned.length === 0 && (
            <p className="text-xs text-gray-400">No badges earned yet</p>
          )}
          {earned.map((badge) => (
            <div
              key={badge.id}
              className="flex flex-col items-center gap-1 min-w-[60px]"
              title={badge.name}
            >
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] font-bold truncate max-w-[60px]">
                {badge.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div data-testid="badge-collection" className="space-y-4">
      <p className="text-sm font-medium text-gray-600" data-testid="badge-count">
        {earnedCount} / {totalCount} badges earned
      </p>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="gap-2 rounded-xl">
          {CATEGORIES.map((cat) => (
            <TabsTrigger
              key={cat.value}
              value={cat.value}
              className="rounded-xl px-3 py-1.5 text-sm font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=inactive]:bg-white data-[state=inactive]:text-gray-600 data-[state=inactive]:border-gray-200"
            >
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CATEGORIES.map((cat) => (
          <TabsContent key={cat.value} value={cat.value}>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-4">
              {(cat.value === 'all'
                ? filteredBadges
                : getBadgesByCategory(cat.value as BadgeCategory)
              ).map((badge) => (
                <BadgeCard
                  key={badge.id}
                  badge={badge}
                  isEarned={earnedSet.has(badge.id)}
                  awardedAt={earnedBadgeMap[badge.id]}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default BadgeCollection;
