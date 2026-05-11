// =============================================================================
// Unit Test: Mystery Reward Box
// Task 26.4 — Unboxing animation, reward display
// =============================================================================

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import MysteryRewardBox from "@/components/shared/MysteryRewardBox";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("MysteryRewardBox", () => {
  it("renders the mystery box in idle state", () => {
    render(<MysteryRewardBox studentId="student-1" institutionId="inst-1" />, {
      wrapper,
    });

    expect(screen.getByTestId("mystery-reward-box")).toBeDefined();
    expect(screen.getByText("Mystery Reward!")).toBeDefined();
  });

  it("shows the open button", () => {
    render(<MysteryRewardBox studentId="student-1" institutionId="inst-1" />, {
      wrapper,
    });

    expect(screen.getByText("Open Box")).toBeDefined();
  });

  it("displays tap to reveal message", () => {
    render(<MysteryRewardBox studentId="student-1" institutionId="inst-1" />, {
      wrapper,
    });

    expect(screen.getByText("Tap to reveal your prize")).toBeDefined();
  });
});
