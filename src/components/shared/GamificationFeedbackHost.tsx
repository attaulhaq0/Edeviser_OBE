import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import BadgeAwardModal from "@/components/shared/BadgeAwardModal";
import LevelUpOverlay from "@/components/shared/LevelUpOverlay";
import MysteryRewardBox from "@/components/shared/MysteryRewardBox";
import XPAwardToast from "@/components/shared/XPAwardToast";
import { useAuth } from "@/hooks/useAuth";
import {
  BADGE_FEEDBACK_EVENT,
  type BadgeFeedbackDetail,
} from "@/lib/badgeFeedback";
import { XP_FEEDBACK_EVENT, type XPFeedbackDetail } from "@/lib/xpFeedback";

/**
 * One app-wide host for confirmed XP rewards. Events are queued so rapid,
 * legitimate awards are shown in order instead of replacing one another.
 */
const GamificationFeedbackHost = () => {
  const { t } = useTranslation("gamification");
  const { profile } = useAuth();
  const [queue, setQueue] = useState<XPFeedbackDetail[]>([]);
  const [badgeQueue, setBadgeQueue] = useState<BadgeFeedbackDetail[]>([]);
  const [phase, setPhase] = useState<"xp" | "level-up" | "mystery">("xp");
  const current = queue[0];
  const currentBadge = badgeQueue[0];

  useEffect(() => {
    const handleFeedback = (event: Event) => {
      const detail = (event as CustomEvent<XPFeedbackDetail>).detail;
      if (!detail || detail.amount <= 0) return;
      setQueue((items) => [...items, detail]);
    };
    const handleBadgeFeedback = (event: Event) => {
      const detail = (event as CustomEvent<BadgeFeedbackDetail>).detail;
      if (!detail) return;
      setBadgeQueue((items) => [...items, detail]);
    };

    window.addEventListener(XP_FEEDBACK_EVENT, handleFeedback);
    window.addEventListener(BADGE_FEEDBACK_EVENT, handleBadgeFeedback);
    return () => {
      window.removeEventListener(XP_FEEDBACK_EVENT, handleFeedback);
      window.removeEventListener(BADGE_FEEDBACK_EVENT, handleBadgeFeedback);
    };
  }, []);

  if (!current) {
    if (!currentBadge) return null;
    return (
      <BadgeAwardModal
        badge={currentBadge}
        isOpen
        onClose={() => setBadgeQueue((items) => items.slice(1))}
      />
    );
  }

  const completeCurrent = () => {
    setQueue((items) => items.slice(1));
    setPhase("xp");
  };

  const continueAfterLevelUp = () => {
    if (current.mysteryRewardTriggered && profile?.institution_id) {
      setPhase("mystery");
      return;
    }
    completeCurrent();
  };

  if (phase === "level-up") {
    return (
      <LevelUpOverlay
        key={`level-${current.id}`}
        newLevel={current.newLevel}
        onComplete={continueAfterLevelUp}
      />
    );
  }

  if (phase === "mystery" && profile?.institution_id) {
    return (
      <div
        className="fixed inset-0 z-[220] flex items-center justify-center bg-slate-950/60 p-5 backdrop-blur-sm"
        role="dialog"
        aria-modal="true"
        aria-label={t("mystery.overlayLabel", "Mystery reward")}
      >
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 shadow-2xl">
          <MysteryRewardBox
            key={`mystery-${current.id}`}
            studentId={current.studentId}
            institutionId={profile.institution_id}
            onComplete={completeCurrent}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[210] flex justify-center lg:bottom-6 lg:ms-[264px]">
      <XPAwardToast
        key={current.id}
        xpAmount={current.amount}
        source={t("xp.rewardEarned")}
        onComplete={() => {
          if (current.levelUp) {
            setPhase("level-up");
            return;
          }
          if (current.mysteryRewardTriggered && profile?.institution_id) {
            setPhase("mystery");
            return;
          }
          completeCurrent();
        }}
      />
    </div>
  );
};

export default GamificationFeedbackHost;
