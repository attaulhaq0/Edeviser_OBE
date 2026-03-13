import { useEffect, useRef, useCallback, useState } from 'react';
import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const WARNING_THRESHOLD_SECONDS = 120; // 2 minutes

export interface AssessmentTimerProps {
  /** Total time in seconds */
  totalSeconds: number;
  onExpire: () => void;
  /** Whether the timer is paused */
  paused?: boolean;
}

const AssessmentTimer = ({ totalSeconds, onExpire, paused = false }: AssessmentTimerProps) => {
  const [remaining, setRemaining] = useState(totalSeconds);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;
  const expiredRef = useRef(false);

  // Pause on tab hidden via visibility API
  const [tabVisible, setTabVisible] = useState(true);

  useEffect(() => {
    const handleVisibility = () => {
      setTabVisible(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const tick = useCallback(() => {
    setRemaining((prev) => {
      if (prev <= 1) {
        if (!expiredRef.current) {
          expiredRef.current = true;
          // Defer callback to avoid setState-in-render
          queueMicrotask(() => onExpireRef.current());
        }
        return 0;
      }
      return prev - 1;
    });
  }, []);

  useEffect(() => {
    if (paused || !tabVisible || expiredRef.current) return;

    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [paused, tabVisible, tick]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const isWarning = remaining <= WARNING_THRESHOLD_SECONDS && remaining > 0;
  const isExpired = remaining === 0;

  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  return (
    <div
      role="timer"
      aria-live="polite"
      aria-label={`${minutes} minutes and ${seconds} seconds remaining`}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-bold transition-colors',
        isExpired
          ? 'bg-red-100 text-red-700'
          : isWarning
            ? 'bg-red-50 text-red-600 animate-pulse'
            : 'bg-slate-50 text-gray-700',
      )}
    >
      <Clock className={cn('h-4 w-4', isWarning && 'text-red-500')} />
      <span>{formatted}</span>
    </div>
  );
};

export default AssessmentTimer;
