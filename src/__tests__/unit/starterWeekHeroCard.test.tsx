// @vitest-environment happy-dom
// =============================================================================
// StarterWeekHeroCard — Unit tests
// Hero card rendering, session count display, "View Plan" navigation,
// post-week summary mode
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import StarterWeekHeroCard, {
  type StarterWeekHeroCardProps,
} from '@/components/shared/StarterWeekHeroCard';
import type { StarterWeekSession } from '@/hooks/useStarterWeekPlan';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const makeSession = (
  overrides: Partial<StarterWeekSession> = {},
): StarterWeekSession => ({
  id: crypto.randomUUID(),
  student_id: 'student-1',
  course_id: 'course-1',
  session_type: 'reading',
  suggested_date: '2025-01-20',
  suggested_time_slot: 'morning',
  duration_minutes: 30,
  description: 'Study session',
  status: 'suggested',
  planner_entry_id: null,
  created_at: '2025-01-20T00:00:00Z',
  updated_at: '2025-01-20T00:00:00Z',
  ...overrides,
});

const defaultProps: StarterWeekHeroCardProps = {
  sessions: [
    makeSession({ duration_minutes: 25 }),
    makeSession({ duration_minutes: 35 }),
    makeSession({ duration_minutes: 25, status: 'completed' }),
  ],
  onViewPlan: vi.fn(),
};

const renderCard = (overrides: Partial<StarterWeekHeroCardProps> = {}) =>
  render(<StarterWeekHeroCard {...defaultProps} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('StarterWeekHeroCard', () => {
  // ── Active week rendering ──────────────────────────────────────────────

  describe('hero card rendering (active week)', () => {
    it('renders the heading', () => {
      renderCard();
      expect(screen.getByText('Your Starter Week Plan')).toBeTruthy();
    });

    it('renders the subtitle', () => {
      renderCard();
      expect(
        screen.getByText(
          'AI-generated study sessions to kick off your semester',
        ),
      ).toBeTruthy();
    });

    it('renders Sessions, Total Time, and Done labels', () => {
      renderCard();
      expect(screen.getByText('Sessions')).toBeTruthy();
      expect(screen.getByText('Total Time')).toBeTruthy();
      expect(screen.getByText('Done')).toBeTruthy();
    });
  });

  // ── Session count display ──────────────────────────────────────────────

  describe('session count display', () => {
    it('displays the total session count', () => {
      renderCard();
      // 3 sessions total
      expect(screen.getByText('3')).toBeTruthy();
    });

    it('displays completed/total ratio', () => {
      renderCard();
      // 1 completed out of 3
      expect(screen.getByText('1/3')).toBeTruthy();
    });

    it('handles zero sessions', () => {
      renderCard({ sessions: [] });
      expect(screen.getByText('0')).toBeTruthy();
      expect(screen.getByText('0/0')).toBeTruthy();
    });

    it('shows all completed when every session is done', () => {
      const sessions = [
        makeSession({ status: 'completed', duration_minutes: 30 }),
        makeSession({ status: 'completed', duration_minutes: 30 }),
      ];
      renderCard({ sessions });
      expect(screen.getByText('2/2')).toBeTruthy();
    });
  });

  // ── Total study time display ───────────────────────────────────────────

  describe('total study time display', () => {
    it('displays time in minutes when under 60', () => {
      // 25 + 35 + 25 = 85m → 1h 25m
      renderCard();
      expect(screen.getByText('1h 25m')).toBeTruthy();
    });

    it('displays only minutes when total is under 60', () => {
      const sessions = [
        makeSession({ duration_minutes: 20 }),
        makeSession({ duration_minutes: 15 }),
      ];
      renderCard({ sessions });
      expect(screen.getByText('35m')).toBeTruthy();
    });

    it('displays hours and minutes for larger totals', () => {
      const sessions = [
        makeSession({ duration_minutes: 45 }),
        makeSession({ duration_minutes: 45 }),
        makeSession({ duration_minutes: 30 }),
      ];
      renderCard({ sessions });
      // 120m = 2h 0m
      expect(screen.getByText('2h 0m')).toBeTruthy();
    });

    it('displays 0m for empty sessions', () => {
      renderCard({ sessions: [] });
      expect(screen.getByText('0m')).toBeTruthy();
    });
  });

  // ── "View Plan" CTA navigation ────────────────────────────────────────

  describe('"View Plan" navigation', () => {
    it('renders the "View Plan" button', () => {
      renderCard();
      expect(screen.getByText('View Plan')).toBeTruthy();
    });

    it('calls onViewPlan when clicked', async () => {
      const onViewPlan = vi.fn();
      renderCard({ onViewPlan });
      await userEvent.click(screen.getByText('View Plan'));
      expect(onViewPlan).toHaveBeenCalledOnce();
    });

    it('does not render "View Plan" button in post-week mode', () => {
      renderCard({ isPostWeek: true });
      expect(screen.queryByText('View Plan')).toBeNull();
    });
  });

  // ── Post-week summary mode ─────────────────────────────────────────────

  describe('post-week summary', () => {
    const postWeekSessions = [
      makeSession({ status: 'completed', duration_minutes: 25 }),
      makeSession({ status: 'completed', duration_minutes: 35 }),
      makeSession({ status: 'completed', duration_minutes: 25 }),
      makeSession({ status: 'completed', duration_minutes: 30 }),
      makeSession({ status: 'dismissed', duration_minutes: 25 }),
    ];

    it('renders "Starter Week Complete!" heading', () => {
      renderCard({ isPostWeek: true, sessions: postWeekSessions });
      expect(screen.getByText('Starter Week Complete!')).toBeTruthy();
    });

    it('shows completion stats with session count and percentage', () => {
      renderCard({ isPostWeek: true, sessions: postWeekSessions });
      // 4 of 5 completed = 80%
      expect(
        screen.getByText(/4 of 5 sessions \(80%\)/),
      ).toBeTruthy();
    });

    it('shows completed minutes in summary', () => {
      renderCard({ isPostWeek: true, sessions: postWeekSessions });
      // completed: 25+35+25+30 = 115 minutes
      expect(screen.getByText(/115 minutes/)).toBeTruthy();
    });

    it('shows encouragement message when completion rate >= 80%', () => {
      renderCard({ isPostWeek: true, sessions: postWeekSessions });
      expect(
        screen.getByText('Great start — keep the momentum going!'),
      ).toBeTruthy();
    });

    it('does not show encouragement when completion rate < 80%', () => {
      const lowCompletionSessions = [
        makeSession({ status: 'completed', duration_minutes: 25 }),
        makeSession({ status: 'dismissed', duration_minutes: 35 }),
        makeSession({ status: 'dismissed', duration_minutes: 25 }),
        makeSession({ status: 'dismissed', duration_minutes: 30 }),
        makeSession({ status: 'dismissed', duration_minutes: 25 }),
      ];
      renderCard({ isPostWeek: true, sessions: lowCompletionSessions });
      expect(
        screen.queryByText('Great start — keep the momentum going!'),
      ).toBeNull();
    });

    it('handles 0 sessions in post-week mode (0%)', () => {
      renderCard({ isPostWeek: true, sessions: [] });
      expect(screen.getByText(/0 of 0 sessions \(0%\)/)).toBeTruthy();
    });

    it('handles 100% completion', () => {
      const allDone = [
        makeSession({ status: 'completed', duration_minutes: 30 }),
        makeSession({ status: 'completed', duration_minutes: 30 }),
      ];
      renderCard({ isPostWeek: true, sessions: allDone });
      expect(screen.getByText(/2 of 2 sessions \(100%\)/)).toBeTruthy();
      expect(
        screen.getByText('Great start — keep the momentum going!'),
      ).toBeTruthy();
    });

    it('does not render active-week heading in post-week mode', () => {
      renderCard({ isPostWeek: true, sessions: postWeekSessions });
      expect(screen.queryByText('Your Starter Week Plan')).toBeNull();
    });
  });
});
