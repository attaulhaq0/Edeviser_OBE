// Task 139.4: Improvement Bonus Celebration component
// Uses Framer Motion + canvas-confetti, honors prefers-reduced-motion

import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { launchConfetti } from "@/lib/confetti";
import { TrendingUp, Sparkles } from "lucide-react";

interface ImprovementBonusCelebrationProps {
  cloTitle: string;
  bonusXP: number;
  previousPercent: number;
  currentPercent: number;
  onDismiss: () => void;
}

const ImprovementBonusCelebration = ({
  cloTitle,
  bonusXP,
  previousPercent,
  currentPercent,
  onDismiss,
}: ImprovementBonusCelebrationProps) => {
  const [visible, setVisible] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const confettiFired = useRef(false);

  const fireConfetti = useCallback(() => {
    if (confettiFired.current || prefersReducedMotion) return;
    confettiFired.current = true;

    void launchConfetti({
      particleCount: 40,
      spread: 60,
      origin: { x: 0.85, y: 0.85 },
      colors: ["#22c55e", "#f59e0b", "#3b82f6"],
      disableForReducedMotion: true,
    });
  }, [prefersReducedMotion]);

  useEffect(() => {
    fireConfetti();
  }, [fireConfetti]);

  useEffect(() => {
    const duration = prefersReducedMotion ? 1000 : 3000;
    const timer = setTimeout(() => {
      setVisible(false);
      onDismiss();
    }, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, prefersReducedMotion]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          role="status"
          aria-live="polite"
          initial={
            prefersReducedMotion
              ? { opacity: 1 }
              : { opacity: 0, scale: 0.8, y: 20 }
          }
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={
            prefersReducedMotion
              ? { opacity: 0 }
              : { opacity: 0, scale: 0.8, y: -20 }
          }
          transition={
            prefersReducedMotion
              ? { duration: 0.1 }
              : { type: "spring", stiffness: 300, damping: 20 }
          }
          className="fixed bottom-6 end-6 z-50 bg-white shadow-xl rounded-xl p-4 border border-green-200 max-w-sm"
        >
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-green-50">
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="flex items-center gap-1">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <p className="text-sm font-bold text-green-700">
                  Great improvement!
                </p>
              </div>
              <p className="text-xs text-gray-600 mt-0.5">
                Great improvement on {cloTitle}!
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {Math.round(previousPercent)}% → {Math.round(currentPercent)}%
              </p>
              <p className="text-sm font-bold text-amber-600 mt-1">
                +{bonusXP} XP Bonus
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ImprovementBonusCelebration;
