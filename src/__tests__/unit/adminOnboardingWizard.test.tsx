import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
const mockMutate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

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
    button: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => {
      const { initial, animate, exit, transition, custom, ...rest } = props;
      void initial; void animate; void exit; void transition; void custom;
      return <button {...rest}>{children}</button>;
    },
  },
  AnimatePresence: ({ children }: React.PropsWithChildren) => <>{children}</>,
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import AdminOnboardingWizard from '@/components/shared/AdminOnboardingWizard';

describe('AdminOnboardingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    hasILOs: false,
    hasPrograms: false,
    hasCoordinators: false,
    hasTeachers: false,
  };

  it('renders all 4 setup steps', () => {
    render(<AdminOnboardingWizard {...defaultProps} />);
    expect(screen.getByText('Create ILOs')).toBeInTheDocument();
    expect(screen.getByText('Create Programs')).toBeInTheDocument();
    expect(screen.getByText('Invite Coordinators')).toBeInTheDocument();
    expect(screen.getByText('Invite Teachers')).toBeInTheDocument();
  });

  it('shows progress as 0/4 when nothing completed', () => {
    render(<AdminOnboardingWizard {...defaultProps} />);
    expect(screen.getByText('0/4')).toBeInTheDocument();
  });

  it('shows progress as 2/4 when two steps completed', () => {
    render(<AdminOnboardingWizard {...defaultProps} hasILOs hasPrograms />);
    expect(screen.getByText('2/4')).toBeInTheDocument();
  });

  it('navigates to ILO page when Create ILOs step is clicked', () => {
    render(<AdminOnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Create ILOs'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/outcomes');
  });

  it('navigates to users page when Invite Teachers step is clicked', () => {
    render(<AdminOnboardingWizard {...defaultProps} />);
    fireEvent.click(screen.getByText('Invite Teachers'));
    expect(mockNavigate).toHaveBeenCalledWith('/admin/users');
  });

  it('does not show Complete Setup button when not all steps done', () => {
    render(<AdminOnboardingWizard {...defaultProps} hasILOs />);
    expect(screen.queryByRole('button', { name: /complete setup/i })).not.toBeInTheDocument();
  });

  it('shows Complete Setup button when all steps done', () => {
    render(
      <AdminOnboardingWizard
        hasILOs
        hasPrograms
        hasCoordinators
        hasTeachers
      />,
    );
    expect(screen.getByRole('button', { name: /complete setup/i })).toBeInTheDocument();
  });

  it('calls completeOnboarding.mutate on Complete Setup click', () => {
    render(
      <AdminOnboardingWizard
        hasILOs
        hasPrograms
        hasCoordinators
        hasTeachers
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /complete setup/i }));
    expect(mockMutate).toHaveBeenCalled();
  });
});
