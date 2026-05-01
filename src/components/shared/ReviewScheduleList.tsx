// =============================================================================
// ReviewScheduleList — List of pending spaced-repetition reviews with
// Start and Skip actions per item. Shows completed/skipped reviews in a
// muted state. Empty state when no reviews exist.
// =============================================================================

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ReviewSchedule } from "@/types/planner";
import { ReviewSessionBadge } from "@/components/shared/ReviewSessionBadge";
import { Play, SkipForward, CheckCircle2, CalendarDays } from "lucide-react";

interface ReviewScheduleListProps {
  reviews: ReviewSchedule[];
  onStartReview: (review: ReviewSchedule) => void;
  onSkipReview: (reviewId: string) => void;
  isSkipping?: boolean;
}

const ReviewScheduleList = ({
  reviews,
  onStartReview,
  onSkipReview,
  isSkipping = false,
}: ReviewScheduleListProps) => {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <CalendarDays className="h-8 w-8 text-slate-300 mb-2" />
        <p className="text-sm font-medium text-slate-500">
          No reviews scheduled
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Complete study sessions linked to CLOs to generate review schedules.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2" role="list" aria-label="Review schedule">
      {reviews.map((review) => {
        const isPending = review.status === "pending";
        const isCompleted = review.status === "completed";
        const isSkipped = review.status === "skipped";

        return (
          <div
            key={review.id}
            role="listitem"
            className={cn(
              "bg-white border border-slate-200 rounded-lg p-3 transition-shadow",
              isPending && "hover:shadow-sm",
              (isCompleted || isSkipped) && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-2">
              {/* Left: Badge + Info */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <ReviewSessionBadge
                  intervalDays={review.intervalDays}
                  status={review.status}
                />

                <p
                  className={cn(
                    "text-xs font-medium text-slate-700 line-clamp-1",
                    isSkipped && "line-through text-slate-400"
                  )}
                >
                  CLO: {review.cloId}
                </p>

                {review.courseId && (
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    Course: {review.courseId}
                  </p>
                )}

                <p className="text-[11px] text-slate-400">
                  Review date: {review.reviewDate}
                </p>
              </div>

              {/* Right: Actions or Status */}
              <div className="flex items-center gap-1.5 shrink-0">
                {isPending && (
                  <>
                    <Button
                      size="sm"
                      className="h-7 gap-1 bg-gradient-to-r from-teal-500 to-blue-600 text-[11px] active:scale-95"
                      onClick={() => onStartReview(review)}
                    >
                      <Play className="h-3 w-3" />
                      Start
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 gap-1 text-[11px]"
                      onClick={() => onSkipReview(review.id)}
                      disabled={isSkipping}
                    >
                      <SkipForward className="h-3 w-3" />
                      Skip
                    </Button>
                  </>
                )}

                {isCompleted && (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed
                  </span>
                )}

                {isSkipped && (
                  <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                    <SkipForward className="h-3.5 w-3.5" />
                    Skipped
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ReviewScheduleList;
export { ReviewScheduleList };
export type { ReviewScheduleListProps };
