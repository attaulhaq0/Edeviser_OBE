// Task 26.1: XP Economist Dashboard — Earn/spend ratio display, inflation indicator, time-series chart
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import XPEconomistDashboard from '@/pages/admin/marketplace/XPEconomistDashboard';

// ─── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ institutionId: 'inst-1', user: { id: 'admin-1' } }),
}));

const mockRatioData = { ratio: 3.5, status: 'healthy' as const, earnedFormatted: '10,000', spentFormatted: '2,857' };
const mockVelocityData = { avgWeeklyEarning: 500, avgWeeklySpending: 150, netWeeklyFlow: 350, trend: 'accumulating' as const };
const mockTimeSeries = [
  { week: 'W1', earned: 400, spent: 100 },
  { week: 'W2', earned: 500, spent: 150 },
];

vi.mock('@/hooks/useXPEconomist', () => ({
  useEarnSpendRatio: () => ({ data: mockRatioData, isLoading: false }),
  useXPVelocity: () => ({ data: mockVelocityData, isLoading: false }),
  useEarnSpendTimeSeries: () => ({ data: mockTimeSeries, isLoading: false }),
}));

vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="responsive-container">{children}</div>,
  LineChart: ({ children }: { children: React.ReactNode }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
}));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('XPEconomistDashboard', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the page title', () => {
    render(<XPEconomistDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('XP Economist')).toBeDefined();
  });

  it('displays earn/spend ratio KPI', () => {
    render(<XPEconomistDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Earn / Spend Ratio')).toBeDefined();
    expect(screen.getByText('3.5:1')).toBeDefined();
  });

  it('displays XP velocity KPI', () => {
    render(<XPEconomistDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('XP Velocity')).toBeDefined();
    expect(screen.getByText('500/wk')).toBeDefined();
  });

  it('displays net flow KPI', () => {
    render(<XPEconomistDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Net Flow / Week')).toBeDefined();
    expect(screen.getByText('+350')).toBeDefined();
  });

  it('displays healthy inflation status', () => {
    render(<XPEconomistDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Inflation Status')).toBeDefined();
    expect(screen.getByText('Healthy')).toBeDefined();
  });

  it('renders the time-series chart', () => {
    render(<XPEconomistDashboard />, { wrapper: createWrapper() });
    expect(screen.getByText('Earn vs Spend Over Time')).toBeDefined();
    expect(screen.getByTestId('line-chart')).toBeDefined();
  });
});
