// @vitest-environment happy-dom
// =============================================================================
// CompleteProfilePage — Unit tests
// Remaining dimensions list, item counts, estimated time, bulk completion flow
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ─── Mock data ───────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();

// Default: no profile → all dimensions incomplete
let mockCompletenessData: { profile_completeness: number } | null = {
  profile_completeness: 40,
};

let mockProfileData: {
  personality_traits: Record<string, number> | null;
  learning_style: Record<string, number> | null;
  self_efficacy: Record<string, number> | null;
  study_strategies: Record<string, number> | null;
} | null = null;

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'student-1' },
  }),
}));

vi.mock('@/hooks/useProfileCompleteness', () => ({
  useProfileCompleteness: () => ({
    data: mockCompletenessData,
  }),
}));

vi.mock('@/hooks/useStudentProfile', () => ({
  useStudentProfile: () => ({
    data: mockProfileData,
  }),
}));

// Framer Motion mock — render children immediately
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => {
      const filtered: Record<string, unknown> = {};
      for (const key of ['className', 'style', 'id', 'role', 'data-testid']) {
        if (key in props) filtered[key] = props[key];
      }
      return <div {...filtered}>{children as React.ReactNode}</div>;
    },
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { CompleteProfilePage } from '@/pages/student/onboarding/CompleteProfilePage';

const renderPage = () => render(<CompleteProfilePage />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('CompleteProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompletenessData = { profile_completeness: 40 };
    mockProfileData = null;
  });

  // ── Heading & basic rendering ──────────────────────────────────────

  it('renders "Complete My Profile" heading', () => {
    renderPage();
    expect(screen.getByText('Complete My Profile')).toBeInTheDocument();
  });

  it('renders "Back to Dashboard" button', () => {
    renderPage();
    expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
  });

  it('renders profile completeness percentage', () => {
    mockCompletenessData = { profile_completeness: 40 };
    renderPage();
    expect(screen.getByText('40%')).toBeInTheDocument();
  });

  it('renders "Profile Completeness" label', () => {
    renderPage();
    expect(screen.getByText('Profile Completeness')).toBeInTheDocument();
  });

  // ── All 5 dimension labels ─────────────────────────────────────────

  describe('dimension labels', () => {
    it('renders all 5 dimension labels when profile is null (all incomplete)', () => {
      mockProfileData = null;
      renderPage();
      expect(screen.getByText('Personality Traits')).toBeInTheDocument();
      expect(screen.getByText('Self-Efficacy')).toBeInTheDocument();
      expect(screen.getByText('Study Strategies')).toBeInTheDocument();
      expect(screen.getByText('Learning Style (VARK)')).toBeInTheDocument();
      expect(screen.getByText('Baseline Tests')).toBeInTheDocument();
    });

    it('renders dimension descriptions', () => {
      renderPage();
      expect(screen.getByText('Big Five personality assessment — understand how you learn and work')).toBeInTheDocument();
      expect(screen.getByText('Academic confidence across different domains')).toBeInTheDocument();
    });
  });

  // ── Items left badges ──────────────────────────────────────────────

  describe('items left badges', () => {
    it('shows "items left" badge for incomplete dimensions when profile is null', () => {
      mockProfileData = null;
      renderPage();
      expect(screen.getByText('25 items left')).toBeInTheDocument(); // personality
      expect(screen.getByText('6 items left')).toBeInTheDocument();  // self_efficacy
      expect(screen.getByText('8 items left')).toBeInTheDocument();  // study_strategy
      expect(screen.getByText('16 items left')).toBeInTheDocument(); // learning_style
      expect(screen.getByText('1 item left')).toBeInTheDocument();   // baseline (singular)
    });

    it('shows "Complete" badge for completed dimensions', () => {
      mockProfileData = {
        personality_traits: { openness: 80, conscientiousness: 70, extraversion: 60, agreeableness: 50, neuroticism: 40 },
        learning_style: { visual: 40, auditory: 30, reading: 20, kinesthetic: 10 },
        self_efficacy: { overall: 75, general_academic: 70, self_regulated_learning: 65 },
        study_strategies: { time_management: 80, elaboration: 70, self_testing: 60, help_seeking: 50 },
      };
      renderPage();
      // All 4 profile-based dimensions should show "Complete"
      const completeBadges = screen.getAllByText('Complete');
      expect(completeBadges.length).toBe(4);
      // Baseline still incomplete (baseline_courses = 0)
      expect(screen.getByText('1 item left')).toBeInTheDocument();
    });
  });

  // ── Estimated time ─────────────────────────────────────────────────

  describe('estimated time', () => {
    it('shows estimated time remaining when there are incomplete dimensions', () => {
      mockProfileData = null;
      renderPage();
      expect(screen.getByText(/min remaining/)).toBeInTheDocument();
    });

    it('shows "Earn XP for each section" text', () => {
      mockProfileData = null;
      renderPage();
      expect(screen.getByText('Earn XP for each section')).toBeInTheDocument();
    });

    it('shows estimated time when baseline is incomplete', () => {
      mockCompletenessData = { profile_completeness: 100 };
      mockProfileData = {
        personality_traits: { openness: 80, conscientiousness: 70, extraversion: 60, agreeableness: 50, neuroticism: 40 },
        learning_style: { visual: 40, auditory: 30, reading: 20, kinesthetic: 10 },
        self_efficacy: { overall: 75, general_academic: 70, self_regulated_learning: 65 },
        study_strategies: { time_management: 80, elaboration: 70, self_testing: 60, help_seeking: 50 },
      };
      renderPage();
      // Only baseline is still incomplete (baseline_courses=0), so time should still show
      // But if we check the actual remaining: baseline is still incomplete
      // The "no estimated time" case requires ALL dimensions complete
      // Since baseline_courses is always 0 in deriveCompletenessInput, baseline is always incomplete
      // So estimated time will always show. Let's verify the text is present for baseline-only remaining
      expect(screen.getByText(/min remaining/)).toBeInTheDocument();
    });
  });

  // ── Profile Complete card ──────────────────────────────────────────

  describe('Profile Complete card', () => {
    it('shows "Profile Complete!" card when completeness is 100%', () => {
      mockCompletenessData = { profile_completeness: 100 };
      renderPage();
      expect(screen.getByText('Profile Complete!')).toBeInTheDocument();
    });

    it('does not show "Profile Complete!" card when completeness is below 100%', () => {
      mockCompletenessData = { profile_completeness: 80 };
      renderPage();
      expect(screen.queryByText('Profile Complete!')).not.toBeInTheDocument();
    });

    it('shows personalization message in the complete card', () => {
      mockCompletenessData = { profile_completeness: 100 };
      renderPage();
      expect(
        screen.getByText(/completed all profiling dimensions/),
      ).toBeInTheDocument();
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────

  describe('navigation', () => {
    it('navigates back to /student when "Back to Dashboard" is clicked', async () => {
      const user = userEvent.setup();
      renderPage();
      await user.click(screen.getByText('Back to Dashboard'));
      expect(mockNavigate).toHaveBeenCalledWith('/student');
    });
  });

  // ── Partial completion ─────────────────────────────────────────────

  describe('partial completion', () => {
    it('shows mix of Complete badges and items-left badges for partially completed profile', () => {
      mockProfileData = {
        personality_traits: { openness: 80, conscientiousness: 70, extraversion: 60, agreeableness: 50, neuroticism: 40 },
        learning_style: null,
        self_efficacy: null,
        study_strategies: null,
      };
      renderPage();
      // Personality complete
      const completeBadges = screen.getAllByText('Complete');
      expect(completeBadges.length).toBe(1);
      // Others incomplete
      expect(screen.getByText('6 items left')).toBeInTheDocument();
      expect(screen.getByText('8 items left')).toBeInTheDocument();
      expect(screen.getByText('16 items left')).toBeInTheDocument();
      expect(screen.getByText('1 item left')).toBeInTheDocument();
    });

    it('renders 0% when completeness data is null', () => {
      mockCompletenessData = null;
      renderPage();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
