// =============================================================================
// Unit Tests — FlowCheckInDialog Component
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FlowCheckInDialog from "@/components/shared/FlowCheckInDialog";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

vi.mock("@/hooks/useFlowCheckIns", () => ({
  useSaveFlowCheckIn: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const renderDialog = (
  props: Partial<Parameters<typeof FlowCheckInDialog>[0]> = {}
) => {
  const defaultProps = {
    open: true,
    onOpenChange: vi.fn(),
    sessionId: "session-abc",
    intervalNumber: 2,
    onComplete: vi.fn(),
    ...props,
  };

  return {
    ...render(
      <MemoryRouter>
        <FlowCheckInDialog {...defaultProps} />
      </MemoryRouter>
    ),
    props: defaultProps,
  };
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("FlowCheckInDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Rendering", () => {
    it("renders the dialog title and interval description", () => {
      renderDialog();
      expect(screen.getByText("Quick Check-In")).toBeTruthy();
      expect(screen.getByText(/interval 2 done/i)).toBeTruthy();
    });

    it("renders all three response buttons", () => {
      renderDialog();
      expect(screen.getByRole("button", { name: /in the zone/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /stuck/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /too easy/i })).toBeTruthy();
    });

    it("renders a dismiss button", () => {
      renderDialog();
      expect(
        screen.getByRole("button", { name: /dismiss check-in/i })
      ).toBeTruthy();
    });

    it("does not render when open is false", () => {
      renderDialog({ open: false });
      expect(screen.queryByText("Quick Check-In")).toBeNull();
    });

    it("displays the correct interval number", () => {
      renderDialog({ intervalNumber: 5 });
      expect(screen.getByText(/interval 5 done/i)).toBeTruthy();
    });
  });

  describe("Response: In the zone", () => {
    it("calls mutate with in_the_zone response", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /in the zone/i }));

      expect(mockMutate).toHaveBeenCalledOnce();
      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs).toMatchObject({
        sessionId: "session-abc",
        intervalNumber: 2,
        response: "in_the_zone",
      });
    });

    it("shows encouragement message after selecting in the zone", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /in the zone/i }));

      expect(screen.getByText(/great flow/i)).toBeTruthy();
    });

    it("hides response buttons after selection", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /in the zone/i }));

      expect(
        screen.queryByRole("group", { name: /flow state options/i })
      ).toBeNull();
    });

    it("shows Continue button after selection", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /in the zone/i }));

      expect(
        screen.getByRole("button", { name: /continue to break/i })
      ).toBeTruthy();
    });
  });

  describe("Response: Stuck", () => {
    it("calls mutate with stuck response", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /^stuck$/i }));

      expect(mockMutate).toHaveBeenCalledOnce();
      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs).toMatchObject({
        sessionId: "session-abc",
        intervalNumber: 2,
        response: "stuck",
      });
    });

    it("shows AI Tutor link after selecting stuck", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /^stuck$/i }));

      expect(screen.getByText(/stuck happens/i)).toBeTruthy();
      expect(screen.getByRole("link", { name: /open ai tutor/i })).toBeTruthy();
    });

    it("renders AI Tutor link pointing to /student/tutor", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /^stuck$/i }));

      const link = screen.getByRole("link", { name: /open ai tutor/i });
      expect(link).toBeTruthy();
      expect(link.getAttribute("href")).toBe("/student/tutor");
    });
  });

  describe("Response: Too easy", () => {
    it("calls mutate with too_easy response", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /too easy/i }));

      expect(mockMutate).toHaveBeenCalledOnce();
      const callArgs = mockMutate.mock.calls[0]?.[0];
      expect(callArgs).toMatchObject({
        sessionId: "session-abc",
        intervalNumber: 2,
        response: "too_easy",
      });
    });

    it("shows Bloom's level suggestion after selecting too easy", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(screen.getByRole("button", { name: /too easy/i }));

      expect(screen.getByText(/ready for more challenge/i)).toBeTruthy();
      expect(screen.getByText(/bloom's level/i)).toBeTruthy();
    });
  });

  describe("Dismiss Action", () => {
    it("calls onOpenChange(false) when dismiss is clicked", async () => {
      const user = userEvent.setup();
      const { props } = renderDialog();

      await user.click(
        screen.getByRole("button", { name: /dismiss check-in/i })
      );

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });

    it("does not call mutate when dismiss is clicked", async () => {
      const user = userEvent.setup();
      renderDialog();

      await user.click(
        screen.getByRole("button", { name: /dismiss check-in/i })
      );

      expect(mockMutate).not.toHaveBeenCalled();
    });
  });

  describe("Continue Action", () => {
    it("calls onOpenChange(false) when continue is clicked after response", async () => {
      const user = userEvent.setup();
      const { props } = renderDialog();

      await user.click(screen.getByRole("button", { name: /in the zone/i }));
      await user.click(
        screen.getByRole("button", { name: /continue to break/i })
      );

      expect(props.onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe("Mutation callback", () => {
    it("calls onComplete with the response on successful save", async () => {
      // Make mutate call onSuccess immediately
      mockMutate.mockImplementation(
        (_input: unknown, options: { onSuccess?: () => void }) => {
          options?.onSuccess?.();
        }
      );

      const user = userEvent.setup();
      const { props } = renderDialog();

      await user.click(screen.getByRole("button", { name: /in the zone/i }));

      await waitFor(() => {
        expect(props.onComplete).toHaveBeenCalledWith("in_the_zone");
      });
    });
  });

  describe("Accessibility", () => {
    it("has an accessible dialog label", () => {
      renderDialog();
      // aria-labelledby (DialogTitle) takes precedence over aria-label
      expect(
        screen.getByRole("dialog", { name: /quick check-in/i })
      ).toBeTruthy();
    });

    it("has an accessible group for response buttons", () => {
      renderDialog();
      expect(
        screen.getByRole("group", { name: /flow state options/i })
      ).toBeTruthy();
    });

    it("each response button has an accessible label", () => {
      renderDialog();
      expect(screen.getByRole("button", { name: /in the zone/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /^stuck$/i })).toBeTruthy();
      expect(screen.getByRole("button", { name: /too easy/i })).toBeTruthy();
    });

    it("dismiss button has an accessible label", () => {
      renderDialog();
      expect(
        screen.getByRole("button", { name: /dismiss check-in/i })
      ).toBeTruthy();
    });
  });
});
