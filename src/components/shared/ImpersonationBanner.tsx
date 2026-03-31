// Task 88.2: Impersonation banner
// Prominent top banner shown during impersonation with exit action

import { useImpersonation } from '@/hooks/useImpersonation';
import { Button } from '@/components/ui/button';
import { Eye, X } from 'lucide-react';

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const ImpersonationBanner = () => {
  const { isImpersonating, impersonatedUser, timeRemaining, stopImpersonation } = useImpersonation();

  if (!isImpersonating || !impersonatedUser) return null;

  return (
    <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between z-50">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Eye className="h-4 w-4" />
        <span>
          You are viewing as {impersonatedUser.full_name} — {impersonatedUser.role}
        </span>
        <span className="text-white/80">({formatTime(timeRemaining)} remaining)</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={stopImpersonation}
        className="text-white hover:bg-amber-600 gap-1"
      >
        <X className="h-4 w-4" />
        Exit
      </Button>
    </div>
  );
};

export default ImpersonationBanner;
