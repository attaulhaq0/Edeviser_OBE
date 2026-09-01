// Feature: Unified agent UI (tasks.md 3.1 — Wave D).
// AgentComposer: bounded message input for the assistant conversation surface.
// Guardrails: trims input, blocks empty sends, enforces a hard character cap,
// disables while a send is in flight — purely presentational; the actual edge
// call lives in the owning hook (agent-orchestrator via supabase.functions).
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send } from "lucide-react";

export const AGENT_COMPOSER_MAX_CHARS = 4000;

export interface AgentComposerProps {
  readonly onSend: (text: string) => void;
  readonly sending?: boolean;
  readonly disabled?: boolean;
  readonly placeholder?: string;
  readonly className?: string;
}

const AgentComposer = ({
  onSend,
  sending = false,
  disabled = false,
  placeholder,
  className,
}: AgentComposerProps) => {
  const { t } = useTranslation("ai");
  const [value, setValue] = useState("");
  const trimmed = value.trim();
  const overLimit = value.length > AGENT_COMPOSER_MAX_CHARS;
  const blocked = disabled || sending || trimmed.length === 0 || overLimit;

  return (
    <div className={`space-y-2 ${className ?? ""}`}>
      <Textarea
        value={value}
        onChange={(event) => setValue(event.target.value)}
        disabled={disabled || sending}
        maxLength={AGENT_COMPOSER_MAX_CHARS}
        rows={3}
        aria-label={t("composer.inputLabel", "Message input")}
        placeholder={
          placeholder ??
          t("composer.placeholder", "Ask about this page's data…")
        }
        className="resize-none text-sm"
      />
      <div className="flex items-center justify-between gap-2">
        <span
          className={`text-xs ${
            overLimit ? "font-semibold text-red-600" : "text-gray-500"
          }`}
        >
          {t("composer.lengthHint", "{{count}} / {{max}}", {
            count: value.length,
            max: AGENT_COMPOSER_MAX_CHARS,
          })}
        </span>
        <Button
          type="button"
          size="sm"
          disabled={blocked}
          onClick={() => {
            if (blocked) return;
            onSend(trimmed);
            setValue("");
          }}
        >
          <Send className="me-1.5 h-3.5 w-3.5" aria-hidden="true" />
          {sending
            ? t("composer.sending", "Sending…")
            : t("composer.send", "Send")}
        </Button>
      </div>
    </div>
  );
};

export default AgentComposer;
