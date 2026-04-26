import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ReviewSessionBadge from '@/components/shared/ReviewSessionBadge';

describe('ReviewSessionBadge', () => {
  it('renders Day 1 Review label', () => {
    render(<ReviewSessionBadge intervalDays={1} status="pending" />);
    expect(screen.getByText('Day 1 Review')).toBeInTheDocument();
  });

  it('renders Day 3 Review label', () => {
    render(<ReviewSessionBadge intervalDays={3} status="pending" />);
    expect(screen.getByText('Day 3 Review')).toBeInTheDocument();
  });

  it('renders Day 7 Review label', () => {
    render(<ReviewSessionBadge intervalDays={7} status="completed" />);
    expect(screen.getByText('Day 7 Review')).toBeInTheDocument();
  });

  it('applies opacity for completed status', () => {
    const { container } = render(<ReviewSessionBadge intervalDays={1} status="completed" />);
    expect(container.firstChild).toHaveClass('opacity-60');
  });

  it('applies line-through for skipped status', () => {
    const { container } = render(<ReviewSessionBadge intervalDays={3} status="skipped" />);
    expect(container.firstChild).toHaveClass('line-through');
  });
});
