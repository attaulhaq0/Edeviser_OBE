// =============================================================================
// Unit Test: Badge Tier Indicator
// Task 26.11 — Bronze/Silver/Gold visual rendering
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeTierIndicator from '@/components/shared/BadgeTierIndicator';

describe('BadgeTierIndicator', () => {
  it('renders bronze tier', () => {
    render(<BadgeTierIndicator tier="bronze" />);
    expect(screen.getByTestId('badge-tier-bronze')).toBeDefined();
    expect(screen.getByText('Bronze')).toBeDefined();
  });

  it('renders silver tier', () => {
    render(<BadgeTierIndicator tier="silver" />);
    expect(screen.getByTestId('badge-tier-silver')).toBeDefined();
    expect(screen.getByText('Silver')).toBeDefined();
  });

  it('renders gold tier', () => {
    render(<BadgeTierIndicator tier="gold" />);
    expect(screen.getByTestId('badge-tier-gold')).toBeDefined();
    expect(screen.getByText('Gold')).toBeDefined();
  });

  it('renders nothing for null tier', () => {
    const { container } = render(<BadgeTierIndicator tier={null} />);
    expect(container.innerHTML).toBe('');
  });

  it('supports small size', () => {
    render(<BadgeTierIndicator tier="gold" size="sm" />);
    expect(screen.getByTestId('badge-tier-gold')).toBeDefined();
  });

  it('supports large size', () => {
    render(<BadgeTierIndicator tier="gold" size="lg" />);
    expect(screen.getByTestId('badge-tier-gold')).toBeDefined();
  });

  it('applies custom className', () => {
    render(<BadgeTierIndicator tier="bronze" className="custom-class" />);
    const el = screen.getByTestId('badge-tier-bronze');
    expect(el.className).toContain('custom-class');
  });
});
