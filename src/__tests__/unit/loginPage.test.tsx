import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/lib/i18n";

// ---------------------------------------------------------------------------
// Mock react-router-dom navigate
// ---------------------------------------------------------------------------
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

// ---------------------------------------------------------------------------
// Mock Supabase client
// ---------------------------------------------------------------------------
const mockSignInWithPassword = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();
const mockFunctionsInvoke = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
      signUp: vi.fn(),
      signOut: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: (...args: unknown[]) => mockFunctionsInvoke(...args),
    },
  },
}));

import { AuthProvider } from "@/providers/AuthProvider";
import LoginPage from "@/pages/LoginPage";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------
const MOCK_USER = { id: "user-123", email: "admin@test.edu" };

const MOCK_PROFILE = {
  id: "user-123",
  email: "admin@test.edu",
  full_name: "Test Admin",
  role: "admin" as const,
  institution_id: "inst-1",
  avatar_url: null,
  is_active: true,
  onboarding_completed: false,
  portfolio_public: false,
  theme_preference: "light",
  language_preference: "en",
  email_preferences: null,
  notification_preferences: null,
  created_at: "2024-01-01T00:00:00Z",
  updated_at: "2024-01-01T00:00:00Z",
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
  // Server-side rate limiting — default: not locked
  mockFunctionsInvoke.mockResolvedValue({
    data: {
      locked: false,
      remaining_seconds: 0,
      cleared: true,
      attempt_count: 0,
    },
    error: null,
  });
};

const renderLoginPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// ---------------------------------------------------------------------------
// Convenience selectors that match the new auth UI
// ---------------------------------------------------------------------------
const getEmailInput = () =>
  screen.getByPlaceholderText("Enter your email address");
const getPasswordInput = () =>
  screen.getByPlaceholderText("Enter your password");
const getSignInButton = () =>
  screen.getByRole("button", { name: /^Sign In$/i });

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  it("renders the auth card with Login and Register tabs", async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText("Welcome Back")).toBeInTheDocument();
    });
    expect(
      screen.getByText("Sign in to your account to continue")
    ).toBeInTheDocument();
    expect(getEmailInput()).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(getSignInButton()).toBeInTheDocument();
    // Tabs visible
    expect(screen.getByRole("tab", { name: /login/i })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /register/i })).toBeInTheDocument();
  });

  it('has a "Forgot password?" link to /reset-password', async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByText("Forgot password?")).toBeInTheDocument();
    });

    const link = screen.getByText("Forgot password?");
    expect(link.closest("a")).toHaveAttribute("href", "/reset-password");
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(getEmailInput()).toBeInTheDocument();
    });

    // Submit with empty email to trigger validation
    await user.type(getPasswordInput(), "password123");
    await user.click(getSignInButton());

    await waitFor(() => {
      expect(screen.getByText(/invalid email/i)).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("shows validation error for short password", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(getEmailInput()).toBeInTheDocument();
    });

    await user.type(getEmailInput(), "user@test.edu");
    await user.type(getPasswordInput(), "short");
    await user.click(getSignInButton());

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("navigates to role dashboard on successful login", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: MOCK_USER, session: { user: MOCK_USER } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi
            .fn()
            .mockResolvedValue({ data: MOCK_PROFILE, error: null }),
        }),
      }),
    });

    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(getEmailInput()).toBeInTheDocument();
    });

    await user.type(getEmailInput(), "admin@test.edu");
    await user.type(getPasswordInput(), "password123");
    await user.click(getSignInButton());

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/admin", { replace: true });
    });
  }, 15_000);

  it("shows generic error message on failed login (Req 1.3)", async () => {
    mockSignInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    });

    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(getEmailInput()).toBeInTheDocument();
    });

    await user.type(getEmailInput(), "bad@test.edu");
    await user.type(getPasswordInput(), "wrongpass1");
    await user.click(getSignInButton());

    await waitFor(() => {
      expect(
        screen.getByText("Invalid email or password.")
      ).toBeInTheDocument();
    });
  });

  it("shows lockout message when account is locked (Req 1.2)", async () => {
    // Pre-lock the account by recording 5 failed attempts
    const { recordFailedAttempt } = await import("@/lib/loginAttemptTracker");
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("locked@test.edu");
    }

    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(getEmailInput()).toBeInTheDocument();
    });

    await user.type(getEmailInput(), "locked@test.edu");
    await user.type(getPasswordInput(), "anypass123");
    await user.click(getSignInButton());

    await waitFor(() => {
      expect(screen.getByText(/temporarily locked/i)).toBeInTheDocument();
    });
    // Should NOT call Supabase when locked
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });

  it("does not submit when both fields are empty", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(getSignInButton()).toBeInTheDocument();
    });

    await user.click(getSignInButton());

    await waitFor(() => {
      expect(screen.getByText(/invalid email address/i)).toBeInTheDocument();
    });
    expect(mockSignInWithPassword).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Register tab — self-signup role affordance (Production Bug Fixes — Req 5)
//
// The server `handle_new_user` trigger forces role='student' for self-signup
// (no invitation_id) and ignores any requested role. The register tab must
// therefore NOT offer privileged roles (admin/teacher/coordinator/parent) that
// the backend would silently ignore — otherwise a user could pick "Admin" and
// quietly receive a student account. This keeps LoginPage consistent with the
// dedicated SignUpPage, which hard-codes 'student'. See Requirement 5.
// ---------------------------------------------------------------------------
describe("LoginPage — register tab role affordance (Req 5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  const openRegisterTab = async () => {
    const user = userEvent.setup();
    renderLoginPage();
    await waitFor(() => {
      expect(
        screen.getByRole("tab", { name: /register/i })
      ).toBeInTheDocument();
    });
    await user.click(screen.getByRole("tab", { name: /register/i }));
    // Register form has mounted once the first-name field is present.
    await waitFor(() => {
      expect(screen.getByPlaceholderText("First")).toBeInTheDocument();
    });
  };

  it("does not offer privileged self-signup roles the server would ignore", async () => {
    await openRegisterTab();

    // The previous role <select> (a native combobox) is removed entirely.
    expect(screen.queryByRole("combobox")).not.toBeInTheDocument();

    // None of the privileged roles are selectable on the register tab.
    for (const role of ["Teacher", "Coordinator", "Admin", "Parent"]) {
      expect(
        screen.queryByRole("option", { name: role })
      ).not.toBeInTheDocument();
    }
  });

  it("communicates that self-registration creates a student account", async () => {
    await openRegisterTab();

    const panel = within(screen.getByRole("tabpanel"));
    // A read-only "Student" indicator replaces the role picker...
    expect(panel.getByText("Student")).toBeInTheDocument();
    // ...alongside the trust hint that staff roles require an invitation.
    expect(
      panel.getByText(/staff roles require an invitation/i)
    ).toBeInTheDocument();
  });
});
