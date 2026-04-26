// Task 26.6: League Tier Badge — Tier badge rendering, promotion animation
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LeagueTierBadge from '@/components/shared/LeagueTierBadge';
import type { LeagueTierName } from '@/lib/leagueTier';

describe('LeagueTierBadge', () => {
  const tiers: LeagueTierName[] = ['Bronze', 'Silver', 'Gold', 'Diamond'];

  it.each(tiers)('renders %s tier badge with correct test id', (tier) => {
    render(<LeagueTierBadge tier={tier} />);
    expect(screen.getByTestId(`league-badge-${tier.toLowerCase()}`)).toBeDefined();
  });

  it.each(tiers)('displays tier name text for %s', (tier) => {
    render(<LeagueTierBadge tier={tier} />);
    expect(screen.getByText(tier)).toBeDefined();
  });

  it('applies small size classes', () => {
    render(<LeagueTierBadge tier="Bronze" size="sm" />);
    const el = screen.getByTestId('league-badge-bronze');
    expect(el.className).toContain('text-xs');
  });

  it('applies medium size classes by default', () => {
    render(<LeagueTierBadge tier="Silver" />);
    const el = screen.getByTestId('league-badge-silver');
    expect(el.className).toContain('text-sm');
  });

  it('applies large size classes', () => {
    render(<LeagueTierBadge tier="Gold" size="lg" />);
    const el = screen.getByTestId('league-badge-gold');
    expect(el.className).toContain('text-base');
  });

  it('renders Bronze with amber color', () => {
    render(<LeagueTierBadge tier="Bronze" />);
    const el = screen.getByTestId('league-badge-bronze');
    expect(el.className).toContain('bg-amber-600');
  });

  it('renders Silver with gray color', () => {
    render(<LeagueTierBadge tier="Silver" />);
    const el = screen.getByTestId('league-badge-silver');
    expect(el.className).toContain('bg-gray-400');
  });

  it('renders Gold with yellow color', () => {
    render(<LeagueTierBadge tier="Gold" />);
    const el = screen.getByTestId('league-badge-gold');
    expect(el.className).toContain('bg-yellow-400');
  });

  it('renders Diamond with blue color', () => {
    render(<LeagueTierBadge tier="Diamond" />);
    const el = screen.getByTestId('league-badge-diamond');
    expect(el.className).toContain('bg-blue-400');
  });

  it('accepts custom className', () => {
    render(<LeagueTierBadge tier="Bronze" className="custom-class" />);
    const el = screen.getByTestId('league-badge-bronze');
    expect(el.className).toContain('custom-class');
  });
});
