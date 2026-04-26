import type { ClassDonation } from '@/hooks/useClassDonations';

interface ClassDonationProgressProps {
  donation: ClassDonation;
}

const ClassDonationProgress = ({ donation }: ClassDonationProgressProps) => {
  const percentage = donation.goal_amount > 0
    ? Math.min(100, Math.round((donation.current_total / donation.goal_amount) * 100))
    : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold tracking-tight line-clamp-1">{donation.resource_description}</p>
        <span className="text-xs font-medium text-gray-500">{percentage}%</span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
          }}
        />
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{donation.current_total.toLocaleString()} XP raised</span>
        <span>Goal: {donation.goal_amount.toLocaleString()} XP</span>
      </div>
    </div>
  );
};

export default ClassDonationProgress;
