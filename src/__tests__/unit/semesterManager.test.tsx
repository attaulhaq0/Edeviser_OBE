// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Mock hooks
vi.mock('@/hooks/useSemesters', () => ({
  useSemesters: vi.fn(() => ({
    data: [
      { id: 's1', name: 'Fall 2025', code: 'F25', start_date: '2025-09-01', end_date: '2025-12-31', is_active: true, institution_id: 'inst-1', created_at: '2025-01-01' },
      { id: 's2', name: 'Spring 2026', code: 'S26', start_date: '2026-01-15', end_date: '2026-05-31', is_active: false, institution_id: 'inst-1', created_at: '2025-01-01' },
    ],
    isLoading: false,
  })),
  useCreateSemester: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useUpdateSemester: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useDeleteSemester: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
  useToggleSemesterActive: vi.fn(() => ({ mutate: vi.fn(), isPending: false })),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, institutionId: 'inst-1', profile: { role: 'admin' } }),
}));

import SemesterManager from '@/pages/admin/semesters/SemesterManager';

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  );
};

describe('SemesterManager', () => {
  it('renders page title', () => {
    render(<SemesterManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Semesters')).toBeInTheDocument();
  });

  it('renders semester list', () => {
    render(<SemesterManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Fall 2025')).toBeInTheDocument();
    expect(screen.getByText('Spring 2026')).toBeInTheDocument();
  });

  it('shows active badge for active semester', () => {
    render(<SemesterManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('renders add semester button', () => {
    render(<SemesterManager />, { wrapper: createWrapper() });
    expect(screen.getByText('Add Semester')).toBeInTheDocument();
  });

  it('renders date ranges', () => {
    render(<SemesterManager />, { wrapper: createWrapper() });
    expect(screen.getByText('2025-09-01 — 2025-12-31')).toBeInTheDocument();
    expect(screen.getByText('2026-01-15 — 2026-05-31')).toBeInTheDocument();
  });

  it('renders semester codes as badges', () => {
    render(<SemesterManager />, { wrapper: createWrapper() });
    expect(screen.getByText('F25')).toBeInTheDocument();
    expect(screen.getByText('S26')).toBeInTheDocument();
  });
});
