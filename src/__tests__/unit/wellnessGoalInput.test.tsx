import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WellnessGoalInput from '@/components/shared/WellnessGoalInput';
import type { WellnessTarget } from '@/types/habits';

const makeTarget = (overrides: Partial<WellnessTarget> = {}): WellnessTarget => ({
  habitType: 'meditation',
  targetValue: 10,
  unit: 'min',
  ...overrides,
});

describe('WellnessGoalInput', () => {
  it('renders the goal container', () => {
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={makeTarget()}
        progress={50}
        currentValue={5}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByTestId('wellness-goal-meditation')).toBeInTheDocument();
  });

  it('shows progress label with current/target values', () => {
    render(
      <WellnessGoalInput
        habitType="hydration"
        target={makeTarget({ habitType: 'hydration', targetValue: 8, unit: 'glasses' })}
        progress={50}
        currentValue={4}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-progress-label-hydration')).toHaveTextContent('4/8 glasses');
  });

  it('shows progress bar', () => {
    render(
      <WellnessGoalInput
        habitType="exercise"
        target={makeTarget({ habitType: 'exercise', targetValue: 30, unit: 'min' })}
        progress={60}
        currentValue={18}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-progress-bar-exercise')).toBeInTheDocument();
  });

  it('shows target met indicator when progress >= 100', () => {
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={makeTarget()}
        progress={100}
        currentValue={10}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-met-meditation')).toBeInTheDocument();
    expect(screen.getByText('Target met')).toBeInTheDocument();
  });

  it('does not show target met indicator when progress < 100', () => {
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={makeTarget()}
        progress={50}
        currentValue={5}
        onSave={vi.fn()}
      />,
    );
    expect(screen.queryByTestId('goal-met-meditation')).not.toBeInTheDocument();
  });

  it('shows edit mode when no target is set', () => {
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={null}
        progress={0}
        currentValue={0}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByTestId('goal-input-meditation')).toBeInTheDocument();
    expect(screen.getByTestId('goal-save-meditation')).toBeInTheDocument();
  });

  it('switches to edit mode when Edit button is clicked', () => {
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={makeTarget()}
        progress={50}
        currentValue={5}
        onSave={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByTestId('goal-edit-meditation'));
    expect(screen.getByTestId('goal-input-meditation')).toBeInTheDocument();
  });

  it('calls onSave with correct target when Save is clicked', () => {
    const onSave = vi.fn();
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={null}
        progress={0}
        currentValue={0}
        onSave={onSave}
      />,
    );

    const input = screen.getByTestId('goal-input-meditation');
    fireEvent.change(input, { target: { value: '15' } });
    fireEvent.click(screen.getByTestId('goal-save-meditation'));

    expect(onSave).toHaveBeenCalledWith({
      habitType: 'meditation',
      targetValue: 15,
      unit: 'min',
    });
  });

  it('does not call onSave for invalid (zero) value', () => {
    const onSave = vi.fn();
    render(
      <WellnessGoalInput
        habitType="meditation"
        target={null}
        progress={0}
        currentValue={0}
        onSave={onSave}
      />,
    );

    const input = screen.getByTestId('goal-input-meditation');
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByTestId('goal-save-meditation'));

    expect(onSave).not.toHaveBeenCalled();
  });

  it('renders habit label correctly', () => {
    render(
      <WellnessGoalInput
        habitType="sleep"
        target={makeTarget({ habitType: 'sleep', unit: 'hours' })}
        progress={70}
        currentValue={7}
        onSave={vi.fn()}
      />,
    );
    expect(screen.getByText('Sleep Goal')).toBeInTheDocument();
  });
});
