// =============================================================================
// PeerTeachingMomentCard — Teaching moment display
// Task 4.10: title, text, media link, average ratings
// =============================================================================

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { BookOpen, ExternalLink, Star, Eye } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

export interface PeerTeachingMomentCardProps {
  title: string;
  explanationText: string;
  mediaUrl?: string | null;
  authorName: string;
  cloTitle?: string;
  createdAt: string;
  avgClarityRating?: number;
  avgHelpfulnessRating?: number;
  totalRatings?: number;
  viewCount?: number;
  className?: string;
  onView?: () => void;
}

function renderStars(rating: number): string {
  const rounded = Math.round(rating * 10) / 10;
  return `${rounded.toFixed(1)}`;
}

const PeerTeachingMomentCard = ({
  title,
  explanationText,
  mediaUrl,
  authorName,
  cloTitle,
  createdAt,
  avgClarityRating,
  avgHelpfulnessRating,
  totalRatings = 0,
  viewCount = 0,
  className,
  onView,
}: PeerTeachingMomentCardProps) => (
  <Card
    className={cn(
      'bg-white border-0 shadow-md rounded-xl p-4',
      onView && 'cursor-pointer hover:shadow-lg transition-shadow',
      className,
    )}
    onClick={onView}
    role={onView ? 'button' : undefined}
    tabIndex={onView ? 0 : undefined}
    onKeyDown={onView ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onView(); } } : undefined}
  >
    {/* Header */}
    <div className="flex items-start gap-3">
      <div className="p-2 rounded-lg bg-blue-50 shrink-0">
        <BookOpen className="h-4 w-4 text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold truncate">{title}</h4>
        <p className="text-xs text-gray-500 mt-0.5">
          by {authorName} · {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
        </p>
      </div>
      {cloTitle && (
        <Badge variant="outline" className="text-[10px] shrink-0">
          {cloTitle}
        </Badge>
      )}
    </div>

    {/* Explanation text */}
    <p className="text-sm text-gray-700 mt-3 line-clamp-3 leading-relaxed">
      {explanationText}
    </p>

    {/* Media link */}
    {mediaUrl && (
      <a
        href={mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline mt-2"
        onClick={(e) => e.stopPropagation()}
      >
        <ExternalLink className="h-3 w-3" />
        View media
      </a>
    )}

    {/* Footer: ratings + views */}
    <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
      {avgClarityRating !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Star className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          <span className="font-medium">Clarity: {renderStars(avgClarityRating)}</span>
        </div>
      )}
      {avgHelpfulnessRating !== undefined && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          <Star className="h-3.5 w-3.5 text-blue-400 fill-blue-400" />
          <span className="font-medium">Helpful: {renderStars(avgHelpfulnessRating)}</span>
        </div>
      )}
      {totalRatings > 0 && (
        <span className="text-[10px] text-gray-400">
          ({totalRatings} rating{totalRatings !== 1 ? 's' : ''})
        </span>
      )}
      <div className="ms-auto flex items-center gap-1 text-xs text-gray-400">
        <Eye className="h-3 w-3" />
        {viewCount}
      </div>
    </div>
  </Card>
);

export default PeerTeachingMomentCard;
