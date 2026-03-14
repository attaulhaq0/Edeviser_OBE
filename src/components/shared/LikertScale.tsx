import { useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';

const LIKERT_LABELS = [
  'Strongly Disagree',
  'Disagree',
  'Neutral',
  'Agree',
  'Strongly Agree',
] as const;

export interface LikertScaleProps {
  value: number | null;
  onChange: (value: number) => void;
  questionId: string;
  disabled?: boolean;
  labels?: readonly string[];
}

const LikertScale = ({
  value,
  onChange,
  questionId,
  disabled = false,
  labels = LIKERT_LABELS,
}: LikertScaleProps) => {
  const groupRef = useRef<HTMLDivElement>(null);
  const groupId = `likert-${questionId}`;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      const current = value ?? 0;
      let next: number | null = null;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        next = current < 5 ? current + 1 : 5;
        if (next < 1) next = 1;
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        next = current > 1 ? current - 1 : 1;
      }

      if (next !== null) {
        onChange(next);
        const buttons = groupRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
        buttons?.[next - 1]?.focus();
      }
    },
    [value, onChange, disabled],
  );

  return (
    <div
      ref={groupRef}
      id={groupId}
      role="radiogroup"
      aria-label="Likert scale rating"
      className="flex items-center gap-2"
      onKeyDown={handleKeyDown}
    >
      {labels.map((label, index) => {
        const optionValue = index + 1;
        const isSelected = value === optionValue;

        return (
          <button
            key={optionValue}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={label}
            tabIndex={isSelected || (value === null && index === 0) ? 0 : -1}
            disabled={disabled}
            onClick={() => !disabled && onChange(optionValue)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-lg px-3 py-2 transition-colors min-w-[72px]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2',
              isSelected
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-slate-50 text-gray-600 hover:bg-slate-100',
              disabled && 'opacity-50 cursor-not-allowed',
            )}
          >
            <span className="text-sm font-bold">{optionValue}</span>
            <span className="text-[10px] font-medium leading-tight text-center">
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

export default LikertScale;
