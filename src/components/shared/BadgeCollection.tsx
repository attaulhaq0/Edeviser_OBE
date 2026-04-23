import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BADGE_DEFINITIONS, type BadgeDef } from '@/lib/badgeDefinitions';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { Pin, PinOff, ChevronDown, ChevronUp } from 'lucide-react';
import type { TieredBadgeData, BadgeTier } from '@/hooks/useTieredBadges';

// ─── Constants ───────────────────────────────────────────────────────────────

const MAX_ACTIVE = 12;
const MAX_PINS = 3;

const TIER_BORDER_COLORS: Record<BadgeTier, string> = {
  bronze: 'border-amber-600',
  silver: 'border-gray-400',
  gold: 'border-yellow-400',
};

const TIER_LABELS: Record<BadgeTier, string> = {
  bronze: 'Bronze',
  silver: 'Silver',
  gold: 'Gold',
};

// ─── Props ───────────────────────────────────────────────────────────────────

interface BadgeCollectionProps {
  earnedBadgeIds?: string[];
  earnedBadgeMap?: Record<string, string>;
  tieredBadges?: TieredBadgeData[];
  onPinBadge?: (badgeId: string) => void;
  onUnpinBadge?: (badgeId: string) => void;
  compact?: boolean;
}

// ─── Tiered Badge Card ───────────────────────────────────────────────────────

interface TieredBadgeCardProps {
  badge: TieredBadgeData;
  pinnedCount: number;
  onPin?: (badgeId: string) => void;
  onUnpin?: (badgeId: string) => void;
}

const TieredBadgeCard = ({ badge, pinnedCount, onPin, onUnpin }: TieredBadgeCardProps) => {
  const tierBorder = badge.tier ? TIER_BORDER_COLORS[badge.tier] : '';

  return (
    <Card
      data-testid={`badge-card-${badge.id}`}
      className={cn(
        'bg-white shadow-md rounded-xl p-4 flex flex-col items-center text-center gap-2 transition-all relative',
        badge.tier ? `border-2 ${tierBorder}` : 'border-0',
      )}
    >
      {(onPin || onUnpin) && (
        <button
          data-testid={`badge-pin-${badge.id}`}
          className="absolute top-2 end-2 p-1 rounded-full hover:bg-slate-100 transition-colors"
          onClick={() => {
            if (badge.is_pinned && onUnpin) onUnpin(badge.id);
            else if (!badge.is_pinned && onPin && pinnedCount < MAX_PINS) onPin(badge.id);
          }}
          disabled={!badge.is_pinned && pinnedCount >= MAX_PINS}
          title={badge.is_pinned ? 'Unpin badge' : pinnedCount >= MAX_PINS ? 'Max 3 pinned badges' : 'Pin badge'}
          aria-label={badge.is_pinned ? 'Unpin badge' : 'Pin badge'}
        >
          {badge.is_pinned ? (
            <PinOff className="h-3.5 w-3.5 text-blue-600" />
          ) : (
            <Pin className="h-3.5 w-3.5 text-gray-400" />
          )}
        </button>
      )}
      <span className="text-3xl" aria-hidden="true">{badge.emoji}</span>
      <span className="text-xs font-bold tracking-wide">{badge.name}</span>
      {badge.tier && (
        <Badge
          data-testid={`badge-tier-${badge.id}`}
          className={cn(
            'text-[10px] font-bold',
            badge.tier === 'bronze' && 'bg-amber-100 text-amber-700 border-amber-300',
            badge.tier === 'silver' && 'bg-gray-100 text-gray-700 border-gray-300',
            badge.tier === 'gold' && 'bg-yellow-100 text-yellow-700 border-yellow-300',
          )}
        >
          {TIER_LABELS[badge.tier]}
        </Badge>
      )}
      {badge.tier !== 'gold' && (
        <div className="w-full mt-1" data-testid={`badge-progress-${badge.id}`}>
          <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-300"
              style={{ width: `${Math.min(badge.progress_toward_next * 100, 100)}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-0.5">
            {Math.round(badge.progress_toward_next * 100)}% to next tier
          </p>
        </div>
      )}
      <span className="text-[10px] text-gray-500">
        {format(new Date(badge.earned_at), 'MMM d, yyyy')}
      </span>
      {badge.is_pinned && (
        <Badge className="text-[10px] bg-blue-50 text-blue-600 border-blue-200">Pinned</Badge>
      )}
    </Card>
  );
};

// ─── Legacy Badge Card ───────────────────────────────────────────────────────

interface LegacyBadgeCardProps {
  badge: BadgeDef;
  isEarned: boolean;
  awardedAt?: string;
}

const LegacyBadgeCard = ({ badge, isEarned, awardedAt }: LegacyBadgeCardProps) => {
  const showMysteryPlaceholder = badge.isMystery && !isEarned;
  return (
    <Card
      data-testid={`badge-card-${badge.id}`}
      className={cn(
        'bg-white border-0 shadow-md rounded-xl p-4 flex flex-col items-center text-center gap-2 transition-all',
        isEarned ? 'border-s-4 border-s-amber-400' : 'opacity-30 grayscale',
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

// ─── Main Component ──────────────────────────────────────────────────────────

const BadgeCollection = ({
  earnedBadgeIds,
  earnedBadgeMap = {},
  tieredBadges,
  onPinBadge,
  onUnpinBadge,
  compact = false,
}: BadgeCollectionProps) => {
  const [showArchived, setShowArchived] = useState(false);

  // All hooks called unconditionally at the top
  const isTieredMode = !!tieredBadges;

  const pinnedCount = useMemo(
    () => (tieredBadges ?? []).filter((b) => b.is_pinned).length,
    [tieredBadges],
  );

  const activeBadges = useMemo(() => {
    if (!tieredBadges) return [];
    const nonArchived = tieredBadges.filter((b) => !b.archived_at);
    const pinned = nonArchived.filter((b) => b.is_pinned);
    const unpinned = nonArchived
      .filter((b) => !b.is_pinned)
      .sort((a, b) => new Date(b.earned_at).getTime() - new Date(a.earned_at).getTime());
    return [...pinned, ...unpinned].slice(0, MAX_ACTIVE);
  }, [tieredBadges]);

  const archivedBadges = useMemo(() => {
    if (!tieredBadges) return [];
    const activeIds = new Set(activeBadges.map((b) => b.id));
    return tieredBadges.filter((b) => !activeIds.has(b.id));
  }, [tieredBadges, activeBadges]);

  const earnedSet = useMemo(
    () => new Set(earnedBadgeIds ?? []),
    [earnedBadgeIds],
  );

  // ── Tiered mode rendering ────────────────────────────────────────────────
  if (isTieredMode) {
    if (compact) {
      return (
        <div data-testid="badge-collection-compact">
          <p className="text-xs text-gray-500 mb-2">
            {tieredBadges!.length} badge{tieredBadges!.length !== 1 ? 's' : ''} earned
          </p>
          <div className="flex gap-3 pb-2 overflow-x-auto">
            {tieredBadges!.length === 0 && (
              <p className="text-xs text-gray-400">No badges earned yet</p>
            )}
            {tieredBadges!.slice(0, 6).map((badge) => (
              <div
                key={badge.id}
                className={cn(
                  'flex flex-col items-center gap-1 min-w-[60px] rounded-lg p-1',
                  badge.tier && `border-2 ${TIER_BORDER_COLORS[badge.tier]}`,
                )}
                title={`${badge.name}${badge.tier ? ` (${TIER_LABELS[badge.tier]})` : ''}`}
              >
                <span className="text-2xl">{badge.emoji}</span>
                <span className="text-[10px] font-bold truncate max-w-[60px]">{badge.name}</span>
              </div>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div data-testid="badge-collection" className="space-y-4">
        <p className="text-sm font-medium text-gray-600" data-testid="badge-count">
          {tieredBadges!.length} badge{tieredBadges!.length !== 1 ? 's' : ''} earned
        </p>
        <div>
          <h3 className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-3">
            Active ({activeBadges.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
            {activeBadges.map((badge) => (
              <TieredBadgeCard
                key={badge.id}
                badge={badge}
                pinnedCount={pinnedCount}
                onPin={onPinBadge}
                onUnpin={onUnpinBadge}
              />
            ))}
          </div>
        </div>
        {archivedBadges.length > 0 && (
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs font-semibold text-gray-500 hover:text-gray-700 gap-1"
              data-testid="view-all-badges-btn"
            >
              {showArchived ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              View All Badges ({archivedBadges.length} archived)
            </Button>
            {showArchived && (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4 mt-3">
                {archivedBadges.map((badge) => (
                  <TieredBadgeCard
                    key={badge.id}
                    badge={badge}
                    pinnedCount={pinnedCount}
                    onPin={onPinBadge}
                    onUnpin={onUnpinBadge}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Legacy mode rendering ────────────────────────────────────────────────
  const earnedCount = earnedBadgeIds?.length ?? 0;
  const totalCount = BADGE_DEFINITIONS.length;

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
            <div key={badge.id} className="flex flex-col items-center gap-1 min-w-[60px]" title={badge.name}>
              <span className="text-2xl">{badge.icon}</span>
              <span className="text-[10px] font-bold truncate max-w-[60px]">{badge.name}</span>
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
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4">
        {BADGE_DEFINITIONS.map((badge) => (
          <LegacyBadgeCard
            key={badge.id}
            badge={badge}
            isEarned={earnedSet.has(badge.id)}
            awardedAt={earnedBadgeMap[badge.id]}
          />
        ))}
      </div>
    </div>
  );
};

export default BadgeCollection;
