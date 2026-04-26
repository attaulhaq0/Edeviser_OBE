// =============================================================================
// ContributionStatusBadge — Unit tests (Task 11.1)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ContributionStatusBadge from '@/components/shared/ContributionStatusBadge';

describe('ContributionStatusBadge', () => {
  it('renders green badge with "Active" for active status', () => {
    render(<ContributionStatusBadge status="active" />);
    const badge = screen.getByTestId('contribution-status-active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Active');
    expect(badge.className).toMatch(/green/);
  });

  it('renders yellow badge with "Warning" for warning status', () => {
    render(<ContributionStatusBadge status="warning" />);
    const badge = screen.getByTestId('contribution-status-warning');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Warning');
    expect(badge.className).toMatch(/yellow/);
  });

  it('renders red badge with "Inactive" for inactive status', () => {
    render(<ContributionStatusBadge status="inactive" />);
    const badge = screen.getByTestId('contribution-status-inactive');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Inactive');
    expect(badge.className).toMatch(/red/);
  });
});
