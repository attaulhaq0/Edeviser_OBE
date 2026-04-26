// Task 26.8: Badge Spotlight Card — Spotlight rendering, progress display
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeSpotlightCard from '@/components/shared/BadgeSpotlightCard';

describe('BadgeSpotlightCard', () => {
  const defaultProps = {
    category: 'academic',
    currentTier: 'bronze' as const,
    progress: 0.65,
    daysRemaining: 3,
  };

  it('renders the spotlight card', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    expect(screen.getByTestId('badge-spotlight-card')).toBeDefined();
  });

  it('displays "Badge Spotlight" title', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    expect(screen.getByText('Badge Spotlight')).toBeDefined();
  });

  it('displays the category name', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    expect(screen.getByText('academic')).toBeDefined();
  });

  it('displays the 2x XP bonus label', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    expect(screen.getByTestId('spotlight-bonus-label')).toBeDefined();
    expect(screen.getByText('2x XP Bonus this week')).toBeDefined();
  });

  it('displays current tier', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    const tierEl = screen.getByTestId('spotlight-current-tier');
    expect(tierEl.textContent).toBe('bronze');
  });

  it('displays progress percentage', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    const progressEl = screen.getByTestId('spotlight-progress');
    expect(progressEl.textContent).toContain('65%');
  });

  it('displays days remaining countdown', () => {
    render(<BadgeSpotlightCard {...defaultProps} />);
    const countdown = screen.getByTestId('spotlight-countdown');
    expect(countdown.textContent).toContain('3 days remaining');
  });

  it('uses singular "day" when 1 day remaining', () => {
    render(<BadgeSpotlightCard {...defaultProps} daysRemaining={1} />);
    const countdown = screen.getByTestId('spotlight-countdown');
    expect(countdown.textContent).toBe('1 day remaining');
  });

  it('caps progress at 100%', () => {
    render(<BadgeSpotlightCard {...defaultProps} progress={1.5} />);
    const progressEl = screen.getByTestId('spotlight-progress');
    expect(progressEl.textContent).toContain('100%');
  });

  it('does not show tier when currentTier is null', () => {
    render(<BadgeSpotlightCard {...defaultProps} currentTier={null} />);
    expect(screen.queryByTestId('spotlight-current-tier')).toBeNull();
  });

  it('renders progress bar with correct width', () => {
    render(<BadgeSpotlightCard {...defaultProps} progress={0.5} />);
    const progressEl = screen.getByTestId('spotlight-progress');
    const bar = progressEl.querySelector('[style]');
    expect(bar?.getAttribute('style')).toContain('width: 50%');
  });
});
