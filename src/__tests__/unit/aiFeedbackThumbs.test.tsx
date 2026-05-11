import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import AIFeedbackThumbs from "@/components/shared/AIFeedbackThumbs";

describe("AIFeedbackThumbs", () => {
  const defaultProps = {
    feedbackId: "fb-1",
    currentFeedback: null as "thumbs_up" | "thumbs_down" | null,
    onFeedback: vi.fn().mockResolvedValue(undefined),
  };

  it("renders thumbs up and thumbs down buttons", () => {
    render(<AIFeedbackThumbs {...defaultProps} />);

    expect(screen.getByLabelText("Thumbs up")).toBeInTheDocument();
    expect(screen.getByLabelText("Thumbs down")).toBeInTheDocument();
  });

  it("calls onFeedback with thumbs_up when thumbs up is clicked", async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<AIFeedbackThumbs {...defaultProps} onFeedback={onFeedback} />);

    fireEvent.click(screen.getByLabelText("Thumbs up"));

    await waitFor(() => {
      expect(onFeedback).toHaveBeenCalledWith("thumbs_up");
    });
  });

  it("calls onFeedback with thumbs_down when thumbs down is clicked", async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<AIFeedbackThumbs {...defaultProps} onFeedback={onFeedback} />);

    fireEvent.click(screen.getByLabelText("Thumbs down"));

    await waitFor(() => {
      expect(onFeedback).toHaveBeenCalledWith("thumbs_down");
    });
  });

  it("highlights thumbs up button when currentFeedback is thumbs_up", () => {
    render(<AIFeedbackThumbs {...defaultProps} currentFeedback="thumbs_up" />);

    const thumbsUp = screen.getByLabelText("Thumbs up");
    expect(thumbsUp).toHaveAttribute("aria-pressed", "true");
    expect(thumbsUp.className).toContain("bg-green-100");
  });

  it("highlights thumbs down button when currentFeedback is thumbs_down", () => {
    render(
      <AIFeedbackThumbs {...defaultProps} currentFeedback="thumbs_down" />
    );

    const thumbsDown = screen.getByLabelText("Thumbs down");
    expect(thumbsDown).toHaveAttribute("aria-pressed", "true");
    expect(thumbsDown.className).toContain("bg-red-100");
  });

  it("does not call onFeedback when clicking already-selected feedback", async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(
      <AIFeedbackThumbs
        {...defaultProps}
        currentFeedback="thumbs_up"
        onFeedback={onFeedback}
      />
    );

    fireEvent.click(screen.getByLabelText("Thumbs up"));

    // Wait a tick to ensure no async call was made
    await new Promise((r) => setTimeout(r, 50));
    expect(onFeedback).not.toHaveBeenCalled();
  });

  it("disables buttons while submitting", async () => {
    let resolvePromise: () => void;
    const slowFeedback = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolvePromise = resolve;
        })
    );

    render(<AIFeedbackThumbs {...defaultProps} onFeedback={slowFeedback} />);

    fireEvent.click(screen.getByLabelText("Thumbs up"));

    // Both buttons should be disabled while submitting
    expect(screen.getByLabelText("Thumbs up")).toBeDisabled();
    expect(screen.getByLabelText("Thumbs down")).toBeDisabled();

    // Resolve the promise
    resolvePromise!();
    await waitFor(() => {
      expect(screen.getByLabelText("Thumbs up")).not.toBeDisabled();
    });
  });

  it("has proper accessibility attributes", () => {
    render(<AIFeedbackThumbs {...defaultProps} />);

    const group = screen.getByRole("group");
    expect(group).toHaveAttribute("aria-label", "Rate this suggestion");

    expect(screen.getByLabelText("Thumbs up")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByLabelText("Thumbs down")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });
});
