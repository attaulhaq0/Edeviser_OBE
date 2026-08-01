import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/lib/i18n";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock("@/lib/loginAttemptTracker", () => ({
  isLocked: () => false,
  getRemainingLockTime: () => 0,
  recordFailedAttempt: vi.fn(),
  clearAttempts: vi.fn(),
  checkServerRateLimit: vi
    .fn()
    .mockResolvedValue({ locked: false, remaining_seconds: 0 }),
  recordServerFailedAttempt: vi.fn().mockResolvedValue({ locked: false }),
  clearServerAttempts: vi.fn().mockResolvedValue({ cleared: true }),
}));

const mockSignInWithPassword = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();
const mockSignOut = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: (...args: unknown[]) =>
        mockSignInWithPassword(...args),
      signUp: vi.fn(),
      signOut: (...args: unknown[]) => mockSignOut(...args),
      resetPasswordForEmail: vi.fn(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: vi
        .fn()
        .mockResolvedValue({ data: { locked: false }, error: null }),
    },
  },
}));

import { AuthProvider } from "@/providers/AuthProvider";
import LoginPage from "@/pages/LoginPage";

const setupMocks = () => {
  mockGetSession.mockResolvedValue({ data: { session: null }, error: null });
  mockSignOut.mockImplementation(() => Promise.resolve({ error: null }));
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockSignInWithPassword.mockImplementation(() =>
    Promise.resolve({
      data: {
        user: { id: "user-1", email: "student01@noor-international.test" },
        session: { user: { id: "user-1" } },
      },
      error: null,
    })
  );
  mockFrom.mockReturnValue({
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        maybeSingle: vi.fn().mockResolvedValue({
          data: {
            id: "user-1",
            role: "student",
            full_name: "Aarav Sharma",
            institution_id: "4de6a0a2-758b-47f3-ab7e-984bb974d88b",
          },
          error: null,
        }),
      }),
    }),
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

describe("Quick Login for Noor International Testing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setupMocks();
  });

  it("renders all 5 Quick Login role buttons when demo panel is active", async () => {
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-admin")).toBeInTheDocument();
    });
    expect(screen.getByTestId("quick-login-coordinator")).toBeInTheDocument();
    expect(screen.getByTestId("quick-login-teacher")).toBeInTheDocument();
    expect(screen.getByTestId("quick-login-student")).toBeInTheDocument();
    expect(screen.getByTestId("quick-login-parent")).toBeInTheDocument();
  });

  it("authenticates student and navigates to /student", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-student")).not.toBeDisabled();
    });

    const studentBtn = screen.getByTestId("quick-login-student");
    await user.click(studentBtn);

    await waitFor(
      () => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "student01@noor-international.test",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/student", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("authenticates parent and navigates to /student", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-parent")).not.toBeDisabled();
    });

    const parentBtn = screen.getByTestId("quick-login-parent");
    await user.click(parentBtn);

    await waitFor(
      () => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "parent01@noor-international.test",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/student", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("authenticates teacher and navigates to /student", async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-teacher")).not.toBeDisabled();
    });

    const teacherBtn = screen.getByTestId("quick-login-teacher");
    await user.click(teacherBtn);

    await waitFor(
      () => {
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "okonkwo@noor-international.test",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/student", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });
});
