// Feature: Task 3.1 — AgentFeedbackControls (Wave D3, 12-component set).
// Lightweight 👍/👎 + optional comment control used by suggestion cards and
// conversations. Emits ratings upward; persistence belongs to the host
// (agent_messages.feedback / agent_feedback via its own hooks).
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";

export type AgentFeedbackRating = "helpful" | "unhelpful";

export interface AgentFeedbackControlsProps {
  readonly subjectId: string;
  readonly onSubmit?: (rating: AgentFeedbackRating, comment?: string) => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export default function AgentFeedbackControls({
  subjectId,
  onSubmit,
  disabled = false,
  className,
}: AgentFeedbackControlsProps) {
  const { t } = useTranslation("ai");
  const [rating, setRating] = useState<AgentFeedbackRating | null>(null);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const choose = (next: AgentFeedbackRating) => {
    if (disabled || submitted) return;
    setRating(next);
  };

  const send = () => {
    if (!rating || submitted) return;
    onSubmit?.(rating, comment.trim() ? comment.trim().slice(0, 500) : undefined);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <p
        className={className}
        role="status"
        data-testid={`agent-feedback-done-${subjectId}`}
      >
        {t("feedback.thanks", "Thanks — your feedback was recorded.")}
      </p>
    );
  }

  return (
    <div className={className} data-testid={`agent-feedback-${subjectId}`}>
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant={rating === "helpful" ? "default" : "ghost"}
          aria-pressed={rating === "helpful"}
          disabled={disabled}
          onClick={() => choose("helpful")}
          aria-label={t("feedback.helpful", "Helpful")}
          data-testid={`agent-feedback-up-${subjectId}`}
        >
          👍
        </Button>
        <Button
          size="sm"
          variant={rating === "unhelpful" ? "default" : "ghost"}
          aria-pressed={rating === "unhelpful"}
          disabled={disabled}
          onClick={() => choose("unhelpful")}
          aria-label={t("feedback.unhelpful", "Not helpful")}
          data-testid={`agent-feedback-down-${subjectId}`}
        >
          👎
        </Button>
        <span className="ms-1 text-xs text-muted-foreground">
          {t("feedback.prompt", "Was this helpful?")}
        </span>
      </div>
      {rating ? (
        <div className="mt-1 flex gap-1">
          <input
            type="text"
            value={comment}
            maxLength={500}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("feedback.placeholder", "Optional comment…")}
            aria-label={t("feedback.placeholder", "Optional comment…")}
            className="h-8 w-full rounded-md border border-slate-200 bg-white/80 px-2 text-xs"
            data-testid={`agent-feedback-comment-${subjectId}`}
          />
          <Button size="sm" variant="outline" onClick={send}>
            {t("feedback.send", "Send")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
