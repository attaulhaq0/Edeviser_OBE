import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import BadgeCollection from '@/components/shared/BadgeCollection';
import type { TieredBadgeData } from '@/hooks/useTieredBadges';

// ---------------------------------------------------------------------------
// Mock date-fns format to avoid locale issues in tests
// ---------------------------------------------------------------------------
vi.mock('date-fns', () => ({
  format: (date: Date, _fmt: string) =>
    date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
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

const makeTieredBadge = (
  overrides: Partial<TieredBadgeData> = {},
): TieredBadgeData => ({
  id: 'badge-1',
  name: 'Test Badge',
  emoji: '🏅',
  description: 'A test badge',
  category: 'academic',
  tier: 'bronze',
  is_pinned: false,
  archived_at: null,
  earned_at: '2024-06-01T10:00:00Z',
  progress_toward_next: 0.5,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Legacy mode tests
// ---------------------------------------------------------------------------
describe('BadgeCollection — Legacy mode', () => {
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
    const card = screen.getByTestId('badge-card-streak_30');
    expect(card.className).toContain('opacity-30');
    expect(card.className).toContain('grayscale');
  });
});


// ---------------------------------------------------------------------------
// Tiered mode tests
// ---------------------------------------------------------------------------
describe('BadgeCollection — Tiered mode', () => {
  it('renders active section with max 12 badges', () => {
    const badges = Array.from({ length: 15 }, (_, i) =>
      makeTieredBadge({
        id: `badge-${i}`,
        name: `Badge ${i}`,
        earned_at: new Date(2024, 5, 15 - i).toISOString(),
      }),
    );
    render(<BadgeCollection tieredBadges={badges} />);
    // Active section should show max 12
    const activeCards = badges
      .slice(0, 12)
      .map((b) => screen.getByTestId(`badge-card-${b.id}`));
    expect(activeCards).toHaveLength(12);
  });

  it('shows pinned badges first in active section', () => {
    const badges = [
      makeTieredBadge({ id: 'old', name: 'Old', earned_at: '2024-01-01T00:00:00Z', is_pinned: true }),
      makeTieredBadge({ id: 'new', name: 'New', earned_at: '2024-06-15T00:00:00Z' }),
    ];
    render(<BadgeCollection tieredBadges={badges} />);
    const cards = screen.getAllByTestId(/^badge-card-/);
    expect(cards[0]).toHaveAttribute('data-testid', 'badge-card-old');
  });

  it('displays tier color-coded border for bronze', () => {
    const badges = [makeTieredBadge({ tier: 'bronze' })];
    render(<BadgeCollection tieredBadges={badges} />);
    const card = screen.getByTestId('badge-card-badge-1');
    expect(card.className).toContain('border-amber-600');
  });

  it('displays tier color-coded border for silver', () => {
    const badges = [makeTieredBadge({ tier: 'silver' })];
    render(<BadgeCollection tieredBadges={badges} />);
    const card = screen.getByTestId('badge-card-badge-1');
    expect(card.className).toContain('border-gray-400');
  });

  it('displays tier color-coded border for gold', () => {
    const badges = [makeTieredBadge({ tier: 'gold' })];
    render(<BadgeCollection tieredBadges={badges} />);
    const card = screen.getByTestId('badge-card-badge-1');
    expect(card.className).toContain('border-yellow-400');
  });

  it('shows progress bar toward next tier (not gold)', () => {
    const badges = [makeTieredBadge({ tier: 'silver', progress_toward_next: 0.75 })];
    render(<BadgeCollection tieredBadges={badges} />);
    const progress = screen.getByTestId('badge-progress-badge-1');
    expect(progress).toBeDefined();
    expect(progress.textContent).toContain('75%');
  });

  it('does not show progress bar for gold tier', () => {
    const badges = [makeTieredBadge({ tier: 'gold' })];
    render(<BadgeCollection tieredBadges={badges} />);
    expect(screen.queryByTestId('badge-progress-badge-1')).toBeNull();
  });

  it('shows "View All Badges" button when archived badges exist', () => {
    const badges = Array.from({ length: 15 }, (_, i) =>
      makeTieredBadge({
        id: `badge-${i}`,
        name: `Badge ${i}`,
        earned_at: new Date(2024, 5, 15 - i).toISOString(),
      }),
    );
    render(<BadgeCollection tieredBadges={badges} />);
    const btn = screen.getByTestId('view-all-badges-btn');
    expect(btn).toBeDefined();
  });

  it('expands archived section on click', () => {
    const badges = Array.from({ length: 15 }, (_, i) =>
      makeTieredBadge({
        id: `badge-${i}`,
        name: `Badge ${i}`,
        earned_at: new Date(2024, 5, 15 - i).toISOString(),
      }),
    );
    render(<BadgeCollection tieredBadges={badges} />);
    const btn = screen.getByTestId('view-all-badges-btn');
    fireEvent.click(btn);
    // Archived badges (13, 14) should now be visible
    expect(screen.getByTestId('badge-card-badge-12')).toBeDefined();
    expect(screen.getByTestId('badge-card-badge-13')).toBeDefined();
    expect(screen.getByTestId('badge-card-badge-14')).toBeDefined();
  });

  it('calls onPinBadge when pin button clicked', () => {
    const onPin = vi.fn();
    const badges = [makeTieredBadge({ is_pinned: false })];
    render(<BadgeCollection tieredBadges={badges} onPinBadge={onPin} />);
    const pinBtn = screen.getByTestId('badge-pin-badge-1');
    fireEvent.click(pinBtn);
    expect(onPin).toHaveBeenCalledWith('badge-1');
  });

  it('calls onUnpinBadge when unpin button clicked', () => {
    const onUnpin = vi.fn();
    const badges = [makeTieredBadge({ is_pinned: true })];
    render(<BadgeCollection tieredBadges={badges} onUnpinBadge={onUnpin} />);
    const pinBtn = screen.getByTestId('badge-pin-badge-1');
    fireEvent.click(pinBtn);
    expect(onUnpin).toHaveBeenCalledWith('badge-1');
  });

  it('disables pin button when 3 badges already pinned', () => {
    const badges = [
      makeTieredBadge({ id: 'p1', is_pinned: true }),
      makeTieredBadge({ id: 'p2', is_pinned: true }),
      makeTieredBadge({ id: 'p3', is_pinned: true }),
      makeTieredBadge({ id: 'unpinned', is_pinned: false }),
    ];
    const onPin = vi.fn();
    render(<BadgeCollection tieredBadges={badges} onPinBadge={onPin} />);
    const pinBtn = screen.getByTestId('badge-pin-unpinned');
    expect(pinBtn).toBeDisabled();
  });
});
