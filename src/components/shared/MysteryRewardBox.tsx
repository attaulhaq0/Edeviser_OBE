// =============================================================================
// MysteryRewardBox — Unboxing animation with reward reveal
// Task 21.5
// =============================================================================

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Gift, Sparkles, Loader2 } from "lucide-react";
import {
  useResolveMysteryReward,
  type MysteryRewardResult,
} from "@/hooks/useMysteryRewardBox";

const REWARD_LABELS: Record<
  string,
  { emoji: string; label: string; color: string }
> = {
  double_xp: { emoji: "⚡", label: "2x XP Bonus!", color: "text-amber-600" },
  cosmetic: {
    emoji: "🎨",
    label: "Random Cosmetic!",
    color: "text-purple-600",
  },
  boost: { emoji: "🚀", label: "Temporary Boost!", color: "text-blue-600" },
};

interface MysteryRewardBoxProps {
  studentId: string;
  institutionId: string;
  onComplete?: () => void;
}

const MysteryRewardBox = ({
  studentId,
  institutionId,
  onComplete,
}: MysteryRewardBoxProps) => {
  const [phase, setPhase] = useState<"idle" | "opening" | "revealed">("idle");
  const [result, setResult] = useState<MysteryRewardResult | null>(null);
  const resolveReward = useResolveMysteryReward();

  const handleOpen = useCallback(() => {
    setPhase("opening");
    resolveReward.mutate(
      { studentId, institutionId },
      {
        onSuccess: (data) => {
          setTimeout(() => {
            setResult(data);
            setPhase("revealed");
          }, 1500);
        },
        onError: () => {
          setPhase("idle");
        },
      }
    );
  }, [studentId, institutionId, resolveReward]);

  const handleDismiss = useCallback(() => {
    setPhase("idle");
    setResult(null);
    onComplete?.();
  }, [onComplete]);

  const rewardInfo = result ? REWARD_LABELS[result.outcome_type] : null;

  return (
    <div className="relative" data-testid="mystery-reward-box">
      <AnimatePresence mode="wait">
        {phase === "idle" && (
          <motion.div
            key="idle"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="text-center"
          >
            <motion.div
              animate={{ y: [0, -5, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="inline-block"
            >
              <Gift className="h-16 w-16 text-purple-500 mx-auto" />
            </motion.div>
            <p className="text-sm font-bold mt-2">Mystery Reward!</p>
            <p className="text-xs text-gray-500 mt-1">
              Tap to reveal your prize
            </p>
            <Button
              size="sm"
              className="mt-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white active:scale-95"
              onClick={handleOpen}
            >
              <Sparkles className="h-4 w-4" /> Open Box
            </Button>
          </motion.div>
        )}

        {phase === "opening" && (
          <motion.div
            key="opening"
            initial={{ scale: 1 }}
            animate={{
              scale: [1, 1.2, 0.9, 1.1, 1],
              rotate: [0, -5, 5, -3, 0],
            }}
            transition={{ duration: 1.5 }}
            className="text-center"
          >
            <Gift className="h-16 w-16 text-purple-500 mx-auto animate-bounce" />
            <div className="flex items-center justify-center gap-2 mt-3">
              <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
              <p className="text-sm font-bold text-purple-600">Opening...</p>
            </div>
          </motion.div>
        )}

        {phase === "revealed" && rewardInfo && (
          <motion.div
            key="revealed"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}
            className="text-center"
          >
            <div className="text-5xl mb-2">{rewardInfo.emoji}</div>
            <p className={`text-lg font-black ${rewardInfo.color}`}>
              {rewardInfo.label}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {result?.outcome_type === "double_xp" &&
                "Your next XP award is doubled!"}
              {result?.outcome_type === "cosmetic" &&
                "A new cosmetic has been added to your inventory!"}
              {result?.outcome_type === "boost" &&
                "A temporary XP boost has been activated!"}
            </p>
            <Button size="sm" className="mt-3" onClick={handleDismiss}>
              Awesome!
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MysteryRewardBox;
