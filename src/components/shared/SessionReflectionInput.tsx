// =============================================================================
// SessionReflectionInput — Textarea with live word count, minimum 30 words
// indicator, save button. Supports template selection (free-form, simple, gibbs).
// =============================================================================

import { useCallback, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { countWords } from "@/lib/plannerUtils";
import { Loader2, Save, BookOpen } from "lucide-react";
import { useReflectionTemplates } from "@/hooks/useReflectionTemplates";
import ReflectionTemplateSelector from "@/components/shared/ReflectionTemplateSelector";
import SimpleReflectionTemplate from "@/components/shared/SimpleReflectionTemplate";
import GibbsReflectionTemplate from "@/components/shared/GibbsReflectionTemplate";

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
  const templates = useReflectionTemplates();

  // Initialize free-form content with defaultValue
  useMemo(() => {
    if (defaultValue && templates.freeFormContent === "") {
      templates.setFreeFormContent(defaultValue);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue]);

  const content = templates.getContent();
  const wordCount = useMemo(() => countWords(content), [content]);
  const meetsMinimum = wordCount >= minWords;
  const hasContent = content.trim().length > 0;

  const handleSave = useCallback(() => {
    if (!meetsMinimum || isPending || disabled) return;
    onSave(content.trim());
  }, [content, meetsMinimum, isPending, disabled, onSave]);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Label + Template Selector */}
      <div className="flex items-center justify-between gap-2">
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
        <ReflectionTemplateSelector
          value={templates.templateType}
          onChange={templates.setTemplateType}
          disabled={disabled || isPending}
          className="w-48"
        />
      </div>

      {/* Template Content */}
      {templates.templateType === "free_form" && (
        <Textarea
          id="session-reflection"
          placeholder="What did you learn? What went well? What would you do differently?"
          rows={4}
          value={templates.freeFormContent}
          onChange={(e) => templates.setFreeFormContent(e.target.value)}
          disabled={disabled || isPending}
          className="resize-y"
          aria-describedby="reflection-word-count"
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
