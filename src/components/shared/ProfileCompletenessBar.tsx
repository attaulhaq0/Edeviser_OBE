import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, ChevronRight } from 'lucide-react';

export interface ProfileCompletenessBarProps {
  completeness: number;
}

const ProfileCompletenessBar = ({ completeness }: ProfileCompletenessBarProps) => {
  const navigate = useNavigate();
  const clamped = Math.max(0, Math.min(100, completeness));

  if (clamped >= 100) {
    return (
      <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
        <CheckCircle className="h-3 w-3" />
        Profile Complete
      </Badge>
    );
  }

  return (
    <button
      type="button"
      onClick={() => navigate('/student/onboarding/complete-profile')}
      className="w-full rounded-xl bg-white shadow-md p-4 flex items-center gap-3 hover:shadow-lg transition-shadow group"
      aria-label={`Profile ${clamped}% complete. Tap to complete your profile.`}
    >
      <div className="flex-1 min-w-0 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-gray-700">Profile Completeness</span>
          <span className="text-xs font-bold text-blue-600">{clamped}%</span>
        </div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 transition-all duration-500"
            style={{ width: `${clamped}%` }}
            role="progressbar"
            aria-valuenow={clamped}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
      </div>
      <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors shrink-0" />
    </button>
  );
};

export default ProfileCompletenessBar;
