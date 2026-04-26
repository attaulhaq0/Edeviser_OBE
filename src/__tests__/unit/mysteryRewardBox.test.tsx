// Task 26.4: Mystery Reward Box — Unboxing animation, reward display
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import MysteryRewardBox from '@/components/shared/MysteryRewardBox';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();
vi.mock('@/hooks/useMysteryRewardBox', () => ({
  useResolveMysteryReward: () => ({ mutate: mockMutate, isPending: false }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const createWrapper = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('MysteryRewardBox', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renders the dialog title when open', () => {
    render(
      <MysteryRewardBox studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Mystery Reward')).toBeDefined();
  });

  it('shows "Open Box" button in initial state', () => {
    render(
      <MysteryRewardBox studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText('Open Box')).toBeDefined();
  });

  it('shows mystery reward description text', () => {
    render(
      <MysteryRewardBox studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(screen.getByText("You've earned a mystery reward!")).toBeDefined();
  });

  it('calls resolve mutation when Open Box is clicked', () => {
    render(
      <MysteryRewardBox studentId="s-1" open onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    fireEvent.click(screen.getByText('Open Box'));
    expect(mockMutate).toHaveBeenCalledWith(
      { studentId: 's-1' },
      expect.any(Object),
    );
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <MysteryRewardBox studentId="s-1" open={false} onOpenChange={vi.fn()} />,
      { wrapper: createWrapper() },
    );
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });
});
