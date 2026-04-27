// =============================================================================
// Unit Tests — SessionCompletionForm Component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionCompletionForm from "@/components/shared/SessionCompletionForm";
import type { StudySession } from "@/types/planner";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockReflectionMutate = vi.fn();

vi.mock("@/hooks/useSessionCompletion", () => ({
  useCompleteSession: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock("@/hooks/useSessionReflections", () => ({
  useSaveSessionReflection: () => ({
    mutate: mockReflectionMutate,
    isPending: false,
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
  status: "in_progress",
  satisfactionRating: null,
  cloIds: null,
  createdAt: "2025-06-15T00:00:00Z",
  ...overrides,
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SessionCompletionForm", () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the completion header with duration", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByText("Session Complete!")).toBeTruthy();
      expect(screen.getByText(/25 minutes/)).toBeTruthy();
    });

    it("renders satisfaction rating stars", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      const stars = screen.getAllByRole("button", { name: /rate \d star/i });
      expect(stars).toHaveLength(5);
    });

    it("renders session notes textarea", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByPlaceholderText(/what did you work on/i)).toBeTruthy();
    });

    it("renders evidence uploader section", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByText("Evidence")).toBeTruthy();
      expect(screen.getByLabelText(/upload evidence files/i)).toBeTruthy();
    });

    it("renders session reflection input", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByText("Session Reflection")).toBeTruthy();
    });

    it("renders Submit and Skip buttons", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(
        screen.getByRole("button", { name: /submit & finish/i })
      ).toBeTruthy();
      expect(screen.getByRole("button", { name: /skip/i })).toBeTruthy();
    });
  });

  describe("Star Rating", () => {
    it("allows selecting a star rating", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );

      const star3 = screen.getByRole("button", { name: /rate 3 stars/i });
      await user.click(star3);

      // After clicking 3 stars, stars 1-3 should be filled (amber)
      const stars = screen.getAllByRole("button", { name: /rate \d star/i });
      // Star 4 and 5 should not be filled
      expect(stars[3]?.className).toContain("text-gray-300");
    });
  });

  describe("Submit Flow", () => {
    it("calls completeSession.mutate with form data on submit", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={30}
          onComplete={onComplete}
        />
      );

      // Add notes
      const notesInput = screen.getByPlaceholderText(/what did you work on/i);
      await user.type(notesInput, "Studied derivatives");

      // Rate 4 stars
      await user.click(screen.getByRole("button", { name: /rate 4 stars/i }));

      // Submit
      await user.click(
        screen.getByRole("button", { name: /submit & finish/i })
      );

      expect(mockMutate).toHaveBeenCalledOnce();
      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs).toMatchObject({
        sessionId: "session-1",
        actualDurationMinutes: 30,
        notes: "Studied derivatives",
        satisfactionRating: 4,
      });
    });

    it("calls completeSession.mutate with minimal data on skip", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );

      await user.click(screen.getByRole("button", { name: /skip/i }));

      expect(mockMutate).toHaveBeenCalledOnce();
      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs).toMatchObject({
        sessionId: "session-1",
        actualDurationMinutes: 25,
      });
      // No notes, rating, or evidence on skip
      expect(callArgs.notes).toBeUndefined();
      expect(callArgs.satisfactionRating).toBeUndefined();
      expect(callArgs.evidenceFiles).toBeUndefined();
    });
  });

  describe("Reflection", () => {
    it("renders reflection word count indicator", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByText(/0 \/ 30 words/)).toBeTruthy();
    });

    it("disables save reflection button when below minimum words", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      const saveBtn = screen.getByRole("button", { name: /save reflection/i });
      expect(saveBtn).toBeDisabled();
    });
  });
});
