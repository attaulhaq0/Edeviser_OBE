import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Target, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SuggestedIntent } from '@/types/planner';

export interface SessionIntentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestedIntents: SuggestedIntent[];
  onSubmit: (concept: string, successCriterion: string, isAutoSuggested: boolean) => void;
  onSkip: () => void;
  isSubmitting?: boolean;
}

const SessionIntentDialog = ({
  open,
  onOpenChange,
  suggestedIntents,
  onSubmit,
  onSkip,
  isSubmitting = false,
}: SessionIntentDialogProps) => {
  const [concept, setConcept] = useState('');
  const [successCriterion, setSuccessCriterion] = useState('');
  const [isAutoSuggested, setIsAutoSuggested] = useState(false);

  const isValid = concept.trim().length >= 5 && successCriterion.trim().length >= 5;

  const handleSuggestionClick = (suggestion: SuggestedIntent) => {
    setConcept(suggestion.concept);
    setSuccessCriterion(suggestion.successCriterion);
    setIsAutoSuggested(true);
  };

  const handleSubmit = () => {
    if (isValid) {
      onSubmit(concept.trim(), successCriterion.trim(), isAutoSuggested);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-blue-600" />
            Set Your Intent
          </DialogTitle>
          <DialogDescription>
            What will you focus on during this session?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Auto-suggested intents */}
          {suggestedIntents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5" /> Suggestions
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestedIntents.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleSuggestionClick(s)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors',
                      concept === s.concept
                        ? 'bg-blue-50 text-blue-700 border-blue-200'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50',
                    )}
                  >
                    {s.concept}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Concept input */}
          <div className="space-y-1.5">
            <Label htmlFor="intent-concept">
              What specific concept will you work on?
            </Label>
            <Input
              id="intent-concept"
              placeholder="e.g., Understanding recursion in data structures"
              value={concept}
              onChange={(e) => {
                setConcept(e.target.value);
                setIsAutoSuggested(false);
              }}
              maxLength={200}
            />
            <p className="text-xs text-gray-400">{concept.length}/200</p>
          </div>

          {/* Success criterion input */}
          <div className="space-y-1.5">
            <Label htmlFor="intent-success">
              What does success look like for this session?
            </Label>
            <Input
              id="intent-success"
              placeholder="e.g., Solve 3 recursive problems without hints"
              value={successCriterion}
              onChange={(e) => setSuccessCriterion(e.target.value)}
              maxLength={200}
            />
            <p className="text-xs text-gray-400">{successCriterion.length}/200</p>
          </div>
        </div>

        <DialogFooter className="flex gap-2 sm:gap-0">
          <Button variant="ghost" onClick={onSkip} className="min-h-[44px]">
            Skip
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!isValid || isSubmitting}
            className="min-h-[44px] bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              'Set Intent & Start'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SessionIntentDialog;
