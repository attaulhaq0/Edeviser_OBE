import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// ---------------------------------------------------------------------------
// Mock react-router-dom navigate
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockSignInWithPassword = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { AuthProvider } from '@/providers/AuthProvider';
import LoginPage from '@/pages/LoginPage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const MOCK_USER = { id: 'user-123', email: 'admin@test.edu' };

const MOCK_PROFILE = {
  id: 'user-123',
  email: 'admin@test.edu',
  full_name: 'Test Admin',
  role: 'admin' as const,
  institution_id: 'inst-1',
  avatar_url: null,
  is_active: true,
  onboarding_completed: false,
  portfolio_public: false,
  theme_preference: 'light',
  language_preference: 'en',
  email_preferences: null,
  notification_preferences: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

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
};

const renderLoginPage = () =>
  render(
    <MemoryRouter>
      <AuthProvider>
        <LoginPage />
      </AuthProvider>
    </MemoryRouter>,
  );

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  it('renders the login form with email and password fields', async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText('Welcome to Edeviser')).toBeInTheDocument();
    });
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('has a "Forgot password?" link to /reset-password', async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText('Forgot password?')).toBeInTheDocument();
    });

    const link = screen.getByText('Forgot password?');
    expect(link.closest('a')).toHaveAttribute('href', '/reset-password');
  });

  it('shows validation error for invalid email', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    // Submit with empty email to trigger validation
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('shows validation error for short password', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@institution.edu'), 'user@test.edu');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'short');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('navigates to role dashboard on successful login', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { user: MOCK_USER } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: MOCK_PROFILE, error: null }),
        }),
      }),
    });

    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@institution.edu'), 'admin@test.edu');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/admin', { replace: true });
    });
  });

  it('shows generic error message on failed login (Req 1.3)', async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@institution.edu'), 'bad@test.edu');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'wrongpass1');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid email or password.')).toBeInTheDocument();
    });
  });

  it('shows lockout message when account is locked (Req 1.2)', async () => {
    // Pre-lock the account by recording 5 failed attempts
    const { recordFailedAttempt } = await import('@/lib/loginAttemptTracker');
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt('locked@test.edu');
    }

    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByPlaceholderText('you@institution.edu')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('you@institution.edu'), 'locked@test.edu');
    await user.type(screen.getByPlaceholderText('Enter your password'), 'anypass123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/temporarily locked/i)).toBeInTheDocument();
    });
    // Should NOT call Supabase when locked
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('does not submit when both fields are empty', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});
