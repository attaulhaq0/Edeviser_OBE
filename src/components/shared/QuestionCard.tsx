import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import LikertScale from '@/components/shared/LikertScale';

export interface QuestionCardProps {
  questionText: string;
  questionNumber?: number;
  totalQuestions?: number;
  mode: 'likert' | 'radio';
  /** Radio options — required when mode is 'radio' */
  options?: string[];
  selectedValue: number | null;
  onSelect: (value: number) => void;
  disabled?: boolean;
  /** Likert scale labels override */
  likertLabels?: readonly string[];
  /** Unique question identifier for ARIA */
  questionId: string;
}

const QuestionCard = ({
  questionText,
  questionNumber,
  totalQuestions,
  mode,
  options = [],
  selectedValue,
  onSelect,
  disabled = false,
  likertLabels,
  questionId,
}: QuestionCardProps) => {
  return (
    <Card className="bg-white border-0 shadow-md rounded-xl p-6 space-y-4">
      {questionNumber != null && totalQuestions != null && (
        <p className="text-xs font-medium text-gray-400">
          Question {questionNumber} of {totalQuestions}
        </p>
      )}

      <p className="text-sm font-medium text-gray-900 leading-relaxed" id={`q-${questionId}`}>
        {questionText}
      </p>

      {mode === 'likert' && (
        <LikertScale
          value={selectedValue}
          onChange={onSelect}
          questionId={questionId}
          disabled={disabled}
          labels={likertLabels}
        />
      )}

      {mode === 'radio' && (
        <div
          role="radiogroup"
          aria-labelledby={`q-${questionId}`}
          className="space-y-2"
        >
          {options.map((option, index) => {
            const isSelected = selectedValue === index;
            return (
              <button
                key={index}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => !disabled && onSelect(index)}
                className={cn(
                  'w-full text-left rounded-lg px-4 py-3 text-sm font-medium transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-slate-50 text-gray-700 hover:bg-slate-100',
                  disabled && 'opacity-50 cursor-not-allowed',
                )}
              >
                {option}
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default QuestionCard;
