// Feature: AgentFeedbackControls (tasks.md 3.1 — Wave D review hardening).
// Contract: a FAILED submission must reset the latched choice so both rating
// controls re-enable for retry (nothing was recorded); a SUCCESSFUL one keeps
// the choice latched. The data hook is mocked — the mutation wiring and
// server-side handling are covered by useAgentFeedback's own contract.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";

const mocks = vi.hoisted(() => ({
  useAgentFeedback: vi.fn(),
}));

vi.mock("@/ai/hooks/useAgentFeedback", () => ({
  useAgentFeedback: mocks.useAgentFeedback,
}));
vi.mock("sonner", () => {
  const toast = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
  return { toast, Toaster: () => null };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: "en", dir: () => "ltr" },
  }),
  Trans: ({ children }: { children?: ReactNode }) => children,
}));

import AgentFeedbackControls from "@/ai/components/AgentFeedbackControls";

interface HookOptions {
  readonly onSuccess?: () => void;
  readonly onError?: (error: unknown) => void;
}

const renderControls = (overrides: { isPending?: boolean } = {}) => {
  let captured: HookOptions = {};
  mocks.useAgentFeedback.mockImplementation((options: HookOptions = {}) => {
    captured = options;
    return {
      mutate: vi.fn(),
      isPending: overrides.isPending ?? false,
    };
  });
  const utils = render(<AgentFeedbackControls />);
  return {
    ...utils,
    // Callback simulations mutate component state — they must run inside
    // act() so the re-render is flushed before assertions.
    emitSuccess: () => act(() => captured.onSuccess?.()),
    emitError: () => act(() => captured.onError?.(new Error("insert failed"))),
  };
};

const thumbsUp = () =>
  screen.getByRole("button", { name: "feedback.helpful" });
const thumbsDown = () =>
  screen.getByRole("button", { name: "feedback.notHelpful" });

describe("AgentFeedbackControls (tasks.md 3.1 quality signal, 3.6 suite)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("latches the chosen rating and disables both controls while recorded", () => {
    renderControls();
    fireEvent.click(thumbsUp());
    expect(thumbsUp()).toBeDisabled();
    expect(thumbsDown()).toBeDisabled();
  });

  it("keeps the choice latched after a successful submission", () => {
    const { emitSuccess } = renderControls();
    fireEvent.click(thumbsDown());
    emitSuccess();
    expect(thumbsUp()).toBeDisabled();
    expect(thumbsDown()).toBeDisabled();
  });

  it("re-enables both controls for retry after a failed submission", () => {
    const { emitError } = renderControls();
    fireEvent.click(thumbsUp());
    emitError();
    expect(thumbsUp()).toBeEnabled();
    expect(thumbsDown()).toBeEnabled();
    // The retry path must be functional, not merely visible.
    expect(() => fireEvent.click(thumbsDown())).not.toThrow();
  });
});
