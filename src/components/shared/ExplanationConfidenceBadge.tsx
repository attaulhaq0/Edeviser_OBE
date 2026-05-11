import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { CheckCircle2, AlertTriangle, ShieldCheck } from "lucide-react";

export interface ExplanationConfidenceBadgeProps {
  confidence: number | null;
  isVerified: boolean;
}

const ExplanationConfidenceBadge = ({
  confidence,
  isVerified,
}: ExplanationConfidenceBadgeProps) => {
  if (isVerified) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-bold tracking-wide uppercase border-transparent",
          "bg-blue-100 text-blue-700"
        )}
        title={
          confidence !== null
            ? `Confidence: ${(confidence * 100).toFixed(0)}%`
            : undefined
        }
      >
        <ShieldCheck className="h-3 w-3" />
        Teacher verified
      </Badge>
    );
  }

  if (confidence === null) {
    return null;
  }

  if (confidence >= 0.8) {
    return (
      <Badge
        variant="outline"
        className={cn(
          "text-xs font-bold tracking-wide uppercase border-transparent",
          "bg-green-100 text-green-700"
        )}
        title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
      >
        <CheckCircle2 className="h-3 w-3" />
        Verified by course materials
      </Badge>
    );
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "text-xs font-bold tracking-wide uppercase border-transparent",
        "bg-amber-100 text-amber-700"
      )}
      title={`Confidence: ${(confidence * 100).toFixed(0)}%`}
    >
      <AlertTriangle className="h-3 w-3" />
      This explanation may need teacher verification
    </Badge>
  );
};

export { ExplanationConfidenceBadge };
export default ExplanationConfidenceBadge;
