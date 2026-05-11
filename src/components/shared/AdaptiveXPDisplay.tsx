// Task 138.1: Adaptive XP Display component
// Shows current XP multiplier, level, level multiplier, and diminishing returns indicator
// Requirements: 120.5, 122.3

import { TrendingUp, AlertTriangle, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  useStudentXPMultiplier,
  useDiminishingReturnsStatus,
} from "@/hooks/useAdaptiveXP";

interface AdaptiveXPDisplayProps {
  studentId: string;
  actionType?: string;
}

const AdaptiveXPDisplay = ({
  studentId,
  actionType = "submission",
}: AdaptiveXPDisplayProps) => {
  const { data: multiplierData } = useStudentXPMultiplier(studentId);
  const { data: diminishingData } = useDiminishingReturnsStatus(
    studentId,
    actionType
  );

  if (!multiplierData) return null;

  return (
    <div className="space-y-3">
      {/* Level & Multiplier row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge
          variant="outline"
          className="text-xs bg-blue-50 text-blue-700 border-blue-200"
        >
          <Zap className="h-3 w-3 me-1" />
          Level {multiplierData.level}
        </Badge>
        <Badge
          variant="outline"
          className="text-xs bg-amber-50 text-amber-700 border-amber-200"
        >
          <TrendingUp className="h-3 w-3 me-1" />
          {multiplierData.multiplier}x XP Multiplier
        </Badge>
      </div>

      {/* Diminishing Returns warning */}
      {diminishingData?.is_diminished && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-xs text-amber-700">
            Diminishing Returns — next action earns{" "}
            {diminishingData.next_multiplier}x XP. Try a different activity to
            earn full XP.
          </p>
        </div>
      )}
    </div>
  );
};

export default AdaptiveXPDisplay;
export type { AdaptiveXPDisplayProps };
