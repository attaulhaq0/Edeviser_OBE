// @vitest-environment happy-dom
// =============================================================================
// AssessmentTimer — Unit tests
// Timer countdown display, warning state, auto-submit on expiry, paused state
// =============================================================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import AssessmentTimer, {
  type AssessmentTimerProps,
} from '@/components/shared/AssessmentTimer';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultProps: AssessmentTimerProps = {
  totalSeconds: 300, // 5 minutes
  onExpire: vi.fn(),
};

const renderTimer = (overrides: Partial<AssessmentTimerProps> = {}) =>
  render(<AssessmentTimer {...defaultProps} {...overrides} />);

/** Advance fake timers by `n` seconds, flushing each tick */
const advanceBySeconds = (n: number) => {
  for (let i = 0; i < n; i++) {
    act(() => {
      vi.advanceTimersByTime(1000);
    });
  }
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AssessmentTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ── Rendering & format ───────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders with role="timer"', () => {
      renderTimer();
      expect(screen.getByRole('timer')).toBeDefined();
    });

    it('displays initial time in MM:SS format', () => {
      renderTimer({ totalSeconds: 300 });
      expect(screen.getByText('05:00')).toBeDefined();
    });

    it('zero-pads single-digit minutes and seconds', () => {
      renderTimer({ totalSeconds: 65 }); // 1:05
      expect(screen.getByText('01:05')).toBeDefined();
    });

    it('displays 00:00 when totalSeconds is 0', () => {
      renderTimer({ totalSeconds: 0 });
      expect(screen.getByText('00:00')).toBeDefined();
    });

    it('has an accessible aria-label with time remaining', () => {
      renderTimer({ totalSeconds: 125 }); // 2 min 5 sec
      const timer = screen.getByRole('timer');
      expect(timer.getAttribute('aria-label')).toBe(
        '2 minutes and 5 seconds remaining',
      );
    });
  });

  // ── Countdown ────────────────────────────────────────────────────────────

  describe('countdown', () => {
    it('decrements every second', () => {
      renderTimer({ totalSeconds: 10 });
      expect(screen.getByText('00:10')).toBeDefined();

      advanceBySeconds(1);
      expect(screen.getByText('00:09')).toBeDefined();

      advanceBySeconds(4);
      expect(screen.getByText('00:05')).toBeDefined();
    });

    it('stops at 00:00 and does not go negative', () => {
      renderTimer({ totalSeconds: 3 });

      advanceBySeconds(5); // overshoot
      expect(screen.getByText('00:00')).toBeDefined();
    });
  });

  // ── Warning state ────────────────────────────────────────────────────────

  describe('warning state', () => {
    it('applies warning styles when remaining ≤ 120 seconds', () => {
      renderTimer({ totalSeconds: 180 }); // 3 minutes

      // Advance to exactly 120 seconds remaining
      advanceBySeconds(60);
      const timer = screen.getByRole('timer');
      expect(timer.className).toContain('animate-pulse');
      expect(timer.className).toContain('text-red-600');
    });

    it('does not apply warning styles above threshold', () => {
      renderTimer({ totalSeconds: 300 });

      advanceBySeconds(1); // 299 seconds remaining — well above 120
      const timer = screen.getByRole('timer');
      expect(timer.className).not.toContain('animate-pulse');
      expect(timer.className).toContain('text-gray-700');
    });

    it('applies expired styles at 00:00', () => {
      renderTimer({ totalSeconds: 3 });

      advanceBySeconds(3);
      const timer = screen.getByRole('timer');
      expect(timer.className).toContain('bg-red-100');
      expect(timer.className).toContain('text-red-700');
      // Should NOT have animate-pulse at 0 (isWarning is false when remaining === 0)
      expect(timer.className).not.toContain('animate-pulse');
    });
  });

  // ── Auto-submit on expiry ────────────────────────────────────────────────

  describe('auto-submit on expiry', () => {
    it('calls onExpire when timer reaches 0', async () => {
      const onExpire = vi.fn();
      renderTimer({ totalSeconds: 3, onExpire });

      advanceBySeconds(3);
      // Flush the queueMicrotask used internally
      await Promise.resolve();

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('calls onExpire only once even after extra ticks', async () => {
      const onExpire = vi.fn();
      renderTimer({ totalSeconds: 2, onExpire });

      advanceBySeconds(5); // well past expiry
      await Promise.resolve();

      expect(onExpire).toHaveBeenCalledTimes(1);
    });

    it('calls onExpire exactly once when countdown finishes', async () => {
      const onExpire = vi.fn();
      renderTimer({ totalSeconds: 1, onExpire });

      advanceBySeconds(1);
      await Promise.resolve();

      expect(onExpire).toHaveBeenCalledTimes(1);
    });
  });

  // ── Paused state ─────────────────────────────────────────────────────────

  describe('paused state', () => {
    it('does not decrement when paused', () => {
      renderTimer({ totalSeconds: 60, paused: true });

      advanceBySeconds(10);
      expect(screen.getByText('01:00')).toBeDefined();
    });

    it('resumes countdown when unpaused', () => {
      const { rerender } = render(
        <AssessmentTimer totalSeconds={60} onExpire={vi.fn()} paused={true} />,
      );

      advanceBySeconds(5);
      expect(screen.getByText('01:00')).toBeDefined();

      // Unpause
      rerender(
        <AssessmentTimer totalSeconds={60} onExpire={vi.fn()} paused={false} />,
      );

      advanceBySeconds(3);
      expect(screen.getByText('00:57')).toBeDefined();
    });
  });
});
