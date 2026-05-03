// =============================================================================
// Unit Test: Badge Spotlight Card
// Task 26.8 — Spotlight rendering, progress display
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import BadgeSpotlightCard from '@/components/shared/BadgeSpotlightCard';

describe('BadgeSpotlightCard', () => {
  it('renders the spotlight card', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="bronze"
        progress={0.5}
        daysRemaining={3}
      />,
    );

    expect(screen.getByTestId('badge-spotlight-card')).toBeDefined();
    expect(screen.getByText('Badge Spotlight')).toBeDefined();
  });

  it('displays the category', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="bronze"
        progress={0.5}
        daysRemaining={3}
      />,
    );

    expect(screen.getByText('academic')).toBeDefined();
  });

  it('displays the current tier', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="silver"
        progress={0.7}
        daysRemaining={5}
      />,
    );

    expect(screen.getByTestId('spotlight-current-tier')).toBeDefined();
    expect(screen.getByText('silver')).toBeDefined();
  });

  it('displays progress percentage', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="bronze"
        progress={0.75}
        daysRemaining={2}
      />,
    );

    expect(screen.getByTestId('spotlight-progress')).toBeDefined();
    expect(screen.getByText('75%')).toBeDefined();
  });

  it('displays days remaining', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="bronze"
        progress={0.5}
        daysRemaining={4}
      />,
    );

    expect(screen.getByTestId('spotlight-countdown')).toBeDefined();
    expect(screen.getByText('4 days remaining')).toBeDefined();
  });

  it('shows singular day for 1 day remaining', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="gold"
        progress={0.9}
        daysRemaining={1}
      />,
    );

    expect(screen.getByText('1 day remaining')).toBeDefined();
  });

  it('shows 2x XP bonus label', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="bronze"
        progress={0.5}
        daysRemaining={3}
      />,
    );

    expect(screen.getByTestId('spotlight-bonus-label')).toBeDefined();
  });

  it('caps progress at 100%', () => {
    render(
      <BadgeSpotlightCard
        category="academic"
        currentTier="gold"
        progress={1.5}
        daysRemaining={0}
      />,
    );

    expect(screen.getByText('100%')).toBeDefined();
  });
});
