// @vitest-environment happy-dom
// =============================================================================
// SmartGoalForm — Unit tests
// SMART form rendering, pre-filled fields, goal text composition on submit
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SmartGoalForm, {
  type SmartGoalFormProps,
  type CourseOption,
} from '@/components/shared/SmartGoalForm';

// ─── Mock Radix Select (portals don't work in happy-dom) ────────────────────

// Track the latest onValueChange callback for the mock select
let mockSelectOnChange: ((v: string) => void) | undefined;

vi.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, defaultValue }: {
    children: React.ReactNode;
    onValueChange?: (v: string) => void;
    defaultValue?: string;
  }) => {
    mockSelectOnChange = onValueChange;
    return <div data-testid="mock-select-root" data-value={defaultValue || ''}>{children}</div>;
  },
  SelectTrigger: ({ children, className }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <button type="button" data-testid="select-trigger" className={className}>
      {children}
    </button>
  ),
  SelectValue: ({ placeholder }: { placeholder?: string }) => (
    <span data-testid="select-value">{placeholder}</span>
  ),
  SelectContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="select-content">{children}</div>
  ),
  SelectItem: ({ children, value }: {
    children: React.ReactNode;
    value: string;
  }) => (
    <div
      role="option"
      data-testid={`select-item-${value}`}
      onClick={() => mockSelectOnChange?.(value)}
    >
      {children}
    </div>
  ),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const courses: CourseOption[] = [
  { id: 'c1', name: 'Mathematics 101' },
  { id: 'c2', name: 'Physics 201' },
  { id: 'c3', name: 'Chemistry 301' },
];

const defaultProps: SmartGoalFormProps = {
  courses,
  onSubmit: vi.fn(),
};

const renderForm = (overrides: Partial<SmartGoalFormProps> = {}) =>
  render(<SmartGoalForm {...defaultProps} {...overrides} />);

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('SmartGoalForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Rendering ──────────────────────────────────────────────────────────

  describe('rendering', () => {
    it('renders the "SMART Goal Template" heading', () => {
      renderForm();
      expect(screen.getByText('SMART Goal Template')).toBeInTheDocument();
    });

    it('renders all 5 SMART field labels', () => {
      renderForm();
      expect(screen.getByText(/Specific/)).toBeInTheDocument();
      expect(screen.getByText(/Measurable/)).toBeInTheDocument();
      expect(screen.getByText(/Achievable/)).toBeInTheDocument();
      expect(screen.getByText(/Relevant/)).toBeInTheDocument();
      expect(screen.getByText(/Time-bound/)).toBeInTheDocument();
    });

    it('renders the "Create Goal" submit button', () => {
      renderForm();
      expect(screen.getByRole('button', { name: /Create Goal/i })).toBeInTheDocument();
    });

    it('renders course options in the Relevant select dropdown', () => {
      renderForm();
      expect(screen.getByTestId('select-item-Mathematics 101')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-Physics 201')).toBeInTheDocument();
      expect(screen.getByTestId('select-item-Chemistry 301')).toBeInTheDocument();
    });
  });

  // ── Pre-filled fields ─────────────────────────────────────────────────

  describe('pre-filled fields', () => {
    it('pre-fills the Relevant field when defaultRelevant is provided', () => {
      renderForm({ defaultRelevant: 'Mathematics 101' });
      const selectRoot = screen.getByTestId('mock-select-root');
      expect(selectRoot.getAttribute('data-value')).toBe('Mathematics 101');
    });

    it('pre-fills the Time-bound field when defaultTimebound is provided', () => {
      renderForm({ defaultTimebound: '2025-03-15' });
      const dateInput = screen.getByDisplayValue('2025-03-15');
      expect(dateInput).toBeInTheDocument();
    });
  });

  // ── Loading / pending state ───────────────────────────────────────────

  describe('pending state', () => {
    it('shows loading spinner when isPending is true', () => {
      const { container } = renderForm({ isPending: true });
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('disables submit button when isPending is true', () => {
      renderForm({ isPending: true });
      const btn = screen.getByRole('button', { name: /Create Goal/i });
      expect(btn).toBeDisabled();
    });

    it('does not show spinner when isPending is false', () => {
      const { container } = renderForm({ isPending: false });
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeNull();
    });
  });

  // ── Form submission with composed text ────────────────────────────────

  describe('form submission', () => {
    it('calls onSubmit with composed text on valid form submission', async () => {
      const onSubmit = vi.fn();
      renderForm({ onSubmit, defaultRelevant: 'Mathematics 101', defaultTimebound: '2025-06-30' });
      const user = userEvent.setup();

      // Fill in the text fields
      const inputs = screen.getAllByRole('textbox');
      // Specific, Measurable, Achievable are the 3 text inputs
      await user.type(inputs[0]!, 'Complete all practice problems');
      await user.type(inputs[1]!, 'Score at least 80 percent on quiz');
      await user.type(inputs[2]!, 'I have enough study time available');

      // Submit the form
      await user.click(screen.getByRole('button', { name: /Create Goal/i }));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledTimes(1);
      });

      const call = onSubmit.mock.calls[0]![0];
      expect(call.specific).toBe('Complete all practice problems');
      expect(call.measurable).toBe('Score at least 80 percent on quiz');
      expect(call.achievable).toBe('I have enough study time available');
      expect(call.relevant).toBe('Mathematics 101');
      expect(call.timebound).toBe('2025-06-30');
      expect(call.composedText).toBe(
        'Complete all practice problems by 2025-06-30, measuring progress through Score at least 80 percent on quiz. This is achievable because I have enough study time available and relevant to Mathematics 101.',
      );
    });
  });

  // ── Validation errors ─────────────────────────────────────────────────

  describe('validation errors', () => {
    it('shows validation errors for empty required fields on submit', async () => {
      const onSubmit = vi.fn();
      renderForm({ onSubmit });
      const user = userEvent.setup();

      // Submit without filling anything
      await user.click(screen.getByRole('button', { name: /Create Goal/i }));

      // onSubmit should NOT be called
      await waitFor(() => {
        expect(onSubmit).not.toHaveBeenCalled();
      });

      // Validation error messages should appear (Zod min length errors)
      await waitFor(() => {
        const errorMessages = document.querySelectorAll('[data-slot="form-message"]');
        expect(errorMessages.length).toBeGreaterThan(0);
      });
    });
  });
});
