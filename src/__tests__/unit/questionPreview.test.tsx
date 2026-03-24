// =============================================================================
// QuestionPreview — Unit tests
// Validates: Requirement 7 (Adaptive Quiz Session Flow), Task 7.1
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuestionPreview from '@/components/shared/QuestionPreview';
import type { QuestionPreviewProps } from '@/components/shared/QuestionPreview';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const mcqOptions = [
  { key: 'A', text: 'Linked list' },
  { key: 'B', text: 'Array' },
  { key: 'C', text: 'Hash map' },
  { key: 'D', text: 'Binary tree' },
];

const renderPreview = (overrides: Partial<QuestionPreviewProps> = {}) =>
  render(
    <QuestionPreview
      questionText="What data structure uses FIFO?"
      questionType="mcq"
      options={mcqOptions}
      {...overrides}
    />,
  );

// ─── MCQ Tests ───────────────────────────────────────────────────────────────

describe('QuestionPreview — MCQ', () => {
  it('renders question text', () => {
    renderPreview();
    expect(screen.getByText('What data structure uses FIFO?')).toBeInTheDocument();
  });

  it('renders all MCQ options with keys', () => {
    renderPreview();
    expect(screen.getByText('Linked list')).toBeInTheDocument();
    expect(screen.getByText('Array')).toBeInTheDocument();
    expect(screen.getByText('Hash map')).toBeInTheDocument();
    expect(screen.getByText('Binary tree')).toBeInTheDocument();
  });

  it('renders radio buttons for MCQ options', () => {
    renderPreview();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(4);
  });

  it('calls onAnswerChange when an MCQ option is clicked', () => {
    const onChange = vi.fn();
    renderPreview({ onAnswerChange: onChange });
    fireEvent.click(screen.getByText('Array'));
    expect(onChange).toHaveBeenCalledWith('B');
  });

  it('marks selected option as checked', () => {
    renderPreview({ selectedAnswer: 'C' });
    const radios = screen.getAllByRole('radio');
    const checkedRadio = radios.find((r) => r.getAttribute('aria-checked') === 'true');
    expect(checkedRadio).toBeDefined();
    expect(checkedRadio).toHaveAttribute('aria-label', 'C. Hash map');
  });

  it('shows correct/incorrect indicators when showCorrectAnswer is true', () => {
    renderPreview({
      selectedAnswer: 'A',
      showCorrectAnswer: true,
      correctAnswer: 'B',
    });
    // The correct option (B) should have green styling
    const radios = screen.getAllByRole('radio');
    const correctOption = radios.find((r) => r.getAttribute('aria-label') === 'B. Array');
    expect(correctOption?.className).toContain('green');
    // The incorrect selected option (A) should have red styling
    const incorrectOption = radios.find((r) => r.getAttribute('aria-label') === 'A. Linked list');
    expect(incorrectOption?.className).toContain('red');
  });

  it('disables options when disabled prop is true', () => {
    const onChange = vi.fn();
    renderPreview({ disabled: true, onAnswerChange: onChange });
    fireEvent.click(screen.getByText('Array'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('has a radiogroup with aria-labelledby', () => {
    renderPreview();
    const radiogroup = screen.getByRole('radiogroup');
    expect(radiogroup).toHaveAttribute('aria-labelledby');
  });
});

// ─── True/False Tests ────────────────────────────────────────────────────────

describe('QuestionPreview — True/False', () => {
  it('renders True and False options', () => {
    renderPreview({ questionType: 'true_false', options: null });
    expect(screen.getByText('True')).toBeInTheDocument();
    expect(screen.getByText('False')).toBeInTheDocument();
  });

  it('renders exactly 2 radio buttons', () => {
    renderPreview({ questionType: 'true_false', options: null });
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(2);
  });

  it('calls onAnswerChange with True or False', () => {
    const onChange = vi.fn();
    renderPreview({ questionType: 'true_false', options: null, onAnswerChange: onChange });
    fireEvent.click(screen.getByText('False'));
    expect(onChange).toHaveBeenCalledWith('False');
  });

  it('shows correct answer indicator for True/False', () => {
    renderPreview({
      questionType: 'true_false',
      options: null,
      selectedAnswer: 'True',
      showCorrectAnswer: true,
      correctAnswer: 'False',
    });
    const falseBtn = screen.getByRole('radio', { name: 'False' });
    expect(falseBtn.className).toContain('green');
    const trueBtn = screen.getByRole('radio', { name: 'True' });
    expect(trueBtn.className).toContain('red');
  });
});

// ─── Short Answer Tests ──────────────────────────────────────────────────────

describe('QuestionPreview — Short Answer', () => {
  it('renders a textarea for short answer', () => {
    renderPreview({ questionType: 'short_answer', options: null });
    expect(screen.getByPlaceholderText('Type your answer here...')).toBeInTheDocument();
  });

  it('renders label for the textarea', () => {
    renderPreview({ questionType: 'short_answer', options: null });
    expect(screen.getByText('Your Answer')).toBeInTheDocument();
  });

  it('calls onAnswerChange when typing in textarea', () => {
    const onChange = vi.fn();
    renderPreview({ questionType: 'short_answer', options: null, onAnswerChange: onChange });
    fireEvent.change(screen.getByPlaceholderText('Type your answer here...'), {
      target: { value: 'Queue' },
    });
    expect(onChange).toHaveBeenCalledWith('Queue');
  });

  it('shows correct answer when showCorrectAnswer is true', () => {
    renderPreview({
      questionType: 'short_answer',
      options: null,
      selectedAnswer: 'Stack',
      showCorrectAnswer: true,
      correctAnswer: 'Queue',
    });
    expect(screen.getByText(/Correct answer: Queue/)).toBeInTheDocument();
  });
});

// ─── Fill in the Blank Tests ─────────────────────────────────────────────────

describe('QuestionPreview — Fill in the Blank', () => {
  it('renders a text input for fill in the blank', () => {
    renderPreview({ questionType: 'fill_in_blank', options: null });
    expect(screen.getByPlaceholderText('Type your answer...')).toBeInTheDocument();
  });

  it('renders label for the input', () => {
    renderPreview({ questionType: 'fill_in_blank', options: null });
    expect(screen.getByText('Fill in the blank')).toBeInTheDocument();
  });

  it('calls onAnswerChange when typing in input', () => {
    const onChange = vi.fn();
    renderPreview({ questionType: 'fill_in_blank', options: null, onAnswerChange: onChange });
    fireEvent.change(screen.getByPlaceholderText('Type your answer...'), {
      target: { value: 'Queue' },
    });
    expect(onChange).toHaveBeenCalledWith('Queue');
  });

  it('shows correct answer when showCorrectAnswer is true', () => {
    renderPreview({
      questionType: 'fill_in_blank',
      options: null,
      selectedAnswer: 'Stack',
      showCorrectAnswer: true,
      correctAnswer: 'Queue',
    });
    expect(screen.getByText(/Correct answer: Queue/)).toBeInTheDocument();
  });

  it('applies green styling for correct answer', () => {
    renderPreview({
      questionType: 'fill_in_blank',
      options: null,
      selectedAnswer: 'Queue',
      showCorrectAnswer: true,
      correctAnswer: 'Queue',
    });
    const input = screen.getByPlaceholderText('Type your answer...');
    expect(input.className).toContain('green');
  });
});
