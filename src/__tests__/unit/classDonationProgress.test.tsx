// =============================================================================
// Unit Test: Class Donation Progress
// Task 26.9 — Progress bar, goal completion
// =============================================================================

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ClassDonationProgress from "@/components/shared/ClassDonationProgress";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ profile: { id: "student-1", role: "student" } }),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

const baseDonation = {
  id: "donation-1",
  course_id: "course-1",
  resource_description: "Practice Exam Pack",
  goal_amount: 1000,
  current_total: 500,
  status: "active" as const,
  created_at: new Date().toISOString(),
};

describe("ClassDonationProgress", () => {
  it("renders the donation card", () => {
    render(<ClassDonationProgress donation={baseDonation} />, { wrapper });
    expect(screen.getByTestId("class-donation-progress")).toBeDefined();
  });

  it("displays the resource description", () => {
    render(<ClassDonationProgress donation={baseDonation} />, { wrapper });
    expect(screen.getByText("Practice Exam Pack")).toBeDefined();
  });

  it("displays the progress bar", () => {
    render(<ClassDonationProgress donation={baseDonation} />, { wrapper });
    expect(screen.getByTestId("donation-progress-bar")).toBeDefined();
  });

  it("shows correct progress percentage", () => {
    render(<ClassDonationProgress donation={baseDonation} />, { wrapper });
    expect(screen.getByText("50% complete")).toBeDefined();
  });

  it("shows donate button for active donations", () => {
    render(<ClassDonationProgress donation={baseDonation} />, { wrapper });
    expect(screen.getByText("Donate 10 XP")).toBeDefined();
  });

  it("shows goal reached for completed donations", () => {
    const completed = { ...baseDonation, status: "completed" as const };
    render(<ClassDonationProgress donation={completed} />, { wrapper });
    expect(screen.getByText("🎉 Goal reached!")).toBeDefined();
  });

  it("shows goal reached when progress is 100%", () => {
    const full = { ...baseDonation, current_total: 1000 };
    render(<ClassDonationProgress donation={full} />, { wrapper });
    expect(screen.getByText("🎉 Goal reached!")).toBeDefined();
  });
});
