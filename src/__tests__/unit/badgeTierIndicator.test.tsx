import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeTierIndicator from '@/components/shared/BadgeTierIndicator';

describe('BadgeTierIndicator', () => {
  it('renders bronze tier with amber ring', () => {
    render(
      <BadgeTierIndicator tier="bronze">
        <span>🏅</span>
      </BadgeTierIndicator>,
    );
    const el = screen.getByTestId('badge-tier-indicator-bronze');
    expect(el.className).toContain('ring-amber-600');
  });

  it('renders silver tier with gray ring', () => {
    render(
      <BadgeTierIndicator tier="silver">
        <span>🏅</span>
      </BadgeTierIndicator>,
    );
    const el = screen.getByTestId('badge-tier-indicator-silver');
    expect(el.className).toContain('ring-gray-400');
  });

  it('renders gold tier with yellow ring', () => {
    render(
      <BadgeTierIndicator tier="gold">
        <span>🏅</span>
      </BadgeTierIndicator>,
    );
    const el = screen.getByTestId('badge-tier-indicator-gold');
    expect(el.className).toContain('ring-yellow-400');
  });

  it('renders without ring when tier is null', () => {
    render(
      <BadgeTierIndicator tier={null}>
        <span>🏅</span>
      </BadgeTierIndicator>,
    );
    const el = screen.getByTestId('badge-tier-indicator-none');
    expect(el.className).not.toContain('ring-amber');
    expect(el.className).not.toContain('ring-gray');
    expect(el.className).not.toContain('ring-yellow');
  });

  it('renders children inside the indicator', () => {
    render(
      <BadgeTierIndicator tier="gold">
        <span data-testid="child">🏅</span>
      </BadgeTierIndicator>,
    );
    expect(screen.getByTestId('child')).toBeDefined();
  });

  it('applies size classes correctly', () => {
    const { rerender } = render(
      <BadgeTierIndicator tier="bronze" size="sm">
        <span>🏅</span>
      </BadgeTierIndicator>,
    );
    expect(screen.getByTestId('badge-tier-indicator-bronze').className).toContain('ring-2');

    rerender(
      <BadgeTierIndicator tier="bronze" size="lg">
        <span>🏅</span>
      </BadgeTierIndicator>,
    );
    expect(screen.getByTestId('badge-tier-indicator-bronze').className).toContain('ring-4');
  });
});
