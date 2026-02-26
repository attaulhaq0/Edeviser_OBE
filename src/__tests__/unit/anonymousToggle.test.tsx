// =============================================================================
// AnonymousToggle — Unit tests
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
let mockIsAnonymous = false;
let mockIsLoadingStatus = false;
let mockIsPending = false;

vi.mock('@/hooks/useLeaderboard', () => ({
  useAnonymousStatus: () => ({
    data: { isAnonymous: mockIsAnonymous },
    isLoading: mockIsLoadingStatus,
  }),
  useToggleAnonymous: () => ({
    mutate: mockMutate,
    isPending: mockIsPending,
  }),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import AnonymousToggle from '@/components/shared/AnonymousToggle';

const createQueryClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = () => {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AnonymousToggle />
    </QueryClientProvider>,
  );
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('AnonymousToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAnonymous = false;
    mockIsLoadingStatus = false;
    mockIsPending = false;
  });

  it('renders "You are visible" when not anonymous', () => {
    mockIsAnonymous = false;
    renderComponent();
    expect(screen.getByText('You are visible')).toBeInTheDocument();
    expect(screen.getByText('Go Anonymous')).toBeInTheDocument();
  });

  it('renders "You are anonymous" when opted out', () => {
    mockIsAnonymous = true;
    renderComponent();
    expect(screen.getByText('You are anonymous')).toBeInTheDocument();
    expect(screen.getByText('Go Visible')).toBeInTheDocument();
  });

  it('calls toggle mutation when button is clicked', async () => {
    const user = userEvent.setup();
    renderComponent();
    const btn = screen.getByRole('button');
    await user.click(btn);
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it('disables button when mutation is pending', () => {
    mockIsPending = true;
    renderComponent();
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('disables button when status is loading', () => {
    mockIsLoadingStatus = true;
    renderComponent();
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
  });

  it('shows loading indicator when status is loading', () => {
    mockIsLoadingStatus = true;
    renderComponent();
    expect(screen.getByText('...')).toBeInTheDocument();
  });
});
