import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RotateCcw, Play, SkipForward } from 'lucide-react';
import ReviewSessionBadge from '@/components/shared/ReviewSessionBadge';
import type { ReviewSchedule } from '@/types/planner';

export interface ReviewScheduleListProps {
  reviews: ReviewSchedule[];
  onStart: (review: ReviewSchedule) => void;
  onSkip: (review: ReviewSchedule) => void;
}

const ReviewScheduleList = ({ reviews, onStart, onSkip }: ReviewScheduleListProps) => {
  const pendingReviews = reviews.filter((r) => r.status === 'pending');

  if (pendingReviews.length === 0) {
    return null;
  }

  return (
    <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
      <div
        className="px-6 py-4 flex items-center gap-2"
        style={{
          background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
        }}
      >
        <RotateCcw className="h-5 w-5 text-white" />
        <h2 className="text-lg font-bold tracking-tight text-white">
          Pending Reviews
        </h2>
      </div>
      <div className="divide-y divide-slate-100">
        {pendingReviews.map((review) => {
          const isPastDue = new Date(review.reviewDate) < new Date(new Date().toISOString().split('T')[0]!);
          return (
            <div
              key={review.id}
              className="px-6 py-3 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <ReviewSessionBadge
                  intervalDays={review.intervalDays}
                  status={review.status}
                />
                <div>
                  <p className="text-sm font-medium">
                    {review.cloTitle ?? 'CLO Review'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {review.courseName ?? 'Course'} · {review.reviewDate}
                    {isPastDue && (
                      <span className="ms-1 text-red-500 font-semibold">
                        Missed
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => onSkip(review)}
                >
                  <SkipForward className="h-3.5 w-3.5" /> Skip
                </Button>
                <Button
                  size="sm"
                  className="h-8 text-xs bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
                  onClick={() => onStart(review)}
                >
                  <Play className="h-3.5 w-3.5" /> Start
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default ReviewScheduleList;
