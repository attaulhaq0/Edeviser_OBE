// =============================================================================
// BonusQuestionPopup — Random bonus question modal with 30s timer
// Task 21.4
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Sparkles, Clock } from "lucide-react";
import { useSubmitBonusAnswer } from "@/hooks/useBonusQuestion";

interface BonusQuestionPopupProps {
  open: boolean;
  onClose: () => void;
  question: {
    text: string;
    type: string;
    clo_id: string | null;
    time_limit_seconds: number;
    xp_reward: number;
  };
  studentId: string;
  institutionId: string;
}

const BonusQuestionPopup = ({
  open,
  onClose,
  question,
  studentId,
  institutionId,
}: BonusQuestionPopupProps) => {
  const [answer, setAnswer] = useState("");
  const [timeLeft, setTimeLeft] = useState(question.time_limit_seconds);
  const [result, setResult] = useState<{
    correct: boolean;
    xp_awarded: number;
    feedback: string;
  } | null>(null);
  const submitAnswer = useSubmitBonusAnswer();

  // Reset state when dialog opens/closes
  const prevOpen = open;
  useEffect(() => {
    if (!prevOpen) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [prevOpen, question.time_limit_seconds]);

  const handleSubmit = useCallback(() => {
    submitAnswer.mutate(
      {
        studentId,
        institutionId,
        answer,
        cloId: question.clo_id,
      },
      {
        onSuccess: (data) => setResult(data),
      }
    );
  }, [answer, studentId, institutionId, question.clo_id, submitAnswer]);

  const timerColor = timeLeft <= 10 ? "text-red-500" : "text-gray-500";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            Bonus Question!
          </DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-600">
                +{question.xp_reward} XP reward
              </span>
              <div
                className={`flex items-center gap-1 text-sm font-mono ${timerColor}`}
              >
                <Clock className="h-4 w-4" />
                {timeLeft}s
              </div>
            </div>

            <p className="text-sm">{question.text}</p>

            <Textarea
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              rows={3}
              disabled={timeLeft === 0}
            />

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={onClose}>
                Skip
              </Button>
              <Button
                size="sm"
                disabled={
                  !answer.trim() || timeLeft === 0 || submitAnswer.isPending
                }
                onClick={handleSubmit}
                className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
              >
                {submitAnswer.isPending && (
                  <Loader2 className="h-3 w-3 animate-spin" />
                )}
                Submit
              </Button>
            </div>

            {timeLeft === 0 && (
              <p className="text-xs text-red-500 text-center">Time's up!</p>
            )}
          </div>
        ) : (
          <div className="text-center space-y-3 py-4">
            <div className={`text-4xl ${result.correct ? "" : "opacity-50"}`}>
              {result.correct ? "🎉" : "😅"}
            </div>
            <p className="text-sm font-bold">
              {result.correct ? `+${result.xp_awarded} XP!` : "No XP this time"}
            </p>
            <p className="text-xs text-gray-500">{result.feedback}</p>
            <Button size="sm" onClick={onClose}>
              Continue
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BonusQuestionPopup;
