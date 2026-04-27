// =============================================================================
// WeeklyReflectionPanel — Textarea with live word count (min 50 words),
// save button, creates journal_entries record on save
// =============================================================================

import { useState, useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import { countWords } from "@/lib/plannerUtils";
import { BookOpen, Loader2, Save } from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeeklyReflectionPanelProps {
  weekStartDate: string;
  onSave: (content: string) => void;
  isPending?: boolean;
  disabled?: boolean;
  className?: string;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_WORDS = 50;

// ─── Component ───────────────────────────────────────────────────────────────

const WeeklyReflectionPanel = ({
  weekStartDate: _weekStartDate,
  onSave,
  isPending = false,
  disabled = false,
  className,
}: WeeklyReflectionPanelProps) => {
  const [content, setContent] = useState("");

  const wordCount = useMemo(() => countWords(content), [content]);
  const meetsMinimum = wordCount >= MIN_WORDS;
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
    <Card
      className={cn(
        "bg-white border-0 shadow-md rounded-xl overflow-hidden",
        className
      )}
      data-testid="weekly-reflection-panel"
    >
      <GradientCardHeader icon={BookOpen} title="Weekly Reflection" />

      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">
          Take a moment to reflect on your week. What worked well? What would
          you do differently? How will you approach next week?
        </p>

        {/* Textarea */}
        <Textarea
          id="weekly-reflection"
          placeholder="Write your weekly reflection here... (minimum 50 words)"
          rows={6}
          value={content}
          onChange={handleChange}
          disabled={disabled || isPending}
          className="resize-y"
          aria-describedby="weekly-reflection-word-count"
          data-testid="weekly-reflection-textarea"
        />

        {/* Word Count + Save */}
        <div className="flex items-center justify-between">
          {/* Word Count Indicator */}
          <div
            id="weekly-reflection-word-count"
            className={cn(
              "text-xs font-medium transition-colors",
              !hasContent
                ? "text-gray-400"
                : meetsMinimum
                ? "text-green-600"
                : "text-red-500"
            )}
            aria-live="polite"
            data-testid="word-count-indicator"
          >
            {wordCount} / {MIN_WORDS} words
            {hasContent && !meetsMinimum && (
              <span className="ms-1">
                ({MIN_WORDS - wordCount} more needed)
              </span>
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
            data-testid="save-reflection-button"
          >
            {isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save Reflection
          </Button>
        </div>

        {/* XP hint */}
        <p className="text-xs text-gray-400">
          Saving your weekly reflection creates a journal entry and awards 20
          XP.
        </p>
      </div>
    </Card>
  );
};

export default WeeklyReflectionPanel;
export type { WeeklyReflectionPanelProps };
