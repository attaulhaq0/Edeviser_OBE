// =============================================================================
// LevelUpOverlay — Full-screen level-up celebration animation
// =============================================================================

import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { TrendingUp, Star } from 'lucide-react';
import { LEVEL_THRESHOLDS } from '@/lib/xpLevelCalculator';

interface LevelUpOverlayProps {
  newLevel: number;
  onComplete?: () => void;
}

const LevelUpOverlay = ({ newLevel, onComplete }: LevelUpOverlayProps) => {
  const [visible, setVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const confettiFired = useRef(false);

  const title = LEVEL_THRESHOLDS.find((t) => t.level === newLevel)?.title ?? 'Unknown';

  const fireConfetti = useCallback(() => {
    if (confettiFired.current || prefersReducedMotion) return;
    confettiFired.current = true;

    confetti({
      particleCount: 80,
      spread: 100,
      origin: { x: 0.5, y: 0.5 },
      colors: ['#3b82f6', '#14b8a6', '#f59e0b', '#eab308'],
    });

    setTimeout(() => {
      confetti({
        particleCount: 40, angle: 60, spread: 55,
        origin: { x: 0, y: 0.6 },
        colors: ['#3b82f6', '#14b8a6'],
      });
      confetti({
        particleCount: 40, angle: 120, spread: 55,
        origin: { x: 1, y: 0.6 },
        colors: ['#f59e0b', '#eab308'],
      });
    }, 200);
  }, [prefersReducedMotion]);


  useEffect(() => { fireConfetti(); }, [fireConfetti]);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 4000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence onExitComplete={() => onComplete?.()}>
      {visible && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={() => setVisible(false)}
          role="dialog"
          aria-label={`Level up to level ${newLevel}`}
        >
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

          <motion.div
            className="relative flex flex-col items-center gap-4 p-8"
            initial={prefersReducedMotion ? undefined : { scale: 0.5, y: 30 }}
            animate={{ scale: 1, y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', damping: 12, stiffness: 200 }}
          >
            <motion.div
              className="absolute inset-0 rounded-full bg-blue-500/20 blur-3xl"
              initial={prefersReducedMotion ? undefined : { scale: 0 }}
              animate={{ scale: 2.5 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
            />

            <motion.div
              className="relative flex items-center justify-center h-28 w-28 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 shadow-2xl"
              initial={prefersReducedMotion ? undefined : { rotate: -180, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: 'spring', damping: 10, stiffness: 150, delay: 0.2 }}
            >
              <div className="flex flex-col items-center">
                <TrendingUp className="h-8 w-8 text-white mb-1" />
                <span className="text-3xl font-black text-white">{newLevel}</span>
              </div>
            </motion.div>

            <motion.div
              className="relative text-center"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.4 }}
            >
              <div className="flex items-center gap-2 justify-center mb-2">
                <Star className="h-5 w-5 text-amber-400" />
                <p className="text-[10px] font-black tracking-widest uppercase text-amber-400">
                  Level Up
                </p>
                <Star className="h-5 w-5 text-amber-400" />
              </div>
              <h2 className="text-3xl font-black text-white">Level {newLevel}</h2>
              <p className="text-lg font-semibold text-white/70 mt-1">{title}</p>
            </motion.div>

            <motion.p
              className="relative text-xs text-white/40 mt-4"
              initial={prefersReducedMotion ? undefined : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
            >
              Tap anywhere to dismiss
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LevelUpOverlay;
