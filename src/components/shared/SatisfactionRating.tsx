// =============================================================================
// SatisfactionRating — Thumbs up/down rating component for tutor messages
// =============================================================================

import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SatisfactionRating as SatisfactionRatingType } from "@/lib/tutorSchemas";

interface SatisfactionRatingProps {
  messageId: string;
  conversationId: string;
  currentRating: SatisfactionRatingType | null;
  onRate: (variables: {
    messageId: string;
    conversationId: string;
    rating: SatisfactionRatingType;
  }) => void;
  isPending?: boolean;
}

const SatisfactionRating = ({
  messageId,
  conversationId,
  currentRating,
  onRate,
  isPending = false,
}: SatisfactionRatingProps) => {
  const handleRate = (rating: SatisfactionRatingType) => {
    if (isPending) return;
    onRate({ messageId, conversationId, rating });
  };

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Rate this response"
    >
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => handleRate("thumbs_up")}
        disabled={isPending}
        aria-label="Thumbs up"
        aria-pressed={currentRating === "thumbs_up"}
        className={cn(
          "transition-colors",
          currentRating === "thumbs_up"
            ? "text-green-600 bg-green-50 hover:bg-green-100"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button
        variant="ghost"
        size="icon-xs"
        onClick={() => handleRate("thumbs_down")}
        disabled={isPending}
        aria-label="Thumbs down"
        aria-pressed={currentRating === "thumbs_down"}
        className={cn(
          "transition-colors",
          currentRating === "thumbs_down"
            ? "text-red-600 bg-red-50 hover:bg-red-100"
            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
};

export default SatisfactionRating;
export type { SatisfactionRatingProps };
