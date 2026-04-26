// =============================================================================
// ChallengeProgressBar — Unit tests (Task 10.4)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ChallengeProgressBar from '@/components/shared/ChallengeProgressBar';

describe('ChallengeProgressBar', () => {
  it('renders with role="progressbar"', () => {
    render(<ChallengeProgressBar current={50} target={100} />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('has aria-valuenow set to current value', () => {
    render(<ChallengeProgressBar current={30} target={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuenow', '30');
  });

  it('has aria-valuemin set to 0', () => {
    render(<ChallengeProgressBar current={30} target={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemin', '0');
  });

  it('has aria-valuemax set to target', () => {
    render(<ChallengeProgressBar current={30} target={100} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-valuemax', '100');
  });

  it('displays percentage correctly', () => {
    render(<ChallengeProgressBar current={75} target={100} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('displays 0% for zero progress', () => {
    render(<ChallengeProgressBar current={0} target={100} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('displays 100% when current equals target', () => {
    render(<ChallengeProgressBar current={100} target={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('caps at 100% when current exceeds target', () => {
    render(<ChallengeProgressBar current={150} target={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows current/target label when showLabel is true', () => {
    render(<ChallengeProgressBar current={25} target={50} showLabel />);
    expect(screen.getByText('25 / 50')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('has accessible aria-label with progress info', () => {
    render(<ChallengeProgressBar current={40} target={200} />);
    const bar = screen.getByRole('progressbar');
    expect(bar).toHaveAttribute('aria-label', 'Progress: 40 of 200 (20%)');
  });
});
