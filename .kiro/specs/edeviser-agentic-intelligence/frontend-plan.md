# Frontend Plan — Shared Role-Aware AI Experience

## Principles

- ONE assistant system adapted by role/route/entity/permission/tools/prompts (never five chat apps).
- No large chatbot on every page: use the lightest surface that fits the page's capability row.
- Design-system based; en/ar from day one; RTL via logical props; accessible.

## Component set (`src/ai/components/`)

| Component | Purpose |
|---|---|
| EdeviserAssistantPanel | shell: mounts per page-capability row; hosts the others |
| AgentConversation | message thread for conversational surfaces |
| AgentComposer | input + suggested prompts + autonomy indicator |
| AgentSuggestionCard | low-risk suggestion (accept → next step; dismiss) |
| AgentApprovalCard | proposal review: evidence, impact, approve/reject wired to decision endpoint |
| AgentEvidenceDrawer | citations/evidence inspection with source metadata |
| AgentTaskInbox | pending proposals/tasks for approvers |
| AgentSourceCitation | inline citation chip → drawer |
| AgentAutonomyControl | user autonomy preference (lower-only) |
| AgentFeedbackControls | thumbs/correction capture → agent_feedback |
| LearningStateSummary | mastery/habits/risk snapshot from student_learning_states |
| OutcomeAlignmentSummary | CLO→PLO→ILO alignment with DERIVED labeling |

## Supporting hooks (`src/ai/hooks/`)

useAgentConversation · useAgentProposals · useProposalDecision · useProactiveCards ·
useLearningState · useAutonomyPreference · usePageCapabilities (reads the matrix registry).

## Mounting plan (Phase 3 scope first)

1. Student dashboard + course pages: Tutor entry (existing), LearningStateSummary, alignment summary.
2. Teacher course outcomes/assignments/gradebook: insight cards, at-risk context, draft feedback entry.
3. Admin outcomes/analytics/governance: hierarchy health, governance/cost panels, approval inbox.
4. Coordinator outcomes/CQI/accreditation: coverage insights, CQI drafts (Phase 5).
5. Parent dashboard/progress: simplified summaries (Phase 6).

## i18n

New namespace `ai.*` in src/locales/{en,ar}/*.json; key-parity checked via `npm run i18n:check`;
no hardcoded strings; logical props only.

## Testing

Component tests per card (render states, approve/reject flows, denial rendering); i18n snapshots;
a11y (keyboard/focus/contrast); visual regression rows added to screen-map as components land.