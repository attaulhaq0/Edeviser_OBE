// =============================================================================
// TeamHealthBadge — Unit tests (Task 13.2)
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TeamHealthBadge from '@/components/shared/TeamHealthBadge';

describe('TeamHealthBadge', () => {
  it('renders green color for score >= 70', () => {
    render(<TeamHealthBadge score={85} />);
    const badge = screen.getByTestId('team-health-badge-healthy');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Healthy');
    expect(badge.className).toMatch(/green/);
  });

  it('renders green at exactly 70', () => {
    render(<TeamHealthBadge score={70} />);
    const badge = screen.getByTestId('team-health-badge-healthy');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Healthy');
  });

  it('renders yellow color for score 40-69', () => {
    render(<TeamHealthBadge score={55} />);
    const badge = screen.getByTestId('team-health-badge-needs_attention');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('Needs Attention');
    expect(badge.className).toMatch(/yellow/);
  });

  it('renders yellow at exactly 40', () => {
    render(<TeamHealthBadge score={40} />);
    const badge = screen.getByTestId('team-health-badge-needs_attention');
    expect(badge).toBeInTheDocument();
  });

  it('renders red color for score < 40', () => {
    render(<TeamHealthBadge score={20} />);
    const badge = screen.getByTestId('team-health-badge-at_risk');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveTextContent('At Risk');
    expect(badge.className).toMatch(/red/);
  });

  it('renders red at score 0', () => {
    render(<TeamHealthBadge score={0} />);
    const badge = screen.getByTestId('team-health-badge-at_risk');
    expect(badge).toBeInTheDocument();
  });

  it('displays the score when showScore is true (default)', () => {
    render(<TeamHealthBadge score={75} />);
    expect(screen.getByText('75')).toBeInTheDocument();
  });

  it('hides the score when showScore is false', () => {
    render(<TeamHealthBadge score={75} showScore={false} />);
    expect(screen.queryByText('75')).not.toBeInTheDocument();
  });
});
