// =============================================================================
// TutorStatePanel — Renders a distinct panel per non-ready TutorUiState (R4)
// =============================================================================
//
// Consumes the discriminated `TutorUiState` produced by `mapTutorError`
// (src/lib/tutorStatus.ts) and renders an actionable panel for each non-ready
// state: unavailable, not_enrolled, no_embeddings, rate_limited, and the
// guaranteed `error` fallback (R4.2, R4.2a, R4.3, R4.4). All copy is routed
// through i18next (en + ar). The `ready` state renders nothing so the live
// chat surface shows through.

import { useTranslation } from "react-i18next";
import { AlertTriangle, BookOpen, Clock, Lock, WifiOff } from "lucide-react";
import ErrorState from "@/components/shared/ErrorState";
import type { TutorUiState } from "@/lib/tutorStatus";

interface TutorStatePanelProps {
  state: TutorUiState;
  /** Retry handler offered on recoverable states. */
  onRetry?: () => void;
}

const TutorStatePanel = ({ state, onRetry }: TutorStatePanelProps) => {
  const { t } = useTranslation("ai");

  if (state.kind === "ready") {
    return null;
  }

  const retryLabel = t("tutor.states.retry");

  switch (state.kind) {
    case "unavailable":
      return (
        <ErrorState
          title={t("tutor.states.unavailable.title")}
          message={t("tutor.states.unavailable.message")}
          icon={<WifiOff className="h-8 w-8 text-red-500" />}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      );

    case "not_enrolled":
      return (
        <ErrorState
          title={t("tutor.states.notEnrolled.title")}
          message={t("tutor.states.notEnrolled.message")}
          icon={<Lock className="h-8 w-8 text-amber-500" />}
        />
      );

    case "no_embeddings":
      return (
        <ErrorState
          title={t("tutor.states.noEmbeddings.title")}
          message={t("tutor.states.noEmbeddings.message")}
          icon={<BookOpen className="h-8 w-8 text-blue-500" />}
        />
      );

    case "rate_limited":
      return (
        <ErrorState
          title={t("tutor.states.rateLimited.title")}
          message={
            state.resetHint
              ? `${t("tutor.states.rateLimited.message")} ${t(
                  "tutor.states.rateLimited.reset",
                  { hint: state.resetHint }
                )}`
              : t("tutor.states.rateLimited.message")
          }
          icon={<Clock className="h-8 w-8 text-amber-500" />}
        />
      );

    case "error":
    default: {
      const message =
        state.kind === "error" && state.message.trim().length > 0
          ? state.message
          : t("tutor.states.error.message");
      return (
        <ErrorState
          title={t("tutor.states.error.title")}
          message={message}
          icon={<AlertTriangle className="h-8 w-8 text-red-500" />}
          onRetry={onRetry}
          retryLabel={retryLabel}
        />
      );
    }
  }
};

export default TutorStatePanel;
export type { TutorStatePanelProps };
