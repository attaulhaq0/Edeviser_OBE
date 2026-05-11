// =============================================================================
// TutorEntryButton — Contextual "Ask Tutor" button for entry points
// =============================================================================

import { useNavigate } from "react-router-dom";
import { Bot, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface TutorEntryButtonProps {
  courseId?: string;
  cloIds?: string[];
  assignmentId?: string;
  /** Compact mode shows just an icon button */
  compact?: boolean;
  /** Custom label text */
  label?: string;
  className?: string;
}

const TutorEntryButton = ({
  courseId,
  cloIds,
  assignmentId,
  compact = false,
  label = "Ask Tutor",
  className,
}: TutorEntryButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const params = new URLSearchParams();
    if (courseId) params.set("courseId", courseId);
    if (assignmentId) params.set("assignmentId", assignmentId);
    if (cloIds && cloIds.length > 0) params.set("cloIds", cloIds.join(","));

    const queryString = params.toString();
    const path = `/student/tutor${queryString ? `?${queryString}` : ""}`;
    navigate(path);
  };

  if (compact) {
    return (
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={handleClick}
        aria-label={label}
        className={cn(
          "text-teal-600 hover:text-teal-700 hover:bg-teal-50",
          className
        )}
      >
        <MessageSquare className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      className={cn(
        "bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 transition-transform duration-100",
        className
      )}
      aria-label={label}
    >
      <Bot className="h-4 w-4" />
      {label}
    </Button>
  );
};

export default TutorEntryButton;
export type { TutorEntryButtonProps };
