// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockMutate = vi.fn();

vi.mock('@/hooks/useOnboarding', () => ({
  useCompleteOnboarding: () => ({
    mutate: mockMutate,
    isPending: false,
  }),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, custom, ...rest } = props;
      void initial; void animate; void exit; void transition; void custom;
      return <div {...rest}>{children}</div>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import WelcomeTour from '@/components/shared/WelcomeTour';

describe('WelcomeTour', () => {
  const onComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders coordinator tour with 3 steps', () => {
    render(<WelcomeTour userRole="coordinator" onComplete={onComplete} />);
    expect(screen.getByText('Program Management')).toBeInTheDocument();
    expect(screen.getByText('Welcome Tour')).toBeInTheDocument();
  });

  it('renders teacher tour with course setup step', () => {
    render(<WelcomeTour userRole="teacher" onComplete={onComplete} />);
    expect(screen.getByText('Course Setup')).toBeInTheDocument();
  });

  it('renders student tour with XP step', () => {
    render(<WelcomeTour userRole="student" onComplete={onComplete} />);
    expect(screen.getByText('Earn XP')).toBeInTheDocument();
  });

  it('navigates to next step on Next click', () => {
    render(<WelcomeTour userRole="coordinator" onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText('PLO Mapping')).toBeInTheDocument();
  });

  it('navigates back on Back click', () => {
    render(<WelcomeTour userRole="coordinator" onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByText('Program Management')).toBeInTheDocument();
  });

  it('shows "Claim 50 XP Bonus" on last student step', () => {
    render(<WelcomeTour userRole="student" onComplete={onComplete} />);
    // Navigate to last step (5 steps, click Next 4 times)
    for (let i = 0; i < 4; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    expect(screen.getByRole('button', { name: /claim 50 xp bonus/i })).toBeInTheDocument();
  });

  it('shows "Get Started" on last coordinator step', () => {
    render(<WelcomeTour userRole="coordinator" onComplete={onComplete} />);
    // Navigate to last step (3 steps, click Next 2 times)
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    expect(screen.getByRole('button', { name: /get started/i })).toBeInTheDocument();
  });

  it('calls completeOnboarding.mutate on finish', () => {
    render(<WelcomeTour userRole="coordinator" onComplete={onComplete} />);
    for (let i = 0; i < 2; i++) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    fireEvent.click(screen.getByRole('button', { name: /get started/i }));
    expect(mockMutate).toHaveBeenCalled();
  });

  it('calls completeOnboarding.mutate on skip (X button)', () => {
    render(<WelcomeTour userRole="teacher" onComplete={onComplete} />);
    // The X button is the ghost button in the header
    const buttons = screen.getAllByRole('button');
    const closeButton = buttons.find((b) => b.querySelector('.lucide-x'));
    expect(closeButton).toBeTruthy();
    fireEvent.click(closeButton!);
    expect(mockMutate).toHaveBeenCalled();
  });
});
