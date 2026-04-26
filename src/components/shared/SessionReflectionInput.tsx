import { Check, PenLine } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { countWords } from '@/lib/plannerUtils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SessionReflectionInputProps {
  /** Current reflection text (controlled). */
  value: string;
  /** Called when the user types in the textarea. */
  onChange: (value: string) => void;
  /** Called when the user clicks Save. Receives the current text. */
  onSave?: (content: string) => void;
  /** Minimum word count required before saving is allowed. @default 30 */
  minWords?: number;
  /** Textarea placeholder text. */
  placeholder?: string;
  /** Disables the save button while a submission is in progress. */
  isSubmitting?: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SessionReflectionInput = ({
  value,
  onChange,
  onSave,
  minWords = 30,
  placeholder = 'Reflect on your session (minimum 30 words)…',
  isSubmitting = false,
}: SessionReflectionInputProps) => {
  const wordCount = countWords(value);
  const meetsMinimum = wordCount >= minWords;

  return (
    <div className="space-y-2" data-testid="session-reflection-input">
      {/* Label */}
      <div className="flex items-center gap-1.5 text-sm font-medium">
        <PenLine className="h-4 w-4 text-gray-500" />
        <span>Reflection</span>
      </div>

      {/* Textarea */}
      <Textarea
        placeholder={placeholder}
        className="resize-none"
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Session reflection"
        aria-describedby="reflection-word-count"
      />

      {/* Footer: word count + save button */}
      <div className="flex items-center justify-between">
        {/* Word count indicator */}
        <p
          id="reflection-word-count"
          className={cn(
            'flex items-center gap-1 text-xs font-medium transition-colors',
            meetsMinimum ? 'text-green-600' : 'text-gray-400',
          )}
        >
          {meetsMinimum && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
          <span>
            {wordCount} / {minWords} words
          </span>
        </p>

        {/* Save button */}
        {onSave && (
          <Button
            type="button"
            size="sm"
            disabled={!meetsMinimum || isSubmitting}
            onClick={() => onSave(value)}
            className={cn(
              'min-h-[44px] min-w-[44px] font-semibold transition-all',
              meetsMinimum
                ? 'bg-gradient-to-r from-teal-500 to-blue-600 text-white shadow-md active:scale-95'
                : '',
            )}
          >
            {isSubmitting ? 'Saving…' : 'Save Reflection'}
          </Button>
        )}
      </div>
    </div>
  );
};

export default SessionReflectionInput;
