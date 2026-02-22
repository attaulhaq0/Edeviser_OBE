import { useState, useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Sparkles, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useActiveBonusEvent } from '@/hooks/useBonusEvents';

const useCountdown = (endDate: string): string => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const update = () => {
      const diff = new Date(endDate).getTime() - Date.now();
      if (diff <= 0) {
        setTimeLeft('Ended');
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [endDate]);

  return timeLeft;
};

const BonusEventBanner = () => {
  const { data: event } = useActiveBonusEvent();
  const prefersReducedMotion = useReducedMotion();

  if (!event) return null;

  return (
    <BonusEventBannerContent
      title={event.title}
      multiplier={event.multiplier}
      endsAt={event.ends_at}
      prefersReducedMotion={prefersReducedMotion ?? false}
    />
  );
};

interface BonusEventBannerContentProps {
  title: string;
  multiplier: number;
  endsAt: string;
  prefersReducedMotion: boolean;
}

const BonusEventBannerContent = ({
  title,
  multiplier,
  endsAt,
  prefersReducedMotion,
}: BonusEventBannerContentProps) => {
  const timeLeft = useCountdown(endsAt);

  const motionProps = prefersReducedMotion
    ? {}
    : {
        initial: { opacity: 0, y: -10 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      };

  return (
    <motion.div {...motionProps}>
      <div className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Sparkles className="h-5 w-5 shrink-0" />
          <span className="font-semibold text-sm">{title}</span>
          <Badge className="bg-white/20 text-white border-transparent hover:bg-white/30">
            {multiplier}x XP
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 shrink-0" />
          <span className="font-mono font-bold text-sm">{timeLeft}</span>
        </div>
      </div>
    </motion.div>
  );
};

export default BonusEventBanner;
