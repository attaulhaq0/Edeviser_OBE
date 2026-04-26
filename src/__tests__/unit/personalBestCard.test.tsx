import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import PersonalBestCard from '@/components/shared/PersonalBestCard';

describe('PersonalBestCard', () => {
  it('renders label, current value, and unit', () => {
    render(<PersonalBestCard label="Weekly XP" currentValue={500} previousValue={400} />);
    expect(screen.getByText('Weekly XP')).toBeDefined();
    expect(screen.getByText('500')).toBeDefined();
  });

  it('shows positive delta with up arrow when current > previous', () => {
    render(<PersonalBestCard label="XP" currentValue={600} previousValue={400} />);
    expect(screen.getByTestId('delta-up')).toBeDefined();
    expect(screen.getByTestId('delta-value').textContent).toContain('+200');
    expect(screen.getByTestId('percent-change').textContent).toContain('+50%');
  });

  it('shows negative delta with down arrow when current < previous', () => {
    render(<PersonalBestCard label="XP" currentValue={300} previousValue={500} />);
    expect(screen.getByTestId('delta-down')).toBeDefined();
    expect(screen.getByTestId('delta-value').textContent).toContain('-200');
  });

  it('shows neutral state when current equals previous', () => {
    render(<PersonalBestCard label="XP" currentValue={100} previousValue={100} />);
    expect(screen.getByTestId('delta-value').textContent).toContain('0');
    expect(screen.getByTestId('percent-change').textContent).toContain('0%');
  });

  it('handles zero previous value without division error', () => {
    render(<PersonalBestCard label="XP" currentValue={100} previousValue={0} />);
    expect(screen.getByTestId('delta-up')).toBeDefined();
    expect(screen.getByTestId('percent-change').textContent).toContain('+100%');
  });

  it('displays "vs previous week" label', () => {
    render(<PersonalBestCard label="XP" currentValue={100} previousValue={50} />);
    expect(screen.getByText('vs previous week')).toBeDefined();
  });

  it('renders with data-testid', () => {
    render(<PersonalBestCard label="XP" currentValue={100} previousValue={50} />);
    expect(screen.getByTestId('personal-best-card')).toBeDefined();
  });
});
