// Task 144.4: Comeback Challenge Banner component

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Flame, X } from "lucide-react";

interface ComebackChallengeBannerProps {
  daysCompleted: number;
  streakToRestore: number;
  onDismiss: () => void;
}

const ComebackChallengeBanner = ({
  daysCompleted,
  streakToRestore,
  onDismiss,
}: ComebackChallengeBannerProps) => {
  const days = [1, 2, 3];

  return (
    <Card
      className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 shadow-md rounded-xl p-4"
      data-testid="comeback-challenge-banner"
      role="region"
      aria-label="Comeback Challenge"
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-orange-100">
            <Flame className="h-5 w-5 text-orange-500" />
          </div>
          <div>
            <p className="text-sm font-bold text-orange-800">
              Comeback Challenge
            </p>
            <p className="text-xs text-orange-600 mt-0.5">
              Complete 3 days to restore your {streakToRestore}-day streak
            </p>
            <div
              className="flex gap-2 mt-3"
              aria-label={`${daysCompleted} of 3 days completed`}
            >
              {days.map((day) => (
                <div
                  key={day}
                  data-testid={`comeback-day-${day}`}
                  aria-label={`Day ${day}${
                    day <= daysCompleted ? " completed" : ""
                  }`}
                  className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                    day <= daysCompleted
                      ? "bg-green-500 border-green-500 text-white"
                      : "bg-white border-gray-300 text-gray-400"
                  }`}
                >
                  {day}
                </div>
              ))}
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onDismiss}
          className="text-gray-400 hover:text-gray-600"
          aria-label="Dismiss comeback challenge"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};

export default ComebackChallengeBanner;
