// =============================================================================
// TeachingMomentRating — Star rating for clarity (1-5) and helpfulness (1-5)
// Task 4.12: interactive star rating component
// =============================================================================

import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Star, Loader2 } from "lucide-react";

export interface TeachingMomentRatingProps {
  onSubmit: (clarity: number, helpfulness: number) => void;
  isPending?: boolean;
  initialClarity?: number;
  initialHelpfulness?: number;
  readOnly?: boolean;
  className?: string;
}

interface StarRatingProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  readOnly?: boolean;
}

const StarRating = ({
  label,
  value,
  onChange,
  readOnly = false,
}: StarRatingProps) => {
  const [hovered, setHovered] = useState(0);

  return (
    <div className="space-y-1">
      <span className="text-xs font-medium text-gray-600">{label}</span>
      <div
        className="flex items-center gap-0.5"
        role="radiogroup"
        aria-label={`${label} rating`}
        tabIndex={0}
        onMouseLeave={() => setHovered(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => {
          const isFilled = star <= (hovered || value);
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={star === value}
              aria-label={`${star} star${star !== 1 ? "s" : ""}`}
              disabled={readOnly}
              className={cn(
                "p-0.5 rounded transition-colors focus-visible:ring-2 focus-visible:ring-blue-400",
                !readOnly &&
                  "cursor-pointer hover:scale-110 transition-transform",
                readOnly && "cursor-default"
              )}
              onClick={() => !readOnly && onChange(star)}
              onMouseEnter={() => !readOnly && setHovered(star)}
              onKeyDown={(e) => {
                if (readOnly) return;
                if (e.key === "ArrowRight" && value < 5) onChange(value + 1);
                if (e.key === "ArrowLeft" && value > 1) onChange(value - 1);
              }}
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  isFilled ? "text-amber-400 fill-amber-400" : "text-gray-300"
                )}
              />
            </button>
          );
        })}
        {value > 0 && (
          <span className="text-xs text-gray-500 ms-1 tabular-nums">
            {value}/5
          </span>
        )}
      </div>
    </div>
  );
};

const TeachingMomentRating = ({
  onSubmit,
  isPending = false,
  initialClarity = 0,
  initialHelpfulness = 0,
  readOnly = false,
  className,
}: TeachingMomentRatingProps) => {
  const [clarity, setClarity] = useState(initialClarity);
  const [helpfulness, setHelpfulness] = useState(initialHelpfulness);

  const handleSubmit = useCallback(() => {
    if (clarity > 0 && helpfulness > 0) {
      onSubmit(clarity, helpfulness);
    }
  }, [clarity, helpfulness, onSubmit]);

  const canSubmit = clarity > 0 && helpfulness > 0 && !isPending && !readOnly;

  return (
    <div className={cn("space-y-3", className)}>
      <StarRating
        label="Clarity"
        value={clarity}
        onChange={setClarity}
        readOnly={readOnly}
      />
      <StarRating
        label="Helpfulness"
        value={helpfulness}
        onChange={setHelpfulness}
        readOnly={readOnly}
      />

      {!readOnly && (
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="active:scale-95 transition-transform duration-100 gap-1.5"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star className="h-4 w-4" />
          )}
          Submit Rating
        </Button>
      )}
    </div>
  );
};

export default TeachingMomentRating;
