// =============================================================================
// ParentStudentCard — Parent view of linked student summary
// =============================================================================

import { User, TrendingUp, Flame, BookOpen } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ParentStudentCardProps {
  studentName: string;
  avatarUrl?: string;
  level: number;
  xpTotal: number;
  streak: number;
  coursesEnrolled: number;
  averageAttainment?: number;
  onClick?: () => void;
  className?: string;
}

const ParentStudentCard = ({
  studentName,
  avatarUrl,
  level,
  xpTotal,
  streak,
  coursesEnrolled,
  averageAttainment,
  onClick,
  className,
}: ParentStudentCardProps) => (
  <Card
    className={cn(
      "bg-white border-0 shadow-md rounded-xl p-4 cursor-pointer hover:shadow-lg transition-shadow",
      className
    )}
    onClick={onClick}
  >
    <div className="flex items-center gap-3">
      <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={studentName}
            className="h-full w-full object-cover"
          />
        ) : (
          <User className="h-6 w-6 text-gray-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold truncate">{studentName}</h4>
        <p className="text-xs text-gray-500">
          Level {level} · {xpTotal.toLocaleString()} XP
        </p>
      </div>
    </div>
    <div className="grid grid-cols-3 gap-2 mt-3">
      <div className="flex items-center gap-1.5 text-xs">
        <Flame className="h-3.5 w-3.5 text-orange-500" />
        <span className="font-medium">{streak}d streak</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs">
        <BookOpen className="h-3.5 w-3.5 text-blue-500" />
        <span className="font-medium">{coursesEnrolled} courses</span>
      </div>
      {averageAttainment != null && (
        <div className="flex items-center gap-1.5 text-xs">
          <TrendingUp className="h-3.5 w-3.5 text-green-500" />
          <span className="font-medium">{Math.round(averageAttainment)}%</span>
        </div>
      )}
    </div>
  </Card>
);

export default ParentStudentCard;
export type { ParentStudentCardProps };
