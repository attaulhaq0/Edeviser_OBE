import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import {
  updatePasswordSchema,
  resetPasswordSchema,
} from '@/lib/schemas/auth';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockResetPasswordForEmail = vi.fn();
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { AuthProvider } from '@/providers/AuthProvider';
import ResetPasswordPage from '@/pages/ResetPasswordPage';
import UpdatePasswordPage from '@/pages/UpdatePasswordPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const setupMocks = () => {
  mockGetSession.mockResolvedValue({ data: { session: null } });
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }),
  });
  mockResetPasswordForEmail.mockResolvedValue({ error: null });
  mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
};

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

const renderWithAuthProvider = (ui: React.ReactElement) =>
  render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Schema Tests
// ---------------------------------------------------------------------------
describe('updatePasswordSchema', () => {
  it('accepts valid matching passwords', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'securePass1',
      confirmPassword: 'securePass1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects passwords shorter than 8 characters', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'short',
      confirmPassword: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched passwords', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'securePass1',
      confirmPassword: 'differentPass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('confirmPassword');
    }
  });

  it('rejects empty confirmPassword', () => {
    const result = updatePasswordSchema.safeParse({
      password: 'securePass1',
      confirmPassword: '',
    });
    expect(result.success).toBe(false);
  });
});

describe('resetPasswordSchema', () => {
  it('accepts a valid email', () => {
    const result = resetPasswordSchema.safeParse({ email: 'user@test.edu' });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid email', () => {
    const result = resetPasswordSchema.safeParse({ email: 'not-an-email' });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ResetPasswordPage Tests
// ---------------------------------------------------------------------------
describe('ResetPasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the reset password form', async () => {
    renderWithAuthProvider(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByText('Reset Password')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('shows success state after submitting a valid email', async () => {
    const user = userEvent.setup();
    renderWithAuthProvider(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@institution.edu'), 'user@test.edu');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.edu');
  });

  it('shows success state even when supabase returns an error (prevents email enumeration)', async () => {
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: 'User not found' },
    });

    const user = userEvent.setup();
    renderWithAuthProvider(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@institution.edu'), 'nonexistent@test.edu');
    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
    });
  });

  it('does not submit when email field is empty', async () => {
    const user = userEvent.setup();
    renderWithAuthProvider(<ResetPasswordPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /send reset link/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('has a back to login link', async () => {
    renderWithAuthProvider(<ResetPasswordPage />);
    await waitFor(() => {
      expect(screen.getByText(/back to login/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// UpdatePasswordPage Tests
// ---------------------------------------------------------------------------
describe('UpdatePasswordPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders the update password form', () => {
    renderWithRouter(<UpdatePasswordPage />);
    expect(screen.getByText('Set New Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Minimum 8 characters')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Re-enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /update password/i })).toBeInTheDocument();
  });

  it('updates password successfully and shows success state', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UpdatePasswordPage />);

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'newSecure123');
    await user.type(screen.getByPlaceholderText('Re-enter your password'), 'newSecure123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText('Password Updated')).toBeInTheDocument();
    });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'newSecure123' });
  });

  it('shows validation error for mismatched passwords', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UpdatePasswordPage />);

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'newSecure123');
    await user.type(screen.getByPlaceholderText('Re-enter your password'), 'different123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderWithRouter(<UpdatePasswordPage />);

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'short');
    await user.type(screen.getByPlaceholderText('Re-enter your password'), 'short');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it('shows error toast when supabase update fails', async () => {
    mockUpdateUser.mockResolvedValue({
      data: null,
      error: { message: 'Token expired' },
    });

    const user = userEvent.setup();
    renderWithRouter(<UpdatePasswordPage />);

    await user.type(screen.getByPlaceholderText('Minimum 8 characters'), 'newSecure123');
    await user.type(screen.getByPlaceholderText('Re-enter your password'), 'newSecure123');
    await user.click(screen.getByRole('button', { name: /update password/i }));

    // Should NOT show success state
    await waitFor(() => {
      expect(screen.queryByText('Password Updated')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Set New Password')).toBeInTheDocument();
  });
});
