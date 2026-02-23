import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeCollection from '@/components/shared/BadgeCollection';

// ---------------------------------------------------------------------------
// Mock date-fns format to avoid locale issues in tests
// ---------------------------------------------------------------------------
vi.mock('date-fns', () => ({
  format: (date: Date, fmt: string) => {
    void fmt;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  },
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const earnedIds = ['streak_7', 'first_submission', 'speed_demon'];
const earnedMap: Record<string, string> = {
  streak_7: '2024-06-01T10:00:00Z',
  first_submission: '2024-06-02T12:00:00Z',
  speed_demon: '2024-06-03T03:00:00Z',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('BadgeCollection', () => {
  it('shows earned badges at full color (no grayscale/opacity)', () => {
    render(
      <BadgeCollection earnedBadgeIds={earnedIds} earnedBadgeMap={earnedMap} />,
    );

    const card = screen.getByTestId('badge-card-streak_7');
    expect(card.className).not.toContain('opacity-30');
    expect(card.className).not.toContain('grayscale');
  });

  it('shows unearned badges as silhouettes (grayscale + opacity)', () => {
    render(
      <BadgeCollection earnedBadgeIds={earnedIds} earnedBadgeMap={earnedMap} />,
    );

    // streak_30 is not earned
    const card = screen.getByTestId('badge-card-streak_30');
    expect(card.className).toContain('opacity-30');
    expect(card.className).toContain('grayscale');
  });
});
