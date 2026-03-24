// =============================================================================
// MasteryRecoveryAlertCard — Unit tests
// Validates: Requirement 18.4 — Teacher dashboard alert for mastery recovery
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
const mockRecoveryAlerts = vi.fn();

vi.mock('@/hooks/useTeacherDashboard', () => ({
  useTeacherKPIs: () => mockTeacherKPIs(),
  useTeacherCLOAttainment: () => mockCLOAttainment(),
  useTeacherBloomsDistribution: () => mockBloomsDist(),
  useStudentPerformanceHeatmap: () => mockHeatmap(),
  useAtRiskStudents: () => mockAtRiskStudents(),
  useSendNudge: () => ({ mutate: vi.fn(), isPending: false }),
  useTeacherRecoveryAlerts: () => mockRecoveryAlerts(),
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

vi.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 hours ago',
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

const mockRecoveryData = [
  {
    recovery_id: 'rec-1',
    student_id: 'student-1',
    student_name: 'Alice Johnson',
    clo_id: 'clo-1',
    clo_title: 'Apply data structures',
    failure_count: 2,
    status: 'active',
    activated_at: '2025-01-15T10:00:00Z',
  },
  {
    recovery_id: 'rec-2',
    student_id: 'student-2',
    student_name: 'Bob Smith',
    clo_id: 'clo-2',
    clo_title: 'Analyze algorithm complexity',
    failure_count: 3,
    status: 'active',
    activated_at: '2025-01-14T08:00:00Z',
  },
];

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
    mockRecoveryAlerts.mockReturnValue({ data: [], isLoading: false });
  });

  it('does not render recovery alert section when no students are in recovery', () => {
    mockRecoveryAlerts.mockReturnValue({ data: [], isLoading: false });
    renderDashboard();
    expect(screen.queryByText('dashboard.masteryRecovery.title')).not.toBeInTheDocument();
  });

  it('renders recovery alert section with student names when recovery data exists', () => {
    mockRecoveryAlerts.mockReturnValue({ data: mockRecoveryData, isLoading: false });
    renderDashboard();
    expect(screen.getByText('dashboard.masteryRecovery.title')).toBeInTheDocument();
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
    expect(screen.getByText('Bob Smith')).toBeInTheDocument();
  });

  it('displays CLO titles for each recovery alert', () => {
    mockRecoveryAlerts.mockReturnValue({ data: mockRecoveryData, isLoading: false });
    renderDashboard();
    expect(screen.getByText('Apply data structures')).toBeInTheDocument();
    expect(screen.getByText('Analyze algorithm complexity')).toBeInTheDocument();
  });

  it('displays failure count badges', () => {
    mockRecoveryAlerts.mockReturnValue({ data: mockRecoveryData, isLoading: false });
    renderDashboard();
    // i18n returns the key with interpolation as-is
    const failureBadges = screen.getAllByText(/dashboard\.masteryRecovery\.failures/);
    expect(failureBadges).toHaveLength(2);
  });

  it('displays "In Recovery" status badges', () => {
    mockRecoveryAlerts.mockReturnValue({ data: mockRecoveryData, isLoading: false });
    renderDashboard();
    const recoveryBadges = screen.getAllByText('dashboard.masteryRecovery.inRecovery');
    expect(recoveryBadges).toHaveLength(2);
  });

  it('displays the count badge in the header', () => {
    mockRecoveryAlerts.mockReturnValue({ data: mockRecoveryData, isLoading: false });
    renderDashboard();
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('displays relative time for each alert', () => {
    mockRecoveryAlerts.mockReturnValue({ data: mockRecoveryData, isLoading: false });
    renderDashboard();
    const timeLabels = screen.getAllByText('2 hours ago');
    expect(timeLabels.length).toBeGreaterThanOrEqual(2);
  });

  it('renders shimmer when recovery data is loading', () => {
    mockRecoveryAlerts.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderDashboard();
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThanOrEqual(1);
  });
});
