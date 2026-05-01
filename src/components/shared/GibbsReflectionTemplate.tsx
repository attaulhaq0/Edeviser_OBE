// =============================================================================
// GibbsReflectionTemplate — 6-stage Gibbs' Reflective Cycle template
// =============================================================================

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { GibbsReflectionValues } from "@/types/planner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface GibbsReflectionTemplateProps {
  values: GibbsReflectionValues;
  onChange: (field: keyof GibbsReflectionValues, value: string) => void;
  disabled?: boolean;
  className?: string;
}

// ─── Field Config ────────────────────────────────────────────────────────────

const FIELDS: Array<{
  key: keyof GibbsReflectionValues;
  label: string;
  placeholder: string;
  hint: string;
}> = [
  {
    key: "description",
    label: "1. Description",
    placeholder: "What happened during the session?",
    hint: "Describe the situation objectively",
  },
  {
    key: "feelings",
    label: "2. Feelings",
    placeholder: "How did you feel during and after?",
    hint: "Explore your emotional response",
  },
  {
    key: "evaluation",
    label: "3. Evaluation",
    placeholder: "What was good and bad about the experience?",
    hint: "Assess what went well and what did not",
  },
  {
    key: "analysis",
    label: "4. Analysis",
    placeholder: "Why did things go the way they did?",
    hint: "Make sense of the situation",
  },
  {
    key: "conclusion",
    label: "5. Conclusion",
    placeholder: "What else could you have done?",
    hint: "Summarize what you learned",
  },
  {
    key: "actionPlan",
    label: "6. Action Plan",
    placeholder: "What will you do differently next time?",
    hint: "Plan concrete next steps",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const GibbsReflectionTemplate = ({
  values,
  onChange,
  disabled = false,
  className,
}: GibbsReflectionTemplateProps) => {
  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="gibbs-reflection-template"
    >
      <p className="text-xs text-gray-400">
        Gibbs&apos; Reflective Cycle guides you through 6 stages of structured
        reflection for deeper learning.
      </p>
      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-1">
          <label
            htmlFor={`gibbs-${field.key}`}
            className="text-sm font-medium text-gray-700"
          >
            {field.label}
          </label>
          <p className="text-xs text-gray-400">{field.hint}</p>
          <Textarea
            id={`gibbs-${field.key}`}
            placeholder={field.placeholder}
            rows={2}
            value={values[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
            className="resize-y"
            data-testid={`gibbs-${field.key}`}
          />
        </div>
      ))}
    </div>
  );
};

export default GibbsReflectionTemplate;
export type { GibbsReflectionTemplateProps };
