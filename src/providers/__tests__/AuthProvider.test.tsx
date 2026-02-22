import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { recordFailedAttempt, LOGIN_ATTEMPT_CONFIG } from '@/lib/loginAttemptTracker';

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockGetSession = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockSignOut = vi.fn();
const mockResetPasswordForEmail = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      resetPasswordForEmail: (...args: unknown[]) => mockResetPasswordForEmail(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

const mockLogActivity = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/activityLogger', () => ({
  logActivity: (...args: unknown[]) => mockLogActivity(...args),
}));

import { AuthProvider, useAuth } from '../AuthProvider';

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

const mockSelectChain = (data: unknown, error: unknown = null) => ({
  select: vi.fn().mockReturnValue({
    eq: vi.fn().mockReturnValue({
      maybeSingle: vi.fn().mockResolvedValue({ data, error }),
    }),
  }),
});

const setupMocks = (opts?: {
  session?: { user: typeof MOCK_USER } | null;
  profile?: typeof MOCK_PROFILE | null;
  profileError?: { message: string } | null;
}) => {
  const session = opts?.session ?? null;
  const profile = opts?.profile ?? null;
  const profileError = opts?.profileError ?? null;

  // getSession resolves with the provided session
  mockGetSession.mockResolvedValue({ data: { session: session ? { user: session.user } : null } });

  // onAuthStateChange returns a subscription with unsubscribe
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });

  // profiles query chain
  mockFrom.mockReturnValue(mockSelectChain(profile, profileError));

  // signOut
  mockSignOut.mockResolvedValue({ error: null });

  // resetPasswordForEmail
  mockResetPasswordForEmail.mockResolvedValue({ error: null });
};

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <AuthProvider>{children}</AuthProvider>
);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('starts in loading state and resolves to unauthenticated when no session', async () => {
    setupMocks({ session: null });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.institutionId).toBeNull();
  });

  it('loads existing session and fetches profile on mount', async () => {
    setupMocks({ session: { user: MOCK_USER }, profile: MOCK_PROFILE });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.profile?.full_name).toBe('Test Admin');
    expect(result.current.role).toBe('admin');
    expect(result.current.institutionId).toBe('inst-1');
  });

  it('signIn returns success with redirect path on valid credentials', async () => {
    setupMocks({ session: null });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { user: MOCK_USER } },
      error: null,
    });
    // After sign-in, profile fetch
    mockFrom.mockReturnValue(mockSelectChain(MOCK_PROFILE));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let authResult: unknown;
    await act(async () => {
      authResult = await result.current.signIn('admin@test.edu', 'password123');
    });

    expect(authResult).toEqual({
      success: true,
      redirectTo: '/admin',
    });
    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.role).toBe('admin');
  });

  it('signIn returns error on invalid credentials', async () => {
    setupMocks({ session: null });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let authResult: unknown;
    await act(async () => {
      authResult = await result.current.signIn('bad@test.edu', 'wrong');
    });

    // Generic message — must not reveal whether email or password was wrong (Req 1.3)
    expect(authResult).toEqual({
      success: false,
      error: 'Invalid email or password.',
    });
    expect(result.current.user).toBeNull();
  });

  it('signOut clears user and profile', async () => {
    setupMocks({ session: { user: MOCK_USER }, profile: MOCK_PROFILE });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).not.toBeNull();

    await act(async () => {
      await result.current.signOut();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it('resetPassword calls supabase resetPasswordForEmail', async () => {
    setupMocks({ session: null });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resetPassword('user@test.edu');
    });

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith('user@test.edu');
  });

  it('resetPassword throws when supabase returns an error', async () => {
    setupMocks({ session: null });
    mockResetPasswordForEmail.mockResolvedValue({
      error: { message: 'Rate limit exceeded' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(
      act(async () => {
        await result.current.resetPassword('user@test.edu');
      }),
    ).rejects.toEqual({ message: 'Rate limit exceeded' });
  });

  it('handles profile fetch failure gracefully (profile is null)', async () => {
    setupMocks({
      session: { user: MOCK_USER },
      profile: null,
      profileError: { message: 'relation "profiles" does not exist' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('useAuth throws when used outside AuthProvider', () => {
    // Suppress console.error for the expected error
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      renderHook(() => useAuth());
    }).toThrow('useAuth must be used within an AuthProvider');

    spy.mockRestore();
  });

  it('subscribes to auth state changes on mount', async () => {
    setupMocks({ session: null });

    renderHook(() => useAuth(), { wrapper });

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalledOnce();
    });
  });

  // -----------------------------------------------------------------------
  // Session persistence & auto-refresh (Req 4)
  // -----------------------------------------------------------------------

  it('restores session from persisted storage on mount (Req 4.1)', async () => {
    setupMocks({ session: { user: MOCK_USER }, profile: MOCK_PROFILE });

    const { result } = renderHook(() => useAuth(), { wrapper });

    // getSession is called on mount to restore persisted session
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockGetSession).toHaveBeenCalledOnce();
    expect(result.current.user?.id).toBe('user-123');
    expect(result.current.role).toBe('admin');
  });

  it('handles TOKEN_REFRESHED event by re-syncing session (Req 4.2)', async () => {
    let authChangeCallback: ((event: string, session: unknown) => void) | null = null;

    setupMocks({ session: null });
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.user).toBeNull();

    // Simulate a TOKEN_REFRESHED event with a valid session
    mockFrom.mockReturnValue(mockSelectChain(MOCK_PROFILE));

    await act(async () => {
      authChangeCallback?.('TOKEN_REFRESHED', { user: MOCK_USER });
    });

    await waitFor(() => expect(result.current.user?.id).toBe('user-123'));
    expect(result.current.role).toBe('admin');
  });

  it('clears state on SIGNED_OUT event (session expiry)', async () => {
    let authChangeCallback: ((event: string, session: unknown) => void) | null = null;

    setupMocks({ session: { user: MOCK_USER }, profile: MOCK_PROFILE });
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user?.id).toBe('user-123');

    // Simulate SIGNED_OUT (e.g., session expired)
    await act(async () => {
      authChangeCallback?.('SIGNED_OUT', null);
    });

    expect(result.current.user).toBeNull();
    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
  });

  it('handles SIGNED_IN event from onAuthStateChange', async () => {
    let authChangeCallback: ((event: string, session: unknown) => void) | null = null;

    setupMocks({ session: null });
    mockOnAuthStateChange.mockImplementation((cb: (event: string, session: unknown) => void) => {
      authChangeCallback = cb;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate SIGNED_IN event
    mockFrom.mockReturnValue(mockSelectChain(MOCK_PROFILE));

    await act(async () => {
      authChangeCallback?.('SIGNED_IN', { user: MOCK_USER });
    });

    await waitFor(() => expect(result.current.user?.id).toBe('user-123'));
    expect(result.current.profile?.full_name).toBe('Test Admin');
  });

  it('redirectTo maps correctly for each role', async () => {
    const roles = ['admin', 'coordinator', 'teacher', 'student', 'parent'] as const;
    const expectedPaths = ['/admin', '/coordinator', '/teacher', '/student', '/parent'];

    for (let i = 0; i < roles.length; i++) {
      vi.clearAllMocks();
      localStorage.clear();
      const roleProfile = { ...MOCK_PROFILE, role: roles[i] };

      setupMocks({ session: null });
      mockSignInWithPassword.mockResolvedValue({
        data: { user: MOCK_USER, session: { user: MOCK_USER } },
        error: null,
      });
      mockFrom.mockReturnValue(mockSelectChain(roleProfile));

      const { result } = renderHook(() => useAuth(), { wrapper });
      await waitFor(() => expect(result.current.isLoading).toBe(false));

      let authResult: { redirectTo?: string } | undefined;
      await act(async () => {
        authResult = await result.current.signIn('user@test.edu', 'pass12345');
      });

      expect(authResult?.redirectTo).toBe(expectedPaths[i]);
    }
  });

  // -----------------------------------------------------------------------
  // Activity logging on login (Req 41.1)
  // -----------------------------------------------------------------------

  it('logs login activity for student role on successful sign-in', async () => {
    const studentProfile = { ...MOCK_PROFILE, role: 'student' as const };
    setupMocks({ session: null });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { user: MOCK_USER } },
      error: null,
    });
    mockFrom.mockReturnValue(mockSelectChain(studentProfile));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn('student@test.edu', 'password123');
    });

    expect(mockLogActivity).toHaveBeenCalledWith({
      student_id: 'user-123',
      event_type: 'login',
    });
  });

  it('does not log login activity for non-student roles', async () => {
    setupMocks({ session: null });

    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { user: MOCK_USER } },
      error: null,
    });
    mockFrom.mockReturnValue(mockSelectChain(MOCK_PROFILE)); // admin role

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn('admin@test.edu', 'password123');
    });

    expect(mockLogActivity).not.toHaveBeenCalled();
  });

  // -----------------------------------------------------------------------
  // Login attempt tracking & lockout (Req 1.2, 1.3)
  // -----------------------------------------------------------------------

  it('returns generic error message on failed login (does not reveal email/password)', async () => {
    setupMocks({ session: null });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let authResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      authResult = await result.current.signIn('bad@test.edu', 'wrong');
    });

    expect(authResult?.success).toBe(false);
    expect(authResult?.error).toBe('Invalid email or password.');
  });

  it('locks account after 5 consecutive failed attempts', async () => {
    setupMocks({ session: null });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Fail 5 times
    for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS; i++) {
      await act(async () => {
        await result.current.signIn('locked@test.edu', 'wrong');
      });
    }

    // 6th attempt should be blocked without calling Supabase
    mockSignInWithPassword.mockClear();
    let authResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      authResult = await result.current.signIn('locked@test.edu', 'wrong');
    });

    expect(authResult?.success).toBe(false);
    expect(authResult?.error).toContain('temporarily locked');
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it('clears attempts on successful login', async () => {
    setupMocks({ session: null });

    // Record some failed attempts first
    recordFailedAttempt('success@test.edu');
    recordFailedAttempt('success@test.edu');

    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { user: MOCK_USER } },
      error: null,
    });
    mockFrom.mockReturnValue(mockSelectChain(MOCK_PROFILE));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.signIn('success@test.edu', 'correct');
    });

    // Attempts should be cleared — localStorage key removed
    expect(localStorage.getItem('login_attempts_success@test.edu')).toBeNull();
  });

  it('shows lockout message on the 5th failed attempt itself', async () => {
    setupMocks({ session: null });
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid login credentials' },
    });

    // Pre-record 4 failures
    for (let i = 0; i < LOGIN_ATTEMPT_CONFIG.MAX_ATTEMPTS - 1; i++) {
      recordFailedAttempt('edge@test.edu');
    }

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The 5th attempt triggers lockout
    let authResult: { success: boolean; error?: string } | undefined;
    await act(async () => {
      authResult = await result.current.signIn('edge@test.edu', 'wrong');
    });

    expect(authResult?.success).toBe(false);
    expect(authResult?.error).toContain('too many failed attempts');
  });
});
