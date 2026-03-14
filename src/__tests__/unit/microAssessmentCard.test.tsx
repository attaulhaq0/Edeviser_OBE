// @vitest-environment happy-dom
// =============================================================================
// MicroAssessmentCard — Unit tests
// Card rendering, complete/dismiss actions, dismissal counter, skip after 3
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import MicroAssessmentCard, {
  type MicroAssessmentCardProps,
} from '@/components/shared/MicroAssessmentCard';
import { ONBOARDING_XP, MAX_MICRO_DISMISSALS } from '@/lib/onboardingConstants';

// ─── Helper ──────────────────────────────────────────────────────────────────

const defaults: MicroAssessmentCardProps = {
  assessmentType: 'personality',
  questionCount: 5,
  onComplete: vi.fn(),
  onDismiss: vi.fn(),
  dismissalCount: 0,
};

const renderCard = (overrides: Partial<MicroAssessmentCardProps> = {}) =>
  render(<MicroAssessmentCard {...defaults} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MicroAssessmentCard', () => {
  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('displays the assessment type label', () => {
      renderCard({ assessmentType: 'self_efficacy' });
      expect(screen.getByText('Quick Self-Efficacy Check')).toBeTruthy();
    });

    it('shows time estimate based on question count', () => {
      renderCard({ questionCount: 8 });
      // 8 * 0.4 = 3.2 → ceil = 4 min
      expect(screen.getByText(/~4 min/)).toBeTruthy();
    });

    it('shows minimum 1 minute for small question counts', () => {
      renderCard({ questionCount: 1 });
      expect(screen.getByText(/~1 min/)).toBeTruthy();
    });

    it('displays XP reward badge', () => {
      renderCard();
      expect(
        screen.getByText(`+${ONBOARDING_XP.micro_assessment} XP`),
      ).toBeTruthy();
    });

    it('shows question count description', () => {
      renderCard({ questionCount: 3 });
      expect(
        screen.getByText('3 quick questions to refine your profile.'),
      ).toBeTruthy();
    });

    it('uses singular "question" for count of 1', () => {
      renderCard({ questionCount: 1 });
      expect(
        screen.getByText('1 quick question to refine your profile.'),
      ).toBeTruthy();
    });

    it('falls back to raw type when label is unknown', () => {
      renderCard({ assessmentType: 'custom_type' });
      expect(screen.getByText('Quick custom_type Check')).toBeTruthy();
    });

    it('renders Complete Now and Remind Me Later buttons', () => {
      renderCard();
      expect(screen.getByText('Complete Now')).toBeTruthy();
      expect(screen.getByText('Remind Me Later')).toBeTruthy();
    });
  });

  // ── Actions ──────────────────────────────────────────────────────────────

  describe('actions', () => {
    it('calls onComplete when "Complete Now" is clicked', async () => {
      const onComplete = vi.fn();
      renderCard({ onComplete });
      await userEvent.click(screen.getByText('Complete Now'));
      expect(onComplete).toHaveBeenCalledOnce();
    });

    it('calls onDismiss when "Remind Me Later" is clicked', async () => {
      const onDismiss = vi.fn();
      renderCard({ onDismiss });
      await userEvent.click(screen.getByText('Remind Me Later'));
      expect(onDismiss).toHaveBeenCalledOnce();
    });

    it('calls onDismiss when X button is clicked', async () => {
      const onDismiss = vi.fn();
      renderCard({ onDismiss });
      await userEvent.click(
        screen.getByRole('button', { name: /dismiss micro-assessment/i }),
      );
      expect(onDismiss).toHaveBeenCalledOnce();
    });
  });

  // ── Dismissal counter ────────────────────────────────────────────────────

  describe('dismissal counter', () => {
    it('shows warning when one dismissal remains', () => {
      renderCard({ dismissalCount: MAX_MICRO_DISMISSALS - 1 });
      expect(
        screen.getByText(
          /last chance — this will be skipped if dismissed again/i,
        ),
      ).toBeTruthy();
    });

    it('does not show warning when dismissals are well below limit', () => {
      renderCard({ dismissalCount: 0 });
      expect(
        screen.queryByText(/last chance/i),
      ).toBeNull();
    });

    it('does not show warning when dismissal count equals limit', () => {
      renderCard({ dismissalCount: MAX_MICRO_DISMISSALS });
      // remainingDismissals = 0, condition is > 0 && <= 1
      expect(
        screen.queryByText(/last chance/i),
      ).toBeNull();
    });
  });
});
