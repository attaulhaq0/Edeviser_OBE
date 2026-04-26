import { ThumbsUp, ThumbsDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface SatisfactionRatingProps {
  messageId: string;
  currentRating: 'thumbs_up' | 'thumbs_down' | null;
  onRate: (messageId: string, rating: 'thumbs_up' | 'thumbs_down') => void;
  disabled?: boolean;
}

const SatisfactionRating = ({
  messageId,
  currentRating,
  onRate,
  disabled = false,
}: SatisfactionRatingProps) => {
  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 w-7 p-0 rounded-full',
          currentRating === 'thumbs_up'
            ? 'text-green-600 bg-green-50 hover:bg-green-100'
            : 'text-gray-400 hover:text-green-600 hover:bg-green-50',
        )}
        onClick={() => onRate(messageId, 'thumbs_up')}
        disabled={disabled}
        aria-label="Helpful"
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'h-7 w-7 p-0 rounded-full',
          currentRating === 'thumbs_down'
            ? 'text-red-600 bg-red-50 hover:bg-red-100'
            : 'text-gray-400 hover:text-red-600 hover:bg-red-50',
        )}
        onClick={() => onRate(messageId, 'thumbs_down')}
        disabled={disabled}
        aria-label="Not helpful"
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default SatisfactionRating;
