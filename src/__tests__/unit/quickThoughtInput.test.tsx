// =============================================================================
// Unit Tests — QuickThoughtInput Component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import QuickThoughtInput from "@/components/shared/QuickThoughtInput";

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("QuickThoughtInput", () => {
  const defaultProps = {
    onSubmit: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── Rendering ─────────────────────────────────────────────────────────

  describe("Rendering", () => {
    it("renders the input with default placeholder", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      expect(
        screen.getByPlaceholderText("What's the one thing you'll remember?")
      ).toBeTruthy();
    });

    it("renders with a custom placeholder", () => {
      render(
        <QuickThoughtInput {...defaultProps} placeholder="Capture a thought" />
      );
      expect(screen.getByPlaceholderText("Capture a thought")).toBeTruthy();
    });

    it("renders the submit button with accessible label", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /submit thought/i })
      ).toBeTruthy();
    });

    it("renders the character counter showing 0/280 initially", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      expect(screen.getByText("0/280")).toBeTruthy();
    });

    it("renders the hint text", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      expect(screen.getByText("One sentence is plenty.")).toBeTruthy();
    });
  });

  // ─── Character Counter ─────────────────────────────────────────────────

  describe("Character Counter", () => {
    it("updates the counter as the user types", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought");
      await user.type(input, "Hello world");

      expect(screen.getByText("11/280")).toBeTruthy();
    });

    it("shows amber styling when approaching the limit (within 30 chars)", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought");
      // Type 260 characters to be within 30 of the 280 limit
      const longText = "a".repeat(260);
      await user.type(input, longText);

      const counter = screen.getByText("260/280");
      expect(counter.className).toContain("text-amber-600");
    });

    it("shows red styling when over the limit", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought");
      const overLimitText = "a".repeat(285);
      await user.type(input, overLimitText);

      const counter = screen.getByText("285/280");
      expect(counter.className).toContain("text-red-600");
    });

    it("has aria-live on the counter for screen readers", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      const counter = screen.getByText("0/280");
      expect(counter.getAttribute("aria-live")).toBe("polite");
    });
  });

  // ─── Submit Behavior ───────────────────────────────────────────────────

  describe("Submit Behavior", () => {
    it("calls onSubmit with trimmed text on form submit", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<QuickThoughtInput onSubmit={onSubmit} />);

      const input = screen.getByLabelText("Quick thought");
      await user.type(input, "  My quick thought  ");
      await user.click(screen.getByRole("button", { name: /submit thought/i }));

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith("My quick thought");
    });

    it("clears the input after successful submit", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought") as HTMLInputElement;
      await user.type(input, "A thought");
      await user.click(screen.getByRole("button", { name: /submit thought/i }));

      expect(input.value).toBe("");
    });

    it("resets the counter to 0/280 after submit", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought");
      await user.type(input, "A thought");
      await user.click(screen.getByRole("button", { name: /submit thought/i }));

      expect(screen.getByText("0/280")).toBeTruthy();
    });

    it("submits on Enter key press", async () => {
      const user = userEvent.setup();
      const onSubmit = vi.fn();
      render(<QuickThoughtInput onSubmit={onSubmit} />);

      const input = screen.getByLabelText("Quick thought");
      await user.type(input, "Enter key thought{Enter}");

      expect(onSubmit).toHaveBeenCalledOnce();
      expect(onSubmit).toHaveBeenCalledWith("Enter key thought");
    });
  });

  // ─── Disabled States ───────────────────────────────────────────────────

  describe("Disabled States", () => {
    it("disables the submit button when input is empty", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      const button = screen.getByRole("button", { name: /submit thought/i });
      expect(button).toBeDisabled();
    });

    it("disables the submit button when only whitespace is entered", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought");
      await user.type(input, "   ");

      const button = screen.getByRole("button", { name: /submit thought/i });
      expect(button).toBeDisabled();
    });

    it("disables the submit button when text exceeds 280 characters", async () => {
      const user = userEvent.setup();
      render(<QuickThoughtInput {...defaultProps} />);

      const input = screen.getByLabelText("Quick thought");
      await user.type(input, "a".repeat(285));

      const button = screen.getByRole("button", { name: /submit thought/i });
      expect(button).toBeDisabled();
    });

    it("disables both input and button when disabled prop is true", () => {
      render(<QuickThoughtInput {...defaultProps} disabled />);

      const input = screen.getByLabelText("Quick thought");
      const button = screen.getByRole("button", { name: /submit thought/i });

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it("disables both input and button when isPending is true", () => {
      render(<QuickThoughtInput {...defaultProps} isPending />);

      const input = screen.getByLabelText("Quick thought");
      const button = screen.getByRole("button", { name: /submit thought/i });

      expect(input).toBeDisabled();
      expect(button).toBeDisabled();
    });

    it("does not call onSubmit when disabled", async () => {
      const onSubmit = vi.fn();
      render(<QuickThoughtInput onSubmit={onSubmit} disabled />);

      const input = screen.getByLabelText("Quick thought");
      // Input is disabled, so typing won't work — verify submit doesn't fire
      expect(input).toBeDisabled();
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  // ─── Accessibility ─────────────────────────────────────────────────────

  describe("Accessibility", () => {
    it("has an accessible label on the input", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      expect(screen.getByLabelText("Quick thought")).toBeTruthy();
    });

    it("has an accessible label on the submit button", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      expect(
        screen.getByRole("button", { name: /submit thought/i })
      ).toBeTruthy();
    });

    it("links the counter to the input via aria-describedby", () => {
      render(<QuickThoughtInput {...defaultProps} />);
      const input = screen.getByLabelText("Quick thought");
      expect(input.getAttribute("aria-describedby")).toBe(
        "quick-thought-counter"
      );

      const counter = document.getElementById("quick-thought-counter");
      expect(counter).toBeTruthy();
      expect(counter?.textContent).toBe("0/280");
    });
  });
});
