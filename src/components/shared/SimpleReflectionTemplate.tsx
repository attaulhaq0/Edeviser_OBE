// =============================================================================
// SimpleReflectionTemplate — 3 guided text areas for structured reflection
// =============================================================================

import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { SimpleReflectionValues } from "@/types/planner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SimpleReflectionTemplateProps {
  values: SimpleReflectionValues;
  onChange: (field: keyof SimpleReflectionValues, value: string) => void;
  disabled?: boolean;
  className?: string;
}

// ─── Field Config ────────────────────────────────────────────────────────────

const FIELDS: Array<{
  key: keyof SimpleReflectionValues;
  label: string;
  placeholder: string;
}> = [
  {
    key: "whatWentWell",
    label: "What went well?",
    placeholder: "Describe what worked during this session...",
  },
  {
    key: "whatWasChallenging",
    label: "What was challenging?",
    placeholder: "What difficulties did you encounter?",
  },
  {
    key: "whatWillChange",
    label: "What will I do differently?",
    placeholder: "How will you approach things next time?",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const SimpleReflectionTemplate = ({
  values,
  onChange,
  disabled = false,
  className,
}: SimpleReflectionTemplateProps) => {
  return (
    <div
      className={cn("space-y-4", className)}
      data-testid="simple-reflection-template"
    >
      {FIELDS.map((field) => (
        <div key={field.key} className="space-y-1.5">
          <label
            htmlFor={`simple-${field.key}`}
            className="text-sm font-medium text-gray-700"
          >
            {field.label}
          </label>
          <Textarea
            id={`simple-${field.key}`}
            placeholder={field.placeholder}
            rows={3}
            value={values[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
            disabled={disabled}
            className="resize-y"
            data-testid={`simple-${field.key}`}
          />
        </div>
      ))}
    </div>
  );
};

export default SimpleReflectionTemplate;
export type { SimpleReflectionTemplateProps };
