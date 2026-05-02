// Unit test: TeachingMomentRating — star rating 1-5 for clarity and helpfulness
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TeachingMomentRating from '@/components/shared/TeachingMomentRating';

describe('TeachingMomentRating', () => {
  it('renders clarity and helpfulness labels', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    expect(screen.getByText('Clarity')).toBeDefined();
    expect(screen.getByText('Helpfulness')).toBeDefined();
  });

  it('renders 5 stars for each rating category', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    const clarityGroup = screen.getByLabelText('Clarity rating');
    const helpfulnessGroup = screen.getByLabelText('Helpfulness rating');
    expect(clarityGroup.querySelectorAll('[role="radio"]').length).toBe(5);
    expect(helpfulnessGroup.querySelectorAll('[role="radio"]').length).toBe(5);
  });

  it('submit button is disabled until both ratings are set', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    const submitBtn = screen.getByText('Submit Rating').closest('button');
    expect(submitBtn?.disabled).toBe(true);
  });

  it('submit button is enabled after both ratings are set', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    // Click 3rd star in clarity
    const clarityStars = screen.getByLabelText('Clarity rating').querySelectorAll('[role="radio"]');
    fireEvent.click(clarityStars[2]!);
    // Click 4th star in helpfulness
    const helpfulnessStars = screen.getByLabelText('Helpfulness rating').querySelectorAll('[role="radio"]');
    fireEvent.click(helpfulnessStars[3]!);

    const submitBtn = screen.getByText('Submit Rating').closest('button');
    expect(submitBtn?.disabled).toBe(false);
  });

  it('calls onSubmit with clarity and helpfulness values', () => {
    const onSubmit = vi.fn();
    render(<TeachingMomentRating onSubmit={onSubmit} />);

    const clarityStars = screen.getByLabelText('Clarity rating').querySelectorAll('[role="radio"]');
    fireEvent.click(clarityStars[3]!); // 4 stars

    const helpfulnessStars = screen.getByLabelText('Helpfulness rating').querySelectorAll('[role="radio"]');
    fireEvent.click(helpfulnessStars[4]!); // 5 stars

    fireEvent.click(screen.getByText('Submit Rating'));
    expect(onSubmit).toHaveBeenCalledWith(4, 5);
  });

  it('renders in read-only mode without submit button', () => {
    render(
      <TeachingMomentRating
        onSubmit={vi.fn()}
        readOnly
        initialClarity={3}
        initialHelpfulness={4}
      />,
    );
    expect(screen.queryByText('Submit Rating')).toBeNull();
  });

  it('stars have accessible aria-label', () => {
    render(<TeachingMomentRating onSubmit={vi.fn()} />);
    // Two "1 star" labels exist (one for clarity, one for helpfulness)
    expect(screen.getAllByLabelText('1 star').length).toBe(2);
    expect(screen.getAllByLabelText('2 stars').length).toBe(2);
  });
});
