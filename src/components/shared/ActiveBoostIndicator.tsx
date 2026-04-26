import { useEffect, useState } from 'react';
import { Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ActiveBoost } from '@/hooks/useActiveBoosts';

interface ActiveBoostIndicatorProps {
  boost: ActiveBoost;
  className?: string;
}

const formatTimeRemaining = (expiresAt: string): string => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return '0:00';
  const mins = Math.floor(diff / 60000);
  const secs = Math.floor((diff % 60000) / 1000);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const ActiveBoostIndicator = ({ boost, className }: ActiveBoostIndicatorProps) => {
  const [timeLeft, setTimeLeft] = useState(() => formatTimeRemaining(boost.expires_at));
  const [isExpired, setIsExpired] = useState(() => new Date(boost.expires_at).getTime() <= Date.now());

  useEffect(() => {
    if (isExpired) return;
    const interval = setInterval(() => {
      const expired = new Date(boost.expires_at).getTime() <= Date.now();
      if (expired) {
        setIsExpired(true);
      }
      setTimeLeft(formatTimeRemaining(boost.expires_at));
    }, 1000);
    return () => clearInterval(interval);
  }, [boost.expires_at, isExpired]);

  if (isExpired) return null;

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full bg-amber-100 border border-amber-300 px-3 py-1 text-sm font-bold text-amber-800 animate-xp-pulse',
        className,
      )}
    >
      <Zap className="h-4 w-4 fill-amber-500 text-amber-500" />
      <span>{boost.multiplier}x XP</span>
      <span className="text-amber-600 font-mono text-xs">{timeLeft}</span>
    </div>
  );
};

export default ActiveBoostIndicator;
