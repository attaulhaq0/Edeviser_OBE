// =============================================================================
// Shared Components — Unit tests
// Validates: Task 39.1 — AttainmentBar, BloomsPill, OutcomeTypeBadge, KPICard,
//            EmptyState, ErrorState, HabitGrid, CQIStatusBadge
// =============================================================================

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import AttainmentBar, { getAttainmentLevel } from '@/components/shared/AttainmentBar';
import BloomsPill from '@/components/shared/BloomsPill';
import OutcomeTypeBadge from '@/components/shared/OutcomeTypeBadge';
import KPICard from '@/components/shared/KPICard';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import HabitGrid from '@/components/shared/HabitGrid';
import CQIStatusBadge from '@/components/shared/CQIStatusBadge';
import { Users } from 'lucide-react';

// ─── AttainmentBar ───────────────────────────────────────────────────────────

describe('AttainmentBar', () => {
  it('renders percentage text', () => {
    render(<AttainmentBar percent={85} />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('renders label when provided', () => {
    render(<AttainmentBar percent={75} label="CLO-1" />);
    expect(screen.getByText('CLO-1')).toBeInTheDocument();
  });

  it('shows Excellent for ≥85%', () => {
    render(<AttainmentBar percent={90} />);
    expect(screen.getByText('Excellent')).toBeInTheDocument();
  });

  it('shows Satisfactory for 70-84%', () => {
    render(<AttainmentBar percent={75} />);
    expect(screen.getByText('Satisfactory')).toBeInTheDocument();
  });

  it('shows Developing for 50-69%', () => {
    render(<AttainmentBar percent={55} />);
    expect(screen.getByText('Developing')).toBeInTheDocument();
  });

  it('shows Not Yet for <50%', () => {
    render(<AttainmentBar percent={30} />);
    expect(screen.getByText('Not Yet')).toBeInTheDocument();
  });

  it('clamps percent to 0-100 range', () => {
    render(<AttainmentBar percent={150} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('clamps negative percent to 0', () => {
    render(<AttainmentBar percent={-10} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<AttainmentBar percent={90} showLabel={false} />);
    expect(screen.queryByText('Excellent')).not.toBeInTheDocument();
  });
});

describe('getAttainmentLevel', () => {
  it('returns Excellent for 85', () => expect(getAttainmentLevel(85)).toBe('Excellent'));
  it('returns Excellent for 100', () => expect(getAttainmentLevel(100)).toBe('Excellent'));
  it('returns Satisfactory for 70', () => expect(getAttainmentLevel(70)).toBe('Satisfactory'));
  it('returns Satisfactory for 84', () => expect(getAttainmentLevel(84)).toBe('Satisfactory'));
  it('returns Developing for 50', () => expect(getAttainmentLevel(50)).toBe('Developing'));
  it('returns Developing for 69', () => expect(getAttainmentLevel(69)).toBe('Developing'));
  it('returns Not_Yet for 49', () => expect(getAttainmentLevel(49)).toBe('Not_Yet'));
  it('returns Not_Yet for 0', () => expect(getAttainmentLevel(0)).toBe('Not_Yet'));
});

// ─── BloomsPill ──────────────────────────────────────────────────────────────

describe('BloomsPill', () => {
  it('renders Remember for remembering level', () => {
    render(<BloomsPill level="remembering" />);
    expect(screen.getByText('Remember')).toBeInTheDocument();
  });

  it('renders Understand for understanding level', () => {
    render(<BloomsPill level="understanding" />);
    expect(screen.getByText('Understand')).toBeInTheDocument();
  });

  it('renders Apply for applying level', () => {
    render(<BloomsPill level="applying" />);
    expect(screen.getByText('Apply')).toBeInTheDocument();
  });

  it('renders Analyze for analyzing level', () => {
    render(<BloomsPill level="analyzing" />);
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });

  it('renders Evaluate for evaluating level', () => {
    render(<BloomsPill level="evaluating" />);
    expect(screen.getByText('Evaluate')).toBeInTheDocument();
  });

  it('renders Create for creating level', () => {
    render(<BloomsPill level="creating" />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('applies purple color for remembering', () => {
    const { container } = render(<BloomsPill level="remembering" />);
    expect(container.firstElementChild?.className).toContain('bg-purple-500');
  });

  it('applies yellow color for analyzing', () => {
    const { container } = render(<BloomsPill level="analyzing" />);
    expect(container.firstElementChild?.className).toContain('bg-yellow-500');
  });
});

// ─── OutcomeTypeBadge ────────────────────────────────────────────────────────

describe('OutcomeTypeBadge', () => {
  it('renders ILO text', () => {
    render(<OutcomeTypeBadge type="ILO" />);
    expect(screen.getByText('ILO')).toBeInTheDocument();
  });

  it('renders PLO text', () => {
    render(<OutcomeTypeBadge type="PLO" />);
    expect(screen.getByText('PLO')).toBeInTheDocument();
  });

  it('renders CLO text', () => {
    render(<OutcomeTypeBadge type="CLO" />);
    expect(screen.getByText('CLO')).toBeInTheDocument();
  });

  it('applies red styling for ILO', () => {
    const { container } = render(<OutcomeTypeBadge type="ILO" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('bg-red-100');
    expect(el?.className).toContain('text-red-700');
  });

  it('applies blue styling for PLO', () => {
    const { container } = render(<OutcomeTypeBadge type="PLO" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('bg-blue-100');
    expect(el?.className).toContain('text-blue-700');
  });

  it('applies green styling for CLO', () => {
    const { container } = render(<OutcomeTypeBadge type="CLO" />);
    const el = container.firstElementChild;
    expect(el?.className).toContain('bg-green-100');
    expect(el?.className).toContain('text-green-700');
  });
});

// ─── KPICard ─────────────────────────────────────────────────────────────────

describe('KPICard', () => {
  it('renders label and value', () => {
    render(<KPICard icon={Users} label="Total Users" value={42} />);
    expect(screen.getByText('Total Users')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('renders string value', () => {
    render(<KPICard icon={Users} label="Avg" value="85%" />);
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('applies label typography classes', () => {
    render(<KPICard icon={Users} label="Test Label" value={0} />);
    const label = screen.getByText('Test Label');
    expect(label.className).toContain('text-[10px]');
    expect(label.className).toContain('font-black');
    expect(label.className).toContain('tracking-widest');
    expect(label.className).toContain('uppercase');
  });

  it('applies value typography classes', () => {
    render(<KPICard icon={Users} label="Test" value={99} />);
    const value = screen.getByText('99');
    expect(value.className).toContain('text-2xl');
    expect(value.className).toContain('font-black');
  });
});

// ─── EmptyState ──────────────────────────────────────────────────────────────

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders description when provided', () => {
    render(<EmptyState title="Empty" description="Nothing here yet" />);
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
  });

  it('renders children', () => {
    render(
      <EmptyState title="Empty">
        <button>Add Item</button>
      </EmptyState>,
    );
    expect(screen.getByText('Add Item')).toBeInTheDocument();
  });

  it('renders without description', () => {
    render(<EmptyState title="No items" />);
    expect(screen.getByText('No items')).toBeInTheDocument();
  });
});

// ─── ErrorState ──────────────────────────────────────────────────────────────

describe('ErrorState', () => {
  it('renders default title', () => {
    render(<ErrorState message="Network error" />);
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('renders custom title', () => {
    render(<ErrorState title="Oops" message="Try again" />);
    expect(screen.getByText('Oops')).toBeInTheDocument();
  });

  it('renders message', () => {
    render(<ErrorState message="Connection failed" />);
    expect(screen.getByText('Connection failed')).toBeInTheDocument();
  });

  it('renders retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Error" onRetry={onRetry} />);
    const btn = screen.getByText('Try Again');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('does not render retry button when onRetry not provided', () => {
    render(<ErrorState message="Error" />);
    expect(screen.queryByText('Try Again')).not.toBeInTheDocument();
  });

  it('renders custom retry label', () => {
    render(<ErrorState message="Error" onRetry={() => {}} retryLabel="Reload" />);
    expect(screen.getByText('Reload')).toBeInTheDocument();
  });
});

// ─── HabitGrid ───────────────────────────────────────────────────────────────

describe('HabitGrid', () => {
  it('renders all 4 habits', () => {
    render(<HabitGrid completedHabits={[]} />);
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.getByText('Journal')).toBeInTheDocument();
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('marks completed habits with checkmark', () => {
    render(<HabitGrid completedHabits={['login', 'journal']} />);
    const checks = screen.getAllByText('✓');
    expect(checks).toHaveLength(2);
  });

  it('applies green styling to completed habits', () => {
    const { container } = render(<HabitGrid completedHabits={['login']} />);
    const loginEl = container.querySelector('.bg-green-50');
    expect(loginEl).not.toBeNull();
  });

  it('applies gray styling to incomplete habits', () => {
    const { container } = render(<HabitGrid completedHabits={[]} />);
    const grayEls = container.querySelectorAll('.bg-gray-50');
    expect(grayEls.length).toBe(4);
  });

  it('handles all habits completed', () => {
    render(<HabitGrid completedHabits={['login', 'submit', 'journal', 'read']} />);
    const checks = screen.getAllByText('✓');
    expect(checks).toHaveLength(4);
  });
});

// ─── CQIStatusBadge ──────────────────────────────────────────────────────────

describe('CQIStatusBadge', () => {
  it('renders Planned for planned status', () => {
    render(<CQIStatusBadge status="planned" />);
    expect(screen.getByText('Planned')).toBeInTheDocument();
  });

  it('renders In Progress for in_progress status', () => {
    render(<CQIStatusBadge status="in_progress" />);
    expect(screen.getByText('In Progress')).toBeInTheDocument();
  });

  it('renders Completed for completed status', () => {
    render(<CQIStatusBadge status="completed" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('renders Evaluated for evaluated status', () => {
    render(<CQIStatusBadge status="evaluated" />);
    expect(screen.getByText('Evaluated')).toBeInTheDocument();
  });

  it('applies gray styling for planned', () => {
    const { container } = render(<CQIStatusBadge status="planned" />);
    expect(container.firstElementChild?.className).toContain('bg-gray-100');
  });

  it('applies blue styling for in_progress', () => {
    const { container } = render(<CQIStatusBadge status="in_progress" />);
    expect(container.firstElementChild?.className).toContain('bg-blue-100');
  });

  it('applies green styling for completed', () => {
    const { container } = render(<CQIStatusBadge status="completed" />);
    expect(container.firstElementChild?.className).toContain('bg-green-100');
  });

  it('applies purple styling for evaluated', () => {
    const { container } = render(<CQIStatusBadge status="evaluated" />);
    expect(container.firstElementChild?.className).toContain('bg-purple-100');
  });
});
