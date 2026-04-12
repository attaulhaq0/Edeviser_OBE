// =============================================================================
// QuizQuestionCard — Quiz question display card
// =============================================================================

import { cn } from '@/lib/utils';

interface QuizQuestionCardProps {
  questionNumber: number;
  questionText: string;
  questionType: 'mcq' | 'true_false' | 'short_answer' | 'fill_blank';
  options?: string[];
  selectedAnswer?: string;
  onAnswer: (answer: string) => void;
  points: number;
  className?: string;
}

const QuizQuestionCard = ({
  questionNumber,
  questionText,
  questionType,
  options,
  selectedAnswer,
  onAnswer,
  points,
  className,
}: QuizQuestionCardProps) => (
  <div className={cn('rounded-xl border border-slate-200 bg-white p-5 space-y-4', className)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-sm font-medium">
        <span className="text-gray-400 me-2">Q{questionNumber}.</span>
        {questionText}
      </p>
      <span className="text-xs text-gray-400 shrink-0">{points} pts</span>
    </div>

    {(questionType === 'mcq' || questionType === 'true_false') && options && (
      <div className="space-y-2">
        {options.map((opt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onAnswer(opt)}
            className={cn(
              'w-full text-start rounded-lg border px-4 py-2.5 text-sm transition-colors',
              selectedAnswer === opt
                ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50',
            )}
          >
            <span className="text-gray-400 me-2 font-medium">
              {String.fromCharCode(65 + idx)}.
            </span>
            {opt}
          </button>
        ))}
      </div>
    )}

    {(questionType === 'short_answer' || questionType === 'fill_blank') && (
      <input
        type="text"
        value={selectedAnswer ?? ''}
        onChange={(e) => onAnswer(e.target.value)}
        placeholder={questionType === 'fill_blank' ? 'Fill in the blank...' : 'Your answer...'}
        className="w-full rounded-lg border border-gray-200 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
      />
    )}
  </div>
);

export default QuizQuestionCard;
export type { QuizQuestionCardProps };
