// =============================================================================
// Unit Test: Personal Best Card
// Task 26.7 — Metric comparison, delta arrows
// =============================================================================

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalBestCard from '@/components/shared/PersonalBestCard';

describe('PersonalBestCard', () => {
  it('renders the label and current value', () => {
    render(
      <PersonalBestCard label="Weekly XP" currentValue={500} previousValue={400} />,
    );

    expect(screen.getByText('Weekly XP')).toBeDefined();
    expect(screen.getByText('500')).toBeDefined();
  });

  it('shows upward delta when current > previous', () => {
    render(
      <PersonalBestCard label="XP" currentValue={500} previousValue={400} />,
    );

    expect(screen.getByTestId('delta-up')).toBeDefined();
    expect(screen.getByText('+100 (25%)')).toBeDefined();
  });

  it('shows downward delta when current < previous', () => {
    render(
      <PersonalBestCard label="XP" currentValue={300} previousValue={400} />,
    );

    expect(screen.getByTestId('delta-down')).toBeDefined();
    expect(screen.getByText('-100 (-25%)')).toBeDefined();
  });

  it('shows no change when current equals previous', () => {
    render(
      <PersonalBestCard label="XP" currentValue={400} previousValue={400} />,
    );

    expect(screen.getByTestId('delta-neutral')).toBeDefined();
    expect(screen.getByText('No change')).toBeDefined();
  });

  it('shows personal best label when isPersonalBest is true', () => {
    render(
      <PersonalBestCard
        label="XP"
        currentValue={500}
        previousValue={400}
        isPersonalBest={true}
      />,
    );

    expect(screen.getByTestId('personal-best-label')).toBeDefined();
  });

  it('does not show personal best label by default', () => {
    render(
      <PersonalBestCard label="XP" currentValue={500} previousValue={400} />,
    );

    expect(screen.queryByTestId('personal-best-label')).toBeNull();
  });
});
