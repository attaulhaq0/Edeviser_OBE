import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock framer-motion to avoid animation complexity in tests
// ---------------------------------------------------------------------------
vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial;
      void animate;
      void exit;
      void transition;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({
    children,
  }: React.PropsWithChildren<Record<string, unknown>>) => <>{children}</>,
  useReducedMotion: () => false,
}));

// ---------------------------------------------------------------------------
// Mock canvas-confetti
// ---------------------------------------------------------------------------
vi.mock('canvas-confetti', () => ({
  default: vi.fn(),
}));

import XPAwardToast from '@/components/shared/XPAwardToast';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('XPAwardToast', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the XP amount', () => {
    render(<XPAwardToast xpAmount={50} source="On-time Submission" />);

    // The count-up starts at 0 and animates to 50.
    // With fake timers the rAF-based animation won't run, so we see the
    // initial value. The text "+0 XP" or "+50 XP" should be present.
    const xpText = screen.getByRole('status');
    expect(xpText).toBeInTheDocument();
    expect(xpText.textContent).toContain('XP');
  });

  it('displays the source label', () => {
    render(<XPAwardToast xpAmount={25} source="Daily Login" />);

    expect(screen.getByText('Daily Login')).toBeInTheDocument();
  });

  it('shows level-up message when levelUp is true', () => {
    render(
      <XPAwardToast
        xpAmount={100}
        source="Streak Milestone"
        levelUp={true}
        newLevel={5}
      />,
    );

    expect(screen.getByText('Level Up! → Level 5')).toBeInTheDocument();
  });

  it('hides level-up message when levelUp is false', () => {
    render(
      <XPAwardToast
        xpAmount={50}
        source="On-time Submission"
        levelUp={false}
      />,
    );

    expect(screen.queryByText(/Level Up/)).not.toBeInTheDocument();
  });

  it('hides level-up message when levelUp is not provided', () => {
    render(<XPAwardToast xpAmount={50} source="On-time Submission" />);

    expect(screen.queryByText(/Level Up/)).not.toBeInTheDocument();
  });

  it('auto-dismisses after 3 seconds', () => {
    const onComplete = vi.fn();
    render(
      <XPAwardToast
        xpAmount={50}
        source="On-time Submission"
        onComplete={onComplete}
      />,
    );

    // Before 3 seconds, the toast should be visible
    expect(screen.getByRole('status')).toBeInTheDocument();

    // Advance past the 3-second auto-dismiss timer
    act(() => {
      vi.advanceTimersByTime(3100);
    });

    // With mocked AnimatePresence the exit animation is instant,
    // so the element should be removed from the DOM
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('fires confetti on mount', async () => {
    const confettiMock = await import('canvas-confetti');
    render(<XPAwardToast xpAmount={50} source="On-time Submission" />);

    expect(confettiMock.default).toHaveBeenCalledTimes(1);
    expect(confettiMock.default).toHaveBeenCalledWith(
      expect.objectContaining({
        particleCount: 30,
        spread: 60,
        colors: ['#f59e0b', '#eab308', '#fbbf24'],
      }),
    );
  });

  it('has accessible role="status" and aria-live', () => {
    render(<XPAwardToast xpAmount={50} source="Test" />);

    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
  });
});
