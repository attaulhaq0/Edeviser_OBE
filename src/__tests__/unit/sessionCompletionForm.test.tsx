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

    it("renders evidence section with QuickThoughtInput as primary option", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByText("Evidence")).toBeTruthy();
      // QuickThoughtInput is shown by default
      expect(screen.getByLabelText(/quick thought/i)).toBeTruthy();
    });

    it("renders Attach files toggle button", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByText("Attach files")).toBeTruthy();
    });

    it("does not render EvidenceUploader by default", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      // The file upload area should not be visible until "Attach files" is clicked
      expect(screen.queryByLabelText(/upload evidence files/i)).toBeNull();
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

  describe("QuickThoughtInput Integration", () => {
    it("shows QuickThoughtInput by default in the evidence section", () => {
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );
      expect(screen.getByLabelText(/quick thought/i)).toBeTruthy();
      expect(
        screen.getByPlaceholderText(/what's the one thing you'll remember/i)
      ).toBeTruthy();
    });

    it("appends quick thought to session notes on submit", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );

      const thoughtInput = screen.getByLabelText(/quick thought/i);
      await user.type(thoughtInput, "Learned about chain rule");

      const submitThought = screen.getByRole("button", {
        name: /submit thought/i,
      });
      await user.click(submitThought);

      // Should show confirmation message
      expect(screen.getByText(/quick thought captured/i)).toBeTruthy();
      // QuickThoughtInput should no longer be visible
      expect(screen.queryByLabelText(/quick thought/i)).toBeNull();
    });

    it("includes quick thought text in notes when submitting the form", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={30}
          onComplete={onComplete}
        />
      );

      // Submit a quick thought first
      const thoughtInput = screen.getByLabelText(/quick thought/i);
      await user.type(thoughtInput, "Key insight about derivatives");
      await user.click(screen.getByRole("button", { name: /submit thought/i }));

      // Now submit the form
      await user.click(
        screen.getByRole("button", { name: /submit & finish/i })
      );

      expect(mockMutate).toHaveBeenCalledOnce();
      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs.notes).toBe("Key insight about derivatives");
    });

    it("combines existing notes with quick thought text", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={30}
          onComplete={onComplete}
        />
      );

      // Type notes first
      const notesInput = screen.getByPlaceholderText(/what did you work on/i);
      await user.type(notesInput, "Studied calculus");

      // Then submit a quick thought
      const thoughtInput = screen.getByLabelText(/quick thought/i);
      await user.type(thoughtInput, "Chain rule is key");
      await user.click(screen.getByRole("button", { name: /submit thought/i }));

      // Submit the form
      await user.click(
        screen.getByRole("button", { name: /submit & finish/i })
      );

      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs.notes).toBe("Studied calculus\n\nChain rule is key");
    });
  });

  describe("Attach Files Toggle", () => {
    it("expands EvidenceUploader when Attach files is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );

      // Initially no file uploader
      expect(screen.queryByLabelText(/upload evidence files/i)).toBeNull();

      // Click "Attach files"
      await user.click(screen.getByText("Attach files"));

      // Now the EvidenceUploader should be visible
      expect(screen.getByLabelText(/upload evidence files/i)).toBeTruthy();
    });

    it("collapses EvidenceUploader when Hide is clicked", async () => {
      const user = userEvent.setup();
      render(
        <SessionCompletionForm
          session={makeSession()}
          actualDurationMinutes={25}
          onComplete={onComplete}
        />
      );

      // Expand
      await user.click(screen.getByText("Attach files"));
      expect(screen.getByLabelText(/upload evidence files/i)).toBeTruthy();

      // Collapse
      await user.click(screen.getByText("Hide"));
      expect(screen.queryByLabelText(/upload evidence files/i)).toBeNull();
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
