import { Lightbulb, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface AutonomyToggleProps {
  /** Current override value: 'L1' = figure it out, 'L3' = just explain it, null = default */
  value: 'L1' | 'L3' | null;
  /** Callback when the student toggles the autonomy override */
  onChange: (value: 'L1' | 'L3' | null) => void;
  /** Whether the toggle is disabled (e.g., during streaming) */
  disabled?: boolean;
}

/**
 * Student-facing toggle for controlling AI tutor autonomy level.
 *
 * - "Figure it out" (L1): hints and guiding questions only
 * - "Just explain it" (L3): direct explanations
 * - Neither selected: uses teacher-configured default
 *
 * Persisted per conversation via the autonomy_override column.
 */
const AutonomyToggle = ({ value, onChange, disabled = false }: AutonomyToggleProps) => {
  const handleToggle = (level: 'L1' | 'L3') => {
    // If already selected, deselect (return to default)
    if (value === level) {
      onChange(null);
    } else {
      onChange(level);
    }
  };

  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Tutor help level">
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => handleToggle('L1')}
        className={cn(
          'h-8 gap-1.5 text-xs font-medium transition-all',
          value === 'L1'
            ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
            : 'text-gray-500 hover:text-gray-700',
        )}
        aria-checked={value === 'L1'}
        role="radio"
        aria-label="Figure it out — hints only"
      >
        <Lightbulb className="h-3.5 w-3.5" />
        Figure it out
      </Button>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => handleToggle('L3')}
        className={cn(
          'h-8 gap-1.5 text-xs font-medium transition-all',
          value === 'L3'
            ? 'bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100'
            : 'text-gray-500 hover:text-gray-700',
        )}
        aria-checked={value === 'L3'}
        role="radio"
        aria-label="Just explain it — direct explanations"
      >
        <BookOpen className="h-3.5 w-3.5" />
        Just explain it
      </Button>
    </div>
  );
};

export default AutonomyToggle;
