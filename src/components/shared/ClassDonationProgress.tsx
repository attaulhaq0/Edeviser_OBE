// =============================================================================
// ClassDonationProgress — Donation progress bar with goal display
// Task 22.2
// =============================================================================

import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import {
  useContributeToDonation,
  type ClassDonation,
} from "@/hooks/useClassDonations";
import { useAuth } from "@/hooks/useAuth";

interface ClassDonationProgressProps {
  donation: ClassDonation;
}

const ClassDonationProgress = ({ donation }: ClassDonationProgressProps) => {
  const { profile } = useAuth();
  const contribute = useContributeToDonation();

  const progressPercent = useMemo(
    () =>
      Math.min(
        100,
        Math.round((donation.current_total / donation.goal_amount) * 100)
      ),
    [donation.current_total, donation.goal_amount]
  );

  const isCompleted = donation.status === "completed" || progressPercent >= 100;

  const handleContribute = () => {
    if (!profile?.id) return;
    contribute.mutate({
      donationId: donation.id,
      studentId: profile.id,
      xpAmount: 10,
    });
  };

  return (
    <Card
      className="bg-white border-0 shadow-md rounded-xl p-4"
      data-testid="class-donation-progress"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-pink-50">
          <Heart className="h-5 w-5 text-pink-500" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold">Class Donation</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {donation.resource_description}
          </p>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[10px] text-gray-500">
              <span>{donation.current_total.toLocaleString()} XP raised</span>
              <span>{donation.goal_amount.toLocaleString()} XP goal</span>
            </div>
            <div className="h-2 rounded-full bg-gray-100 overflow-hidden mt-1">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pink-400 to-rose-500 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
                data-testid="donation-progress-bar"
              />
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {progressPercent}% complete
            </p>
          </div>

          {!isCompleted && (
            <Button
              size="sm"
              variant="outline"
              className="mt-2 text-pink-600 border-pink-200 hover:bg-pink-50"
              disabled={contribute.isPending}
              onClick={handleContribute}
            >
              {contribute.isPending && (
                <Loader2 className="h-3 w-3 animate-spin" />
              )}
              <Heart className="h-3 w-3" /> Donate 10 XP
            </Button>
          )}

          {isCompleted && (
            <p className="text-xs font-bold text-green-600 mt-2">
              🎉 Goal reached!
            </p>
          )}
        </div>
      </div>
    </Card>
  );
};

export default ClassDonationProgress;
