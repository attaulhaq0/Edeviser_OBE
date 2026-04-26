import { Coins } from 'lucide-react';
import { useXPBalance } from '@/hooks/useXPBalance';
import { cn } from '@/lib/utils';

interface XPBalanceBadgeProps {
  studentId: string;
  className?: string;
  size?: 'sm' | 'md';
}

const XPBalanceBadge = ({ studentId, className, size = 'md' }: XPBalanceBadgeProps) => {
  const { data: balance, isLoading } = useXPBalance(studentId);

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-amber-50 border border-amber-200 font-bold text-amber-700',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        className,
      )}
    >
      <Coins className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {isLoading ? (
        <span className="w-8 h-3 rounded animate-shimmer" />
      ) : (
        <span>{(balance ?? 0).toLocaleString()} XP</span>
      )}
    </div>
  );
};

export default XPBalanceBadge;
