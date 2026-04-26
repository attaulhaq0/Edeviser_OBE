// =============================================================================
// PeerTeachingMomentCard — Task 4.10
// Teaching moment display with title, text, media link, average ratings
// =============================================================================

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Eye, Star, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

export interface TeachingMomentData {
  id: string;
  author_name: string;
  author_id: string;
  clo_title: string;
  title: string;
  explanation_text: string;
  media_url: string | null;
  view_count: number;
  avg_clarity_rating: number | null;
  avg_helpfulness_rating: number | null;
  created_at: string;
}

interface PeerTeachingMomentCardProps {
  moment: TeachingMomentData;
  onView?: (momentId: string) => void;
  className?: string;
}

const StarRating = ({ value, label }: { value: number | null; label: string }) => {
  if (value === null) return null;
  const rounded = Math.round(value * 10) / 10;

  return (
    <div className="flex items-center gap-1" data-testid={`rating-${label.toLowerCase()}`}>
      <Star className="h-3 w-3 text-amber-400 fill-amber-400" />
      <span className="text-xs font-bold text-gray-700">{rounded}</span>
      <span className="text-[10px] text-gray-400">{label}</span>
    </div>
  );
};

const PeerTeachingMomentCard = ({
  moment,
  onView,
  className,
}: PeerTeachingMomentCardProps) => {
  return (
    <Card
      className={cn(
        'bg-white border-0 shadow-md rounded-xl p-4 hover:shadow-lg transition-shadow',
        onView && 'cursor-pointer',
        className,
      )}
      onClick={() => onView?.(moment.id)}
      data-testid={`teaching-moment-${moment.id}`}
    >
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-50 shrink-0">
              <BookOpen className="h-4 w-4 text-blue-600" />
            </div>
            <div className="min-w-0">
              <h4 className="text-sm font-bold truncate">{moment.title}</h4>
              <p className="text-xs text-gray-500 mt-0.5">
                by {moment.author_name} ·{' '}
                {formatDistanceToNow(new Date(moment.created_at), { addSuffix: true })}
              </p>
            </div>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] bg-green-50 text-green-700 border-green-200 shrink-0"
          >
            {moment.clo_title}
          </Badge>
        </div>

        {/* Explanation Text */}
        <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
          {moment.explanation_text}
        </p>

        {/* Media Link */}
        {moment.media_url && (
          <a
            href={moment.media_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700"
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
            View attached media
          </a>
        )}

        {/* Footer: Views and Ratings */}
        <div className="flex items-center gap-4 pt-1 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Eye className="h-3 w-3" />
            <span>{moment.view_count} views</span>
          </div>
          <StarRating value={moment.avg_clarity_rating} label="Clarity" />
          <StarRating value={moment.avg_helpfulness_rating} label="Helpful" />
        </div>
      </div>
    </Card>
  );
};

export default PeerTeachingMomentCard;
