import { cn } from "@/lib/utils";

export interface QuestionQualityIndicatorProps {
  qualityFlag: "good" | "low_discrimination" | "too_easy" | "too_hard" | null;
  className?: string;
}

const getQualityConfig = (
  flag: QuestionQualityIndicatorProps["qualityFlag"]
) => {
  switch (flag) {
    case "too_hard":
      return {
        dotColor: "bg-red-500",
        textColor: "text-red-700",
        label: "Too Hard",
      };
    case "low_discrimination":
      return {
        dotColor: "bg-yellow-500",
        textColor: "text-yellow-700",
        label: "Low Discrimination",
      };
    case "too_easy":
      return {
        dotColor: "bg-yellow-500",
        textColor: "text-yellow-700",
        label: "Too Easy",
      };
    case "good":
    default:
      return {
        dotColor: "bg-green-500",
        textColor: "text-green-700",
        label: "Good",
      };
  }
};

const QuestionQualityIndicator = ({
  qualityFlag,
  className,
}: QuestionQualityIndicatorProps) => {
  const { dotColor, textColor, label } = getQualityConfig(qualityFlag);

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className={cn("h-2 w-2 shrink-0 rounded-full", dotColor)} />
      <span className={cn("text-xs font-medium", textColor)}>{label}</span>
    </span>
  );
};

export { QuestionQualityIndicator };
export default QuestionQualityIndicator;
