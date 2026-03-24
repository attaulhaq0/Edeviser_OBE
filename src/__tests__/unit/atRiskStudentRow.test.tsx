// =============================================================================
// AtRiskStudentRow — Unit tests
// Validates: Requirements 47.3, 47.4
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AtRiskStudentRow from '@/components/shared/AtRiskStudentRow';
import type { ContributingSignals } from '@/hooks/useAtRiskPredictions';

const defaultSignals: ContributingSignals = {
  login_frequency: 'low',
  submission_pattern: 'late',
  attainment_trend: 'declining',
};

const renderRow = (overrides = {}) => {
  const props = {
    studentName: 'Alice Johnson',
    cloTitle: 'Apply data structures in problem solving',
    probabilityScore: 82,
    contributingSignals: defaultSignals,
    onSendNudge: vi.fn(),
    isNudging: false,
    ...overrides,
  };
  return { ...render(<AtRiskStudentRow {...props} />), props };
};

describe('AtRiskStudentRow', () => {
  it('renders student name', () => {
    renderRow();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('renders CLO title', () => {
    renderRow();
    expect(screen.getByText(/Apply data structures/)).toBeInTheDocument();
  });

  it('renders probability score with risk label', () => {
    renderRow({ probabilityScore: 82 });
    expect(screen.getByText('82% risk')).toBeInTheDocument();
  });

  it('renders contributing signal badges', () => {
    renderRow();
    expect(screen.getByText('Login: low')).toBeInTheDocument();
    expect(screen.getByText('Submissions: late')).toBeInTheDocument();
    expect(screen.getByText('Trend: declining')).toBeInTheDocument();
  });

  it('calls onSendNudge when Nudge button is clicked', () => {
    const { props } = renderRow();
    fireEvent.click(screen.getByRole('button', { name: /send nudge/i }));
    expect(props.onSendNudge).toHaveBeenCalledOnce();
  });

  it('disables Nudge button when isNudging is true', () => {
    renderRow({ isNudging: true });
    expect(screen.getByRole('button', { name: /send nudge/i })).toBeDisabled();
  });

  it('applies red color for high probability scores (>=75)', () => {
    renderRow({ probabilityScore: 90 });
    const badge = screen.getByText('90% risk');
    expect(badge.className).toContain('text-red-600');
  });

  it('applies yellow color for medium probability scores (50-74)', () => {
    renderRow({ probabilityScore: 60 });
    const badge = screen.getByText('60% risk');
    expect(badge.className).toContain('text-yellow-600');
  });

  it('applies blue color for lower probability scores (<50)', () => {
    renderRow({ probabilityScore: 35 });
    const badge = screen.getByText('35% risk');
    expect(badge.className).toContain('text-blue-600');
  });

  it('renders signal badges with correct colors for positive signals', () => {
    renderRow({
      contributingSignals: {
        login_frequency: 'high',
        submission_pattern: 'early',
        attainment_trend: 'improving',
      },
    });
    const loginBadge = screen.getByText('Login: high');
    expect(loginBadge.className).toContain('text-green-600');
    const subBadge = screen.getByText('Submissions: early');
    expect(subBadge.className).toContain('text-green-600');
    const trendBadge = screen.getByText('Trend: improving');
    expect(trendBadge.className).toContain('text-green-600');
  });
});
