// =============================================================================
// FocusTimer — Large countdown timer display (MM:SS), start/pause/resume/end
// controls, Pomodoro interval indicator, session context, ARIA live region,
// audio notification on completion, offline indicator
// =============================================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getTimerAnnouncement } from "@/lib/plannerUtils";
import PomodoroIndicator from "@/components/shared/PomodoroIndicator";
import FlowCheckInDialog from "@/components/shared/FlowCheckInDialog";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";
import type { FocusTimerReturn } from "@/hooks/useFocusTimer";
import type { StudySession, FlowResponse } from "@/types/planner";
import {
  Play,
  Pause,
  SkipForward,
  Square,
  WifiOff,
  Volume2,
  Bell,
  Target,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

interface FocusTimerProps {
  /** Timer hook return value — all state and controls */
  timer: FocusTimerReturn;
  /** Session data for context display */
  session: StudySession | null;
  /** CLO titles for context display */
  cloTitles?: string[];
  /** Session intent concept text to display alongside timer */
  intentConcept?: string | null;
  /** Session intent success criterion to display alongside timer */
  intentSuccessCriterion?: string | null;
  /** Called when timer completes (transition to completion form) */
  onComplete?: () => void;
  /** Called when user manually ends session */
  onEnd?: () => void;
  className?: string;
}

// ─── Audio Notification ──────────────────────────────────────────────────────

function playCompletionSound(): boolean {
  try {
    const audioCtx = new (window.AudioContext ||
      (window as unknown as Record<string, typeof AudioContext>)
        .webkitAudioContext)();
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);

    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, audioCtx.currentTime);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(
      0.01,
      audioCtx.currentTime + 0.8
    );

    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + 0.8);

    return true;
  } catch {
    return false;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

const FocusTimer = ({
  timer,
  session,
  cloTitles = [],
  intentConcept,
  intentSuccessCriterion,
  onComplete,
  onEnd,
  className,
}: FocusTimerProps) => {
  const {
    timerState,
    display,
    remainingMs,
    totalElapsedMs,
    pomodoroInterval,
    pomodoroIntervalType,
    mode,
    start,
    pause,
    resume,
    end,
    skipBreak,
  } = timer;

  const { isOnline } = useOfflineQueue();

  // ─── Visual fallback for audio notification ──────────────────────────────
  const [showVisualNotification, setShowVisualNotification] = useState(false);

  // ─── ARIA live region announcement ───────────────────────────────────────
  const [announcement, setAnnouncement] = useState<string>("");
  const lastAnnouncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      timerState !== "running" &&
      timerState !== "break" &&
      timerState !== "long_break"
    )
      return;

    const text = getTimerAnnouncement(remainingMs);
    if (text && text !== lastAnnouncedRef.current) {
      setAnnouncement(text);
      lastAnnouncedRef.current = text;
    }
  }, [remainingMs, timerState]);

  // ─── Handle timer completion ─────────────────────────────────────────────
  const prevTimerStateRef = useRef(timerState);

  useEffect(() => {
    const prev = prevTimerStateRef.current;
    prevTimerStateRef.current = timerState;

    if (timerState === "completed" && prev !== "completed") {
      const audioPlayed = playCompletionSound();
      // Schedule state updates for next microtask to avoid sync setState in effect
      queueMicrotask(() => {
        if (!audioPlayed) {
          setShowVisualNotification(true);
        }
        setAnnouncement("Timer completed. Session finished.");
      });
      onComplete?.();
    }
  }, [timerState, onComplete]);

  // ─── Prompt before next work interval (Pomodoro idle state) ──────────────
  const isWaitingForNextWork =
    timerState === "idle" && mode === "pomodoro" && pomodoroInterval > 0;

  // ─── Break states ────────────────────────────────────────────────────────
  const isOnBreak = timerState === "break" || timerState === "long_break";

  // ─── Flow Check-In on Pomodoro break transitions ─────────────────────────
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [flowCheckInInterval, setFlowCheckInInterval] = useState(1);
  const lastCheckInIntervalRef = useRef<number>(-1);

  useEffect(() => {
    if (mode !== "pomodoro") return;
    if (!isOnBreak) return;
    if (!session) return;
    // Show once per work→break transition; key on the just-completed interval.
    if (lastCheckInIntervalRef.current === pomodoroInterval) return;
    lastCheckInIntervalRef.current = pomodoroInterval;
    setFlowCheckInInterval(pomodoroInterval);
    setFlowDialogOpen(true);
  }, [isOnBreak, mode, pomodoroInterval, session]);

  // ─── Flow Check-In at midpoint for custom sessions ≥50 min ───────────────
  const customMidpointShownRef = useRef(false);

  useEffect(() => {
    if (mode !== "custom") return;
    if (!session) return;
    if (timerState !== "running") return;
    if (session.plannedDurationMinutes < 50) return;
    if (customMidpointShownRef.current) return;

    const midpointMs = (session.plannedDurationMinutes * 60 * 1000) / 2;
    if (totalElapsedMs >= midpointMs) {
      customMidpointShownRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFlowCheckInInterval(1);
      setFlowDialogOpen(true);
    }
  }, [mode, session, timerState, totalElapsedMs]);

  const handleFlowComplete = useCallback((_response: FlowResponse) => {
    // Response is already saved by FlowCheckInDialog internally.
    // Close dialog handled by onOpenChange.
  }, []);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleStart = useCallback(() => {
    start();
  }, [start]);

  const handleResume = useCallback(() => {
    resume();
  }, [resume]);

  const handlePause = useCallback(() => {
    pause();
  }, [pause]);

  const handleEnd = useCallback(() => {
    end();
    onEnd?.();
  }, [end, onEnd]);

  const handleSkipBreak = useCallback(() => {
    skipBreak();
  }, [skipBreak]);

  const handleStartNextWork = useCallback(() => {
    // Resume from idle state to start next Pomodoro work interval
    resume();
  }, [resume]);

  const dismissVisualNotification = useCallback(() => {
    setShowVisualNotification(false);
  }, []);

  // ─── Timer ring color based on state ─────────────────────────────────────
  const ringColor =
    timerState === "paused"
      ? "border-amber-400"
      : isOnBreak
      ? "border-teal-400"
      : timerState === "completed"
      ? "border-green-400"
      : "border-blue-500";

  return (
    <div className={cn("flex flex-col items-center gap-6", className)}>
      {/* Offline Indicator */}
      {!isOnline && (
        <div
          className="flex items-center gap-2 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700"
          role="alert"
        >
          <WifiOff className="h-4 w-4" />
          <span>
            Offline — timer continues, data will sync when reconnected
          </span>
        </div>
      )}

      {/* Visual Notification Fallback */}
      {showVisualNotification && (
        <div
          className="flex items-center gap-2 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
          role="alert"
        >
          <Bell className="h-4 w-4" />
          <span className="font-medium">Timer completed!</span>
          <Button
            variant="ghost"
            size="sm"
            className="ms-2 h-7 text-xs"
            onClick={dismissVisualNotification}
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Session Context */}
      {session && (
        <div className="flex flex-col items-center gap-1 text-center">
          <h2 className="text-lg font-bold tracking-tight text-gray-900">
            {session.title}
          </h2>
          {session.courseName && (
            <span className="text-sm text-gray-500">{session.courseName}</span>
          )}
          {cloTitles.length > 0 && (
            <div className="mt-1 flex flex-wrap justify-center gap-1">
              {cloTitles.map((title, i) => (
                <Badge
                  key={i}
                  className="bg-green-100 text-green-700 text-[10px]"
                >
                  {title}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Session Intent */}
      {intentConcept && (
        <div className="flex max-w-sm items-start gap-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3">
          <Target className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
          <div className="min-w-0 space-y-0.5">
            <p className="text-sm font-medium text-teal-800">{intentConcept}</p>
            {intentSuccessCriterion && (
              <p className="text-xs text-teal-600">{intentSuccessCriterion}</p>
            )}
          </div>
        </div>
      )}

      {/* Pomodoro Indicator */}
      {mode === "pomodoro" && (
        <PomodoroIndicator
          currentInterval={pomodoroInterval}
          intervalType={pomodoroIntervalType}
        />
      )}

      {/* Timer Display */}
      <div
        className={cn(
          "flex h-48 w-48 items-center justify-center rounded-full border-4 transition-colors sm:h-56 sm:w-56",
          ringColor
        )}
      >
        <span
          className="text-5xl font-black tabular-nums tracking-tight text-gray-900 sm:text-6xl"
          aria-label={`Time remaining: ${display}`}
        >
          {display}
        </span>
      </div>

      {/* ARIA Live Region */}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        role="timer"
      >
        {announcement}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {/* Idle — initial start */}
        {timerState === "idle" && !isWaitingForNextWork && (
          <Button
            size="lg"
            className="h-12 min-w-[120px] gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-base active:scale-95"
            onClick={handleStart}
          >
            <Play className="h-5 w-5" />
            Start
          </Button>
        )}

        {/* Waiting for next Pomodoro work interval */}
        {isWaitingForNextWork && (
          <>
            <Button
              size="lg"
              className="h-12 min-w-[120px] gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-base active:scale-95"
              onClick={handleStartNextWork}
            >
              <Play className="h-5 w-5" />
              Start Next
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 text-base"
              onClick={handleEnd}
            >
              <Square className="h-4 w-4" />
              End Session
            </Button>
          </>
        )}

        {/* Running — pause + end */}
        {timerState === "running" && (
          <>
            <Button
              variant="outline"
              size="lg"
              className="h-12 min-w-[100px] gap-2 text-base"
              onClick={handlePause}
            >
              <Pause className="h-5 w-5" />
              Pause
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 text-base text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleEnd}
            >
              <Square className="h-4 w-4" />
              End
            </Button>
          </>
        )}

        {/* Paused — resume + end */}
        {timerState === "paused" && (
          <>
            <Button
              size="lg"
              className="h-12 min-w-[120px] gap-2 bg-gradient-to-r from-teal-500 to-blue-600 text-base active:scale-95"
              onClick={handleResume}
            >
              <Play className="h-5 w-5" />
              Resume
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 text-base text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleEnd}
            >
              <Square className="h-4 w-4" />
              End
            </Button>
          </>
        )}

        {/* On break — skip break + end */}
        {isOnBreak && (
          <>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 text-base"
              onClick={handleSkipBreak}
            >
              <SkipForward className="h-4 w-4" />
              Skip Break
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-12 gap-2 text-base text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={handleEnd}
            >
              <Square className="h-4 w-4" />
              End
            </Button>
          </>
        )}

        {/* Completed — audio icon indicator */}
        {timerState === "completed" && (
          <div className="flex items-center gap-2 text-green-600">
            <Volume2 className="h-5 w-5" />
            <span className="text-sm font-medium">Session Complete</span>
          </div>
        )}
      </div>

      {/* Flow Check-In Dialog (Pomodoro break transitions + custom midpoint) */}
      {session && (
        <FlowCheckInDialog
          key={`flow-${session.id}-${flowCheckInInterval}`}
          open={flowDialogOpen}
          onOpenChange={setFlowDialogOpen}
          sessionId={session.id}
          intervalNumber={flowCheckInInterval}
          onComplete={handleFlowComplete}
        />
      )}

      {/* Timer mode badge */}
      <Badge
        className={cn(
          "text-xs",
          mode === "pomodoro"
            ? "bg-blue-100 text-blue-700"
            : "bg-gray-100 text-gray-600"
        )}
      >
        {mode === "pomodoro" ? "Pomodoro Mode" : "Custom Timer"}
      </Badge>
    </div>
  );
};

export default FocusTimer;
export type { FocusTimerProps };
