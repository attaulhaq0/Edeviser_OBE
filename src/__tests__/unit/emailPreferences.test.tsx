// @vitest-environment happy-dom
// =============================================================================
// EmailPreferencesSection — Unit tests
// Tests the email notification opt-out settings component (Req 39.2)
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import _userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: mockMaybeSingle,
        })),
      })),
      update: vi.fn(() => ({
        eq: mockEq,
      })),
    })),
  },
}));

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'student-1' },
    profile: {
      id: 'student-1',
      email: 'student@test.com',
      full_name: 'Test Student',
      role: 'student',
    },
  }),
}));

// Suppress Sonner toast in tests
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import EmailPreferencesSection from '@/components/shared/EmailPreferencesSection';

// ─── Helpers ────────────────────────────────────────────────────────────────

const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const renderComponent = () => {
  const queryClient = createQueryClient();
  return render(
    <QueryClientProvider client={queryClient}>
      <EmailPreferencesSection />
    </QueryClientProvider>,
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('EmailPreferencesSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMaybeSingle.mockResolvedValue({
      data: {
        email_preferences: {
          streak_risk: true,
          weekly_summary: true,
          new_assignment: true,
          grade_released: true,
        },
      },
      error: null,
    });
    mockEq.mockResolvedValue({ error: null });
  });

  it('renders the section header', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Email Notifications')).toBeDefined();
    });
  });

  it('renders all 4 preference toggles', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('Streak Risk Alerts')).toBeDefined();
      expect(screen.getByText('Weekly Summary')).toBeDefined();
      expect(screen.getByText('New Assignments')).toBeDefined();
      expect(screen.getByText('Grade Released')).toBeDefined();
    });
  });

  it('renders descriptions for each preference', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText(/Daily reminder at 8 PM/)).toBeDefined();
      expect(screen.getByText(/Monday morning recap/)).toBeDefined();
      expect(screen.getByText(/new assignment is posted/)).toBeDefined();
      expect(screen.getByText(/grade is ready to view/)).toBeDefined();
    });
  });

  it('renders switch toggles with correct aria labels', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByRole('switch', { name: /Toggle Streak Risk Alerts/i })).toBeDefined();
      expect(screen.getByRole('switch', { name: /Toggle Weekly Summary/i })).toBeDefined();
      expect(screen.getByRole('switch', { name: /Toggle New Assignments/i })).toBeDefined();
      expect(screen.getByRole('switch', { name: /Toggle Grade Released/i })).toBeDefined();
    });
  });

  it('shows loading spinner while fetching preferences', () => {
    mockMaybeSingle.mockReturnValue(new Promise(() => {})); // never resolves
    renderComponent();
    // The loading state should show the spinner (Loader2 has animate-spin class)
    const spinners = document.querySelectorAll('.animate-spin');
    expect(spinners.length).toBeGreaterThan(0);
  });
});
