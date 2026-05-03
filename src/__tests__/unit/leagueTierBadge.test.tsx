// =============================================================================
// Unit Test: League Tier Badge
// Task 26.6 — Tier badge rendering, promotion animation
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeagueTierBadge from '@/components/shared/LeagueTierBadge';
import { getLeagueTier } from '@/lib/leagueTier';

describe('LeagueTierBadge', () => {
  it('renders Bronze tier', () => {
    render(<LeagueTierBadge tier="Bronze" />);
    expect(screen.getByTestId('league-badge-bronze')).toBeDefined();
    expect(screen.getByText('Bronze')).toBeDefined();
  });

  it('renders Silver tier', () => {
    render(<LeagueTierBadge tier="Silver" />);
    expect(screen.getByTestId('league-badge-silver')).toBeDefined();
    expect(screen.getByText('Silver')).toBeDefined();
  });

  it('renders Gold tier', () => {
    render(<LeagueTierBadge tier="Gold" />);
    expect(screen.getByTestId('league-badge-gold')).toBeDefined();
    expect(screen.getByText('Gold')).toBeDefined();
  });

  it('renders Diamond tier', () => {
    render(<LeagueTierBadge tier="Diamond" />);
    expect(screen.getByTestId('league-badge-diamond')).toBeDefined();
    expect(screen.getByText('Diamond')).toBeDefined();
  });

  it('supports different sizes', () => {
    const { rerender } = render(<LeagueTierBadge tier="Gold" size="sm" />);
    expect(screen.getByTestId('league-badge-gold')).toBeDefined();

    rerender(<LeagueTierBadge tier="Gold" size="lg" />);
    expect(screen.getByTestId('league-badge-gold')).toBeDefined();
  });
});

describe('getLeagueTier', () => {
  it('returns Bronze for 0 XP', () => {
    expect(getLeagueTier(0)).toBe('Bronze');
  });

  it('returns Silver for 500 XP', () => {
    expect(getLeagueTier(500)).toBe('Silver');
  });

  it('returns Gold for 1500 XP', () => {
    expect(getLeagueTier(1500)).toBe('Gold');
  });

  it('returns Diamond for 4000 XP', () => {
    expect(getLeagueTier(4000)).toBe('Diamond');
  });

  it('uses custom thresholds', () => {
    const custom = { bronze: 0, silver: 100, gold: 200, diamond: 300 };
    expect(getLeagueTier(150, custom)).toBe('Silver');
    expect(getLeagueTier(250, custom)).toBe('Gold');
    expect(getLeagueTier(350, custom)).toBe('Diamond');
  });
});
