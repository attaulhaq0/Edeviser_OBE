import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Mock framer-motion
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
    span: ({
      children,
      ...props
    }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, ...rest } = props;
      void initial;
      void animate;
      void exit;
      void transition;
      return <span {...rest}>{children}</span>;
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

import BadgeAwardModal from '@/components/shared/BadgeAwardModal';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const normalBadge = {
  id: 'streak_7',
  name: '7-Day Warrior',
  description: '7-day login streak',
  icon: '🔥',
  isMystery: false,
  xpReward: 50,
};

const mysteryBadge = {
  id: 'speed_demon',
  name: 'Speed Demon',
  description: 'Submit within 1 hour of publish',
  icon: '⚡',
  isMystery: true,
  xpReward: 75,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BadgeAwardModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('displays badge name and description', () => {
    render(
      <BadgeAwardModal badge={normalBadge} isOpen={true} onClose={vi.fn()} />,
    );

    expect(screen.getByText('7-Day Warrior')).toBeInTheDocument();
    expect(screen.getByText('7-day login streak')).toBeInTheDocument();
  });

  it('displays XP reward amount', () => {
    render(
      <BadgeAwardModal badge={normalBadge} isOpen={true} onClose={vi.fn()} />,
    );

    expect(screen.getByTestId('xp-reward')).toHaveTextContent('+50 XP');
  });

  it('shows mystery placeholder initially for mystery badges', () => {
    render(
      <BadgeAwardModal badge={mysteryBadge} isOpen={true} onClose={vi.fn()} />,
    );

    expect(screen.getByText('Mystery Badge Unlocked!')).toBeInTheDocument();
    expect(screen.getByText('❓')).toBeInTheDocument();
  });

  it('reveals mystery badge after delay', () => {
    render(
      <BadgeAwardModal badge={mysteryBadge} isOpen={true} onClose={vi.fn()} />,
    );

    // Before reveal
    expect(screen.getByText('Mystery Badge Unlocked!')).toBeInTheDocument();

    // Advance past the reveal delay
    act(() => {
      vi.advanceTimersByTime(1100);
    });

    expect(screen.getByText('Speed Demon')).toBeInTheDocument();
    expect(screen.getByText('⚡')).toBeInTheDocument();
  });

  it('calls onClose when dismiss button is clicked', () => {
    const onClose = vi.fn();
    render(
      <BadgeAwardModal badge={normalBadge} isOpen={true} onClose={onClose} />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Awesome!' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders an accessible dialog role', () => {
    render(
      <BadgeAwardModal badge={normalBadge} isOpen={true} onClose={vi.fn()} />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when isOpen is false', () => {
    render(
      <BadgeAwardModal badge={normalBadge} isOpen={false} onClose={vi.fn()} />,
    );

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('fires confetti on open', async () => {
    const confettiMock = await import('canvas-confetti');
    render(
      <BadgeAwardModal badge={normalBadge} isOpen={true} onClose={vi.fn()} />,
    );

    expect(confettiMock.default).toHaveBeenCalledTimes(1);
  });
});
