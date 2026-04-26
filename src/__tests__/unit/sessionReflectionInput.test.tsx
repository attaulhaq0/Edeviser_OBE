import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SessionReflectionInput from '@/components/shared/SessionReflectionInput';

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SessionReflectionInput', () => {
  const defaultProps = {
    value: '',
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Renders textarea with placeholder
  it('renders textarea with placeholder', () => {
    render(<SessionReflectionInput {...defaultProps} />);

    expect(
      screen.getByPlaceholderText(/reflect on your session/i),
    ).toBeInTheDocument();
  });

  // 2. Shows word count (0 / 30 words)
  it('shows word count (0 / 30 words)', () => {
    render(<SessionReflectionInput {...defaultProps} />);

    expect(screen.getByText('0 / 30 words')).toBeInTheDocument();
  });

  // 3. Updates word count as user types
  it('updates word count as user types', () => {
    const { rerender } = render(
      <SessionReflectionInput {...defaultProps} value="" />,
    );

    // Simulate controlled component update with 5 words
    rerender(
      <SessionReflectionInput
        {...defaultProps}
        value="one two three four five"
      />,
    );

    expect(screen.getByText('5 / 30 words')).toBeInTheDocument();
  });

  // 4. Shows green text + checkmark when minimum met
  it('shows green text and checkmark when minimum met', () => {
    const thirtyWords = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    render(
      <SessionReflectionInput {...defaultProps} value={thirtyWords} />,
    );

    const wordCountEl = screen.getByText('30 / 30 words');
    expect(wordCountEl.closest('p')).toHaveClass('text-green-600');
  });

  // 5. Shows gray text when below minimum
  it('shows gray text when below minimum', () => {
    render(
      <SessionReflectionInput {...defaultProps} value="just a few words" />,
    );

    const wordCountEl = screen.getByText('4 / 30 words');
    expect(wordCountEl.closest('p')).toHaveClass('text-gray-400');
  });

  // 6. Save button disabled when below minimum
  it('save button disabled when below minimum', () => {
    const onSave = vi.fn();
    render(
      <SessionReflectionInput
        {...defaultProps}
        value="not enough words"
        onSave={onSave}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /save reflection/i });
    expect(saveBtn).toBeDisabled();
  });

  // 7. Save button enabled when minimum met
  it('save button enabled when minimum met', () => {
    const onSave = vi.fn();
    const thirtyWords = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    render(
      <SessionReflectionInput
        {...defaultProps}
        value={thirtyWords}
        onSave={onSave}
      />,
    );

    const saveBtn = screen.getByRole('button', { name: /save reflection/i });
    expect(saveBtn).toBeEnabled();
  });

  // 8. Calls onSave with content when Save clicked
  it('calls onSave with content when Save clicked', async () => {
    const onSave = vi.fn();
    const thirtyWords = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    render(
      <SessionReflectionInput
        {...defaultProps}
        value={thirtyWords}
        onSave={onSave}
      />,
    );

    await userEvent.click(
      screen.getByRole('button', { name: /save reflection/i }),
    );

    expect(onSave).toHaveBeenCalledOnce();
    expect(onSave).toHaveBeenCalledWith(thirtyWords);
  });

  // 9. Save button not rendered when onSave not provided
  it('save button not rendered when onSave not provided', () => {
    render(<SessionReflectionInput {...defaultProps} />);

    expect(
      screen.queryByRole('button', { name: /save reflection/i }),
    ).not.toBeInTheDocument();
  });

  // 10. Has proper ARIA attributes
  it('has proper ARIA attributes', () => {
    render(<SessionReflectionInput {...defaultProps} />);

    const textarea = screen.getByRole('textbox', { name: /session reflection/i });
    expect(textarea).toBeInTheDocument();
    expect(textarea).toHaveAttribute('aria-describedby', 'reflection-word-count');

    const wordCount = document.getElementById('reflection-word-count');
    expect(wordCount).toBeInTheDocument();
  });

  // Additional: calls onChange when user types
  it('calls onChange when user types', async () => {
    const onChange = vi.fn();
    render(<SessionReflectionInput {...defaultProps} onChange={onChange} />);

    const textarea = screen.getByPlaceholderText(/reflect on your session/i);
    await userEvent.type(textarea, 'hello');

    expect(onChange).toHaveBeenCalled();
  });

  // Additional: custom minWords prop works
  it('respects custom minWords prop', () => {
    const onSave = vi.fn();
    render(
      <SessionReflectionInput
        {...defaultProps}
        value="one two three four five"
        minWords={5}
        onSave={onSave}
      />,
    );

    expect(screen.getByText('5 / 5 words')).toBeInTheDocument();
    const saveBtn = screen.getByRole('button', { name: /save reflection/i });
    expect(saveBtn).toBeEnabled();
  });

  // Additional: shows "Saving…" when isSubmitting
  it('shows "Saving…" when isSubmitting is true', () => {
    const onSave = vi.fn();
    const thirtyWords = Array.from({ length: 30 }, (_, i) => `word${i}`).join(' ');
    render(
      <SessionReflectionInput
        {...defaultProps}
        value={thirtyWords}
        onSave={onSave}
        isSubmitting
      />,
    );

    expect(screen.getByText('Saving…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /saving/i })).toBeDisabled();
  });

  // Additional: data-testid is present
  it('has data-testid for integration', () => {
    render(<SessionReflectionInput {...defaultProps} />);

    expect(screen.getByTestId('session-reflection-input')).toBeInTheDocument();
  });
});
