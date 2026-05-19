// =============================================================================
// SessionCompletionForm — Form with: session notes textarea, EvidenceUploader,
// satisfaction rating (1–5 stars), SessionReflectionInput, Submit and Skip
// buttons. Calls useCompleteSession for the full completion flow.
// =============================================================================

import { useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import EvidenceUploader from "@/components/shared/EvidenceUploader";
import SessionReflectionInput from "@/components/shared/SessionReflectionInput";
import QuickThoughtInput from "@/components/shared/QuickThoughtInput";
import { useCompleteSession } from "@/hooks/useSessionCompletion";
import { useSaveSessionReflection } from "@/hooks/useSessionReflections";
import { cn } from "@/lib/utils";
import type { StudySession } from "@/types/planner";
import {
  Star,
  FileText,
  Loader2,
  CheckCircle2,
  Paperclip,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionCompletionFormProps {
  /** The study session being completed */
  session: StudySession;
  /** Actual duration in minutes (excluding paused time) */
  actualDurationMinutes: number;
  /** Called after successful submission or skip */
  onComplete: () => void;
  className?: string;
}

// ─── Star Rating Component ───────────────────────────────────────────────────

interface StarRatingProps {
  value: number | null;
  onChange: (rating: number) => void;
  disabled?: boolean;
}

const StarRating = ({ value, onChange, disabled }: StarRatingProps) => (
  <div
    className="flex items-center gap-1"
    role="group"
    aria-labelledby="rating-label"
  >
    {[1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={cn(
          "flex min-h-[44px] min-w-[44px] items-center justify-center rounded p-1 transition-colors",
          value !== null && star <= value
            ? "text-amber-500"
            : "text-gray-300 hover:text-amber-300",
          disabled && "cursor-not-allowed opacity-50"
        )}
        onClick={() => !disabled && onChange(star)}
        disabled={disabled}
        aria-label={`Rate ${star} star${star > 1 ? "s" : ""}`}
      >
        <Star
          className="h-6 w-6"
          fill={value !== null && star <= value ? "currentColor" : "none"}
        />
      </button>
    ))}
  </div>
);

// ─── Component ───────────────────────────────────────────────────────────────

const SessionCompletionForm = ({
  session,
  actualDurationMinutes,
  onComplete,
  className,
}: SessionCompletionFormProps) => {
  // ─── Form State ────────────────────────────────────────────────────────
  const [notes, setNotes] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [reflectionSaved, setReflectionSaved] = useState(false);
  const [quickThoughtCaptured, setQuickThoughtCaptured] = useState(false);
  const [showFullEvidence, setShowFullEvidence] = useState(false);

  // ─── Mutations ─────────────────────────────────────────────────────────
  const completeSession = useCompleteSession();
  const saveReflection = useSaveSessionReflection();

  const isSubmitting = completeSession.isPending;

  // ─── Handlers ──────────────────────────────────────────────────────────

  const handleSubmit = useCallback(() => {
    completeSession.mutate(
      {
        sessionId: session.id,
        actualDurationMinutes,
        notes: notes.trim() || null,
        satisfactionRating: rating,
        evidenceFiles: evidenceFiles.length > 0 ? evidenceFiles : undefined,
      },
      {
        onSuccess: () => {
          onComplete();
        },
      }
    );
  }, [
    completeSession,
    session.id,
    actualDurationMinutes,
    notes,
    rating,
    evidenceFiles,
    onComplete,
  ]);

  const handleSkip = useCallback(() => {
    completeSession.mutate(
      {
        sessionId: session.id,
        actualDurationMinutes,
      },
      {
        onSuccess: () => {
          onComplete();
        },
      }
    );
  }, [completeSession, session.id, actualDurationMinutes, onComplete]);

  const handleReflectionSave = useCallback(
    (content: string) => {
      saveReflection.mutate(
        {
          sessionId: session.id,
          content,
        },
        {
          onSuccess: () => {
            setReflectionSaved(true);
          },
        }
      );
    },
    [saveReflection, session.id]
  );

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <Card
      className={cn(
        "mx-auto w-full max-w-lg bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div
        className="px-6 py-4"
        style={{
          background: "var(--brand-gradient)",
        }}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 text-white" />
          <h3 className="text-lg font-bold tracking-tight text-white">
            Session Complete!
          </h3>
        </div>
        <p className="mt-1 text-sm text-white/80">
          You studied for{" "}
          <span className="font-semibold text-white">
            {actualDurationMinutes} minutes
          </span>
        </p>
      </div>

      <div className="space-y-5 p-6">
        {/* Satisfaction Rating */}
        <div>
          <span
            id="rating-label"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            How was this session?
          </span>
          <StarRating
            value={rating}
            onChange={setRating}
            disabled={isSubmitting}
          />
        </div>

        <Separator />

        {/* Session Notes */}
        <div>
          <label
            htmlFor="completion-notes"
            className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700"
          >
            <FileText className="h-4 w-4" />
            Session Notes
            <span className="text-xs text-gray-400">(optional)</span>
          </label>
          <Textarea
            id="completion-notes"
            placeholder="What did you work on? Any key takeaways?"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={isSubmitting}
            className="resize-y"
          />
        </div>

        <Separator />

        {/* Evidence — Quick Thought (primary) + optional full uploader */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Paperclip className="h-4 w-4" />
            Evidence
            <span className="text-xs text-gray-400">(optional)</span>
          </div>

          {!quickThoughtCaptured ? (
            <QuickThoughtInput
              onSubmit={(text) => {
                setNotes((prev) => (prev ? `${prev}\n\n${text}` : text));
                setQuickThoughtCaptured(true);
              }}
            />
          ) : (
            <div className="rounded-lg bg-green-50 px-3 py-2 text-xs text-green-700">
              <CheckCircle2 className="me-1 inline-block h-3.5 w-3.5" />
              Quick thought captured — added to notes above.
            </div>
          )}

          <button
            type="button"
            onClick={() => setShowFullEvidence((s) => !s)}
            className="flex items-center gap-1 text-xs font-medium text-gray-600 hover:text-gray-800"
          >
            {showFullEvidence ? (
              <ChevronUp className="h-3.5 w-3.5" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" />
            )}
            {showFullEvidence ? "Hide" : "Attach files"}
          </button>

          {showFullEvidence && (
            <EvidenceUploader
              files={evidenceFiles}
              onChange={setEvidenceFiles}
              disabled={isSubmitting}
            />
          )}
        </div>

        <Separator />

        {/* Session Reflection */}
        {reflectionSaved ? (
          <div className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Reflection saved!</span>
          </div>
        ) : (
          <SessionReflectionInput
            onSave={handleReflectionSave}
            isPending={saveReflection.isPending}
            disabled={isSubmitting}
          />
        )}

        <Separator />

        {/* Actions */}
        <div className="flex items-center gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
            onClick={handleSubmit}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin me-2" />
            ) : null}
            Submit & Finish
          </Button>
          <Button
            variant="outline"
            onClick={handleSkip}
            disabled={isSubmitting}
          >
            Skip
          </Button>
        </div>
      </div>
    </Card>
  );
};

export default SessionCompletionForm;
export type { SessionCompletionFormProps };
