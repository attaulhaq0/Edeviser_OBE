// @vitest-environment happy-dom
// =============================================================================
// OnboardingWizard — Unit tests
// Wizard step navigation, Day 1 mode (7 questions), progress persistence, skip
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { OnboardingStepId } from '@/lib/onboardingConstants';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

const defaultProgress = {
  id: 'prog-1',
  student_id: 'student-1',
  current_step: 'welcome' as OnboardingStepId,
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
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

const mockMutate = vi.fn();
const mockMutateAsync = vi.fn().mockResolvedValue({ success: true });

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'student-1' },
    profile: { role: 'student', institution_id: 'inst-1' },
    role: 'student',
  }),
}));

let mockProgressData = { ...defaultProgress };
let mockProgressLoading = false;

vi.mock('@/hooks/useOnboardingProgress', () => ({
  useOnboardingProgress: () => ({
    data: mockProgressData,
    isLoading: mockProgressLoading,
  }),
  useUpdateProgress: () => ({
    mutate: mockMutate,
  }),
}));

vi.mock('@/hooks/useStudentProfile', () => ({
  useProcessOnboarding: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useOnboardingQuestions', () => ({
  usePersonalityQuestions: () => ({ data: [], isLoading: false }),
  useLearningStyleQuestions: () => ({ data: [], isLoading: false }),
  useSelfEfficacyQuestions: () => ({ data: [], isLoading: false }),
  useStudyStrategyQuestions: () => ({ data: [], isLoading: false }),
  useBaselineQuestions: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useOnboardingResponses', () => ({
  useSaveResponses: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Mock child step components to keep tests focused on wizard navigation
vi.mock('@/pages/student/onboarding/WelcomeStep', () => ({
  WelcomeStep: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="welcome-step">
      <span>Welcome Step</span>
      <button data-testid="step-complete" onClick={onComplete}>Complete</button>
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/PersonalityStep', () => ({
  PersonalityStep: ({ onComplete, onSkip }: { onComplete: () => void; onSkip?: () => void }) => (
    <div data-testid="personality-step">
      <span>Personality Step</span>
      <button data-testid="step-complete" onClick={onComplete}>Complete</button>
      {onSkip && <button data-testid="step-skip" onClick={onSkip}>Skip</button>}
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/SelfEfficacyStep', () => ({
  SelfEfficacyStep: ({ onComplete, onSkip }: { onComplete: () => void; onSkip?: () => void }) => (
    <div data-testid="self-efficacy-step">
      <span>Self Efficacy Step</span>
      <button data-testid="step-complete" onClick={onComplete}>Complete</button>
      {onSkip && <button data-testid="step-skip" onClick={onSkip}>Skip</button>}
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/LearningStyleStep', () => ({
  LearningStyleStep: ({ onComplete, onSkip }: { onComplete: () => void; onSkip?: () => void }) => (
    <div data-testid="learning-style-step">
      <span>Learning Style Step</span>
      <button data-testid="step-complete" onClick={onComplete}>Complete</button>
      {onSkip && <button data-testid="step-skip" onClick={onSkip}>Skip</button>}
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/StudyStrategyStep', () => ({
  StudyStrategyStep: ({ onComplete, onSkip }: { onComplete: () => void; onSkip?: () => void }) => (
    <div data-testid="study-strategy-step">
      <span>Study Strategy Step</span>
      <button data-testid="step-complete" onClick={onComplete}>Complete</button>
      {onSkip && <button data-testid="step-skip" onClick={onSkip}>Skip</button>}
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/BaselineSelectStep', () => ({
  BaselineSelectStep: ({ onCoursesSelected, onSkip }: { onCoursesSelected: (ids: string[]) => void; onSkip?: () => void }) => (
    <div data-testid="baseline-select-step">
      <span>Baseline Select Step</span>
      <button data-testid="select-courses" onClick={() => onCoursesSelected(['c1'])}>Select Courses</button>
      <button data-testid="skip-baseline" onClick={() => onCoursesSelected([])}>Skip Baseline</button>
      {onSkip && <button data-testid="step-skip" onClick={onSkip}>Skip</button>}
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/BaselineTestStep', () => ({
  BaselineTestStep: ({ onComplete }: { onComplete: () => void }) => (
    <div data-testid="baseline-test-step">
      <span>Baseline Test Step</span>
      <button data-testid="step-complete" onClick={onComplete}>Complete</button>
    </div>
  ),
}));

vi.mock('@/pages/student/onboarding/ProfileSummaryStep', () => ({
  ProfileSummaryStep: ({ onConfirm, isProcessing }: { onConfirm: () => void; isProcessing: boolean }) => (
    <div data-testid="summary-step">
      <span>Profile Summary Step</span>
      <button data-testid="confirm-profile" onClick={onConfirm} disabled={isProcessing}>
        {isProcessing ? 'Processing...' : 'Confirm'}
      </button>
    </div>
  ),
}));

// Framer Motion mock — render children immediately
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...filterDomProps(props)}>{children as React.ReactNode}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

function filterDomProps(props: Record<string, unknown>) {
  const allowed = ['className', 'style', 'id', 'role', 'data-testid'];
  const filtered: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in props) filtered[key] = props[key];
  }
  return filtered;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { OnboardingWizard } from '@/pages/student/onboarding/OnboardingWizard';

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWizard = (props: { isDay1?: boolean } = {}) => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <MemoryRouter>
        <OnboardingWizard {...props} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('OnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProgressData = { ...defaultProgress };
    mockProgressLoading = false;
  });

  // ── Loading state ────────────────────────────────────────────────

  it('shows a loading spinner while progress is loading', () => {
    mockProgressLoading = true;
    renderWizard();
    // The spinner is a Loader2 icon with animate-spin class
    const spinner = document.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  // ── Day 1 mode ───────────────────────────────────────────────────

  describe('Day 1 mode (isDay1 = true)', () => {
    it('renders the welcome step first', () => {
      renderWizard({ isDay1: true });
      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();
    });

    it('shows "Step 1 of 4" for Day 1 mode (welcome, personality, self_efficacy, summary)', () => {
      renderWizard({ isDay1: true });
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });

    it('shows 25% progress on the first step', () => {
      renderWizard({ isDay1: true });
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('navigates through Day 1 steps: welcome → personality → self_efficacy → summary', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Step 1: Welcome
      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();

      // Click Next to go to personality
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByTestId('personality-step')).toBeInTheDocument();
      });
      expect(screen.getByText('Step 2 of 4')).toBeInTheDocument();

      // Click Next to go to self_efficacy
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByTestId('self-efficacy-step')).toBeInTheDocument();
      });
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();

      // Click Next to go to summary
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(screen.getByTestId('summary-step')).toBeInTheDocument();
      });
      expect(screen.getByText('Step 4 of 4')).toBeInTheDocument();
    });

    it('does NOT include learning_style, study_strategy, or baseline steps in Day 1', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate through all 4 steps
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }

      // We should be at summary — none of the excluded steps should have appeared
      expect(screen.getByTestId('summary-step')).toBeInTheDocument();
      expect(screen.queryByTestId('learning-style-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('study-strategy-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('baseline-select-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('baseline-test-step')).not.toBeInTheDocument();
    });
  });

  // ── Full mode ────────────────────────────────────────────────────

  describe('Full mode (isDay1 = false)', () => {
    it('shows "Step 1 of 8" for full mode', () => {
      renderWizard({ isDay1: false });
      expect(screen.getByText('Step 1 of 8')).toBeInTheDocument();
    });

    it('includes all 8 steps in full mode', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: false });

      // Step 1: Welcome
      expect(screen.getByTestId('welcome-step')).toBeInTheDocument();

      // Step 2: Personality
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('personality-step')).toBeInTheDocument());

      // Step 3: Self Efficacy
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('self-efficacy-step')).toBeInTheDocument());

      // Step 4: Learning Style
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('learning-style-step')).toBeInTheDocument());

      // Step 5: Study Strategy
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('study-strategy-step')).toBeInTheDocument());

      // Step 6: Baseline Select
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('baseline-select-step')).toBeInTheDocument());

      // Step 7: Baseline Test
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('baseline-test-step')).toBeInTheDocument());

      // Step 8: Summary
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('summary-step')).toBeInTheDocument());
    });
  });

  // ── Back navigation ──────────────────────────────────────────────

  describe('Back navigation', () => {
    it('disables the Back button on the first step', () => {
      renderWizard({ isDay1: true });
      const backBtn = screen.getByRole('button', { name: /back/i });
      expect(backBtn).toBeDisabled();
    });

    it('navigates back to the previous step', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Go to step 2
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('personality-step')).toBeInTheDocument());

      // Go back to step 1
      await user.click(screen.getByRole('button', { name: /back/i }));
      await waitFor(() => expect(screen.getByTestId('welcome-step')).toBeInTheDocument());
      expect(screen.getByText('Step 1 of 4')).toBeInTheDocument();
    });
  });

  // ── Progress persistence ─────────────────────────────────────────

  describe('Progress persistence', () => {
    it('calls updateProgress.mutate with current_step when navigating forward', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ current_step: 'personality' }),
        );
      });
    });

    it('resumes from the saved step on mount', () => {
      mockProgressData = { ...defaultProgress, current_step: 'self_efficacy' };
      renderWizard({ isDay1: true });
      // Should resume at self_efficacy (step 3 of 4)
      expect(screen.getByTestId('self-efficacy-step')).toBeInTheDocument();
      expect(screen.getByText('Step 3 of 4')).toBeInTheDocument();
    });

    it('restores skipped_sections from saved progress', () => {
      mockProgressData = {
        ...defaultProgress,
        current_step: 'self_efficacy',
        skipped_sections: ['personality'],
      };
      renderWizard({ isDay1: true });
      // The wizard should have loaded the skipped sections from progress
      expect(screen.getByTestId('self-efficacy-step')).toBeInTheDocument();
    });

    it('calls updateProgress with completion flags when a step completes via onComplete', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to personality step
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('personality-step')).toBeInTheDocument());

      // Complete the personality step via the step's onComplete callback
      await user.click(screen.getByTestId('step-complete'));
      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ personality_completed: true }),
        );
      });
    });
  });

  // ── Skip behavior ────────────────────────────────────────────────

  describe('Skip behavior', () => {
    it('shows "Skip for Now" button on skippable steps (personality, self_efficacy)', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to personality step
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('personality-step')).toBeInTheDocument());

      // Skip for Now should be visible
      expect(screen.getByRole('button', { name: /skip for now/i })).toBeInTheDocument();
    });

    it('does NOT show "Skip for Now" on the welcome step', () => {
      renderWizard({ isDay1: true });
      expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
    });

    it('skipping a step records the section in skipped_sections and advances', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to personality step
      await user.click(screen.getByRole('button', { name: /next/i }));
      await waitFor(() => expect(screen.getByTestId('personality-step')).toBeInTheDocument());

      // Click Skip for Now
      await user.click(screen.getByRole('button', { name: /skip for now/i }));

      // Should advance to self_efficacy
      await waitFor(() => expect(screen.getByTestId('self-efficacy-step')).toBeInTheDocument());

      // Should have persisted the skip
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ skipped_sections: ['personality'] }),
      );
    });

    it('does NOT show "Skip for Now" on the summary step', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to summary (step 4)
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }
      await waitFor(() => expect(screen.getByTestId('summary-step')).toBeInTheDocument());
      expect(screen.queryByRole('button', { name: /skip for now/i })).not.toBeInTheDocument();
    });
  });

  // ── Profile confirmation ─────────────────────────────────────────

  describe('Profile confirmation', () => {
    it('calls processOnboarding and navigates to /student on confirm', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to summary
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }
      await waitFor(() => expect(screen.getByTestId('summary-step')).toBeInTheDocument());

      // Click confirm
      await user.click(screen.getByTestId('confirm-profile'));

      await waitFor(() => {
        expect(mockMutateAsync).toHaveBeenCalledWith(
          expect.objectContaining({
            student_id: 'student-1',
            assessment_version: 1,
            is_day1: true,
          }),
        );
      });

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/student');
      });
    });

    it('sets day1_completed via updateProgress when Day 1 confirm succeeds', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to summary
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }
      await waitFor(() => expect(screen.getByTestId('summary-step')).toBeInTheDocument());

      await user.click(screen.getByTestId('confirm-profile'));

      await waitFor(() => {
        expect(mockMutate).toHaveBeenCalledWith(
          expect.objectContaining({ day1_completed: true }),
        );
      });
    });

    it('hides the Next button on the summary step', async () => {
      const user = userEvent.setup();
      renderWizard({ isDay1: true });

      // Navigate to summary
      for (let i = 0; i < 3; i++) {
        await user.click(screen.getByRole('button', { name: /next/i }));
      }
      await waitFor(() => expect(screen.getByTestId('summary-step')).toBeInTheDocument());

      // The Next button should not be present on the summary step
      expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    });
  });
});
