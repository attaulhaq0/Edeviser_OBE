// =============================================================================
// AIFeedbackThumbs — Thumbs up/down feedback for AI suggestions
// =============================================================================

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

type FeedbackValue = "thumbs_up" | "thumbs_down" | null;

interface AIFeedbackThumbsProps {
  feedbackId: string;
  currentFeedback: FeedbackValue;
  onFeedback: (feedback: "thumbs_up" | "thumbs_down") => Promise<void>;
}

// ─── Component ───────────────────────────────────────────────────────────────

const AIFeedbackThumbs = ({
  feedbackId,
  currentFeedback,
  onFeedback,
}: AIFeedbackThumbsProps) => {
  const [submitting, setSubmitting] = useState<
    "thumbs_up" | "thumbs_down" | null
  >(null);

  const handleClick = async (value: "thumbs_up" | "thumbs_down") => {
    if (currentFeedback === value || submitting) return;
    setSubmitting(value);
    try {
      await onFeedback(value);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label="Rate this suggestion"
    >
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-full transition-colors",
          currentFeedback === "thumbs_up"
            ? "bg-green-100 text-green-600 hover:bg-green-100"
            : "text-gray-400 hover:text-green-600 hover:bg-green-50"
        )}
        onClick={() => handleClick("thumbs_up")}
        disabled={submitting !== null}
        aria-label="Thumbs up"
        aria-pressed={currentFeedback === "thumbs_up"}
        data-feedback-id={feedbackId}
      >
        {submitting === "thumbs_up" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsUp className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 w-8 p-0 rounded-full transition-colors",
          currentFeedback === "thumbs_down"
            ? "bg-red-100 text-red-600 hover:bg-red-100"
            : "text-gray-400 hover:text-red-600 hover:bg-red-50"
        )}
        onClick={() => handleClick("thumbs_down")}
        disabled={submitting !== null}
        aria-label="Thumbs down"
        aria-pressed={currentFeedback === "thumbs_down"}
        data-feedback-id={feedbackId}
      >
        {submitting === "thumbs_down" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ThumbsDown className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

export default AIFeedbackThumbs;
export type { AIFeedbackThumbsProps, FeedbackValue };
