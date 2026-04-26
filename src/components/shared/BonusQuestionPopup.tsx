/**
 * Task 21.4: Bonus Question Popup — Random bonus question modal with 30s timer
 */
import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  useSubmitBonusAnswer,
  type BonusQuestionResult,
} from '@/hooks/useBonusQuestion';
import { Zap, Clock, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface BonusQuestionPopupProps {
  question: BonusQuestionResult['question'];
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TIMER_SECONDS = 30;

const BonusQuestionPopup = ({
  question,
  studentId,
  open,
  onOpenChange,
}: BonusQuestionPopupProps) => {
  const [secondsLeft, setSecondsLeft] = useState(TIMER_SECONDS);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [result, setResult] = useState<{ correct: boolean; xp: number } | null>(null);
  const submitAnswer = useSubmitBonusAnswer();

  // Reset state when dialog opens
  useEffect(() => {
    if (!open) return;
    const reset = () => {
      setSecondsLeft(TIMER_SECONDS);
      setSelectedAnswer(null);
      setResult(null);
    };
    // Use microtask to avoid synchronous setState in effect
    queueMicrotask(reset);
  }, [open]);

  // Countdown timer
  useEffect(() => {
    if (!open || result) return;
    if (secondsLeft <= 0) {
      onOpenChange(false);
      toast.info('Time is up! Bonus question expired.');
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [open, secondsLeft, result, onOpenChange]);

  const handleSubmit = useCallback(() => {
    if (!question || !selectedAnswer) return;
    submitAnswer.mutate(
      { questionId: question.id, answer: selectedAnswer, studentId },
      {
        onSuccess: (data) => {
          setResult({ correct: data.correct, xp: data.xp_awarded });
          if (data.correct) {
            toast.success(`Correct! +${data.xp_awarded} XP`);
          } else {
            toast.info('Not quite — better luck next time!');
          }
        },
        onError: () => toast.error('Failed to submit answer'),
      },
    );
  }, [question, selectedAnswer, studentId, submitAnswer]);

  if (!question) return null;

  const timerPercent = (secondsLeft / TIMER_SECONDS) * 100;
  const timerColor = secondsLeft <= 10 ? 'text-red-500' : 'text-amber-500';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Bonus Question!
          </DialogTitle>
          <DialogDescription>
            Answer correctly for surprise XP
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Timer */}
          {!result && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <div className={cn('flex items-center gap-1 font-medium', timerColor)}>
                  <Clock className="h-3.5 w-3.5" />
                  {secondsLeft}s
                </div>
                <span className="text-gray-400">Time remaining</span>
              </div>
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all duration-1000"
                  style={{ width: `${timerPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Question */}
          <p className="text-sm font-medium">{question.question_text}</p>

          {/* Options */}
          {!result ? (
            <div className="space-y-2">
              {question.options.map((option) => (
                <button
                  key={option.key}
                  onClick={() => setSelectedAnswer(option.key)}
                  className={cn(
                    'w-full text-start px-4 py-3 rounded-xl border text-sm font-medium transition-all',
                    selectedAnswer === option.key
                      ? 'bg-blue-50 border-blue-300 text-blue-700'
                      : 'bg-white border-gray-200 text-gray-700 hover:bg-slate-50',
                  )}
                >
                  <span className="font-bold me-2">{option.key}.</span>
                  {option.text}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 py-4">
              {result.correct ? (
                <>
                  <CheckCircle2 className="h-12 w-12 text-green-500" />
                  <p className="text-sm font-bold text-green-700">Correct!</p>
                  <Badge className="bg-amber-100 text-amber-700 text-sm">
                    +{result.xp} XP
                  </Badge>
                </>
              ) : (
                <>
                  <XCircle className="h-12 w-12 text-red-400" />
                  <p className="text-sm font-bold text-red-600">Incorrect</p>
                  <p className="text-xs text-gray-500">Better luck next time!</p>
                </>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            {!result ? (
              <Button
                onClick={handleSubmit}
                disabled={!selectedAnswer || submitAnswer.isPending}
                className="flex-1 bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
              >
                {submitAnswer.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Submit Answer
              </Button>
            ) : (
              <Button
                onClick={() => onOpenChange(false)}
                className="flex-1"
                variant="outline"
              >
                Close
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BonusQuestionPopup;
