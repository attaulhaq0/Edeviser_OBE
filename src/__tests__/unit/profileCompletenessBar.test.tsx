// @vitest-environment happy-dom
// =============================================================================
// ProfileCompletenessBar — Unit tests
// Progress bar rendering, percentage display, navigation, badge at 100%
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ProfileCompletenessBar, {
  type ProfileCompletenessBarProps,
} from '@/components/shared/ProfileCompletenessBar';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

// ─── Helper ──────────────────────────────────────────────────────────────────

const renderBar = (overrides: Partial<ProfileCompletenessBarProps> = {}) =>
  render(<ProfileCompletenessBar completeness={50} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('ProfileCompletenessBar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  // ── Progress bar rendering ─────────────────────────────────────────────

  describe('progress bar rendering', () => {
    it('renders a progressbar element with correct value', () => {
      renderBar({ completeness: 65 });
      const bar = screen.getByRole('progressbar');
      expect(bar.getAttribute('aria-valuenow')).toBe('65');
      expect(bar.getAttribute('aria-valuemin')).toBe('0');
      expect(bar.getAttribute('aria-valuemax')).toBe('100');
    });

    it('sets the progress bar width via inline style', () => {
      renderBar({ completeness: 42 });
      const bar = screen.getByRole('progressbar');
      expect(bar.style.width).toBe('42%');
    });

    it('clamps values below 0 to 0', () => {
      renderBar({ completeness: -20 });
      const bar = screen.getByRole('progressbar');
      expect(bar.getAttribute('aria-valuenow')).toBe('0');
      expect(bar.style.width).toBe('0%');
    });

    it('clamps values above 100 but below threshold to 100 (renders bar, not badge)', () => {
      // 99 should still show the bar
      renderBar({ completeness: 99 });
      const bar = screen.getByRole('progressbar');
      expect(bar.getAttribute('aria-valuenow')).toBe('99');
    });

    it('renders the "Profile Completeness" label', () => {
      renderBar({ completeness: 30 });
      expect(screen.getByText('Profile Completeness')).toBeTruthy();
    });
  });

  // ── Percentage display ─────────────────────────────────────────────────

  describe('percentage display', () => {
    it('displays the percentage text', () => {
      renderBar({ completeness: 73 });
      expect(screen.getByText('73%')).toBeTruthy();
    });

    it('displays 0% for zero completeness', () => {
      renderBar({ completeness: 0 });
      expect(screen.getByText('0%')).toBeTruthy();
    });

    it('displays clamped value for negative input', () => {
      renderBar({ completeness: -10 });
      expect(screen.getByText('0%')).toBeTruthy();
    });
  });

  // ── Navigation ─────────────────────────────────────────────────────────

  describe('navigation to CompleteProfilePage', () => {
    it('navigates to /student/onboarding/complete-profile on click', async () => {
      renderBar({ completeness: 40 });
      const button = screen.getByRole('button');
      await userEvent.click(button);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/student/onboarding/complete-profile',
      );
    });

    it('has an accessible aria-label with percentage', () => {
      renderBar({ completeness: 55 });
      const button = screen.getByRole('button');
      expect(button.getAttribute('aria-label')).toBe(
        'Profile 55% complete. Tap to complete your profile.',
      );
    });
  });

  // ── Badge at 100% ─────────────────────────────────────────────────────

  describe('badge at 100%', () => {
    it('renders "Profile Complete" badge at 100%', () => {
      renderBar({ completeness: 100 });
      expect(screen.getByText('Profile Complete')).toBeTruthy();
    });

    it('does not render a progress bar at 100%', () => {
      renderBar({ completeness: 100 });
      expect(screen.queryByRole('progressbar')).toBeNull();
    });

    it('does not render a clickable button at 100%', () => {
      renderBar({ completeness: 100 });
      expect(screen.queryByRole('button')).toBeNull();
    });

    it('renders badge for values above 100 (clamped)', () => {
      renderBar({ completeness: 150 });
      expect(screen.getByText('Profile Complete')).toBeTruthy();
      expect(screen.queryByRole('progressbar')).toBeNull();
    });
  });
});
