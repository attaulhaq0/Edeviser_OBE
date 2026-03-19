import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import WellnessSettingsPanel from '@/components/shared/WellnessSettingsPanel';
import type { WellnessHabitType } from '@/types/habits';

describe('WellnessSettingsPanel', () => {
  const defaultProps = {
    enabledHabits: [] as WellnessHabitType[],
    parentVisibility: false,
    onToggleHabit: vi.fn(),
    onToggleParentVisibility: vi.fn(),
  };

  it('renders 4 wellness habit toggles', () => {
    render(<WellnessSettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('wellness-setting-meditation')).toBeInTheDocument();
    expect(screen.getByTestId('wellness-setting-hydration')).toBeInTheDocument();
    expect(screen.getByTestId('wellness-setting-exercise')).toBeInTheDocument();
    expect(screen.getByTestId('wellness-setting-sleep')).toBeInTheDocument();
  });

  it('renders parent visibility toggle', () => {
    render(<WellnessSettingsPanel {...defaultProps} />);

    expect(screen.getByTestId('wellness-parent-visibility')).toBeInTheDocument();
    expect(screen.getByTestId('wellness-parent-visibility-toggle')).toBeInTheDocument();
  });

  it('shows correct checked state for enabled habits', () => {
    render(
      <WellnessSettingsPanel
        {...defaultProps}
        enabledHabits={['meditation', 'sleep']}
      />,
    );

    const meditationToggle = screen.getByTestId('wellness-setting-toggle-meditation');
    const hydrationToggle = screen.getByTestId('wellness-setting-toggle-hydration');
    const sleepToggle = screen.getByTestId('wellness-setting-toggle-sleep');

    expect(meditationToggle).toHaveAttribute('data-state', 'checked');
    expect(hydrationToggle).toHaveAttribute('data-state', 'unchecked');
    expect(sleepToggle).toHaveAttribute('data-state', 'checked');
  });

  it('calls onToggleHabit when a habit toggle is clicked', () => {
    const onToggleHabit = vi.fn();
    render(
      <WellnessSettingsPanel
        {...defaultProps}
        onToggleHabit={onToggleHabit}
      />,
    );

    const meditationToggle = screen.getByTestId('wellness-setting-toggle-meditation');
    fireEvent.click(meditationToggle);

    expect(onToggleHabit).toHaveBeenCalledWith('meditation', true);
  });

  it('calls onToggleParentVisibility when parent visibility toggle is clicked', () => {
    const onToggleParentVisibility = vi.fn();
    render(
      <WellnessSettingsPanel
        {...defaultProps}
        onToggleParentVisibility={onToggleParentVisibility}
      />,
    );

    const toggle = screen.getByTestId('wellness-parent-visibility-toggle');
    fireEvent.click(toggle);

    expect(onToggleParentVisibility).toHaveBeenCalledWith(true);
  });

  it('shows parent visibility as checked when enabled', () => {
    render(
      <WellnessSettingsPanel
        {...defaultProps}
        parentVisibility={true}
      />,
    );

    const toggle = screen.getByTestId('wellness-parent-visibility-toggle');
    expect(toggle).toHaveAttribute('data-state', 'checked');
  });

  it('renders habit descriptions', () => {
    render(<WellnessSettingsPanel {...defaultProps} />);

    expect(screen.getByText('Track daily meditation sessions (5+ minutes)')).toBeInTheDocument();
    expect(screen.getByText('Track daily water intake (8 glasses)')).toBeInTheDocument();
    expect(screen.getByText('Track daily physical activity (30+ minutes)')).toBeInTheDocument();
    expect(screen.getByText('Track nightly sleep duration (7+ hours)')).toBeInTheDocument();
  });

  it('renders the Wellness Preferences heading', () => {
    render(<WellnessSettingsPanel {...defaultProps} />);

    expect(screen.getByText('Wellness Preferences')).toBeInTheDocument();
  });
});
