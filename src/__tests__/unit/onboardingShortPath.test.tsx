// @vitest-environment happy-dom
// =============================================================================
// OnboardingWizard — Day-1 short-path default (Task 18.4, R14.1)
//
// Verifies that onboarding defaults to the Day-1 short path and does NOT
// front-load the full assessment battery in a single sitting:
//  - A first-time student (default progress) gets the 4-step short path even
//    with no isDay1 prop, and even when isDay1={false} is passed explicitly —
//    first-time detection always resolves to the short path.
//  - The full 8-step battery only applies to a returning student (Day 1 already
//    completed), and is never front-loaded on the first sitting.
//  - Navigating the short path reaches the summary at step 4 and never surfaces
//    the learning_style / study_strategy / baseline steps.
//
// Child step components are stubbed so the test stays focused on the wizard's
// step-set resolution (DAY1_STEPS vs ONBOARDING_STEPS).
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { OnboardingStepId } from "@/lib/onboardingConstants";

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

const defaultProgress = {
  id: "prog-1",
  student_id: "student-1",
  current_step: "welcome" as OnboardingStepId,
  personality_completed: false,
  learning_style_completed: false,
  self_efficacy_completed: false,
  study_strategy_completed: false,
  baseline_completed: false,
  baseline_course_ids: [] as string[],
  skipped_sections: [] as string[],
  assessment_version: 1,
  day1_completed: false,
  micro_assessment_day: 0,
  micro_assessment_dismissals: 0,
  profile_completeness: 0,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
};

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });

let mockProgressData = { ...defaultProgress };

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    user: { id: "student-1" },
    profile: { role: "student", institution_id: "inst-1" },
    role: "student",
  }),
}));

vi.mock("@/hooks/useOnboardingProgress", () => ({
  useOnboardingProgress: () => ({ data: mockProgressData, isLoading: false }),
  useUpdateProgress: () => ({ mutate: mockMutate }),
}));

vi.mock("@/hooks/useStudentProfile", () => ({
  useProcessOnboarding: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

// Stub every child step component so the wizard's step-set resolution is the
// only thing under test. Each stub exposes a deterministic testid. The JSX is
// inlined per-mock because `vi.mock` is hoisted above any top-level helper.
vi.mock("@/pages/student/onboarding/WelcomeStep", () => ({
  WelcomeStep: () => <div data-testid="welcome-step">welcome-step</div>,
}));
vi.mock("@/pages/student/onboarding/PersonalityStep", () => ({
  PersonalityStep: () => (
    <div data-testid="personality-step">personality-step</div>
  ),
}));
vi.mock("@/pages/student/onboarding/LearningStyleStep", () => ({
  LearningStyleStep: () => (
    <div data-testid="learning-style-step">learning-style-step</div>
  ),
}));
vi.mock("@/pages/student/onboarding/SelfEfficacyStep", () => ({
  SelfEfficacyStep: () => (
    <div data-testid="self-efficacy-step">self-efficacy-step</div>
  ),
}));
vi.mock("@/pages/student/onboarding/StudyStrategyStep", () => ({
  StudyStrategyStep: () => (
    <div data-testid="study-strategy-step">study-strategy-step</div>
  ),
}));
vi.mock("@/pages/student/onboarding/BaselineSelectStep", () => ({
  BaselineSelectStep: () => (
    <div data-testid="baseline-select-step">baseline-select-step</div>
  ),
}));
vi.mock("@/pages/student/onboarding/BaselineTestStep", () => ({
  BaselineTestStep: () => (
    <div data-testid="baseline-test-step">baseline-test-step</div>
  ),
}));
vi.mock("@/pages/student/onboarding/ProfileSummaryStep", () => ({
  ProfileSummaryStep: () => <div data-testid="summary-step">summary-step</div>,
}));

// Framer Motion mock — render children immediately, drop animation-only props.
vi.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => (
      <div {...filterDomProps(props)}>{children as React.ReactNode}</div>
    ),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useReducedMotion: () => false,
}));

function filterDomProps(props: Record<string, unknown>) {
  const allowed = ["className", "style", "id", "role", "data-testid"];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in props) filtered[key] = props[key];
  }
  return filtered;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { OnboardingWizard } from "@/pages/student/onboarding/OnboardingWizard";

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWizard = (props: { isDay1?: boolean } = {}) =>
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <OnboardingWizard {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("OnboardingWizard — Day-1 short-path default (R14.1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressData = { ...defaultProgress };
  });

  it("defaults a first-time student to the 4-step short path when no isDay1 prop is given", () => {
    renderWizard();
    expect(screen.getByTestId("welcome-step")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    // The full battery is NOT front-loaded.
    expect(screen.queryByText("Step 1 of 8")).not.toBeInTheDocument();
  });

  it("keeps a first-time student on the short path even when isDay1={false} is passed", () => {
    // First-time-login detection overrides the prop: the long battery must not
    // be front-loaded in the first sitting.
    renderWizard({ isDay1: false });
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    expect(screen.queryByText("Step 1 of 8")).not.toBeInTheDocument();
  });

  it("only uses the full 8-step battery for a returning student (Day 1 already completed)", () => {
    mockProgressData = { ...defaultProgress, day1_completed: true };
    renderWizard({ isDay1: false });
    expect(screen.getByText("Step 1 of 8")).toBeInTheDocument();
    expect(screen.queryByText("Step 1 of 4")).not.toBeInTheDocument();
  });

  it("walks the short path welcome → personality → self_efficacy → summary without surfacing the full battery", async () => {
    const user = userEvent.setup();
    renderWizard();

    expect(screen.getByTestId("welcome-step")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByTestId("personality-step")).toBeInTheDocument()
    );
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByTestId("self-efficacy-step")).toBeInTheDocument()
    );
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /next/i }));
    await waitFor(() =>
      expect(screen.getByTestId("summary-step")).toBeInTheDocument()
    );
    expect(screen.getByText("Step 4 of 4")).toBeInTheDocument();

    // None of the front-loaded battery steps ever rendered on the short path.
    expect(screen.queryByTestId("learning-style-step")).not.toBeInTheDocument();
    expect(screen.queryByTestId("study-strategy-step")).not.toBeInTheDocument();
    expect(
      screen.queryByTestId("baseline-select-step")
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId("baseline-test-step")).not.toBeInTheDocument();
  });
});
