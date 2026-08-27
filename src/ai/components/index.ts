// Feature: Shared assistant components (frontend-plan.md §Component set).
// Barrel per feature-area conventions — extend as Agent* components land (D3+).

export { default as EdeviserAssistantPanel } from "@/ai/components/EdeviserAssistantPanel";
export type {
  EdeviserAssistantPanelProps,
  HostedSurfaceProps,
} from "@/ai/components/EdeviserAssistantPanel";

export { default as AgentApprovalCard } from "@/ai/components/AgentApprovalCard";
export type { AgentApprovalCardProps } from "@/ai/components/AgentApprovalCard";

