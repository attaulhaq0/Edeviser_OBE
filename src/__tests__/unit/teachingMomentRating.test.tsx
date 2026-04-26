// =============================================================================
// TeachingMomentRating — Unit tests (Task 12.3)
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import TeachingMomentRating from '@/components/shared/TeachingMomentRating';

describe('TeachingMomentRating', () => {
  it('renders 5 stars for clarity', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    const clarityGroup = screen.getByTestId('star-input-clarity');
    const stars = within(clarityGroup).getAllByRole('radio');
    expect(stars).toHaveLength(5);
  });

  it('renders 5 stars for helpfulness', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    const helpfulnessGroup = screen.getByTestId('star-input-helpfulness');
    const stars = within(helpfulnessGroup).getAllByRole('radio');
    expect(stars).toHaveLength(5);
  });

  it('star ratings have aria-labels from 1 to 5', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    const clarityGroup = screen.getByTestId('star-input-clarity');
    const stars = within(clarityGroup).getAllByRole('radio');

    expect(stars[0]).toHaveAttribute('aria-label', '1 star');
    expect(stars[1]).toHaveAttribute('aria-label', '2 stars');
    expect(stars[2]).toHaveAttribute('aria-label', '3 stars');
    expect(stars[3]).toHaveAttribute('aria-label', '4 stars');
    expect(stars[4]).toHaveAttribute('aria-label', '5 stars');
  });

  it('renders clarity and helpfulness labels', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Helpfulness')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    expect(screen.getByRole('button', { name: /submit rating/i })).toBeInTheDocument();
  });

  it('shows existing rating message when ratings already provided', () => {
    render(
      <TeachingMomentRating
        onSubmit={vi.fn()}
        existingClarity={4}
        existingHelpfulness={3}
      />,
    );
    expect(
      screen.getByText('You already rated this teaching moment.'),
    ).toBeInTheDocument();
  });
});
