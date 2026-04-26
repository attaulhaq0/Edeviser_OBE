import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SessionIntentDialog from '@/components/shared/SessionIntentDialog';
import type { SuggestedIntent } from '@/types/planner';

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  suggestedIntents: [] as SuggestedIntent[],
  onSubmit: vi.fn(),
  onSkip: vi.fn(),
};

describe('SessionIntentDialog', () => {
  it('renders the dialog title', () => {
    render(<SessionIntentDialog {...defaultProps} />);
    expect(screen.getByText('Set Your Intent')).toBeInTheDocument();
  });

  it('renders concept and success criterion inputs', () => {
    render(<SessionIntentDialog {...defaultProps} />);
    expect(screen.getByLabelText(/what specific concept/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/what does success look like/i)).toBeInTheDocument();
  });

  it('disables submit when inputs are too short', () => {
    render(<SessionIntentDialog {...defaultProps} />);
    const submitBtn = screen.getByText('Set Intent & Start');
    expect(submitBtn).toBeDisabled();
  });

  it('enables submit when both inputs have >= 5 characters', () => {
    render(<SessionIntentDialog {...defaultProps} />);
    fireEvent.change(screen.getByLabelText(/what specific concept/i), {
      target: { value: 'Learn recursion basics' },
    });
    fireEvent.change(screen.getByLabelText(/what does success look like/i), {
      target: { value: 'Solve 3 problems' },
    });
    expect(screen.getByText('Set Intent & Start')).not.toBeDisabled();
  });

  it('calls onSubmit with correct values', () => {
    const onSubmit = vi.fn();
    render(<SessionIntentDialog {...defaultProps} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText(/what specific concept/i), {
      target: { value: 'Learn recursion basics' },
    });
    fireEvent.change(screen.getByLabelText(/what does success look like/i), {
      target: { value: 'Solve 3 problems' },
    });
    fireEvent.click(screen.getByText('Set Intent & Start'));
    expect(onSubmit).toHaveBeenCalledWith('Learn recursion basics', 'Solve 3 problems', false);
  });

  it('calls onSkip when Skip is clicked', () => {
    const onSkip = vi.fn();
    render(<SessionIntentDialog {...defaultProps} onSkip={onSkip} />);
    fireEvent.click(screen.getByText('Skip'));
    expect(onSkip).toHaveBeenCalled();
  });

  it('renders suggested intents as clickable chips', () => {
    const suggestions: SuggestedIntent[] = [
      { concept: 'Review: Data Structures', successCriterion: 'Improve attainment', source: 'low_attainment' },
    ];
    render(<SessionIntentDialog {...defaultProps} suggestedIntents={suggestions} />);
    expect(screen.getByText('Review: Data Structures')).toBeInTheDocument();
  });

  it('populates inputs when a suggestion is clicked', () => {
    const suggestions: SuggestedIntent[] = [
      { concept: 'Review: Data Structures', successCriterion: 'Improve attainment', source: 'low_attainment' },
    ];
    render(<SessionIntentDialog {...defaultProps} suggestedIntents={suggestions} />);
    fireEvent.click(screen.getByText('Review: Data Structures'));
    expect((screen.getByLabelText(/what specific concept/i) as HTMLInputElement).value).toBe('Review: Data Structures');
  });
});
