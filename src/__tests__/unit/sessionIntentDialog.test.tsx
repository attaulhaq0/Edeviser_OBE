// =============================================================================
// Unit Tests — SessionIntentDialog Component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import SessionIntentDialog from "@/components/shared/SessionIntentDialog";
import type { SuggestedIntent } from "@/types/planner";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
const mockSuggestions: SuggestedIntent[] = [
  {
    concept: "Quadratic equations",
    successCriterion:
      "Solve 3 practice problems on Quadratic equations correctly",
  },
  {
    concept: "Chapter 5 Review",
    successCriterion: "Complete an outline / first draft for Chapter 5 Review",
  },
];

vi.mock("@/hooks/useSessionIntent", () => ({
  useSaveSessionIntent: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
  useSuggestedIntents: () => ({
    data: mockSuggestions,
    isLoading: false,
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SessionIntentDialog", () => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    sessionId: "session-123",
    onSubmit: vi.fn(),
    onSkip: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the dialog title and description", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(screen.getByText("Set Your Intent")).toBeTruthy();
      expect(
        screen.getByText(/what will you focus on this session/i)
      ).toBeTruthy();
    });

    it("renders concept and success criterion input fields", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(
        screen.getByLabelText(/what specific concept will you work on/i)
      ).toBeTruthy();
      expect(
        screen.getByLabelText(/what does success look like/i)
      ).toBeTruthy();
    });

    it("renders Skip and Submit buttons", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(screen.getByRole("button", { name: /skip/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /submit/i })).toBeTruthy();
    });

    it("renders suggested intent chips when suggestions are available", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(screen.getByText("Suggested intents")).toBeTruthy();
      expect(screen.getByText("Quadratic equations")).toBeTruthy();
      expect(screen.getByText("Chapter 5 Review")).toBeTruthy();
    });

    it("does not render when open is false", () => {
      render(<SessionIntentDialog {...defaultProps} open={false} />);
      expect(screen.queryByText("Set Your Intent")).toBeNull();
    });
  });

  describe("Chip Interaction", () => {
    it("populates form fields when a suggestion chip is clicked", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      const chip = screen.getByRole("button", {
        name: /use suggestion: quadratic equations/i,
      });
      await user.click(chip);

      const conceptInput = screen.getByLabelText(
        /what specific concept will you work on/i
      ) as HTMLInputElement;
      const criterionInput = screen.getByLabelText(
        /what does success look like/i
      ) as HTMLInputElement;

      expect(conceptInput.value).toBe("Quadratic equations");
      expect(criterionInput.value).toBe(
        "Solve 3 practice problems on Quadratic equations correctly"
      );
    });

    it("highlights the selected chip", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      const chip = screen.getByRole("button", {
        name: /use suggestion: quadratic equations/i,
      });
      await user.click(chip);

      // The badge inside the chip should have the active styling
      const badge = chip.querySelector("[data-slot='badge']");
      expect(badge?.className).toContain("bg-teal-50");
    });
  });

  describe("Skip Action", () => {
    it("calls onSkip and closes dialog when Skip is clicked", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /skip/i }));

      expect(defaultProps.onSkip).toHaveBeenCalledOnce();
      expect(defaultProps.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not call mutate when Skip is clicked", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /skip/i }));

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("Submit Action", () => {
    it("calls mutate with form data on valid submit", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      const conceptInput = screen.getByLabelText(
        /what specific concept will you work on/i
      );
      const criterionInput = screen.getByLabelText(
        /what does success look like/i
      );

      await user.type(conceptInput, "Linear algebra basics");
      await user.type(
        criterionInput,
        "Complete matrix multiplication exercises"
      );

      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledOnce();
      });

      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs).toMatchObject({
        sessionId: "session-123",
        concept: "Linear algebra basics",
        successCriterion: "Complete matrix multiplication exercises",
        isAutoSuggested: false,
      });
    });

    it("marks isAutoSuggested true when submitting a suggestion", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      // Click a suggestion chip
      await user.click(
        screen.getByRole("button", {
          name: /use suggestion: quadratic equations/i,
        })
      );

      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledOnce();
      });

      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs.isAutoSuggested).toBe(true);
    });

    it("shows validation errors for empty fields", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(
          screen.getAllByText(/at least 5 characters/i).length
        ).toBeGreaterThanOrEqual(1);
      });

      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("shows validation error for too-short concept", async () => {
      const user = userEvent.setup();
      render(<SessionIntentDialog {...defaultProps} />);

      const conceptInput = screen.getByLabelText(
        /what specific concept will you work on/i
      );
      await user.type(conceptInput, "abc");

      await user.click(screen.getByRole("button", { name: /submit/i }));

      await waitFor(() => {
        expect(
          screen.getAllByText(/at least 5 characters/i).length
        ).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe("Accessibility", () => {
    it("has an accessible dialog label", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(
        screen.getByRole("dialog", { name: /set your intent/i })
      ).toBeTruthy();
    });

    it("has an accessible group for suggested intents", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(
        screen.getByRole("group", { name: /suggested intents/i })
      ).toBeTruthy();
    });

    it("each chip has an accessible label", () => {
      render(<SessionIntentDialog {...defaultProps} />);
      expect(
        screen.getByRole("button", {
          name: /use suggestion: quadratic equations/i,
        })
      ).toBeTruthy();
      expect(
        screen.getByRole("button", {
          name: /use suggestion: chapter 5 review/i,
        })
      ).toBeTruthy();
    });
  });
});
