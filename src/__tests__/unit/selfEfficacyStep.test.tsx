// @vitest-environment happy-dom
// =============================================================================
// SelfEfficacyStep — Unit tests (Task 18.4)
//
// Covers two of the three behaviours required by task 18.4:
//   • Non-blocking fallback (task 18.1 / R11.3, R11.4, R11.4a, R11.4b):
//       - a non-alarming zero-data fallback (never an admin-contact error)
//         when there are genuinely zero questions;
//       - a DISTINCT system-issue panel on query error;
//       - both expose a Continue that advances the sequence (never blocks).
//   • Framing gate (task 18.3 / R17.2a):
//       - the AssessmentIntro (benefit + estimated time) renders first and the
//         question body stays gated until the student presses "Begin".
//
// The onboarding question/response hooks are mocked; the assessment-intro
// content resolves from the real i18n bundle via I18nextProvider so the
// benefit + estimated-time gate is exercised against production copy.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { I18nextProvider } from "react-i18next";

import i18n from "@/lib/i18n";
import type { OnboardingQuestion } from "@/hooks/useOnboardingQuestions";
import type { WizardStepProps } from "@/pages/student/onboarding/OnboardingWizard";

// ─── Hook mocks ──────────────────────────────────────────────────────────────

interface QuestionsResult {
  data: OnboardingQuestion[];
  isLoading: boolean;
  isError: boolean;
}

let mockQuestionsResult: QuestionsResult = {
  data: [],
  isLoading: false,
  isError: false,
};

const mockSaveResponses = vi.fn().mockResolvedValue([]);

vi.mock("@/hooks/useOnboardingQuestions", () => ({
  useSelfEfficacyQuestions: () => mockQuestionsResult,
}));

vi.mock("@/hooks/useOnboardingResponses", () => ({
  useSaveResponses: () => ({
    mutateAsync: mockSaveResponses,
    isPending: false,
  }),
}));

// Framer Motion mock — render children immediately so assertions are sync.
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

import { SelfEfficacyStep } from "@/pages/student/onboarding/SelfEfficacyStep";

const makeQuestion = (
  overrides: Partial<OnboardingQuestion> = {}
): OnboardingQuestion => ({
  id: "q-1",
  institution_id: "inst-1",
  assessment_type: "self_efficacy",
  question_text: "I can master difficult coursework when I try.",
  dimension: "general_academic",
  weight: 1,
  options: null,
  correct_option: null,
  clo_id: null,
  course_id: null,
  difficulty_level: null,
  sort_order: 1,
  is_active: true,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
  ...overrides,
});

const onComplete = vi.fn();

const renderStep = (props: Partial<WizardStepProps> = {}) => {
  const stepProps: WizardStepProps = {
    isDay1: false,
    onComplete,
    studentId: "student-1",
    assessmentVersion: 1,
    ...props,
  };
  return render(
    <I18nextProvider i18n={i18n}>
      <SelfEfficacyStep {...stepProps} />
    </I18nextProvider>
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("SelfEfficacyStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockQuestionsResult = { data: [], isLoading: false, isError: false };
  });

  // ── Non-blocking fallback (R11.3, R11.4, R11.4b) ─────────────────────────

  describe("genuine zero-data fallback", () => {
    beforeEach(() => {
      mockQuestionsResult = { data: [], isLoading: false, isError: false };
    });

    it("shows a non-alarming fallback rather than an admin-contact error", () => {
      renderStep();
      expect(
        screen.getByText("No confidence check needed right now")
      ).toBeInTheDocument();
      // R11.3 — must NOT be the old administrator-contact error message.
      expect(
        screen.queryByText(/contact your administrator/i)
      ).not.toBeInTheDocument();
    });

    it("does not show the system-issue copy when there are genuinely zero questions (R11.4b)", () => {
      renderStep();
      expect(
        screen.queryByText("We couldn't load this step")
      ).not.toBeInTheDocument();
    });

    it("advances the sequence via Continue without blocking (R11.4)", async () => {
      const user = userEvent.setup();
      renderStep();
      await user.click(screen.getByRole("button", { name: /continue/i }));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Distinct system-issue panel (R11.4a, R11.4b) ─────────────────────────

  describe("system-issue fallback (query error)", () => {
    beforeEach(() => {
      mockQuestionsResult = { data: [], isLoading: false, isError: true };
    });

    it("shows a system-issue panel distinct from the zero-data fallback", () => {
      renderStep();
      expect(
        screen.getByText("We couldn't load this step")
      ).toBeInTheDocument();
      // Must be distinct from the genuine "no questions" copy (R11.4b).
      expect(
        screen.queryByText("No confidence check needed right now")
      ).not.toBeInTheDocument();
      // And never the admin-contact error.
      expect(
        screen.queryByText(/contact your administrator/i)
      ).not.toBeInTheDocument();
    });

    it("still allows the student to continue on a system issue (R11.4a)", async () => {
      const user = userEvent.setup();
      renderStep();
      await user.click(screen.getByRole("button", { name: /continue/i }));
      expect(onComplete).toHaveBeenCalledTimes(1);
    });
  });

  // ── Framing gate (R17.2a) ────────────────────────────────────────────────

  describe("benefit-oriented framing gate", () => {
    beforeEach(() => {
      mockQuestionsResult = {
        data: [
          makeQuestion({ id: "q-1", dimension: "general_academic" }),
          makeQuestion({
            id: "q-2",
            dimension: "self_regulated_learning",
            question_text: "I keep working on tasks even when they are hard.",
          }),
        ],
        isLoading: false,
        isError: false,
      };
    });

    it("renders the AssessmentIntro (benefit + estimated time) before the body", () => {
      renderStep();
      // Estimated time is displayed up front (R17.2).
      expect(screen.getByText("About 1 minute")).toBeInTheDocument();
      // At least one concrete benefit is displayed up front (R17.3).
      expect(
        screen.getByText(
          "Encouragement and goals set at the right level for you"
        )
      ).toBeInTheDocument();
      // The Begin action is available...
      expect(
        screen.getByRole("button", { name: /begin/i })
      ).toBeInTheDocument();
      // ...and the question body is still gated (R17.2a).
      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();
      expect(
        screen.queryByText("I can master difficult coursework when I try.")
      ).not.toBeInTheDocument();
    });

    it("reveals the question body only after the student presses Begin", async () => {
      const user = userEvent.setup();
      renderStep();

      expect(screen.queryByRole("radiogroup")).not.toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: /begin/i }));

      // Now the body renders: the Likert radiogroup and the first question.
      expect(screen.getByRole("radiogroup")).toBeInTheDocument();
      expect(
        screen.getByText("I can master difficult coursework when I try.")
      ).toBeInTheDocument();
      // The intro Begin button is gone once the body renders.
      expect(
        screen.queryByRole("button", { name: /begin/i })
      ).not.toBeInTheDocument();
    });
  });
});
