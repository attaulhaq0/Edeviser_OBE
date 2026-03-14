// @vitest-environment happy-dom
// =============================================================================
// LikertScale — Unit tests
// Rendering, keyboard navigation, ARIA attributes, selection via click/keyboard
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LikertScale, { type LikertScaleProps } from '@/components/shared/LikertScale';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Safe array access for tests — throws if index is out of bounds */
function at<T>(arr: T[], index: number): T {
  const item = arr[index];
  if (item === undefined) throw new Error(`Index ${index} out of bounds (length ${arr.length})`);
  return item;
}

const defaultProps: LikertScaleProps = {
  value: null,
  onChange: vi.fn(),
  questionId: 'q1',
};

const renderLikert = (overrides: Partial<LikertScaleProps> = {}) =>
  render(<LikertScale {...defaultProps} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('LikertScale', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders 5 radio options with default labels', () => {
      renderLikert();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
    });

    it('displays default Likert labels', () => {
      renderLikert();
      expect(screen.getByLabelText('Strongly Disagree')).toBeDefined();
      expect(screen.getByLabelText('Disagree')).toBeDefined();
      expect(screen.getByLabelText('Neutral')).toBeDefined();
      expect(screen.getByLabelText('Agree')).toBeDefined();
      expect(screen.getByLabelText('Strongly Agree')).toBeDefined();
    });

    it('displays numeric values 1 through 5', () => {
      renderLikert();
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(String(i))).toBeDefined();
      }
    });

    it('renders with custom labels', () => {
      const customLabels = ['Never', 'Rarely', 'Sometimes', 'Often', 'Always'] as const;
      renderLikert({ labels: customLabels });
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
      expect(screen.getByLabelText('Never')).toBeDefined();
      expect(screen.getByLabelText('Always')).toBeDefined();
    });
  });

  // ── ARIA attributes ──────────────────────────────────────────────────────

  describe('ARIA attributes', () => {
    it('has role="radiogroup" on the container', () => {
      renderLikert();
      const group = screen.getByRole('radiogroup');
      expect(group).toBeDefined();
    });

    it('has aria-label on the radiogroup', () => {
      renderLikert();
      const group = screen.getByRole('radiogroup');
      expect(group.getAttribute('aria-label')).toBe('Likert scale rating');
    });

    it('each option has role="radio"', () => {
      renderLikert();
      const radios = screen.getAllByRole('radio');
      expect(radios).toHaveLength(5);
      radios.forEach((radio) => {
        expect(radio.getAttribute('role')).toBe('radio');
      });
    });

    it('sets aria-checked="true" on the selected option', () => {
      renderLikert({ value: 3 });
      const radios = screen.getAllByRole('radio');
      expect(at(radios, 2).getAttribute('aria-checked')).toBe('true');
    });

    it('sets aria-checked="false" on unselected options', () => {
      renderLikert({ value: 3 });
      const radios = screen.getAllByRole('radio');
      expect(at(radios, 0).getAttribute('aria-checked')).toBe('false');
      expect(at(radios, 1).getAttribute('aria-checked')).toBe('false');
      expect(at(radios, 3).getAttribute('aria-checked')).toBe('false');
      expect(at(radios, 4).getAttribute('aria-checked')).toBe('false');
    });

    it('sets aria-label on each radio matching the label text', () => {
      renderLikert();
      const labels = ['Strongly Disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly Agree'];
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio, i) => {
        expect(radio.getAttribute('aria-label')).toBe(at(labels, i));
      });
    });
  });

  // ── Tab index / focus management ─────────────────────────────────────────

  describe('tab index management', () => {
    it('first option is tabbable when no value is selected', () => {
      renderLikert({ value: null });
      const radios = screen.getAllByRole('radio');
      expect(at(radios, 0).getAttribute('tabindex')).toBe('0');
      radios.slice(1).forEach((radio) => {
        expect(radio.getAttribute('tabindex')).toBe('-1');
      });
    });

    it('selected option is tabbable, others are not', () => {
      renderLikert({ value: 4 });
      const radios = screen.getAllByRole('radio');
      expect(at(radios, 3).getAttribute('tabindex')).toBe('0');
      [0, 1, 2, 4].forEach((i) => {
        expect(at(radios, i).getAttribute('tabindex')).toBe('-1');
      });
    });
  });

  // ── Click selection ──────────────────────────────────────────────────────

  describe('click selection', () => {
    it('calls onChange with correct value when clicking an option', async () => {
      const onChange = vi.fn();
      renderLikert({ onChange });
      const user = userEvent.setup();

      await user.click(at(screen.getAllByRole('radio'), 2)); // "Neutral" = 3
      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('calls onChange for each clicked option', async () => {
      const onChange = vi.fn();
      renderLikert({ onChange });
      const user = userEvent.setup();
      const radios = screen.getAllByRole('radio');

      await user.click(at(radios, 0));
      expect(onChange).toHaveBeenCalledWith(1);

      await user.click(at(radios, 4));
      expect(onChange).toHaveBeenCalledWith(5);
    });

    it('does not call onChange when disabled', async () => {
      const onChange = vi.fn();
      renderLikert({ onChange, disabled: true });
      const user = userEvent.setup();

      await user.click(at(screen.getAllByRole('radio'), 2));
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── Keyboard navigation ──────────────────────────────────────────────────

  describe('keyboard navigation', () => {
    it('ArrowRight moves selection forward', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 2, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 1).focus();
      await user.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('ArrowDown moves selection forward', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 2, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 1).focus();
      await user.keyboard('{ArrowDown}');

      expect(onChange).toHaveBeenCalledWith(3);
    });

    it('ArrowLeft moves selection backward', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 3, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 2).focus();
      await user.keyboard('{ArrowLeft}');

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('ArrowUp moves selection backward', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 3, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 2).focus();
      await user.keyboard('{ArrowUp}');

      expect(onChange).toHaveBeenCalledWith(2);
    });

    it('does not go below 1 on ArrowLeft', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 1, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 0).focus();
      await user.keyboard('{ArrowLeft}');

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('does not go above 5 on ArrowRight', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 5, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 4).focus();
      await user.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith(5);
    });

    it('ArrowRight from null starts at 1', async () => {
      const onChange = vi.fn();
      renderLikert({ value: null, onChange });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 0).focus();
      await user.keyboard('{ArrowRight}');

      expect(onChange).toHaveBeenCalledWith(1);
    });

    it('does not respond to keyboard when disabled', async () => {
      const onChange = vi.fn();
      renderLikert({ value: 3, onChange, disabled: true });
      const user = userEvent.setup();

      const radios = screen.getAllByRole('radio');
      at(radios, 2).focus();
      await user.keyboard('{ArrowRight}');

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  // ── Disabled state ───────────────────────────────────────────────────────

  describe('disabled state', () => {
    it('all buttons are disabled when disabled prop is true', () => {
      renderLikert({ disabled: true });
      const radios = screen.getAllByRole('radio');
      radios.forEach((radio) => {
        expect((radio as HTMLButtonElement).disabled).toBe(true);
      });
    });
  });
});
