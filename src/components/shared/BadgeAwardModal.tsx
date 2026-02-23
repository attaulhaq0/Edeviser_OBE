import { useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles } from 'lucide-react';

interface BadgeAwardModalProps {
  badge: {
    id: string;
    name: string;
    description: string;
    icon: string;
    isMystery: boolean;
    xpReward: number;
  };
  isOpen: boolean;
  onClose: () => void;
}

const MYSTERY_REVEAL_DELAY_MS = 1000;

/**
 * Hook that manages a delayed boolean flag via useSyncExternalStore,
 * avoiding setState-in-effect lint warnings.
 */
function useDelayedFlag(active: boolean, delayMs: number): boolean {
  const listeners = useRef(new Set<() => void>());
  const value = useRef(false);

  useEffect(() => {
    if (!active) {
      if (value.current) {
        value.current = false;
        listeners.current.forEach((fn) => fn());
      }
      return;
    }

    // Start unrevealed
    value.current = false;
    listeners.current.forEach((fn) => fn());

    const timer = setTimeout(() => {
      value.current = true;
      listeners.current.forEach((fn) => fn());
    }, delayMs);

    return () => clearTimeout(timer);
  }, [active, delayMs]);

  // useSyncExternalStore for tear-free reads
  const subscribe = useCallback((cb: () => void) => {
    listeners.current.add(cb);
    return () => { listeners.current.delete(cb); };
  }, []);

  const getSnapshot = useCallback(() => value.current, []);

  // Inline useSyncExternalStore to avoid import issues in some envs
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return require('react').useSyncExternalStore(subscribe, getSnapshot);
}

const BadgeAwardModal = ({ badge, isOpen, onClose }: BadgeAwardModalProps) => {
  const prefersReducedMotion = useReducedMotion();
  const confettiFired = useRef(false);

  const needsReveal = isOpen && badge.isMystery && !prefersReducedMotion;
  const timerRevealed = useDelayedFlag(needsReveal, MYSTERY_REVEAL_DELAY_MS);

  const isRevealed = !badge.isMystery || (prefersReducedMotion ?? false) || timerRevealed;

  const fireConfetti = useCallback(
    (opts?: { reveal?: boolean }) => {
      if (prefersReducedMotion) return;

      const isReveal = opts?.reveal ?? false;
      confetti({
        particleCount: isReveal ? 100 : 60,
        spread: isReveal ? 120 : 80,
        origin: { y: isReveal ? 0.5 : 0.6 },
        colors: isReveal
          ? ['#f59e0b', '#eab308', '#fbbf24', '#a855f7', '#ec4899']
          : ['#f59e0b', '#eab308', '#fbbf24', '#3b82f6', '#14b8a6'],
      });
    },
    [prefersReducedMotion],
  );

  // Fire initial confetti when modal opens
  useEffect(() => {
    if (!isOpen) {
      confettiFired.current = false;
      return;
    }

    if (!confettiFired.current) {
      confettiFired.current = true;
      fireConfetti();
    }
  }, [isOpen, fireConfetti]);

  // Fire extra confetti on mystery reveal
  useEffect(() => {
    if (isOpen && badge.isMystery && timerRevealed) {
      fireConfetti({ reveal: true });
    }
  }, [isOpen, badge.isMystery, timerRevealed, fireConfetti]);

  const displayIcon = isRevealed ? badge.icon : '❓';
  const displayName = isRevealed ? badge.name : 'Mystery Badge Unlocked!';
  const displayDescription = isRevealed
    ? badge.description
    : 'Revealing your achievement...';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="bg-white border-0 shadow-2xl rounded-2xl max-w-sm p-0 overflow-hidden"
      >
        <div className="flex flex-col items-center text-center p-8 gap-4">
          {/* Badge icon */}
          <AnimatePresence mode="wait">
            <motion.div
              key={isRevealed ? 'revealed' : 'hidden'}
              initial={
                prefersReducedMotion ? undefined : { scale: 0, opacity: 0 }
              }
              animate={
                prefersReducedMotion ? undefined : { scale: 1, opacity: 1 }
              }
              exit={
                prefersReducedMotion
                  ? undefined
                  : { scale: 0.5, opacity: 0 }
              }
              transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              className="text-6xl animate-badge-pop"
              aria-hidden="true"
            >
              {displayIcon}
            </motion.div>
          </AnimatePresence>

          {/* Title */}
          <DialogTitle className="text-xl font-bold tracking-tight">
            <AnimatePresence mode="wait">
              <motion.span
                key={displayName}
                initial={
                  prefersReducedMotion ? undefined : { opacity: 0, y: 8 }
                }
                animate={
                  prefersReducedMotion ? undefined : { opacity: 1, y: 0 }
                }
                exit={
                  prefersReducedMotion ? undefined : { opacity: 0, y: -8 }
                }
                transition={{ duration: 0.25 }}
              >
                {displayName}
              </motion.span>
            </AnimatePresence>
          </DialogTitle>

          {/* Description */}
          <DialogDescription className="text-sm text-gray-500">
            <AnimatePresence mode="wait">
              <motion.span
                key={displayDescription}
                initial={
                  prefersReducedMotion ? undefined : { opacity: 0 }
                }
                animate={
                  prefersReducedMotion ? undefined : { opacity: 1 }
                }
                exit={prefersReducedMotion ? undefined : { opacity: 0 }}
                transition={{ duration: 0.2, delay: 0.1 }}
              >
                {displayDescription}
              </motion.span>
            </AnimatePresence>
          </DialogDescription>

          {/* XP reward */}
          <div className="flex items-center gap-1.5 text-amber-500 font-bold text-lg">
            <Sparkles className="h-5 w-5" />
            <span data-testid="xp-reward">+{badge.xpReward} XP</span>
          </div>

          {/* Dismiss button */}
          <Button
            onClick={onClose}
            className="mt-2 w-full bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold active:scale-95 transition-transform duration-100"
          >
            Awesome!
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BadgeAwardModal;
