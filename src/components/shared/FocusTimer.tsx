import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, SkipForward } from "lucide-react";
import { getTimerAnnouncement } from "@/lib/plannerUtils";
import type {
  TimerState,
  PomodoroIntervalType,
  TimerMode,
} from "@/types/planner";

interface FocusTimerProps {
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

const intervalTypeLabels: Record<PomodoroIntervalType, string> = {
  work: "Work",
  break: "Break",
  long_break: "Long Break",
};

const intervalTypeColors: Record<PomodoroIntervalType, string> = {
  work: "text-blue-600",
  break: "text-green-600",
  long_break: "text-teal-600",
};

const FocusTimer = ({
  display,
  remainingMs,
  timerState,
  mode,
  pomodoroInterval,
  pomodoroIntervalType,
  sessionTitle,
  courseName,
  onStart,
  onPause,
  onResume,
  onEnd,
  onSkipBreak,
}: FocusTimerProps) => {
  const isRunning = timerState === "running";
  const isPaused = timerState === "paused";
  const isBreak = timerState === "break" || timerState === "long_break";
  const isIdle = timerState === "idle";

  // ARIA live region: announce remaining time at 5-min intervals and 1-min mark
  const isTimerActive =
    timerState === "running" ||
    timerState === "break" ||
    timerState === "long_break";
  const currentAnnouncement = isTimerActive
    ? getTimerAnnouncement(remainingMs) ?? ""
    : "";

  return (
    <div className="flex flex-col items-center justify-center space-y-8">
      {/* Session context */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-bold tracking-tight">{sessionTitle}</h2>
        {courseName && <p className="text-sm text-gray-500">{courseName}</p>}
      </div>

      {/* Pomodoro indicator */}
      {mode === "pomodoro" && (
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "text-sm font-semibold",
              intervalTypeColors[pomodoroIntervalType]
            )}
          >
            {intervalTypeLabels[pomodoroIntervalType]}
          </span>
          <span className="text-xs text-gray-400">
            Interval {Math.floor(pomodoroInterval / 2) + 1}
          </span>
          {/* Progress dots */}
          <div className="flex gap-1">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-2 w-2 rounded-full",
                  i <
                    Math.floor(pomodoroInterval / 2) +
                      (pomodoroIntervalType === "work" ? 0 : 1)
                    ? "bg-blue-500"
                    : "bg-gray-200"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Timer display */}
      <div
        className="text-7xl font-black tabular-nums tracking-tight"
        role="timer"
        aria-label={`Time remaining: ${display}`}
      >
        {display}
      </div>

      {/* ARIA live region for screen reader announcements at 5-min intervals and 1-min mark */}
      <span
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
        data-testid="timer-announcement"
      >
        {currentAnnouncement}
      </span>

      {/* Controls */}
      <div className="flex items-center gap-4">
        {isIdle && (
          <Button
            size="lg"
            className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95 px-8"
            onClick={onStart}
          >
            <Play className="h-5 w-5" /> Start
          </Button>
        )}

        {isRunning && (
          <>
            <Button size="lg" variant="outline" onClick={onPause}>
              <Pause className="h-5 w-5" /> Pause
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={onEnd}
            >
              <Square className="h-5 w-5" /> End
            </Button>
          </>
        )}

        {isPaused && (
          <>
            <Button
              size="lg"
              className="bg-gradient-to-r from-teal-500 to-blue-600 text-white active:scale-95"
              onClick={onResume}
            >
              <Play className="h-5 w-5" /> Resume
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={onEnd}
            >
              <Square className="h-5 w-5" /> End
            </Button>
          </>
        )}

        {isBreak && (
          <>
            <Button size="lg" variant="outline" onClick={onSkipBreak}>
              <SkipForward className="h-5 w-5" /> Skip Break
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              onClick={onEnd}
            >
              <Square className="h-5 w-5" /> End Session
            </Button>
          </>
        )}
      </div>
    </div>
  );
};

export default FocusTimer;
