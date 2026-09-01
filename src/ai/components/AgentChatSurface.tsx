// Feature: Unified agent UI (tasks.md 3.1/3.3) — conversation host surface.
//
// Hosted under EdeviserAssistantPanel's "conversation" surface. Combines the
// presentational AgentConversation transcript with the AgentComposer input and
// owns the ephemeral session transcript; each send runs through the
// orchestrator (useAgentRun) which persists the run + messages server-side.
//
// Fail-closed: backend error codes render as calm in-transcript notices
// (`ai_feature_disabled` gets its own message); nothing is fabricated locally.

import { useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AgentConversation, {
  type AgentConversationMessage,
} from "@/ai/components/AgentConversation";
import AgentComposer from "@/ai/components/AgentComposer";
import { useAgentRun } from "@/ai/hooks/useAgentRun";
import type { HostedSurfaceProps } from "@/ai/components/EdeviserAssistantPanel";
import { cn } from "@/lib/utils";

const uuidish = (value: string | undefined): string | undefined =>
  value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
    ? value
    : undefined;

export interface AgentChatSurfaceProps extends HostedSurfaceProps {
  readonly className?: string;
}

const AgentChatSurface = ({ className }: AgentChatSurfaceProps) => {
  const { t } = useTranslation("ai");
  const location = useLocation();
  const params = useParams();
  const [messages, setMessages] = useState<AgentConversationMessage[]>([]);
  const run = useAgentRun({
    route: location.pathname,
    studentId: uuidish(params.studentId),
    courseId: uuidish(params.courseId),
    programId: uuidish(params.programId),
  });

  const send = (text: string): void => {
    const now = new Date().toISOString();
    setMessages((previous) => [
      ...previous,
      { id: `u-${now}`, role: "user", content: text, createdAt: now },
    ]);
    run.mutate(text, {
      onSuccess: (result) => {
        setMessages((previous) => [
          ...previous,
          {
            id: `a-${new Date().toISOString()}`,
            role: "agent",
            content: result.response,
            createdAt: new Date().toISOString(),
          },
        ]);
      },
    });
  };

  const featureDisabled = run.error?.code === "ai_feature_disabled";

  return (
    <div className={cn("space-y-3", className)}>
      <AgentConversation messages={messages} loading={run.isPending} />
      {run.isError ? (
        <p
          role="alert"
          className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800"
        >
          {featureDisabled
            ? t("chatSurface.featureDisabled")
            : t("chatSurface.error")}
        </p>
      ) : null}
      <AgentComposer onSend={send} sending={run.isPending} />
    </div>
  );
};

export default AgentChatSurface;
