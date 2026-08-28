// Feature: Task 3.1 — AgentSuggestionCard (Wave D3, 12-component set).
// Renders one proactive agent suggestion with optional evidence count and
// accept/dismiss actions. Suggestions are inert until the user acts — the
// card never executes anything itself; callbacks are owned by the host page.
import { useTranslation } from "react-i18next";

import { AgentFeedbackControls } from "@/ai/components/AgentFeedbackControls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface AgentSuggestionCardProps {
  readonly id: string;
  readonly title: string;
  readonly description?: string;
  readonly evidenceCount?: number;
  readonly onAccept?: () => void;
  readonly onDismiss?: () => void;
  readonly disabled?: boolean;
  readonly className?: string;
}

export default function AgentSuggestionCard({
  id,
  title,
  description,
  evidenceCount,
  onAccept,
  onDismiss,
  disabled = false,
  className,
}: AgentSuggestionCardProps) {
  const { t } = useTranslation("ai");

  return (
    <article
      className={className}
      aria-label={title}
      data-testid={`agent-suggestion-${id}`}
    >
      <div className="rounded-xl border border-slate-200/60 bg-white/80 p-3 backdrop-blur-xs">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-sm font-semibold">{title}</h4>
          {typeof evidenceCount === "number" && evidenceCount > 0 ? (
            <Badge variant="outline">
              {t("suggestionCard.evidence_one", "{{count}} source", {
                count: evidenceCount,
              })}
            </Badge>
          ) : null}
        </div>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
        {onAccept || onDismiss ? (
          <div className="mt-2 flex gap-2">
            {onAccept ? (
              <Button
                size="sm"
                disabled={disabled}
                onClick={onAccept}
                data-testid={`agent-suggestion-accept-${id}`}
              >
                {t("suggestionCard.accept", "Apply")}
              </Button>
            ) : null}
            {onDismiss ? (
              <Button
                size="sm"
                variant="outline"
                disabled={disabled}
                onClick={onDismiss}
                data-testid={`agent-suggestion-dismiss-${id}`}
              >
                {t("suggestionCard.dismiss", "Dismiss")}
              </Button>
            ) : null}
          </div>
        ) : null}
        <AgentFeedbackControls subjectId={`suggestion-${id}`} className="mt-2" />
      </div>
    </article>
  );
}
