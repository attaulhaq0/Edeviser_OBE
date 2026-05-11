// Task 148.8: League Promotion Celebration component

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { type LeagueTierName, TIER_COLORS } from "@/lib/leagueTier";
import { Crown, Sparkles } from "lucide-react";

interface LeaguePromotionCelebrationProps {
  newTier: LeagueTierName;
  onDismiss: () => void;
}

const LeaguePromotionCelebration = ({
  newTier,
  onDismiss,
}: LeaguePromotionCelebrationProps) => {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const timer = setTimeout(
      () => {
        setVisible(false);
        onDismiss();
      },
      prefersReduced ? 1500 : 4000
    );
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => {
            setVisible(false);
            onDismiss();
          }}
        >
          <motion.div
            initial={{ scale: 0.5, y: 50 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.5, y: 50 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${TIER_COLORS[newTier]}`}>
                <Crown className="h-8 w-8" />
              </div>
            </div>
            <h2 className="text-xl font-black">League Promotion!</h2>
            <p className="text-gray-600 mt-1">You've been promoted to</p>
            <p className="text-2xl font-black mt-2">{newTier} League</p>
            <div className="flex items-center justify-center gap-1 mt-3">
              <Sparkles className="h-4 w-4 text-amber-500" />
              <span className="text-sm font-bold text-amber-600">
                +100 XP Bonus
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LeaguePromotionCelebration;
