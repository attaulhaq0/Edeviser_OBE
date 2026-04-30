// =============================================================================
// WeeklyReflectionPanel — Textarea with live word count (min 50 words),
// save button, creates journal_entries record on save.
// Supports reflection templates and streak indicator.
// =============================================================================

import { useCallback, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import GradientCardHeader from "@/components/shared/GradientCardHeader";
import { cn } from "@/lib/utils";
import { countWords } from "@/lib/plannerUtils";
import { BookOpen, Loader2, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useReflectionTemplates } from "@/hooks/useReflectionTemplates";
import ReflectionTemplateSelector from "@/components/shared/ReflectionTemplateSelector";
import SimpleReflectionTemplate from "@/components/shared/SimpleReflectionTemplate";
import GibbsReflectionTemplate from "@/components/shared/GibbsReflectionTemplate";
import ReflectionStreakIndicator from "@/components/shared/ReflectionStreakIndicator";

// ─── Types ───────────────────────────────────────────────────────────────────

interface WeeklyReflectionPanelProps {
  weekStartDate: string;
  onSave: (content: string) => void;
  isPending?: boolean;
  disabled?: boolean;
  reflectionStreakWeeks?: number;
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
  reflectionStreakWeeks = 0,
  className,
}: WeeklyReflectionPanelProps) => {
  const templates = useReflectionTemplates();

  const content = templates.getContent();
  const wordCount = useMemo(() => countWords(content), [content]);
  const meetsMinimum = wordCount >= MIN_WORDS;
  const hasContent = content.trim().length > 0;

  const handleSave = useCallback(() => {
    if (!meetsMinimum || isPending || disabled) return;
    onSave(content.trim());
  }, [content, meetsMinimum, isPending, disabled, onSave]);

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
        {/* Header with streak and template selector */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Take a moment to reflect on your week. What worked well? What would
            you do differently? How will you approach next week?
          </p>
          <ReflectionStreakIndicator streakWeeks={reflectionStreakWeeks} />
        </div>

        {/* Template Selector */}
        <ReflectionTemplateSelector
          value={templates.templateType}
          onChange={templates.setTemplateType}
          disabled={disabled || isPending}
        />

        {/* Template Content */}
        {templates.templateType === "free_form" && (
          <Textarea
            id="weekly-reflection"
            placeholder="Write your weekly reflection here... (minimum 50 words)"
            rows={6}
            value={templates.freeFormContent}
            onChange={(e) => templates.setFreeFormContent(e.target.value)}
            disabled={disabled || isPending}
            className="resize-y"
            aria-describedby="weekly-reflection-word-count"
            data-testid="weekly-reflection-textarea"
          />
        )}

        {templates.templateType === "simple" && (
          <SimpleReflectionTemplate
            values={templates.simpleValues}
            onChange={templates.updateSimpleField}
            disabled={disabled || isPending}
          />
        )}

        {templates.templateType === "gibbs" && (
          <GibbsReflectionTemplate
            values={templates.gibbsValues}
            onChange={templates.updateGibbsField}
            disabled={disabled || isPending}
          />
        )}

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
          XP. Quality reflections earn bonus XP.
        </p>
      </div>
    </Card>
  );
};

export default WeeklyReflectionPanel;
export type { WeeklyReflectionPanelProps };
