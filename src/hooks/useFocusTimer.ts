// =============================================================================
// useFocusTimer — Timer state machine with localStorage persistence
// =============================================================================

import { useCallback, useEffect, useReducer, useRef } from "react";
import {
  persistTimerState,
  restoreTimerState,
  clearTimerState,
} from "@/lib/timerPersistence";
import {
  formatTimerDisplay,
  calculateActualDuration,
  getPomodoroIntervalType,
  getPomodoroIntervalDuration,
} from "@/lib/plannerUtils";
import type {
  TimerState,
  TimerMode,
  PomodoroIntervalType,
  TimerPersistState,
} from "@/types/planner";

// ─── Public Types ────────────────────────────────────────────────────────────

export interface FocusTimerOptions {
  sessionId: string;
  mode: TimerMode;
  durationMinutes: number;
  onComplete?: () => void;
  onIntervalComplete?: (intervalType: PomodoroIntervalType) => void;
}

export interface FocusTimerReturn {
  timerState: TimerState;
  display: string;
  remainingMs: number;
  totalElapsedMs: number;
  pomodoroInterval: number;
  pomodoroIntervalType: PomodoroIntervalType;
  mode: TimerMode;
  start: () => void;
  pause: () => void;
  resume: () => void;
  end: () => void;
  skipBreak: () => void;
  actualDurationMinutes: number;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

interface TimerInternalState {
  timerState: TimerState;
  remainingMs: number;
  totalElapsedMs: number;
  pomodoroInterval: number;
  pomodoroIntervalType: PomodoroIntervalType;
  actualDurationMinutes: number;
}

type TimerAction =
  | {
      type: "TICK";
      remainingMs: number;
      totalElapsedMs: number;
      actualDurationMinutes: number;
    }
  | { type: "SET_STATE"; timerState: TimerState }
  | { type: "START"; remainingMs: number }
  | { type: "PAUSE"; actualDurationMinutes: number }
  | { type: "RESUME" }
  | { type: "END"; actualDurationMinutes: number }
  | {
      type: "INTERVAL_TRANSITION";
      pomodoroInterval: number;
      pomodoroIntervalType: PomodoroIntervalType;
      remainingMs: number;
      timerState: TimerState;
    }
  | {
      type: "RESTORE";
      timerState: TimerState;
      remainingMs: number;
      totalElapsedMs: number;
      pomodoroInterval: number;
      pomodoroIntervalType: PomodoroIntervalType;
      actualDurationMinutes: number;
    };

function timerReducer(
  state: TimerInternalState,
  action: TimerAction
): TimerInternalState {
  switch (action.type) {
    case "TICK":
      return {
        ...state,
        remainingMs: action.remainingMs,
        totalElapsedMs: action.totalElapsedMs,
        actualDurationMinutes: action.actualDurationMinutes,
      };
    case "SET_STATE":
      return { ...state, timerState: action.timerState };
    case "START":
      return {
        ...state,
        timerState: "running",
        remainingMs: action.remainingMs,
        totalElapsedMs: 0,
        pomodoroInterval: 0,
        pomodoroIntervalType: "work",
        actualDurationMinutes: 0,
      };
    case "PAUSE":
      return {
        ...state,
        timerState: "paused",
        actualDurationMinutes: action.actualDurationMinutes,
      };
    case "RESUME":
      return { ...state, timerState: "running" };
    case "END":
      return {
        ...state,
        timerState: "completed",
        actualDurationMinutes: action.actualDurationMinutes,
      };
    case "INTERVAL_TRANSITION":
      return {
        ...state,
        pomodoroInterval: action.pomodoroInterval,
        pomodoroIntervalType: action.pomodoroIntervalType,
        remainingMs: action.remainingMs,
        timerState: action.timerState,
      };
    case "RESTORE":
      return {
        timerState: action.timerState,
        remainingMs: action.remainingMs,
        totalElapsedMs: action.totalElapsedMs,
        pomodoroInterval: action.pomodoroInterval,
        pomodoroIntervalType: action.pomodoroIntervalType,
        actualDurationMinutes: action.actualDurationMinutes,
      };
    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export const useFocusTimer = (options: FocusTimerOptions): FocusTimerReturn => {
  const { sessionId, mode, durationMinutes, onComplete, onIntervalComplete } =
    options;

  const initialMs = durationMinutes * 60 * 1000;

  const [state, dispatch] = useReducer(timerReducer, {
    timerState: "idle",
    remainingMs: initialMs,
    totalElapsedMs: 0,
    pomodoroInterval: 0,
    pomodoroIntervalType: "work",
    actualDurationMinutes: 0,
  });

  // Mutable refs for the rAF loop (never read during render)
  const rafRef = useRef<number | null>(null);
  const startedAtRef = useRef<number>(0);
  const pausedAtRef = useRef<number | null>(null);
  const totalPausedMsRef = useRef<number>(0);
  const intervalStartRef = useRef<number>(0);
  const intervalTargetMsRef = useRef<number>(0);

  // Callback refs (synced via effect, never read during render)
  const onCompleteRef = useRef(onComplete);
  const onIntervalCompleteRef = useRef(onIntervalComplete);
  const modeRef = useRef(mode);
  const sessionIdRef = useRef(sessionId);
  const stateRef = useRef(state);

  useEffect(() => {
    onCompleteRef.current = onComplete;
    onIntervalCompleteRef.current = onIntervalComplete;
    modeRef.current = mode;
    sessionIdRef.current = sessionId;
    stateRef.current = state;
  });

  // ─── Persistence helper ──────────────────────────────────────────────────

  const persistState = useCallback(() => {
    const s = stateRef.current;
    const persisted: TimerPersistState = {
      sessionId: sessionIdRef.current,
      mode: modeRef.current,
      startedAt: startedAtRef.current,
      totalElapsedMs: s.totalElapsedMs,
      pausedAt: pausedAtRef.current,
      totalPausedMs: totalPausedMsRef.current,
      pomodoroInterval: s.pomodoroInterval,
      pomodoroIntervalType: s.pomodoroIntervalType,
      targetDurationMs: intervalTargetMsRef.current,
    };
    persistTimerState(persisted);
  }, []);

  // ─── Restore from localStorage on mount ──────────────────────────────────

  useEffect(() => {
    const saved = restoreTimerState();
    if (!saved || saved.sessionId !== sessionId) return;

    startedAtRef.current = saved.startedAt;
    totalPausedMsRef.current = saved.totalPausedMs;
    intervalTargetMsRef.current = saved.targetDurationMs;
    intervalStartRef.current = saved.startedAt;

    let restoredTimerState: TimerState;
    let restoredRemaining: number;
    let restoredActualMinutes: number;

    if (saved.pausedAt) {
      pausedAtRef.current = saved.pausedAt;
      const elapsed = saved.pausedAt - saved.startedAt - saved.totalPausedMs;
      restoredRemaining = Math.max(0, saved.targetDurationMs - elapsed);
      restoredActualMinutes = calculateActualDuration(
        saved.startedAt,
        saved.pausedAt,
        saved.totalPausedMs
      );
      restoredTimerState = "paused";
    } else if (saved.startedAt > 0) {
      const now = Date.now();
      const elapsed = now - saved.startedAt - saved.totalPausedMs;
      restoredRemaining = Math.max(0, saved.targetDurationMs - elapsed);
      restoredActualMinutes = calculateActualDuration(
        saved.startedAt,
        now,
        saved.totalPausedMs
      );
      restoredTimerState = restoredRemaining > 0 ? "running" : "completed";
    } else {
      return;
    }

    dispatch({
      type: "RESTORE",
      timerState: restoredTimerState,
      remainingMs: restoredRemaining,
      totalElapsedMs: saved.totalElapsedMs,
      pomodoroInterval: saved.pomodoroInterval,
      pomodoroIntervalType: saved.pomodoroIntervalType,
      actualDurationMinutes: restoredActualMinutes,
    });
  }, [sessionId]);

  // ─── rAF tick function (stable — reads only refs) ────────────────────────

  const tickRef = useRef<() => void>();

  useEffect(() => {
    tickRef.current = () => {
      const now = Date.now();
      const elapsed = now - intervalStartRef.current - totalPausedMsRef.current;
      const remaining = Math.max(0, intervalTargetMsRef.current - elapsed);

      const currentState = stateRef.current;
      const currentMode = modeRef.current;

      let totalWork = currentState.totalElapsedMs;
      if (
        currentState.pomodoroIntervalType === "work" ||
        currentMode !== "pomodoro"
      ) {
        totalWork = now - startedAtRef.current - totalPausedMsRef.current;
      }

      const actualMin = calculateActualDuration(
        startedAtRef.current,
        now,
        totalPausedMsRef.current
      );

      dispatch({
        type: "TICK",
        remainingMs: remaining,
        totalElapsedMs: totalWork,
        actualDurationMinutes: actualMin,
      });

      // Persist
      persistState();

      if (remaining <= 0) {
        if (currentMode === "pomodoro") {
          const currentType = getPomodoroIntervalType(
            currentState.pomodoroInterval
          );
          onIntervalCompleteRef.current?.(currentType);

          const nextInterval = currentState.pomodoroInterval + 1;
          const nextType = getPomodoroIntervalType(nextInterval);
          const nextDuration = getPomodoroIntervalDuration(nextType);

          intervalTargetMsRef.current = nextDuration;
          intervalStartRef.current = Date.now();
          totalPausedMsRef.current = 0;
          pausedAtRef.current = null;

          let nextTimerState: TimerState;
          if (nextType === "work") {
            nextTimerState = "idle";
          } else if (nextType === "long_break") {
            nextTimerState = "long_break";
          } else {
            nextTimerState = "break";
          }

          dispatch({
            type: "INTERVAL_TRANSITION",
            pomodoroInterval: nextInterval,
            pomodoroIntervalType: nextType,
            remainingMs: nextDuration,
            timerState: nextTimerState,
          });

          if (nextType === "work") {
            rafRef.current = null;
            return;
          }
        } else {
          dispatch({ type: "END", actualDurationMinutes: actualMin });
          clearTimerState();
          onCompleteRef.current?.();
          rafRef.current = null;
          return;
        }
      }

      rafRef.current = requestAnimationFrame(() => tickRef.current?.());
    };
  });

  // ─── Start/stop rAF based on timer state ─────────────────────────────────

  useEffect(() => {
    const { timerState } = state;
    if (
      timerState === "running" ||
      timerState === "break" ||
      timerState === "long_break"
    ) {
      rafRef.current = requestAnimationFrame(() => tickRef.current?.());
    }
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [state.timerState]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Actions ─────────────────────────────────────────────────────────────

  const start = useCallback(() => {
    const now = Date.now();
    startedAtRef.current = now;
    intervalStartRef.current = now;
    pausedAtRef.current = null;
    totalPausedMsRef.current = 0;

    let targetMs: number;
    if (mode === "pomodoro") {
      const type = getPomodoroIntervalType(0);
      targetMs = getPomodoroIntervalDuration(type);
    } else {
      targetMs = durationMinutes * 60 * 1000;
    }
    intervalTargetMsRef.current = targetMs;

    dispatch({ type: "START", remainingMs: targetMs });
  }, [mode, durationMinutes]);

  const pause = useCallback(() => {
    const now = Date.now();
    pausedAtRef.current = now;
    const actualMin = calculateActualDuration(
      startedAtRef.current,
      now,
      totalPausedMsRef.current
    );
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    dispatch({ type: "PAUSE", actualDurationMinutes: actualMin });
    persistState();
  }, [persistState]);

  const resume = useCallback(() => {
    if (pausedAtRef.current) {
      totalPausedMsRef.current += Date.now() - pausedAtRef.current;
    }
    pausedAtRef.current = null;

    // If resuming from idle (next Pomodoro work interval after break)
    const s = stateRef.current;
    if (s.timerState === "idle" && s.pomodoroInterval > 0) {
      intervalStartRef.current = Date.now();
      totalPausedMsRef.current = 0;
    }

    dispatch({ type: "RESUME" });
  }, []);

  const end = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const endedAt = Date.now();
    const minutes = calculateActualDuration(
      startedAtRef.current,
      endedAt,
      totalPausedMsRef.current
    );

    dispatch({ type: "END", actualDurationMinutes: minutes });
    clearTimerState();
    onCompleteRef.current?.();
  }, []);

  const skipBreak = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const s = stateRef.current;
    const nextInterval = s.pomodoroInterval + 1;
    const nextType = getPomodoroIntervalType(nextInterval);
    const nextDuration = getPomodoroIntervalDuration(nextType);

    intervalTargetMsRef.current = nextDuration;
    intervalStartRef.current = Date.now();
    totalPausedMsRef.current = 0;
    pausedAtRef.current = null;

    dispatch({
      type: "INTERVAL_TRANSITION",
      pomodoroInterval: nextInterval,
      pomodoroIntervalType: nextType,
      remainingMs: nextDuration,
      timerState: "running",
    });
  }, []);

  // ─── Computed values ─────────────────────────────────────────────────────

  const display = formatTimerDisplay(state.remainingMs);

  return {
    timerState: state.timerState,
    display,
    remainingMs: state.remainingMs,
    totalElapsedMs: state.totalElapsedMs,
    pomodoroInterval: state.pomodoroInterval,
    pomodoroIntervalType: state.pomodoroIntervalType,
    mode,
    start,
    pause,
    resume,
    end,
    skipBreak,
    actualDurationMinutes: state.actualDurationMinutes,
  };
};
