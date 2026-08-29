// Feature: Unified agent UI (tasks.md 3.1 — Wave D).
// AgentConversation renders an assistant transcript for a surface host.
// Pure presentational component: messages arrive pre-validated from the
// owning hook (RLS-scoped agent_messages read via the client session).
// RTL-safe: logical spacing utilities only (ms-/me-).
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export interface AgentConversationMessage {
  readonly id: string;
  /** "user" | "agent" | "system" — anything else renders as agent. */
  readonly role: string;
  readonly content: string;
  readonly createdAt: string;
}

export interface AgentConversationProps {
  readonly messages: readonly AgentConversationMessage[];
  readonly loading?: boolean;
  readonly className?: string;
}

const isUserMessage = (role: string): boolean => role === "user";

const AgentConversation = ({
  messages,
  loading = false,
  className,
}: AgentConversationProps) => {
  const { t } = useTranslation("ai");

  return (
    <Card className={className} aria-busy={loading}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold text-gray-900">
          {t("conversation.title", "Conversation")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div
            className="space-y-2"
            aria-label={t("conversation.loading", "Loading messages")}
          >
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : messages.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-500">
            {t(
              "conversation.empty",
              "No messages yet — start the conversation above."
            )}
          </p>
        ) : (
          <ul className="space-y-3">
            {messages.map((message) => {
              const mine = isUserMessage(message.role);
              return (
                <li
                  key={message.id}
                  className={`flex flex-col ${
                    mine ? "items-end" : "items-start"
                  }`}
                >
                  <Badge
                    variant="outline"
                    className="mb-1 bg-transparent text-[10px] uppercase tracking-wide"
                  >
                    {mine
                      ? t("conversation.you", "You")
                      : t("conversation.agent", "Edeviser")}
                  </Badge>
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap rounded-xl border px-3 py-2 text-sm ${
                      mine
                        ? "ms-auto border-sky-200 bg-sky-50 text-sky-950"
                        : "me-auto border-slate-200 bg-white text-slate-800"
                    }`}
                  >
                    {message.content}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};

export default AgentConversation;
