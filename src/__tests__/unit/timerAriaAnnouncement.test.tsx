import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTimerAnnouncement } from '@/lib/plannerUtils';
import FocusTimer from '@/components/shared/FocusTimer';

// ---------------------------------------------------------------------------
// Unit tests for getTimerAnnouncement pure function
// ---------------------------------------------------------------------------

describe('getTimerAnnouncement', () => {
  it('returns "25 minutes remaining" at exactly 25 minutes', () => {
    expect(getTimerAnnouncement(25 * 60 * 1000)).toBe('25 minutes remaining');
  });

  it('returns "20 minutes remaining" at exactly 20 minutes', () => {
    expect(getTimerAnnouncement(20 * 60 * 1000)).toBe('20 minutes remaining');
  });

  it('returns "15 minutes remaining" at exactly 15 minutes', () => {
    expect(getTimerAnnouncement(15 * 60 * 1000)).toBe('15 minutes remaining');
  });

  it('returns "10 minutes remaining" at exactly 10 minutes', () => {
    expect(getTimerAnnouncement(10 * 60 * 1000)).toBe('10 minutes remaining');
  });

  it('returns "5 minutes remaining" at exactly 5 minutes', () => {
    expect(getTimerAnnouncement(5 * 60 * 1000)).toBe('5 minutes remaining');
  });

  it('returns "1 minute remaining" at exactly 1 minute', () => {
    expect(getTimerAnnouncement(1 * 60 * 1000)).toBe('1 minute remaining');
  });

  it('returns null for non-announcement times (e.g. 12 minutes)', () => {
    expect(getTimerAnnouncement(12 * 60 * 1000)).toBeNull();
  });

  it('returns null for non-announcement times (e.g. 3 minutes)', () => {
    expect(getTimerAnnouncement(3 * 60 * 1000)).toBeNull();
  });

  it('returns null when seconds are not zero (e.g. 5:30)', () => {
    expect(getTimerAnnouncement(5 * 60 * 1000 + 30 * 1000)).toBeNull();
  });

  it('returns null for 0 minutes remaining', () => {
    expect(getTimerAnnouncement(0)).toBeNull();
  });

  it('returns null for negative remaining time', () => {
    expect(getTimerAnnouncement(-1000)).toBeNull();
  });

  it('returns "30 minutes remaining" at exactly 30 minutes', () => {
    expect(getTimerAnnouncement(30 * 60 * 1000)).toBe('30 minutes remaining');
  });

  it('returns null for 2 minutes remaining (not a 5-min interval or 1-min mark)', () => {
    expect(getTimerAnnouncement(2 * 60 * 1000)).toBeNull();
  });

  it('returns null for 4 minutes remaining', () => {
    expect(getTimerAnnouncement(4 * 60 * 1000)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Component tests for FocusTimer ARIA live region
// ---------------------------------------------------------------------------

const defaultProps = {
  display: '25:00',
  remainingMs: 25 * 60 * 1000,
  timerState: 'running' as const,
  mode: 'custom' as const,
  pomodoroInterval: 0,
  pomodoroIntervalType: 'work' as const,
  sessionTitle: 'Study Math',
  courseName: 'Math 101',
  onStart: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onEnd: vi.fn(),
  onSkipBreak: vi.fn(),
};

describe('FocusTimer ARIA live region', () => {
  it('renders a visually hidden aria-live region', () => {
    render(<FocusTimer {...defaultProps} />);
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion).toBeDefined();
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
    expect(liveRegion.getAttribute('aria-atomic')).toBe('true');
    expect(liveRegion.className).toContain('sr-only');
  });

  it('announces "25 minutes remaining" when remainingMs is exactly 25 minutes and timer is running', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={25 * 60 * 1000}
        timerState="running"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('25 minutes remaining');
  });

  it('announces "5 minutes remaining" when remainingMs is exactly 5 minutes', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={5 * 60 * 1000}
        display="05:00"
        timerState="running"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('5 minutes remaining');
  });

  it('announces "1 minute remaining" at the 1-minute mark', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={1 * 60 * 1000}
        display="01:00"
        timerState="running"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('1 minute remaining');
  });

  it('does not announce at non-interval times (e.g. 12 minutes)', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={12 * 60 * 1000}
        display="12:00"
        timerState="running"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('');
  });

  it('does not announce when timer is idle', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={25 * 60 * 1000}
        timerState="idle"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('');
  });

  it('does not announce when timer is paused', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={5 * 60 * 1000}
        display="05:00"
        timerState="paused"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('');
  });

  it('announces during break state (Pomodoro breaks)', () => {
    render(
      <FocusTimer
        {...defaultProps}
        remainingMs={5 * 60 * 1000}
        display="05:00"
        timerState="break"
        mode="pomodoro"
      />,
    );
    const liveRegion = screen.getByTestId('timer-announcement');
    expect(liveRegion.textContent).toBe('5 minutes remaining');
  });

  it('has the timer display with role="timer" and aria-label', () => {
    render(<FocusTimer {...defaultProps} />);
    const timerDisplay = screen.getByRole('timer');
    expect(timerDisplay).toBeDefined();
    expect(timerDisplay.getAttribute('aria-label')).toBe('Time remaining: 25:00');
  });
});
