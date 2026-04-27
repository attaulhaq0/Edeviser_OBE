// =============================================================================
// Unit Tests — FocusTimer Component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import FocusTimer from "@/components/shared/FocusTimer";
import type { FocusTimerReturn } from "@/hooks/useFocusTimer";
import type { StudySession } from "@/types/planner";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/hooks/useOfflineQueue", () => ({
  useOfflineQueue: () => ({
    isOnline: true,
    queueSize: 0,
    isFlushing: false,
    enqueue: vi.fn(),
    flush: vi.fn(),
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSession = (overrides: Partial<StudySession> = {}): StudySession => ({
  id: "session-1",
  studentId: "student-1",
  courseId: "course-1",
  courseName: "Math 101",
  title: "Review Chapter 5",
  description: null,
  plannedDate: "2025-06-16",
  plannedStartTime: "09:00",
  plannedDurationMinutes: 25,
  actualStartAt: null,
  actualEndAt: null,
  actualDurationMinutes: null,
  timerMode: "pomodoro",
  status: "planned",
  satisfactionRating: null,
  cloIds: null,
  createdAt: "2025-06-15T00:00:00Z",
  ...overrides,
});

const makeTimer = (
  overrides: Partial<FocusTimerReturn> = {}
): FocusTimerReturn => ({
  timerState: "idle",
  display: "25:00",
  remainingMs: 25 * 60 * 1000,
  totalElapsedMs: 0,
  pomodoroInterval: 0,
  pomodoroIntervalType: "work",
  mode: "pomodoro",
  start: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  end: vi.fn(),
  skipBreak: vi.fn(),
  actualDurationMinutes: 0,
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("FocusTimer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Timer Display", () => {
    it("renders the timer display in MM:SS format", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      expect(screen.getByText("25:00")).toBeTruthy();
    });

    it("renders different time values", () => {
      render(
        <FocusTimer
          timer={makeTimer({ display: "12:34", remainingMs: 754000 })}
          session={makeSession()}
        />
      );
      expect(screen.getByText("12:34")).toBeTruthy();
    });

    it("has aria-label on timer display", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      const timerEl = screen.getByLabelText(/time remaining/i);
      expect(timerEl).toBeTruthy();
    });
  });

  describe("Session Context", () => {
    it("renders session title", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      expect(screen.getByText("Review Chapter 5")).toBeTruthy();
    });

    it("renders course name", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      expect(screen.getByText("Math 101")).toBeTruthy();
    });

    it("renders CLO titles when provided", () => {
      render(
        <FocusTimer
          timer={makeTimer()}
          session={makeSession()}
          cloTitles={["Understand derivatives", "Apply chain rule"]}
        />
      );
      expect(screen.getByText("Understand derivatives")).toBeTruthy();
      expect(screen.getByText("Apply chain rule")).toBeTruthy();
    });

    it("renders intent text when provided", () => {
      render(
        <FocusTimer
          timer={makeTimer()}
          session={makeSession()}
          intentText="Focus on integration by parts"
        />
      );
      expect(screen.getByText(/Focus on integration by parts/)).toBeTruthy();
    });

    it("does not render session context when session is null", () => {
      render(<FocusTimer timer={makeTimer()} session={null} />);
      expect(screen.queryByText("Review Chapter 5")).toBeNull();
    });
  });

  describe("Controls — Idle State", () => {
    it("shows Start button in idle state", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      expect(screen.getByRole("button", { name: /start/i })).toBeTruthy();
    });

    it("calls start when Start button is clicked", async () => {
      const user = userEvent.setup();
      const startFn = vi.fn();
      render(
        <FocusTimer
          timer={makeTimer({ start: startFn })}
          session={makeSession()}
        />
      );
      await user.click(screen.getByRole("button", { name: /start/i }));
      expect(startFn).toHaveBeenCalledOnce();
    });
  });

  describe("Controls — Running State", () => {
    it("shows Pause and End buttons when running", () => {
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "running" })}
          session={makeSession()}
        />
      );
      expect(screen.getByRole("button", { name: /pause/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /end/i })).toBeTruthy();
    });

    it("calls pause when Pause button is clicked", async () => {
      const user = userEvent.setup();
      const pauseFn = vi.fn();
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "running", pause: pauseFn })}
          session={makeSession()}
        />
      );
      await user.click(screen.getByRole("button", { name: /pause/i }));
      expect(pauseFn).toHaveBeenCalledOnce();
    });

    it("calls end and onEnd when End button is clicked", async () => {
      const user = userEvent.setup();
      const endFn = vi.fn();
      const onEnd = vi.fn();
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "running", end: endFn })}
          session={makeSession()}
          onEnd={onEnd}
        />
      );
      await user.click(screen.getByRole("button", { name: /end/i }));
      expect(endFn).toHaveBeenCalledOnce();
      expect(onEnd).toHaveBeenCalledOnce();
    });
  });

  describe("Controls — Paused State", () => {
    it("shows Resume and End buttons when paused", () => {
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "paused" })}
          session={makeSession()}
        />
      );
      expect(screen.getByRole("button", { name: /resume/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /end/i })).toBeTruthy();
    });

    it("calls resume when Resume button is clicked", async () => {
      const user = userEvent.setup();
      const resumeFn = vi.fn();
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "paused", resume: resumeFn })}
          session={makeSession()}
        />
      );
      await user.click(screen.getByRole("button", { name: /resume/i }));
      expect(resumeFn).toHaveBeenCalledOnce();
    });
  });

  describe("Controls — Break State", () => {
    it("shows Skip Break and End buttons during break", () => {
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "break" })}
          session={makeSession()}
        />
      );
      expect(screen.getByRole("button", { name: /skip break/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /end/i })).toBeTruthy();
    });

    it("calls skipBreak when Skip Break is clicked", async () => {
      const user = userEvent.setup();
      const skipBreakFn = vi.fn();
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "break", skipBreak: skipBreakFn })}
          session={makeSession()}
        />
      );
      await user.click(screen.getByRole("button", { name: /skip break/i }));
      expect(skipBreakFn).toHaveBeenCalledOnce();
    });

    it("shows Skip Break during long break too", () => {
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "long_break" })}
          session={makeSession()}
        />
      );
      expect(screen.getByRole("button", { name: /skip break/i })).toBeTruthy();
    });
  });

  describe("Controls — Waiting for Next Work (Pomodoro)", () => {
    it("shows Start Next and End Session when waiting for next work interval", () => {
      render(
        <FocusTimer
          timer={makeTimer({
            timerState: "idle",
            mode: "pomodoro",
            pomodoroInterval: 2,
          })}
          session={makeSession()}
        />
      );
      expect(screen.getByRole("button", { name: /start next/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /end session/i })).toBeTruthy();
    });
  });

  describe("Completed State", () => {
    it('shows "Session Complete" text when completed', () => {
      render(
        <FocusTimer
          timer={makeTimer({ timerState: "completed" })}
          session={makeSession()}
        />
      );
      expect(screen.getByText("Session Complete")).toBeTruthy();
    });
  });

  describe("Pomodoro Indicator", () => {
    it("renders PomodoroIndicator in pomodoro mode", () => {
      render(
        <FocusTimer
          timer={makeTimer({ mode: "pomodoro" })}
          session={makeSession()}
        />
      );
      expect(screen.getByText("Pomodoro 1 of 4")).toBeTruthy();
    });

    it("does not render PomodoroIndicator in custom mode", () => {
      render(
        <FocusTimer
          timer={makeTimer({ mode: "custom" })}
          session={makeSession()}
        />
      );
      expect(screen.queryByText(/Pomodoro \d+ of 4/)).toBeNull();
    });
  });

  describe("Timer Mode Badge", () => {
    it('shows "Pomodoro Mode" badge in pomodoro mode', () => {
      render(
        <FocusTimer
          timer={makeTimer({ mode: "pomodoro" })}
          session={makeSession()}
        />
      );
      expect(screen.getByText("Pomodoro Mode")).toBeTruthy();
    });

    it('shows "Custom Timer" badge in custom mode', () => {
      render(
        <FocusTimer
          timer={makeTimer({ mode: "custom" })}
          session={makeSession()}
        />
      );
      expect(screen.getByText("Custom Timer")).toBeTruthy();
    });
  });

  describe("ARIA Live Region", () => {
    it("renders an ARIA live region for timer announcements", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      const liveRegion = screen.getByRole("timer");
      expect(liveRegion).toBeTruthy();
      expect(liveRegion.getAttribute("aria-live")).toBe("polite");
    });
  });

  describe("Offline Indicator", () => {
    it("does not show offline indicator when online", () => {
      render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
      expect(screen.queryByText(/offline/i)).toBeNull();
    });
  });
});

// ─── Offline Indicator Tests ─────────────────────────────────────────────────

describe("FocusTimer — Offline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows offline indicator when useOfflineQueue returns isOnline=false", async () => {
    // Dynamically re-mock the module for this test
    const offlineMock = await import("@/hooks/useOfflineQueue");
    const originalImpl = offlineMock.useOfflineQueue;

    // Override the module export temporarily
    (offlineMock as Record<string, unknown>).useOfflineQueue = () => ({
      isOnline: false,
      queueSize: 2,
      isFlushing: false,
      enqueue: vi.fn(),
      flush: vi.fn() as unknown as () => Promise<{
        flushed: number;
        failed: number;
      }>,
    });

    render(<FocusTimer timer={makeTimer()} session={makeSession()} />);
    expect(screen.getByText(/offline/i)).toBeTruthy();
    expect(screen.getByRole("alert")).toBeTruthy();

    // Restore
    (offlineMock as Record<string, unknown>).useOfflineQueue = originalImpl;
  });
});
