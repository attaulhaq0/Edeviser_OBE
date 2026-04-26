import { useState, useCallback, useRef, useEffect } from 'react';
import type { TimerMode, TimerState, PomodoroIntervalType } from '@/types/planner';
import { formatTimerDisplay, getPomodoroIntervalType, getPomodoroIntervalDuration } from '@/lib/plannerUtils';
import { persistTimerState, restoreTimerState, clearTimerState } from '@/lib/timerPersistence';

interface FocusTimerOptions {
  sessionId: string;
  mode: TimerMode;
  durationMinutes: number;
  onComplete: () => void;
  onBreakStart?: () => void;
}

interface FocusTimerReturn {
  timerState: TimerState;
  display: string;
  remainingMs: number;
  elapsedMs: number;
  pomodoroInterval: number;
  pomodoroIntervalType: PomodoroIntervalType;
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void;
  skipBreak: () => void;
  actualDurationMinutes: number;
}

export const useFocusTimer = (options: FocusTimerOptions): FocusTimerReturn => {
  const { sessionId, mode, durationMinutes, onComplete, onBreakStart } = options;

  // Restore timer state from localStorage on mount (called once during initial render)
  const [initialSaved] = useState(() => restoreTimerState());

  const [timerState, setTimerState] = useState<TimerState>(() => {
    if (!initialSaved) return 'idle';
    return initialSaved.pausedAt ? 'paused' : 'running';
  });
  const [remainingMs, setRemainingMs] = useState(() => {
    if (!initialSaved) return durationMinutes * 60 * 1000;
    if (initialSaved.pausedAt) {
      const elapsed = initialSaved.pausedAt - initialSaved.startedAt - initialSaved.totalPausedMs;
      return Math.max(0, initialSaved.targetDurationMs - elapsed);
    }
    return durationMinutes * 60 * 1000;
  });
  const [elapsedMs, setElapsedMs] = useState(() => {
    if (!initialSaved) return 0;
    if (initialSaved.pausedAt) {
      return initialSaved.pausedAt - initialSaved.startedAt - initialSaved.totalPausedMs;
    }
    return 0;
  });
  const [pomodoroInterval, setPomodoroInterval] = useState(() => {
    return initialSaved?.pomodoroInterval ?? 0;
  });
  const [pomodoroIntervalType, setPomodoroIntervalType] = useState<PomodoroIntervalType>(() => {
    return initialSaved?.pomodoroIntervalType ?? 'work';
  });

  const startedAtRef = useRef<number>(initialSaved?.startedAt ?? 0);
  const pausedAtRef = useRef<number | null>(initialSaved?.pausedAt ?? null);
  const totalPausedMsRef = useRef(initialSaved?.totalPausedMs ?? 0);
  const intervalStartRef = useRef<number>(0);
  const targetDurationMsRef = useRef(
    initialSaved?.targetDurationMs ?? (mode === 'pomodoro' ? 25 * 60 * 1000 : durationMinutes * 60 * 1000),
  );
  const rafRef = useRef<number>(0);

  const tickRef = useRef<() => void>(() => {});

  const tick = useCallback(() => {
    if (pausedAtRef.current !== null) return;
    const now = Date.now();
    const elapsed = now - intervalStartRef.current - totalPausedMsRef.current;
    const remaining = Math.max(0, targetDurationMsRef.current - elapsed);
    setElapsedMs(now - startedAtRef.current - totalPausedMsRef.current);
    setRemainingMs(remaining);

    // Persist state
    persistTimerState({
      sessionId,
      mode,
      startedAt: startedAtRef.current,
      totalElapsedMs: now - startedAtRef.current - totalPausedMsRef.current,
      pausedAt: null,
      totalPausedMs: totalPausedMsRef.current,
      pomodoroInterval,
      pomodoroIntervalType,
      targetDurationMs: targetDurationMsRef.current,
    });

    if (remaining <= 0) {
      if (mode === 'pomodoro') {
        const nextInterval = pomodoroInterval + 1;
        const nextType = getPomodoroIntervalType(nextInterval);
        setPomodoroInterval(nextInterval);
        setPomodoroIntervalType(nextType);
        targetDurationMsRef.current = getPomodoroIntervalDuration(nextType);
        intervalStartRef.current = Date.now();
        totalPausedMsRef.current = 0;
        if (nextType === 'work') {
          setTimerState('running');
        } else {
          setTimerState('break');
          onBreakStart?.();
        }
        setRemainingMs(targetDurationMsRef.current);
      } else {
        setTimerState('completed');
        clearTimerState();
        onComplete();
        return;
      }
    }

    rafRef.current = requestAnimationFrame(tickRef.current);
  }, [sessionId, mode, pomodoroInterval, pomodoroIntervalType, onComplete, onBreakStart]);

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  useEffect(() => {
    if (timerState === 'running' || timerState === 'break') {
      rafRef.current = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(rafRef.current);
  }, [timerState, tick]);

  const start = useCallback(() => {
    const now = Date.now();
    startedAtRef.current = now;
    intervalStartRef.current = now;
    totalPausedMsRef.current = 0;
    pausedAtRef.current = null;
    if (mode === 'pomodoro') {
      targetDurationMsRef.current = 25 * 60 * 1000;
      setPomodoroInterval(0);
      setPomodoroIntervalType('work');
    }
    setTimerState('running');
  }, [mode]);

  const pause = useCallback(() => {
    pausedAtRef.current = Date.now();
    setTimerState('paused');
    cancelAnimationFrame(rafRef.current);
    persistTimerState({
      sessionId, mode, startedAt: startedAtRef.current,
      totalElapsedMs: Date.now() - startedAtRef.current - totalPausedMsRef.current,
      pausedAt: pausedAtRef.current, totalPausedMs: totalPausedMsRef.current,
      pomodoroInterval, pomodoroIntervalType, targetDurationMs: targetDurationMsRef.current,
    });
  }, [sessionId, mode, pomodoroInterval, pomodoroIntervalType]);

  const resume = useCallback(() => {
    if (pausedAtRef.current) {
      totalPausedMsRef.current += Date.now() - pausedAtRef.current;
      pausedAtRef.current = null;
    }
    setTimerState('running');
  }, []);

  const end = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    setTimerState('completed');
    clearTimerState();
    onComplete();
  }, [onComplete]);

  const skipBreak = useCallback(() => {
    const nextInterval = pomodoroInterval + 1;
    setPomodoroInterval(nextInterval);
    setPomodoroIntervalType('work');
    targetDurationMsRef.current = 25 * 60 * 1000;
    intervalStartRef.current = Date.now();
    totalPausedMsRef.current = 0;
    setTimerState('running');
  }, [pomodoroInterval]);

  // Derive actual duration from state (elapsedMs already excludes paused time)
  const actualDurationMinutes = Math.max(0, Math.round(elapsedMs / 60000));

  return {
    timerState,
    display: formatTimerDisplay(remainingMs),
    remainingMs,
    elapsedMs,
    pomodoroInterval,
    pomodoroIntervalType,
    start, pause, resume, end, skipBreak,
    actualDurationMinutes,
  };
};
