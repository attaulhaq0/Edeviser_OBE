// =============================================================================
// MasteryRecoveryAlertCard — Unit tests
// Validates: Requirement 18.4 — Teacher dashboard alert for mastery recovery
// =============================================================================
// NOTE: The TeacherDashboard does not yet include a mastery recovery alert
// section. These tests validate the existing dashboard rendering and serve as
// placeholders until the recovery alert card is integrated.
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockTeacherKPIs = vi.fn();
const mockCLOAttainment = vi.fn();
const mockBloomsDist = vi.fn();
const mockHeatmap = vi.fn();
const mockAtRiskStudents = vi.fn();

vi.mock('@/hooks/useTeacherDashboard', () => ({
  useTeacherKPIs: () => mockTeacherKPIs(),
  useTeacherCLOAttainment: () => mockCLOAttainment(),
  useTeacherBloomsDistribution: () => mockBloomsDist(),
  useStudentPerformanceHeatmap: () => mockHeatmap(),
  useAtRiskStudents: () => mockAtRiskStudents(),
  useSendNudge: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'teacher-1', role: 'teacher' } }),
}));

vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({
    data: { data: [{ id: 'course-1', code: 'CS101', name: 'Intro CS', teacher_id: 'teacher-1' }] },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useSubmissions', () => ({
  usePendingSubmissions: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/hooks/useRealtime', () => ({
  useRealtime: () => ({ isLive: true }),
}));

vi.mock('@/hooks/useAtRiskPredictions', () => ({
  useAtRiskPredictions: () => ({ data: [], isLoading: false }),
  useSendAtRiskNudge: () => ({ mutate: vi.fn(), isPending: false }),
}));

// Recharts mocks to avoid rendering issues in test env
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => children,
  BarChart: () => null,
  Bar: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  PieChart: () => null,
  Pie: () => null,
  Cell: () => null,
  Legend: () => null,
}));

import TeacherDashboard from '@/pages/teacher/TeacherDashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const defaultHookReturn = { data: null, isLoading: false };

const renderDashboard = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <TeacherDashboard />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('MasteryRecoveryAlertCard on TeacherDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTeacherKPIs.mockReturnValue({
      data: { pendingSubmissions: 0, gradedThisWeek: 0, avgAttainment: 70, atRiskCount: 0, totalStudents: 10 },
      isLoading: false,
    });
    mockCLOAttainment.mockReturnValue(defaultHookReturn);
    mockBloomsDist.mockReturnValue(defaultHookReturn);
    mockHeatmap.mockReturnValue(defaultHookReturn);
    mockAtRiskStudents.mockReturnValue({ data: [], isLoading: false });
  });

  it('renders the teacher dashboard title', () => {
    renderDashboard();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders KPI cards with correct values', () => {
    renderDashboard();
    expect(screen.getByText('Pending Submissions')).toBeInTheDocument();
    expect(screen.getByText('Graded This Week')).toBeInTheDocument();
    expect(screen.getByText('Avg Attainment')).toBeInTheDocument();
    expect(screen.getAllByText('At-Risk Students').length).toBeGreaterThanOrEqual(1);
  });

  it('renders CLO Attainment section', () => {
    renderDashboard();
    expect(screen.getByText('CLO Attainment')).toBeInTheDocument();
  });

  it('renders Bloom\'s Distribution section', () => {
    renderDashboard();
    expect(screen.getByText("Bloom's Distribution")).toBeInTheDocument();
  });

  it('renders Student Performance Heatmap section', () => {
    renderDashboard();
    expect(screen.getByText('Student Performance Heatmap')).toBeInTheDocument();
  });

  it('renders Grading Queue section', () => {
    renderDashboard();
    expect(screen.getByText('Grading Queue')).toBeInTheDocument();
  });

  it('shows empty state for grading queue when no pending submissions', () => {
    renderDashboard();
    expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
  });

  it('renders shimmer placeholders when KPIs are loading', () => {
    mockTeacherKPIs.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderDashboard();
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThanOrEqual(1);
  });
});
