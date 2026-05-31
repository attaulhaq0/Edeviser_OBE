// =============================================================================
// AutonomyToggle — Student-facing "Figure it out" / "Just explain it" toggle
// =============================================================================

import { Lightbulb, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AutonomyToggleProps {
  /** Current autonomy override: L1, L3, or null (use default) */
  value: "L1" | "L3" | null;
  /** Called when the student toggles the autonomy level */
  onChange: (level: "L1" | "L3" | null) => void;
  /** Disable the toggle (e.g., when rate limit reached) */
  disabled?: boolean;
}

const AutonomyToggle = ({
  value,
  onChange,
  disabled = false,
}: AutonomyToggleProps) => {
  const { t } = useTranslation("ai");

  const handleClick = (level: "L1" | "L3") => {
    if (disabled) return;
    // Clicking the active button deselects it (sets to null = use default)
    onChange(value === level ? null : level);
  };

  return (
    <div
      className="flex items-center gap-1"
      role="radiogroup"
      aria-label={t("tutor.autonomy.groupLabel")}
    >
      <Button
        variant="outline"
        size="sm"
        role="radio"
        aria-checked={value === "L1"}
        aria-label={t("tutor.autonomy.figureItOutLabel")}
        disabled={disabled}
        onClick={() => handleClick("L1")}
        className={cn(
          "gap-1 text-xs h-7 px-2 transition-colors",
          value === "L1"
            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        )}
      >
        <Lightbulb className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {t("tutor.autonomy.figureItOut")}
        </span>
      </Button>

      <Button
        variant="outline"
        size="sm"
        role="radio"
        aria-checked={value === "L3"}
        aria-label={t("tutor.autonomy.justExplainLabel")}
        disabled={disabled}
        onClick={() => handleClick("L3")}
        className={cn(
          "gap-1 text-xs h-7 px-2 transition-colors",
          value === "L3"
            ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:text-white"
            : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
        )}
      >
        <BookOpen className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">
          {t("tutor.autonomy.justExplain")}
        </span>
      </Button>
    </div>
  );
};

export default AutonomyToggle;
export type { AutonomyToggleProps };
