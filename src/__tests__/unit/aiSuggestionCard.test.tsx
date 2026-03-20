import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import AISuggestionCard from '@/components/shared/AISuggestionCard';

describe('AISuggestionCard', () => {
  const defaultProps = {
    id: 'sug-1',
    suggestionText: 'Before you tackle CLO-4 (Analyzing), strengthen your CLO-3 (Applying) skills.',
    weakCLOTitle: 'CLO-3: Apply data structures',
    weakCLOAttainment: 55,
    socialProofText: 'Students who improved CLO-3 before CLO-4 scored 34% higher.',
    feedback: null as 'thumbs_up' | 'thumbs_down' | null,
    onFeedback: vi.fn().mockResolvedValue(undefined),
  };

  it('renders the suggestion text', () => {
    render(<AISuggestionCard {...defaultProps} />);

    expect(
      screen.getByText('Before you tackle CLO-4 (Analyzing), strengthen your CLO-3 (Applying) skills.'),
    ).toBeInTheDocument();
  });

  it('renders the AI Suggestion header', () => {
    render(<AISuggestionCard {...defaultProps} />);

    expect(screen.getByText('AI Suggestion')).toBeInTheDocument();
  });

  it('displays CLO gap info with title and attainment percentage', () => {
    render(<AISuggestionCard {...defaultProps} />);

    expect(screen.getByText('CLO-3: Apply data structures')).toBeInTheDocument();
    expect(screen.getByText('55% — Developing')).toBeInTheDocument();
  });

  it('displays social proof text when provided', () => {
    render(<AISuggestionCard {...defaultProps} />);

    expect(
      screen.getByText('Students who improved CLO-3 before CLO-4 scored 34% higher.'),
    ).toBeInTheDocument();
  });

  it('does not render social proof section when socialProofText is null', () => {
    render(<AISuggestionCard {...defaultProps} socialProofText={null} />);

    expect(
      screen.queryByText('Students who improved CLO-3 before CLO-4 scored 34% higher.'),
    ).not.toBeInTheDocument();
  });

  it('shows "Not Yet" label for attainment below 50%', () => {
    render(<AISuggestionCard {...defaultProps} weakCLOAttainment={35} />);

    expect(screen.getByText('35% — Not Yet')).toBeInTheDocument();
  });

  it('shows "Developing" label for attainment between 50-69%', () => {
    render(<AISuggestionCard {...defaultProps} weakCLOAttainment={62} />);

    expect(screen.getByText('62% — Developing')).toBeInTheDocument();
  });

  it('shows "Satisfactory" label for attainment at 70% or above', () => {
    render(<AISuggestionCard {...defaultProps} weakCLOAttainment={75} />);

    expect(screen.getByText('75% — Satisfactory')).toBeInTheDocument();
  });

  it('renders thumbs up/down feedback buttons', () => {
    render(<AISuggestionCard {...defaultProps} />);

    expect(screen.getByLabelText('Thumbs up')).toBeInTheDocument();
    expect(screen.getByLabelText('Thumbs down')).toBeInTheDocument();
  });

  it('renders "Was this helpful?" label', () => {
    render(<AISuggestionCard {...defaultProps} />);

    expect(screen.getByText('Was this helpful?')).toBeInTheDocument();
  });

  it('calls onFeedback with id and feedback value when thumbs up is clicked', async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<AISuggestionCard {...defaultProps} onFeedback={onFeedback} />);

    fireEvent.click(screen.getByLabelText('Thumbs up'));

    await waitFor(() => {
      expect(onFeedback).toHaveBeenCalledWith('sug-1', 'thumbs_up');
    });
  });

  it('calls onFeedback with id and feedback value when thumbs down is clicked', async () => {
    const onFeedback = vi.fn().mockResolvedValue(undefined);
    render(<AISuggestionCard {...defaultProps} onFeedback={onFeedback} />);

    fireEvent.click(screen.getByLabelText('Thumbs down'));

    await waitFor(() => {
      expect(onFeedback).toHaveBeenCalledWith('sug-1', 'thumbs_down');
    });
  });

  it('passes current feedback state to AIFeedbackThumbs', () => {
    render(<AISuggestionCard {...defaultProps} feedback="thumbs_up" />);

    const thumbsUp = screen.getByLabelText('Thumbs up');
    expect(thumbsUp).toHaveAttribute('aria-pressed', 'true');
  });

  it('rounds attainment percentage for display', () => {
    render(<AISuggestionCard {...defaultProps} weakCLOAttainment={55.7} />);

    expect(screen.getByText('56% — Developing')).toBeInTheDocument();
  });
});
