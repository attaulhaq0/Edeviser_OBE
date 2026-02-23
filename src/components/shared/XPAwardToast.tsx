import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Star, TrendingUp } from 'lucide-react';

interface XPAwardToastProps {
  xpAmount: number;
  source: string;
  levelUp?: boolean;
  newLevel?: number;
  onComplete?: () => void;
}

const useCountUp = (target: number, duration: number = 600): number => {
  const prefersReducedMotion = useReducedMotion();
  const [count, setCount] = useState(prefersReducedMotion ? target : 0);

  useEffect(() => {
    if (prefersReducedMotion || target <= 0) return;

    let rafId: number;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic for a satisfying deceleration
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, prefersReducedMotion]);

  return count;
};

const XPAwardToast = ({
  xpAmount,
  source,
  levelUp = false,
  newLevel,
  onComplete,
}: XPAwardToastProps) => {
  const [visible, setVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const confettiFired = useRef(false);
  const count = useCountUp(xpAmount);

  const fireConfetti = useCallback(() => {
    if (confettiFired.current || prefersReducedMotion) return;
    confettiFired.current = true;

    confetti({
      particleCount: 30,
      spread: 60,
      origin: { y: 0.8 },
      colors: ['#f59e0b', '#eab308', '#fbbf24'],
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleExitComplete = () => {
    onComplete?.();
  };

  return (
    <AnimatePresence onExitComplete={handleExitComplete}>
      {visible && (
        <motion.div
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
          animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="bg-white border-0 shadow-lg rounded-xl p-4 w-64"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Star className="h-5 w-5 text-amber-500 animate-xp-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-black text-amber-500">+{count} XP</p>
              <p className="text-xs text-gray-500 truncate">{source}</p>
            </div>
          </div>

          {levelUp && newLevel != null && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-blue-600">
                Level Up! → Level {newLevel}
              </span>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default XPAwardToast;
