// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import XPBalanceBadge from '@/components/shared/XPBalanceBadge';

// ── Mocks ────────────────────────────────────────────────────────────────────

let mockBalance: number | undefined = 500;
let mockIsLoading = false;

vi.mock('@/hooks/useXPBalance', () => ({
  useXPBalance: () => ({
    data: mockBalance,
    isLoading: mockIsLoading,
  }),
}));

// ── Tests ────────────────────────────────────────────────────────────────────

describe('XPBalanceBadge', () => {
  it('renders formatted XP balance with coin icon', () => {
    mockBalance = 500;
    mockIsLoading = false;
    render(<XPBalanceBadge studentId="student-1" />);

    expect(screen.getByText('500 XP')).toBeInTheDocument();
  });

  it('shows 0 when balance is zero', () => {
    mockBalance = 0;
    mockIsLoading = false;
    render(<XPBalanceBadge studentId="student-1" />);

    expect(screen.getByText('0 XP')).toBeInTheDocument();
  });

  it('shows loading shimmer when data is loading', () => {
    mockBalance = undefined;
    mockIsLoading = true;
    const { container } = render(<XPBalanceBadge studentId="student-1" />);

    const shimmer = container.querySelector('.animate-shimmer');
    expect(shimmer).toBeInTheDocument();
  });

  it('formats large numbers with commas (e.g., 1,250)', () => {
    mockBalance = 1250;
    mockIsLoading = false;
    render(<XPBalanceBadge studentId="student-1" />);

    expect(screen.getByText('1,250 XP')).toBeInTheDocument();
  });

  it('shows 0 XP when balance is undefined (fallback)', () => {
    mockBalance = undefined;
    mockIsLoading = false;
    render(<XPBalanceBadge studentId="student-1" />);

    expect(screen.getByText('0 XP')).toBeInTheDocument();
  });
});
