// =============================================================================
// TeachingMomentRating — Task 4.12
// Star rating component for clarity (1-5) and helpfulness (1-5)
// =============================================================================

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Star, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TeachingMomentRatingProps {
  onSubmit: (clarity: number, helpfulness: number) => void;
  isPending?: boolean;
  existingClarity?: number;
  existingHelpfulness?: number;
  className?: string;
}

const StarInput = ({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-1" data-testid={`star-input-${label.toLowerCase()}`}>
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label={`${label} rating`}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star !== 1 ? 's' : ''}`}
              disabled={disabled}
              className={cn(
                'p-0.5 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded',
                disabled && 'cursor-not-allowed opacity-60',
              )}
              onClick={() => onChange(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowRight' && star < 5) onChange(star + 1);
                if (e.key === 'ArrowLeft' && star > 1) onChange(star - 1);
              }}
            >
              <Star
                className={cn(
                  'h-5 w-5 transition-colors',
                  isFilled
                    ? 'text-amber-400 fill-amber-400'
                    : 'text-gray-300',
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
};

const TeachingMomentRating = ({
  onSubmit,
  isPending,
  existingClarity,
  existingHelpfulness,
  className,
}: TeachingMomentRatingProps) => {
  const [clarity, setClarity] = useState(existingClarity ?? 0);
  const [helpfulness, setHelpfulness] = useState(existingHelpfulness ?? 0);
  const hasExisting = existingClarity !== undefined && existingHelpfulness !== undefined;
  const canSubmit = clarity > 0 && helpfulness > 0 && !hasExisting;

  return (
    <div className={cn('space-y-3', className)} data-testid="teaching-moment-rating">
      {hasExisting && (
        <p className="text-xs text-gray-500 italic">You already rated this teaching moment.</p>
      )}

      <div className="flex items-start gap-6">
        <StarInput
          label="Clarity"
          value={clarity}
          onChange={setClarity}
          disabled={hasExisting || isPending}
        />
        <StarInput
          label="Helpfulness"
          value={helpfulness}
          onChange={setHelpfulness}
          disabled={hasExisting || isPending}
        />
      </div>

      {!hasExisting && (
        <Button
          size="sm"
          disabled={!canSubmit || isPending}
          onClick={() => onSubmit(clarity, helpfulness)}
          className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
        >
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Submit Rating
        </Button>
      )}
    </div>
  );
};

export default TeachingMomentRating;
