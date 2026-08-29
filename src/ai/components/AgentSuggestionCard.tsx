// =============================================================================
// AgentSuggestionCard — one proactive-intelligence recommendation (3.5)
// =============================================================================
// Feature: Unified UI components (tasks.md 3.1/3.5 — Wave D).
// Renders one row of the actor-scoped get_my_proactive_intelligence_v1 feed
// (useProactiveSuggestions). Deterministic evidence only: the recommendation
// text is server-generated from a completed job's evidence packet; the card
// never extrapolates. Pending proposals attached to the originating run deep-
// link the approver to the inbox card below.

import { Lightbulb, ShieldQuestion } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PCard } from "@/design-system";
import type { ProactiveSuggestion } from "@/ai/hooks/useProactiveSuggestions";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentSuggestionCardProps {
  readonly suggestion: ProactiveSuggestion;
  /** Scroll/focus the inbox card for a linked pending proposal. */
  readonly onOpenProposal?: (proposalId: string) => void;
  readonly className?: string;
}

// Closed trigger-key label allowlist — unknown keys render the raw key.
const TRIGGER_KEYS: ReadonlySet<string> = new Set([
  "student_risk_elevated",
  "streak_broken",
  "mastery_decline",
  "late_submission_pattern",
  "mapping_gap_detected",
  "attainment_gap",
  "intervention_due",
]);

const AgentSuggestionCard = ({
  suggestion,
  onOpenProposal,
  className,
}: AgentSuggestionCardProps) => {
  const { t } = useTranslation("ai");
  const knownTrigger = TRIGGER_KEYS.has(suggestion.triggerKey);
  const triggerLabel = knownTrigger
    ? t(`suggestionTriggers.${suggestion.triggerKey}`, {
        defaultValue: suggestion.triggerKey,
      })
    : suggestion.triggerKey;

  return (
    <PCard className={className} data-suggestion-id={suggestion.id}>
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-slate-200/60 bg-white/80 backdrop-blur-xs">
          <Lightbulb className="h-4 w-4 text-amber-500" aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-transparent text-[11px] font-normal"
            >
              {triggerLabel}
            </Badge>
            <span className="text-[11px] text-muted-foreground">
              {t("suggestions.completedAt", {
                val: new Date(suggestion.completedAt),
                formatParams: {
                  val: { weekday: "short", day: "numeric", month: "short" },
                },
              })}
            </span>
          </div>
          <p className="text-sm leading-relaxed text-foreground">
            {suggestion.recommendation}
          </p>
          {suggestion.pendingProposals.length > 0 ? (
            <div className="space-y-1.5 rounded-md border border-slate-200/60 bg-slate-50/60 p-2">
              <p className="flex items-center gap-1.5 text-xs font-medium text-slate-700">
                <ShieldQuestion className="h-3.5 w-3.5" aria-hidden="true" />
                {t("suggestions.pendingProposals")}
              </p>
              {suggestion.pendingProposals.map((proposal) => (
                <div
                  key={proposal.id}
                  className="flex items-center justify-between gap-2"
                >
                  <span className="truncate font-mono text-[11px] text-muted-foreground">
                    {proposal.actionType}
                  </span>
                  {onOpenProposal ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 px-2 text-[11px]"
                      onClick={() => onOpenProposal(proposal.id)}
                    >
                      {t("suggestions.review")}
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </PCard>
  );
};

export default AgentSuggestionCard;
