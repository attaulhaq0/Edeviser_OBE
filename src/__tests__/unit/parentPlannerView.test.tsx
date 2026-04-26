import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'parent-1' },
    profile: { role: 'parent' },
  }),
}));

vi.mock('@/lib/supabase', () => {
  const chainable = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: { student_id: 'student-1', full_name: 'Test Student' } }),
  };
  // Make all methods return the chainable object
  Object.values(chainable).forEach((fn) => {
    if (typeof fn === 'function' && 'mockReturnThis' in fn) {
      (fn as ReturnType<typeof vi.fn>).mockReturnValue(chainable);
    }
  });
  // Override terminal methods
  chainable.maybeSingle = vi.fn().mockResolvedValue({ data: { student_id: 'student-1', full_name: 'Test Student' } });

  return {
    supabase: {
      from: vi.fn().mockReturnValue(chainable),
    },
  };
});

vi.mock('@/components/shared/WeeklyCalendarGrid', () => ({
  default: ({ readOnly }: { readOnly?: boolean }) => (
    <div data-testid="weekly-calendar-grid" data-readonly={String(readOnly)}>
      Calendar Grid
    </div>
  ),
}));

vi.mock('@/components/shared/WeeklyGoalPanel', () => ({
  default: ({ isEditable }: { isEditable?: boolean }) => (
    <div data-testid="weekly-goal-panel" data-editable={String(isEditable)}>
      Goal Panel
    </div>
  ),
}));

vi.mock('@/components/shared/Shimmer', () => ({
  default: () => <div data-testid="shimmer" />,
}));

import ParentPlannerView from '@/pages/parent/planner/ParentPlannerView';

const renderWithProviders = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={['/parent/planner/student-1']}>
        <ParentPlannerView />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

describe('ParentPlannerView', () => {
  it('renders the page title', () => {
    renderWithProviders();
    expect(screen.getByText(/Study Plan/)).toBeInTheDocument();
  });

  it('has This Week button', () => {
    renderWithProviders();
    expect(screen.getByText('This Week')).toBeInTheDocument();
  });
});
