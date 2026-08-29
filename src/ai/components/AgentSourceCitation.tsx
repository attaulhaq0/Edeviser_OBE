// =============================================================================
// AgentSourceCitation — bounded citation chip for evidence-backed agent output
// =============================================================================
// Feature: Unified UI components (tasks.md 3.1 — Wave D).
// Renders a numbered citation for one evidence source. The label is derived
// from a closed table allowlist; unknown sources render their raw identifier
// in monospace instead of a fabricated friendly name (no hallucinated labels).

import { FileSearch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AgentSourceCitationProps {
  /** 1-based citation number as shown in the message/evidence list. */
  readonly index: number;
  /** Backing table identifier (e.g. "grades", "student_learning_states"). */
  readonly source: string;
  /** Optional row pointer shown in the tooltip (never trusted for routing). */
  readonly rowHint?: string;
  readonly className?: string;
}

// Closed allowlist of localizable evidence tables. Extend alongside the
// capability registry's evidenceSources — unknown values fall back to raw id.
const LOCALIZED_SOURCES: ReadonlySet<string> = new Set([
  "grades",
  "submissions",
  "assignments",
  "clos",
  "sub_clos",
  "plos",
  "ilos",
  "outcome_mappings",
  "student_learning_states",
  "learning_interventions",
  "agent_action_proposals",
  "agent_messages",
  "attendance",
  "proactive_agent_jobs",
  "course_material_embeddings",
  "rag_chunks",
]);

const AgentSourceCitation = ({
  index,
  source,
  rowHint,
  className,
}: AgentSourceCitationProps) => {
  const { t } = useTranslation("ai");
  const known = LOCALIZED_SOURCES.has(source);
  const label = known
    ? t(`evidence.sources.${source}`, { defaultValue: source })
    : source;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="outline"
            className={cn(
              "gap-1 bg-transparent font-normal text-xs",
              className
            )}
            data-citation-source={source}
          >
            <FileSearch className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span>[{index}]</span>
            <span
              className={cn(
                "max-w-40 truncate",
                !known && "font-mono text-[11px]"
              )}
            >
              {label}
            </span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-64 text-xs">
          <p className="font-medium">{label}</p>
          {rowHint ? <p className="font-mono opacity-70">{rowHint}</p> : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default AgentSourceCitation;
