// @vitest-environment happy-dom

import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import "@/lib/i18n";
import {
  emitXPFeedback,
  XP_FEEDBACK_EVENT,
  type XPFeedbackDetail,
} from "@/lib/xpFeedback";
import {
  BADGE_FEEDBACK_EVENT,
  type BadgeFeedbackDetail,
} from "@/lib/badgeFeedback";

vi.mock("@/components/shared/XPAwardToast", () => ({
  default: ({
    xpAmount,
    source,
    onComplete,
  }: {
    xpAmount: number;
    source: string;
    onComplete?: () => void;
  }) => (
    <button type="button" onClick={onComplete}>
      +{xpAmount} XP · {source}
    </button>
  ),
}));

vi.mock("@/components/shared/LevelUpOverlay", () => ({
  default: ({
    newLevel,
    onComplete,
  }: {
    newLevel: number;
    onComplete?: () => void;
  }) => (
    <button type="button" onClick={onComplete}>
      Level up to {newLevel}
    </button>
  ),
}));

vi.mock("@/components/shared/MysteryRewardBox", () => ({
  default: ({
    studentId,
    institutionId,
    onComplete,
  }: {
    studentId: string;
    institutionId: string;
    onComplete?: () => void;
  }) => (
    <button type="button" onClick={onComplete}>
      Mystery reward for {studentId} at {institutionId}
    </button>
  ),
}));

vi.mock("@/components/shared/BadgeAwardModal", () => ({
  default: ({
    badge,
    onClose,
  }: {
    badge: BadgeFeedbackDetail;
    onClose: () => void;
  }) => (
    <button type="button" onClick={onClose}>
      Badge earned: {badge.name}
    </button>
  ),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    profile: { institution_id: "institution-1" },
  }),
}));

import GamificationFeedbackHost from "@/components/shared/GamificationFeedbackHost";

const feedback = (id: string, amount: number): XPFeedbackDetail => ({
  id,
  studentId: "student-1",
  amount,
  source: "study_session",
  levelUp: false,
  newLevel: 2,
  mysteryRewardTriggered: false,
});

describe("GamificationFeedbackHost", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows only backend-confirmed positive XP feedback", () => {
    render(<GamificationFeedbackHost />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(XP_FEEDBACK_EVENT, {
          detail: feedback("reward-1", 25),
        })
      );
    });

    expect(
      screen.getByRole("button", { name: "+25 XP · Reward earned" })
    ).toBeInTheDocument();
  });

  it("queues rapid rewards instead of replacing the current overlay", async () => {
    const user = userEvent.setup();
    render(<GamificationFeedbackHost />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(XP_FEEDBACK_EVENT, {
          detail: feedback("reward-1", 10),
        })
      );
      window.dispatchEvent(
        new CustomEvent(XP_FEEDBACK_EVENT, {
          detail: feedback("reward-2", 30),
        })
      );
    });

    await user.click(
      screen.getByRole("button", { name: "+10 XP · Reward earned" })
    );
    expect(
      screen.getByRole("button", { name: "+30 XP · Reward earned" })
    ).toBeInTheDocument();
  });

  it("shows the level-up overlay after the confirmed XP reward", async () => {
    const user = userEvent.setup();
    render(<GamificationFeedbackHost />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(XP_FEEDBACK_EVENT, {
          detail: {
            ...feedback("reward-level", 50),
            levelUp: true,
            newLevel: 4,
          },
        })
      );
    });

    expect(screen.queryByText("Level up to 4")).not.toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "+50 XP · Reward earned" })
    );
    expect(
      screen.getByRole("button", { name: "Level up to 4" })
    ).toBeInTheDocument();
  });

  it("does not publish feedback for idempotent zero-XP responses", () => {
    const listener = vi.fn();
    window.addEventListener(XP_FEEDBACK_EVENT, listener);

    emitXPFeedback({
      studentId: "student-1",
      amount: 0,
      source: "login",
      levelUp: false,
      newLevel: 1,
    });

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(XP_FEEDBACK_EVENT, listener);
  });

  it("shows a server-triggered mystery reward after XP feedback", async () => {
    const user = userEvent.setup();
    render(<GamificationFeedbackHost />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent(XP_FEEDBACK_EVENT, {
          detail: {
            ...feedback("reward-mystery", 20),
            mysteryRewardTriggered: true,
          },
        })
      );
    });

    await user.click(
      screen.getByRole("button", { name: "+20 XP · Reward earned" })
    );
    expect(
      screen.getByRole("button", {
        name: "Mystery reward for student-1 at institution-1",
      })
    ).toBeInTheDocument();
  });

  it("queues badge celebrations from confirmed badge events", () => {
    render(<GamificationFeedbackHost />);

    act(() => {
      window.dispatchEvent(
        new CustomEvent<BadgeFeedbackDetail>(BADGE_FEEDBACK_EVENT, {
          detail: {
            id: "bookworm",
            name: "Bookworm",
            description: "Read consistently",
            icon: "📚",
            isMystery: false,
            xpReward: 25,
          },
        })
      );
    });

    expect(
      screen.getByRole("button", { name: "Badge earned: Bookworm" })
    ).toBeInTheDocument();
  });
});
