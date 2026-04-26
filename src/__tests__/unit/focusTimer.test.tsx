import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import FocusTimer from '@/components/shared/FocusTimer';
import type { TimerState, TimerMode, PomodoroIntervalType } from '@/types/planner';

// ---------------------------------------------------------------------------
// Helper: default props factory
// ---------------------------------------------------------------------------

interface FocusTimerTestProps {
  display: string;
  remainingMs: number;
  timerState: TimerState;
  mode: TimerMode;
  pomodoroInterval: number;
  pomodoroIntervalType: PomodoroIntervalType;
  sessionTitle: string;
  courseName?: string;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onEnd: () => void;
  onSkipBreak: () => void;
}

const makeProps = (overrides: Partial<FocusTimerTestProps> = {}): FocusTimerTestProps => ({
  display: '25:00',
  remainingMs: 25 * 60 * 1000,
  timerState: 'idle',
  mode: 'custom',
  pomodoroInterval: 0,
  pomodoroIntervalType: 'work',
  sessionTitle: 'Study Calculus',
  courseName: 'Math 201',
  onStart: vi.fn(),
  onPause: vi.fn(),
  onResume: vi.fn(),
  onEnd: vi.fn(),
  onSkipBreak: vi.fn(),
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests — FocusTimer component (excluding ARIA announcements, covered in
// timerAriaAnnouncement.test.tsx)
// ---------------------------------------------------------------------------

describe('FocusTimer', () => {
  it('renders session title and course name', () => {
    render(<FocusTimer {...makeProps()} />);
    expect(screen.getByText('Study Calculus')).toBeDefined();
    expect(screen.getByText('Math 201')).toBeDefined();
  });

  it('renders session title without course name when courseName is omitted', () => {
    render(<FocusTimer {...makeProps({ courseName: undefined })} />);
    expect(screen.getByText('Study Calculus')).toBeDefined();
    expect(screen.queryByText('Math 201')).toBeNull();
  });

  // -------------------------------------------------------------------------
  // Timer display
  // -------------------------------------------------------------------------

  it('displays the timer in MM:SS format', () => {
    render(<FocusTimer {...makeProps({ display: '12:34' })} />);
    const timer = screen.getByRole('timer');
    expect(timer.textContent).toBe('12:34');
  });

  it('has an accessible aria-label on the timer display', () => {
    render(<FocusTimer {...makeProps({ display: '05:00' })} />);
    const timer = screen.getByRole('timer');
    expect(timer.getAttribute('aria-label')).toBe('Time remaining: 05:00');
  });

  // -------------------------------------------------------------------------
  // Button visibility per timer state
  // -------------------------------------------------------------------------

  it('shows Start button when idle', () => {
    render(<FocusTimer {...makeProps({ timerState: 'idle' })} />);
    expect(screen.getByText('Start')).toBeDefined();
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Resume')).toBeNull();
    expect(screen.queryByText('End')).toBeNull();
    expect(screen.queryByText('Skip Break')).toBeNull();
  });

  it('shows Pause and End buttons when running', () => {
    render(<FocusTimer {...makeProps({ timerState: 'running' })} />);
    expect(screen.getByText('Pause')).toBeDefined();
    expect(screen.getByText('End')).toBeDefined();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.queryByText('Resume')).toBeNull();
    expect(screen.queryByText('Skip Break')).toBeNull();
  });

  it('shows Resume and End buttons when paused', () => {
    render(<FocusTimer {...makeProps({ timerState: 'paused' })} />);
    expect(screen.getByText('Resume')).toBeDefined();
    expect(screen.getByText('End')).toBeDefined();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Skip Break')).toBeNull();
  });

  it('shows Skip Break and End Session buttons during break', () => {
    render(<FocusTimer {...makeProps({ timerState: 'break', mode: 'pomodoro' })} />);
    expect(screen.getByText('Skip Break')).toBeDefined();
    expect(screen.getByText('End Session')).toBeDefined();
    expect(screen.queryByText('Start')).toBeNull();
    expect(screen.queryByText('Pause')).toBeNull();
    expect(screen.queryByText('Resume')).toBeNull();
  });

  it('shows Skip Break and End Session buttons during long_break', () => {
    render(<FocusTimer {...makeProps({ timerState: 'long_break', mode: 'pomodoro' })} />);
    expect(screen.getByText('Skip Break')).toBeDefined();
    expect(screen.getByText('End Session')).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // Callback invocations
  // -------------------------------------------------------------------------

  it('calls onStart when Start is clicked', () => {
    const onStart = vi.fn();
    render(<FocusTimer {...makeProps({ timerState: 'idle', onStart })} />);
    fireEvent.click(screen.getByText('Start'));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it('calls onPause when Pause is clicked', () => {
    const onPause = vi.fn();
    render(<FocusTimer {...makeProps({ timerState: 'running', onPause })} />);
    fireEvent.click(screen.getByText('Pause'));
    expect(onPause).toHaveBeenCalledTimes(1);
  });

  it('calls onResume when Resume is clicked', () => {
    const onResume = vi.fn();
    render(<FocusTimer {...makeProps({ timerState: 'paused', onResume })} />);
    fireEvent.click(screen.getByText('Resume'));
    expect(onResume).toHaveBeenCalledTimes(1);
  });

  it('calls onEnd when End is clicked (running state)', () => {
    const onEnd = vi.fn();
    render(<FocusTimer {...makeProps({ timerState: 'running', onEnd })} />);
    fireEvent.click(screen.getByText('End'));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onEnd when End is clicked (paused state)', () => {
    const onEnd = vi.fn();
    render(<FocusTimer {...makeProps({ timerState: 'paused', onEnd })} />);
    fireEvent.click(screen.getByText('End'));
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('calls onSkipBreak when Skip Break is clicked', () => {
    const onSkipBreak = vi.fn();
    render(<FocusTimer {...makeProps({ timerState: 'break', mode: 'pomodoro', onSkipBreak })} />);
    fireEvent.click(screen.getByText('Skip Break'));
    expect(onSkipBreak).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Pomodoro indicator visibility
  // -------------------------------------------------------------------------

  it('shows Pomodoro indicator when mode is pomodoro', () => {
    render(
      <FocusTimer
        {...makeProps({
          mode: 'pomodoro',
          timerState: 'running',
          pomodoroInterval: 0,
          pomodoroIntervalType: 'work',
        })}
      />,
    );
    expect(screen.getByText('Work')).toBeDefined();
  });

  it('does not show Pomodoro indicator when mode is custom', () => {
    render(
      <FocusTimer
        {...makeProps({
          mode: 'custom',
          timerState: 'running',
        })}
      />,
    );
    expect(screen.queryByText('Work')).toBeNull();
    expect(screen.queryByText('Break')).toBeNull();
    expect(screen.queryByText('Long Break')).toBeNull();
  });
});
