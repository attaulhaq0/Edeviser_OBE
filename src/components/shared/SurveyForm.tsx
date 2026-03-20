// =============================================================================
// SurveyForm — Generic survey/questionnaire form
// =============================================================================

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type QuestionType = 'likert' | 'mcq' | 'text';

interface SurveyQuestion {
  id: string;
  questionText: string;
  questionType: QuestionType;
  options?: string[];
}

interface SurveyFormProps {
  title: string;
  questions: SurveyQuestion[];
  onSubmit: (responses: Record<string, string>) => Promise<void>;
  className?: string;
}

const LIKERT_OPTIONS = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];

const SurveyForm = ({ title, questions, onSubmit, className }: SurveyFormProps) => {
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const setResponse = (questionId: string, value: string) => {
    setResponses((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(responses);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn('space-y-6', className)}>
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      {questions.map((q, idx) => (
        <div key={q.id} className="space-y-2">
          <p className="text-sm font-medium">
            {idx + 1}. {q.questionText}
          </p>
          {q.questionType === 'likert' && (
            <div className="flex flex-wrap gap-2">
              {LIKERT_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setResponse(q.id, opt)}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
                    responses[q.id] === opt
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50',
                  )}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
          {q.questionType === 'mcq' && q.options && (
            <div className="space-y-1">
              {q.options.map((opt) => (
                <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Input
                    type="radio"
                    name={q.id}
                    value={opt}
                    checked={responses[q.id] === opt}
                    onChange={() => setResponse(q.id, opt)}
                    className="h-4 w-4"
                  />
                  {opt}
                </label>
              ))}
            </div>
          )}
          {q.questionType === 'text' && (
            <Textarea
              value={responses[q.id] ?? ''}
              onChange={(e) => setResponse(q.id, e.target.value)}
              placeholder="Your answer..."
              rows={3}
            />
          )}
        </div>
      ))}
      <Button
        type="submit"
        disabled={isSubmitting}
        className="bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
      >
        {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
        Submit
      </Button>
    </form>
  );
};

export default SurveyForm;
export type { SurveyFormProps, SurveyQuestion, QuestionType };
