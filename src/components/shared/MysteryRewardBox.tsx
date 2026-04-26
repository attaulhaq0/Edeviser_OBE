/**
 * Task 21.5: Mystery Reward Box — Unboxing animation with reward reveal
 */
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useResolveMysteryReward, type MysteryBoxRevealResult } from '@/hooks/useMysteryRewardBox';
import { Gift, Zap, Sparkles, Timer, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface MysteryRewardBoxProps {
  studentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const REWARD_CONFIG: Record<string, { icon: typeof Zap; color: string; bg: string; label: string }> = {
  xp_multiplier: { icon: Zap, color: 'text-amber-600', bg: 'bg-amber-100', label: '2x XP Multiplier' },
  cosmetic: { icon: Sparkles, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Cosmetic Item' },
  boost: { icon: Timer, color: 'text-blue-600', bg: 'bg-blue-100', label: 'XP Boost' },
};

const MysteryRewardBox = ({ studentId, open, onOpenChange }: MysteryRewardBoxProps) => {
  const [phase, setPhase] = useState<'box' | 'opening' | 'revealed'>('box');
  const [reward, setReward] = useState<MysteryBoxRevealResult | null>(null);
  const resolveMutation = useResolveMysteryReward();

  const handleOpen = () => {
    setPhase('opening');
    resolveMutation.mutate(
      { studentId },
      {
        onSuccess: (data) => {
          // Brief delay for animation
          setTimeout(() => {
            setReward(data);
            setPhase('revealed');
          }, 1200);
        },
        onError: () => {
          setPhase('box');
        },
      },
    );
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setPhase('box');
      setReward(null);
    }, 300);
  };

  const rewardConfig = reward ? REWARD_CONFIG[reward.type] : null;
  const RewardIcon = rewardConfig?.icon ?? Gift;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 justify-center">
            <Gift className="h-5 w-5 text-purple-500" />
            Mystery Reward
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center py-6">
          <AnimatePresence mode="wait">
            {phase === 'box' && (
              <motion.div
                key="box"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0, rotateY: 90 }}
                transition={{ duration: 0.3 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="relative">
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
                    className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg"
                  >
                    <Gift className="h-12 w-12 text-white" />
                  </motion.div>
                  <motion.div
                    animate={{ scale: [1, 1.3, 1] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="absolute -top-1 -end-1 w-4 h-4 rounded-full bg-amber-400"
                  />
                </div>
                <p className="text-sm text-gray-500 text-center">
                  You've earned a mystery reward!
                </p>
                <Button
                  onClick={handleOpen}
                  disabled={resolveMutation.isPending}
                  className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white active:scale-95"
                >
                  {resolveMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Open Box
                </Button>
              </motion.div>
            )}

            {phase === 'opening' && (
              <motion.div
                key="opening"
                initial={{ scale: 1 }}
                animate={{
                  scale: [1, 1.1, 0.9, 1.2, 0],
                  rotate: [0, -5, 5, -10, 0],
                }}
                transition={{ duration: 1.2, ease: 'easeInOut' }}
                className="w-24 h-24 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg"
              >
                <Gift className="h-12 w-12 text-white" />
              </motion.div>
            )}

            {phase === 'revealed' && reward && (
              <motion.div
                key="revealed"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                className="flex flex-col items-center gap-4"
              >
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 12, delay: 0.1 }}
                  className={cn(
                    'w-20 h-20 rounded-2xl flex items-center justify-center',
                    rewardConfig?.bg ?? 'bg-gray-100',
                  )}
                >
                  <RewardIcon className={cn('h-10 w-10', rewardConfig?.color ?? 'text-gray-600')} />
                </motion.div>

                <motion.div
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="text-center space-y-2"
                >
                  <Badge className={cn('text-sm', rewardConfig?.bg, rewardConfig?.color)}>
                    {rewardConfig?.label}
                  </Badge>
                  <p className="text-sm text-gray-600">{reward.description}</p>
                </motion.div>

                <Button variant="outline" onClick={handleClose} className="mt-2">
                  Awesome!
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MysteryRewardBox;
