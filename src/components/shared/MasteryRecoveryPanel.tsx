// =============================================================================
// MasteryRecoveryPanel — 3-step recovery UI for students stuck at mastery gates
// Validates: Requirements 19.1, 19.2, 19.3, 19.4, 19.5
// =============================================================================

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { isRecoveryComplete } from "@/lib/masteryRecovery";
import {
  useRecoveryPathway,
  useCompleteRecoveryStep,
} from "@/hooks/useMasteryRecovery";
import {
  BookOpen,
  BrainCircuit,
  Users,
  CheckCircle2,
  Loader2,
  RotateCcw,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────────────────

interface MasteryRecoveryPanelProps {
  recoveryId: string;
  studentId: string;
  cloId: string;
  cloTitle: string;
  courseId: string;
  onRetryUnlocked?: () => void;
  className?: string;
}

interface RecoveryStep {
  number: number;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  required: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

const MasteryRecoveryPanel = ({
  recoveryId,
  studentId: _studentId,
  cloId,
  cloTitle,
  courseId,
  onRetryUnlocked,
  className,
}: MasteryRecoveryPanelProps) => {
  const { data: pathway, isLoading } = useRecoveryPathway(recoveryId);
  const completeStep = useCompleteRecoveryStep();

  const aiTutorCompleted = pathway?.ai_tutor_completed ?? false;
  const practiceCompleted = pathway?.practice_completed ?? false;
  const peerApplicable = pathway?.peer_suggestion_applicable ?? true;
  const peerShown = pathway?.peer_suggestion_shown ?? false;

  const retryUnlocked =
    pathway != null &&
    isRecoveryComplete({
      ai_tutor_completed: aiTutorCompleted,
      practice_completed: practiceCompleted,
    });

  const steps: RecoveryStep[] = [
    {
      number: 1,
      title: "AI Tutor Session",
      description: `Review foundational concepts for "${cloTitle}" with the AI Tutor.`,
      icon: BrainCircuit,
      completed: aiTutorCompleted,
      required: true,
    },
    {
      number: 2,
      title: "Practice Questions",
      description:
        "Complete practice questions at a lower difficulty level to rebuild understanding.",
      icon: BookOpen,
      completed: practiceCompleted,
      required: true,
    },
    {
      number: 3,
      title: "Peer Study Group",
      description: peerApplicable
        ? "Join a peer study group working on the same topic."
        : "No active study groups available for this topic.",
      icon: Users,
      completed: peerShown || !peerApplicable,
      required: false,
    },
  ];

  const handleCompleteAITutor = () => {
    completeStep.mutate(
      { recovery_id: recoveryId, step: "ai_tutor" },
      {
        onSuccess: () => toast.success("AI Tutor session marked as complete"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to update step"
          ),
      }
    );
  };

  const handleCompletePractice = () => {
    completeStep.mutate(
      { recovery_id: recoveryId, step: "practice" },
      {
        onSuccess: () => toast.success("Practice questions marked as complete"),
        onError: (err) =>
          toast.error(
            err instanceof Error ? err.message : "Failed to update step"
          ),
      }
    );
  };

  const handleRetry = () => {
    onRetryUnlocked?.();
  };

  if (isLoading) {
    return (
      <Card
        className={cn("bg-white border-0 shadow-md rounded-xl p-6", className)}
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </Card>
    );
  }

  if (!pathway) {
    return null;
  }

  return (
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
    >
      {/* Gradient header */}
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: "var(--brand-gradient)",
        }}
      >
        <RotateCcw className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Recovery Pathway
        </h2>
        <Badge className="ml-auto bg-white/20 text-white border-0 text-xs font-bold tracking-wide uppercase">
          {retryUnlocked ? "Ready to Retry" : "In Progress"}
        </Badge>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-600">
          Complete the steps below to unlock your quiz retry for{" "}
          <span className="font-semibold text-gray-900">{cloTitle}</span>.
        </p>

        {/* Steps */}
        <div className="space-y-3">
          {steps.map((step) => (
            <StepCard
              key={step.number}
              step={step}
              cloId={cloId}
              courseId={courseId}
              isCompletingStep={completeStep.isPending}
              onCompleteAITutor={handleCompleteAITutor}
              onCompletePractice={handleCompletePractice}
              peerApplicable={peerApplicable}
            />
          ))}
        </div>

        {/* Retry button */}
        <div className="pt-2">
          <Button
            onClick={handleRetry}
            disabled={!retryUnlocked}
            className={cn(
              "w-full",
              retryUnlocked
                ? "bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95 text-white"
                : "bg-gray-100 text-gray-400 cursor-not-allowed"
            )}
            aria-label={
              retryUnlocked
                ? "Retry quiz"
                : "Complete required steps to unlock retry"
            }
          >
            <RotateCcw className="h-4 w-4" />
            {retryUnlocked ? "Retry Quiz" : "Complete Steps to Unlock Retry"}
          </Button>
        </div>
      </div>
    </Card>
  );
};

// ─── StepCard ───────────────────────────────────────────────────────────────

const StepCard = ({
  step,
  cloId,
  courseId,
  isCompletingStep,
  onCompleteAITutor,
  onCompletePractice,
  peerApplicable,
}: {
  step: RecoveryStep;
  cloId: string;
  courseId: string;
  isCompletingStep: boolean;
  onCompleteAITutor: () => void;
  onCompletePractice: () => void;
  peerApplicable: boolean;
}) => {
  const Icon = step.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border p-4 transition-colors",
        step.completed
          ? "border-green-200 bg-green-50"
          : "border-slate-200 bg-slate-50"
      )}
    >
      {/* Step number / check */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
          step.completed
            ? "bg-green-500 text-white"
            : "bg-slate-200 text-gray-600"
        )}
        aria-hidden="true"
      >
        {step.completed ? <CheckCircle2 className="h-5 w-5" /> : step.number}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">{step.title}</h3>
          {!step.required && (
            <Badge
              variant="outline"
              className="text-xs text-gray-500 border-gray-300"
            >
              Optional
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-500 mt-1">{step.description}</p>

        {/* Action buttons per step */}
        {!step.completed && (
          <div className="mt-3">
            {step.number === 1 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild className="text-xs">
                  <a
                    href={`/student/ai-tutor?clo=${cloId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <BrainCircuit className="h-3.5 w-3.5" />
                    Open AI Tutor
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
                <Button
                  size="sm"
                  onClick={onCompleteAITutor}
                  disabled={isCompletingStep}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCompletingStep ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Mark Complete
                </Button>
              </div>
            )}

            {step.number === 2 && (
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" asChild className="text-xs">
                  <a
                    href={`/student/courses/${courseId}/practice?clo=${cloId}`}
                  >
                    <BookOpen className="h-3.5 w-3.5" />
                    Start Practice
                  </a>
                </Button>
                <Button
                  size="sm"
                  onClick={onCompletePractice}
                  disabled={isCompletingStep}
                  className="text-xs bg-green-600 hover:bg-green-700 text-white"
                >
                  {isCompletingStep ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  )}
                  Mark Complete
                </Button>
              </div>
            )}

            {step.number === 3 && peerApplicable && (
              <Button size="sm" variant="outline" asChild className="text-xs">
                <a
                  href={`/student/courses/${courseId}/team-challenges?clo=${cloId}`}
                >
                  <Users className="h-3.5 w-3.5" />
                  Browse Study Groups
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default MasteryRecoveryPanel;
