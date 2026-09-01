// Feature: Shared assistant components (frontend-plan.md §Component set).
// Barrel per feature-area conventions — extend as Agent* components land (D3+).

export { default as EdeviserAssistantPanel } from "@/ai/components/EdeviserAssistantPanel";
export type {
  EdeviserAssistantPanelProps,
  HostedSurfaceProps,
} from "@/ai/components/EdeviserAssistantPanel";

export { default as AgentApprovalCard } from "@/ai/components/AgentApprovalCard";
export type { AgentApprovalCardProps } from "@/ai/components/AgentApprovalCard";

export { default as AgentTaskInbox } from "@/ai/components/AgentTaskInbox";
export type { AgentTaskInboxProps } from "@/ai/components/AgentTaskInbox";

export { default as AgentConversation } from "@/ai/components/AgentConversation";
export { default as AgentComposer } from "@/ai/components/AgentComposer";
export { default as AgentEvidenceDrawer } from "@/ai/components/AgentEvidenceDrawer";
export { default as AgentAutonomyControl } from "@/ai/components/AgentAutonomyControl";
export { default as AgentChatSurface } from "@/ai/components/AgentChatSurface";
export { default as InsightCardsSurface } from "@/ai/components/InsightCardsSurface";
export { default as ParentTwinSummary } from "@/ai/components/ParentTwinSummary";
export { default as AgentGovernanceCard } from "@/ai/components/AgentGovernanceCard";
export { default as AgentSourceCitation } from "@/ai/components/AgentSourceCitation";
export { default as AgentSuggestionCard } from "@/ai/components/AgentSuggestionCard";
export { default as AgentFeedbackControls } from "@/ai/components/AgentFeedbackControls";

export { default as LearningStateSummary } from "@/ai/components/LearningStateSummary";
export { default as OutcomeAlignmentSummary } from "@/ai/components/OutcomeAlignmentSummary";
