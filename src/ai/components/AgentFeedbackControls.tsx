// =============================================================================
// AgentFeedbackControls — human quality signal for agent output (thumbs)
// =============================================================================
// Feature: Unified UI components (tasks.md 3.1 — Wave D).
// Maps 👍/👎 onto the bounded 1–5 rating accepted by useAgentFeedback
// (author-scoped RLS insert; the backend treats this as a pure quality
// signal — it never mutates official records). Errors surface via Sonner.

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAgentFeedback } from "@/ai/hooks/useAgentFeedback";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentFeedbackControlsProps {
  /** Link the rating to a specific orchestrator run. */
  readonly runId?: string;
  /** Link the rating to a specific conversation message. */
  readonly messageId?: string;
  readonly className?: string;
}

const RATING_HELPFUL = 5;
const RATING_NOT_HELPFUL = 2;

const AgentFeedbackControls = ({
  runId,
  messageId,
  className,
}: AgentFeedbackControlsProps) => {
  const { t } = useTranslation("ai");
  const [submitted, setSubmitted] = useState<1 | 2 | 5 | null>(null);

  const feedback = useAgentFeedback({
    onSuccess: () => {
      toast.success(t("feedback.recorded"));
    },
    onError: () => {
      // Reset the latched choice so BOTH controls re-enable for retry — the
      // failed attempt recorded nothing (Wave D review).
      setSubmitted(null);
      toast.error(t("feedback.failed"));
    },
  });

  const submit = (rating: 2 | 5) => {
    if (submitted !== null || feedback.isPending) return;
    setSubmitted(rating);
    feedback.mutate({ rating, runId, messageId });
  };

  return (
    <div
      className={cn("flex items-center gap-1", className)}
      role="group"
      aria-label={t("feedback.groupLabel")}
    >
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          submitted === RATING_HELPFUL && "text-emerald-600"
        )}
        disabled={submitted !== null || feedback.isPending}
        onClick={() => submit(RATING_HELPFUL)}
        aria-pressed={submitted === RATING_HELPFUL}
      >
        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{t("feedback.helpful")}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          submitted === RATING_NOT_HELPFUL && "text-rose-600"
        )}
        disabled={submitted !== null || feedback.isPending}
        onClick={() => submit(RATING_NOT_HELPFUL)}
        aria-pressed={submitted === RATING_NOT_HELPFUL}
      >
        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
        <span className="sr-only">{t("feedback.notHelpful")}</span>
      </Button>
    </div>
  );
};

export default AgentFeedbackControls;
