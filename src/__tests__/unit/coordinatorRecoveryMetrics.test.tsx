import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => vi.fn() };
});

const mockCoordinatorKPIs = vi.fn();
vi.mock('@/hooks/useCoordinatorDashboard', () => ({
  useCoordinatorKPIs: () => mockCoordinatorKPIs(),
}));

const mockRecoveryMetrics = vi.fn();
vi.mock('@/hooks/useMasteryRecovery', () => ({
  useRecoveryMetrics: () => mockRecoveryMetrics(),
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ institutionId: 'inst-1', role: 'coordinator', user: { id: 'u1' }, profile: null, isLoading: false }),
}));

const mockPrograms = vi.fn();
vi.mock('@/hooks/usePrograms', () => ({
  usePrograms: () => mockPrograms(),
}));

vi.mock('@/components/shared/CurriculumMatrix', () => ({
  default: () => <div data-testid="curriculum-matrix" />,
}));

vi.mock('@/components/shared/CellDetailSheet', () => ({
  default: () => null,
}));

vi.mock('@/hooks/useCourses', () => ({
  useCourses: () => ({ data: { data: [] }, isLoading: false }),
  useTeachers: () => ({ data: [] }),
}));

vi.mock('@/hooks/useCourseSections', () => ({
  useCourseSections: () => ({ data: [], isLoading: false }),
}));

vi.mock('@/components/shared/SectionComparisonChart', () => ({
  default: () => <div data-testid="section-comparison-chart" />,
}));

import CoordinatorDashboard from '@/pages/coordinator/CoordinatorDashboard';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const defaultKPIs = {
  data: { totalPLOs: 10, totalCourses: 5, cloCoveragePercent: 80, atRiskStudents: 3, teacherCompliancePercent: 90 },
  isLoading: false,
};

const defaultPrograms = {
  data: { data: [{ id: 'p1', code: 'CS', name: 'Computer Science' }] },
  isLoading: false,
};

const renderDashboard = () =>
  render(
    <MemoryRouter>
      <CoordinatorDashboard />
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CoordinatorDashboard — Recovery Pathway Metrics', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCoordinatorKPIs.mockReturnValue(defaultKPIs);
    mockPrograms.mockReturnValue(defaultPrograms);
  });

  it('renders the Recovery Pathways section header', () => {
    mockRecoveryMetrics.mockReturnValue({ data: null, isLoading: false });
    renderDashboard();
    expect(screen.getByText('Recovery Pathways')).toBeInTheDocument();
  });

  it('shows shimmer loading state when recovery data is loading', () => {
    mockRecoveryMetrics.mockReturnValue({ data: null, isLoading: true });
    const { container } = renderDashboard();
    const shimmers = container.querySelectorAll('.animate-shimmer');
    expect(shimmers.length).toBeGreaterThanOrEqual(4);
  });

  it('displays total activations metric', () => {
    mockRecoveryMetrics.mockReturnValue({
      data: { total_activations: 42, completion_rate: 0.75, avg_completion_time_hours: 12.5, retry_success_rate: 0.6 },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText('Total Activations')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
  });

  it('displays completion rate as percentage', () => {
    mockRecoveryMetrics.mockReturnValue({
      data: { total_activations: 10, completion_rate: 0.85, avg_completion_time_hours: 8, retry_success_rate: 0.5 },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('displays average completion time in hours', () => {
    mockRecoveryMetrics.mockReturnValue({
      data: { total_activations: 10, completion_rate: 0.5, avg_completion_time_hours: 24.3, retry_success_rate: 0.7 },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText('Avg Completion Time')).toBeInTheDocument();
    expect(screen.getByText('24.3h')).toBeInTheDocument();
  });

  it('displays retry success rate as percentage', () => {
    mockRecoveryMetrics.mockReturnValue({
      data: { total_activations: 20, completion_rate: 0.6, avg_completion_time_hours: 10, retry_success_rate: 0.73 },
      isLoading: false,
    });
    renderDashboard();
    expect(screen.getByText('Retry Success Rate')).toBeInTheDocument();
    expect(screen.getByText('73%')).toBeInTheDocument();
  });

  it('shows 0 defaults when no recovery data is available', () => {
    mockRecoveryMetrics.mockReturnValue({ data: null, isLoading: false });
    renderDashboard();
    expect(screen.getByText('Total Activations')).toBeInTheDocument();
    expect(screen.getByText('Completion Rate')).toBeInTheDocument();
    expect(screen.getByText('Avg Completion Time')).toBeInTheDocument();
    expect(screen.getByText('Retry Success Rate')).toBeInTheDocument();
    // Default values
    expect(screen.getByText('0.0h')).toBeInTheDocument();
  });
});
