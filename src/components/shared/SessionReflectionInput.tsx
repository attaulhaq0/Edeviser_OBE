// =============================================================================
// SessionReflectionInput — Textarea with live word count, minimum 30 words
// indicator, save button
// =============================================================================

import { useState, useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countWords } from "@/lib/plannerUtils";
import { Loader2, Save, BookOpen } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SessionReflectionInputProps {
  /** Minimum word count required */
  minWords?: number;
  /** Called when the reflection is saved */
  onSave: (content: string) => void;
  /** Whether the save operation is pending */
  isPending?: boolean;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Initial content value */
  defaultValue?: string;
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

const SessionReflectionInput = ({
  minWords = 30,
  onSave,
  isPending = false,
  disabled = false,
  defaultValue = "",
  className,
}: SessionReflectionInputProps) => {
  const [content, setContent] = useState(defaultValue);

  const wordCount = useMemo(() => countWords(content), [content]);
  const meetsMinimum = wordCount >= minWords;
  const hasContent = content.trim().length > 0;

  const handleSave = useCallback(() => {
    if (!meetsMinimum || isPending || disabled) return;
    onSave(content.trim());
  }, [content, meetsMinimum, isPending, disabled, onSave]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setContent(e.target.value);
    },
    []
  );

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-gray-500" />
        <label
          htmlFor="session-reflection"
          className="text-sm font-medium text-gray-700"
        >
          Session Reflection
          <span className="ms-1 text-xs text-gray-400">
            (optional, min {minWords} words)
          </span>
        </label>
      </div>

      {/* Textarea */}
      <Textarea
        id="session-reflection"
        placeholder="What did you learn? What went well? What would you do differently?"
        rows={4}
        value={content}
        onChange={handleChange}
        disabled={disabled || isPending}
        className="resize-y"
        aria-describedby="reflection-word-count"
      />

      {/* Word Count + Save */}
      <div className="flex items-center justify-between">
        {/* Word Count Indicator */}
        <div
          id="reflection-word-count"
          className={cn(
            "text-xs font-medium transition-colors",
            !hasContent
              ? "text-gray-400"
              : meetsMinimum
              ? "text-green-600"
              : "text-red-500"
          )}
          aria-live="polite"
        >
          {wordCount} / {minWords} words
          {hasContent && !meetsMinimum && (
            <span className="ms-1">({minWords - wordCount} more needed)</span>
          )}
          {meetsMinimum && <span className="ms-1">✓</span>}
        </div>

        {/* Save Button */}
        <Button
          type="button"
          size="sm"
          className="h-9 gap-1.5 bg-gradient-to-r from-teal-500 to-blue-600 active:scale-95"
          onClick={handleSave}
          disabled={!meetsMinimum || isPending || disabled}
        >
          {isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Save Reflection
        </Button>
      </div>
    </div>
  );
};

export default SessionReflectionInput;
export type { SessionReflectionInputProps };
