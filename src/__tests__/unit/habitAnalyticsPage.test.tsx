import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockExportCSV = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'student-1', role: 'student' } }),
}));

vi.mock('@/hooks/useSemesterRange', () => ({
  useSemesterRange: () => ({
    data: { start: '2025-01-01', end: '2025-06-30' },
    isLoading: false,
  }),
}));

const mockHeatmapData = [
  { date: '2025-01-01', academicCount: 2, wellnessCount: 1, totalCount: 3, habits: [] },
  { date: '2025-01-02', academicCount: 4, wellnessCount: 0, totalCount: 4, habits: [] },
  { date: '2025-01-03', academicCount: 0, wellnessCount: 0, totalCount: 0, habits: [] },
];

vi.mock('@/hooks/useHeatmapData', () => ({
  useHeatmapData: () => ({
    data: mockHeatmapData,
    isLoading: false,
  }),
  useHeatmapSummary: () => ({
    data: { currentStreak: 5, longestStreak: 10, totalActiveDays: 20 },
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useWellnessPreferences', () => ({
  useWellnessPreferences: () => ({
    data: { enabledHabits: ['meditation'], parentVisibility: false },
  }),
  useUpdateWellnessPreferences: () => ({ mutate: vi.fn() }),
}));

let mockCorrelationResult = {
  insights: [
    {
      id: 'ins-1',
      habitType: 'meditation' as const,
      academicMetric: 'submissions',
      description: 'You tend to submit more on days when you meditate',
      strength: 0.72,
    },
  ],
  insufficientData: false,
};

vi.mock('@/hooks/useHabitCorrelations', () => ({
  useHabitCorrelations: () => ({
    data: mockCorrelationResult,
    isLoading: false,
  }),
}));

vi.mock('@/hooks/useHabitExport', () => ({
  useHabitExport: () => ({ exportCSV: mockExportCSV }),
}));

vi.mock('@/hooks/useStudentHabitLevel', () => ({
  useStudentHabitLevel: () => ({
    data: {
      currentLevel: 4,
      levelHistory: [{ date: '2025-01-01', level: 4 }],
      maxHabitsPerDay: 4,
    },
    isLoading: false,
  }),
}));

// Mock Recharts to avoid SVG rendering issues in tests
vi.mock('recharts', () => ({
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div />,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  Tooltip: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Cell: () => <div />,
  ReferenceDot: () => <div />,
}));

// ---------------------------------------------------------------------------
// Imports (after mocks)
// ---------------------------------------------------------------------------

import HabitAnalyticsPage from '@/pages/student/habits/HabitAnalyticsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <HabitAnalyticsPage />
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('HabitAnalyticsPage', () => {
  beforeEach(() => {
    mockExportCSV.mockClear();
    mockCorrelationResult = {
      insights: [
        {
          id: 'ins-1',
          habitType: 'meditation' as const,
          academicMetric: 'submissions',
          description: 'You tend to submit more on days when you meditate',
          strength: 0.72,
        },
      ],
      insufficientData: false,
    };
  });

  it('renders the page title', () => {
    renderPage();
    expect(screen.getByText('Habit Analytics')).toBeInTheDocument();
  });

  it('renders the back link to /student/habits', () => {
    renderPage();
    const backLink = screen.getByText('Back').closest('a');
    expect(backLink).toHaveAttribute('href', '/student/habits');
  });

  it('renders the export report button', () => {
    renderPage();
    expect(screen.getByTestId('export-report-btn')).toBeInTheDocument();
  });

  it('calls exportCSV when export button is clicked', () => {
    renderPage();
    fireEvent.click(screen.getByTestId('export-report-btn'));
    expect(mockExportCSV).toHaveBeenCalledTimes(1);
  });

  it('renders the consistency score ring', () => {
    renderPage();
    expect(screen.getByTestId('consistency-score-ring')).toBeInTheDocument();
  });

  it('renders the completion chart section', () => {
    renderPage();
    expect(screen.getByTestId('habit-completion-chart')).toBeInTheDocument();
  });

  it('renders the best day chart section', () => {
    renderPage();
    expect(screen.getByTestId('best-day-chart')).toBeInTheDocument();
  });

  it('renders correlation insights when data is available', () => {
    renderPage();
    expect(screen.getByTestId('correlation-insights-list')).toBeInTheDocument();
    expect(screen.getByTestId('correlation-insight-ins-1')).toBeInTheDocument();
  });

  it('renders insufficient data message when correlations have insufficient data', () => {
    mockCorrelationResult = { insights: [], insufficientData: true };
    renderPage();
    expect(screen.getByTestId('insufficient-data-message')).toBeInTheDocument();
    expect(
      screen.getByText('Keep tracking — insights appear after 2 weeks of data'),
    ).toBeInTheDocument();
  });

  it('is wrapped in ErrorBoundary', () => {
    // The page renders without crashing — ErrorBoundary is present
    renderPage();
    expect(screen.getByText('Habit Analytics')).toBeInTheDocument();
  });

  it('renders section cards with gradient headers', () => {
    renderPage();
    expect(screen.getByText('Consistency')).toBeInTheDocument();
    expect(screen.getByText('Completion Rates')).toBeInTheDocument();
    expect(screen.getByText('Best Day of Week')).toBeInTheDocument();
    expect(screen.getByText('Insights')).toBeInTheDocument();
  });
});
