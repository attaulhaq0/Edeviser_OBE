// =============================================================================
// Unit Tests — StudySessionCard
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import StudySessionCard from "@/components/shared/StudySessionCard";
import type { StudySession } from "@/types/planner";

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

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("StudySessionCard", () => {
  it("renders session title", () => {
    render(<StudySessionCard session={makeSession()} />);
    expect(screen.getByText("Review Chapter 5")).toBeTruthy();
  });

  it("renders start time", () => {
    render(
      <StudySessionCard session={makeSession({ plannedStartTime: "14:30" })} />
    );
    expect(screen.getByText("14:30")).toBeTruthy();
  });

  it("renders course name", () => {
    render(
      <StudySessionCard session={makeSession({ courseName: "Physics 201" })} />
    );
    expect(screen.getByText("Physics 201")).toBeTruthy();
  });

  it("renders duration in minutes for short sessions", () => {
    render(
      <StudySessionCard session={makeSession({ plannedDurationMinutes: 45 })} />
    );
    expect(screen.getByText("45m")).toBeTruthy();
  });

  it("renders duration in hours for long sessions", () => {
    render(
      <StudySessionCard
        session={makeSession({ plannedDurationMinutes: 120 })}
      />
    );
    expect(screen.getByText("2h")).toBeTruthy();
  });

  it("renders mixed duration format", () => {
    render(
      <StudySessionCard session={makeSession({ plannedDurationMinutes: 90 })} />
    );
    expect(screen.getByText("1h 30m")).toBeTruthy();
  });

  it("renders status badge for planned session", () => {
    render(<StudySessionCard session={makeSession({ status: "planned" })} />);
    expect(screen.getByText("Planned")).toBeTruthy();
  });

  it("renders status badge for completed session", () => {
    render(<StudySessionCard session={makeSession({ status: "completed" })} />);
    expect(screen.getByText("Completed")).toBeTruthy();
  });

  it("renders status badge for in_progress session", () => {
    render(
      <StudySessionCard session={makeSession({ status: "in_progress" })} />
    );
    expect(screen.getByText("In Progress")).toBeTruthy();
  });

  it("renders status badge for cancelled session", () => {
    render(<StudySessionCard session={makeSession({ status: "cancelled" })} />);
    expect(screen.getByText("Cancelled")).toBeTruthy();
  });

  it("shows Start button for planned sessions", () => {
    const onStart = vi.fn();
    render(<StudySessionCard session={makeSession()} onStart={onStart} />);
    expect(screen.getByRole("button", { name: /start/i })).toBeTruthy();
  });

  it("shows Edit button for planned sessions", () => {
    const onEdit = vi.fn();
    render(<StudySessionCard session={makeSession()} onEdit={onEdit} />);
    expect(screen.getByRole("button", { name: /edit/i })).toBeTruthy();
  });

  it("does not show Start button for completed sessions", () => {
    const onStart = vi.fn();
    render(
      <StudySessionCard
        session={makeSession({ status: "completed" })}
        onStart={onStart}
      />
    );
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
  });

  it("does not show Edit button for completed sessions", () => {
    const onEdit = vi.fn();
    render(
      <StudySessionCard
        session={makeSession({ status: "completed" })}
        onEdit={onEdit}
      />
    );
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("calls onStart when Start button is clicked", async () => {
    const user = userEvent.setup();
    const onStart = vi.fn();
    const session = makeSession();
    render(<StudySessionCard session={session} onStart={onStart} />);

    await user.click(screen.getByRole("button", { name: /start/i }));
    expect(onStart).toHaveBeenCalledWith(session);
  });

  it("calls onEdit when Edit button is clicked", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const session = makeSession();
    render(<StudySessionCard session={session} onEdit={onEdit} />);

    await user.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalledWith(session);
  });

  it("does not show action buttons in compact mode", () => {
    const onStart = vi.fn();
    const onEdit = vi.fn();
    render(
      <StudySessionCard
        session={makeSession()}
        onStart={onStart}
        onEdit={onEdit}
        compact
      />
    );
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });

  it("does not show action buttons when no handlers provided", () => {
    render(<StudySessionCard session={makeSession()} />);
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /edit/i })).toBeNull();
  });
});
