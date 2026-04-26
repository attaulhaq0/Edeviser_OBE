// Task 26.9: Class Donation Progress — Progress bar, goal completion
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ClassDonationProgress from '@/components/shared/ClassDonationProgress';
import type { ClassDonation } from '@/hooks/useClassDonations';

const makeDonation = (overrides: Partial<ClassDonation> = {}): ClassDonation => ({
  id: 'd-1',
  course_id: 'c-1',
  resource_description: 'New Lab Equipment',
  goal_amount: 5000,
  current_total: 2500,
  status: 'active',
  created_at: '2025-01-01T00:00:00Z',
  ...overrides,
});

describe('ClassDonationProgress', () => {
  it('renders the resource description', () => {
    render(<ClassDonationProgress donation={makeDonation()} />);
    expect(screen.getByText('New Lab Equipment')).toBeDefined();
  });

  it('displays correct percentage', () => {
    render(<ClassDonationProgress donation={makeDonation()} />);
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('displays current total and goal', () => {
    render(<ClassDonationProgress donation={makeDonation()} />);
    expect(screen.getByText('2,500 XP raised')).toBeDefined();
    expect(screen.getByText('Goal: 5,000 XP')).toBeDefined();
  });

  it('shows 100% when goal is met', () => {
    render(<ClassDonationProgress donation={makeDonation({ current_total: 5000 })} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('caps percentage at 100% when over goal', () => {
    render(<ClassDonationProgress donation={makeDonation({ current_total: 7000 })} />);
    expect(screen.getByText('100%')).toBeDefined();
  });

  it('shows 0% when no contributions', () => {
    render(<ClassDonationProgress donation={makeDonation({ current_total: 0 })} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('handles zero goal amount gracefully', () => {
    render(<ClassDonationProgress donation={makeDonation({ goal_amount: 0 })} />);
    expect(screen.getByText('0%')).toBeDefined();
  });

  it('renders progress bar with gradient', () => {
    const { container } = render(<ClassDonationProgress donation={makeDonation()} />);
    const bar = container.querySelector('[style*="linear-gradient"]');
    expect(bar).toBeDefined();
  });
});
