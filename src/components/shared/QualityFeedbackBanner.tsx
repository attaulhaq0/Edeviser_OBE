// =============================================================================
// QualityFeedbackBanner — Displays quality category with improvement suggestions
// No numeric score shown — only category label and actionable feedback.
// =============================================================================

import { cn } from "@/lib/utils";
import { Sparkles, ThumbsUp, Lightbulb } from "lucide-react";
import type { QualityCategory } from "@/types/planner";

// ─── Types ───────────────────────────────────────────────────────────────────

interface QualityFeedbackBannerProps {
  category: QualityCategory;
  suggestions?: string[];
  className?: string;
}

// ─── Category Config ─────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<
  QualityCategory,
  {
    label: string;
    description: string;
    icon: typeof Sparkles;
    bgClass: string;
    textClass: string;
    borderClass: string;
  }
> = {
  thoughtful: {
    label: "Thoughtful reflection",
    description: "Great depth and originality — keep it up!",
    icon: Sparkles,
    bgClass: "bg-green-50",
    textClass: "text-green-700",
    borderClass: "border-green-200",
  },
  good_effort: {
    label: "Good effort",
    description:
      "Solid reflection. Try adding more specific examples next time.",
    icon: ThumbsUp,
    bgClass: "bg-blue-50",
    textClass: "text-blue-700",
    borderClass: "border-blue-200",
  },
  needs_detail: {
    label: "Try adding more detail",
    description:
      "Your reflection could benefit from more specific examples and deeper analysis.",
    icon: Lightbulb,
    bgClass: "bg-amber-50",
    textClass: "text-amber-700",
    borderClass: "border-amber-200",
  },
};

// ─── Component ───────────────────────────────────────────────────────────────

const QualityFeedbackBanner = ({
  category,
  suggestions = [],
  className,
}: QualityFeedbackBannerProps) => {
  const config = CATEGORY_CONFIG[category];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "rounded-lg border p-3",
        config.bgClass,
        config.borderClass,
        className
      )}
      data-testid="quality-feedback-banner"
      role="status"
      aria-label={`Reflection quality: ${config.label}`}
    >
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.textClass)} />
        <div className="space-y-1">
          <p className={cn("text-sm font-semibold", config.textClass)}>
            {config.label}
          </p>
          <p className="text-xs text-gray-600">{config.description}</p>
          {suggestions.length > 0 && (
            <ul className="mt-1.5 space-y-0.5">
              {suggestions.map((s, i) => (
                <li
                  key={i}
                  className="text-xs text-gray-500 flex items-start gap-1"
                >
                  <span className="text-gray-400">•</span>
                  {s}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};

export default QualityFeedbackBanner;
export type { QualityFeedbackBannerProps };
