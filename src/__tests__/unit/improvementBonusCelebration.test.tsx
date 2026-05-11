import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act } from "@testing-library/react";
import ImprovementBonusCelebration from "@/components/shared/ImprovementBonusCelebration";

vi.mock("framer-motion", () => ({
  motion: {
    div: (p: Record<string, unknown>) => {
      const { children, initial, animate, exit, transition, ...rest } = p;
      void initial;
      void animate;
      void exit;
      void transition;
      return <div {...rest}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: (p: { children: React.ReactNode }) => <>{p.children}</>,
  useReducedMotion: () => false,
}));
vi.mock("canvas-confetti", () => ({ default: vi.fn() }));
beforeEach(() => {
  vi.useFakeTimers();
});

const props = {
  cloTitle: "DS",
  bonusXP: 50,
  previousPercent: 45,
  currentPercent: 72,
  onDismiss: vi.fn(),
};

describe("ImprovementBonusCelebration", () => {
  it("renders CLO title", () => {
    render(<ImprovementBonusCelebration {...props} />);
    expect(screen.getByText(/Great improvement on DS!/)).toBeInTheDocument();
  });

  it("renders bonus XP", () => {
    render(<ImprovementBonusCelebration {...props} />);
    expect(screen.getByText("+50 XP Bonus")).toBeInTheDocument();
  });

  it("shows heading", () => {
    render(<ImprovementBonusCelebration {...props} />);
    expect(screen.getByText("Great improvement!")).toBeInTheDocument();
  });

  it("shows percentages", () => {
    render(<ImprovementBonusCelebration {...props} />);
    expect(screen.getByText(/45%.*72%/)).toBeInTheDocument();
  });

  it("fires confetti", async () => {
    const c = await import("canvas-confetti");
    render(<ImprovementBonusCelebration {...props} />);
    expect(c.default).toHaveBeenCalled();
  });

  it("dismisses after timeout", () => {
    const d = vi.fn();
    render(<ImprovementBonusCelebration {...props} onDismiss={d} />);
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(d).toHaveBeenCalled();
  });

  it("has role=status", () => {
    render(<ImprovementBonusCelebration {...props} />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });
});
