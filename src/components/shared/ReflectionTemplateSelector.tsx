// =============================================================================
// ReflectionTemplateSelector — Dropdown to choose reflection template type
// =============================================================================

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, List, RotateCcw } from "lucide-react";
import type { ReflectionTemplateType } from "@/types/planner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface ReflectionTemplateSelectorProps {
  value: ReflectionTemplateType;
  onChange: (value: ReflectionTemplateType) => void;
  disabled?: boolean;
  className?: string;
}

// ─── Template Options ────────────────────────────────────────────────────────

const TEMPLATE_OPTIONS: Array<{
  value: ReflectionTemplateType;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  {
    value: "free_form",
    label: "Free Form",
    description: "Write freely in your own style",
    icon: FileText,
  },
  {
    value: "simple",
    label: "Simple",
    description: "3 guided prompts: What went well, challenges, next steps",
    icon: List,
  },
  {
    value: "gibbs",
    label: "Gibbs' Cycle",
    description: "6-stage reflective cycle for deeper analysis",
    icon: RotateCcw,
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

const ReflectionTemplateSelector = ({
  value,
  onChange,
  disabled = false,
  className,
}: ReflectionTemplateSelectorProps) => {
  return (
    <div className={className}>
      <label
        htmlFor="reflection-template"
        className="text-xs font-medium text-gray-500 mb-1 block"
      >
        Reflection Template
      </label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as ReflectionTemplateType)}
        disabled={disabled}
      >
        <SelectTrigger
          id="reflection-template"
          className="w-full bg-white"
          data-testid="reflection-template-selector"
        >
          <SelectValue placeholder="Choose a template" />
        </SelectTrigger>
        <SelectContent>
          {TEMPLATE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <SelectItem key={opt.value} value={opt.value}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-gray-500" />
                  <div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <span className="ms-2 text-xs text-gray-400">
                      {opt.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};

export default ReflectionTemplateSelector;
export type { ReflectionTemplateSelectorProps };
