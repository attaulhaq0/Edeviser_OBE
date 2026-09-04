import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/lib/i18n";

vi.hoisted(() => {
  vi.stubEnv("VITE_DEMO_PASSWORD", "test-only-noor-demo-password");
});

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

const setupMocks = (
  role = "student",
  email = "student01@noor-international.edu",
  userId = "user-1"
) => {
  mockGetSession.mockResolvedValue({
    data: {
      session: {
        user: { id: userId, email },
      },
    },
    error: null,
  });
  mockSignOut.mockImplementation(() => Promise.resolve({ error: null }));
  mockOnAuthStateChange.mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  });
  mockSignInWithPassword.mockImplementation(() =>
    Promise.resolve({
      data: {
        user: { id: userId, email },
        session: { user: { id: userId, email } },
      },
      error: null,
    })
  );

  mockFrom.mockImplementation((tableName: string) => {
    if (tableName === "profiles") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: userId,
                role,
                full_name: "Test User",
                institution_id: "4de6a0a2-758b-47f3-ab7e-984bb974d88b",
                status: "active",
              },
              error: null,
            }),
            single: vi.fn().mockResolvedValue({
              data: {
                id: userId,
                role,
                full_name: "Test User",
                institution_id: "4de6a0a2-758b-47f3-ab7e-984bb974d88b",
                status: "active",
              },
              error: null,
            }),
          }),
        }),
      };
    }

    // Role-specific verification tables
    if (tableName === "parent_student_links") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
          }),
        }),
      };
    }

    if (tableName === "courses") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 2, error: null }),
        }),
      };
    }

    if (tableName === "programs") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
        }),
      };
    }

    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ count: 1, error: null }),
      }),
    };
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

  it("authenticates student and navigates to /student/dashboard", async () => {
    setupMocks("student", "student01@noor-international.edu", "student-id-1");
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-student")).not.toBeDisabled();
    });

    const studentBtn = screen.getByTestId("quick-login-student");
    await user.click(studentBtn);

    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "student01@noor-international.edu",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/student/dashboard", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("authenticates parent with verified child link and navigates to /parent/dashboard", async () => {
    setupMocks("parent", "parent01@noor-international.edu", "parent-id-1");
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-parent")).not.toBeDisabled();
    });

    const parentBtn = screen.getByTestId("quick-login-parent");
    await user.click(parentBtn);

    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "parent01@noor-international.edu",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/parent/dashboard", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("authenticates teacher with assigned courses and navigates to /teacher/dashboard", async () => {
    setupMocks("teacher", "okonkwo@noor-international.edu", "teacher-id-1");
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-teacher")).not.toBeDisabled();
    });

    const teacherBtn = screen.getByTestId("quick-login-teacher");
    await user.click(teacherBtn);

    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "okonkwo@noor-international.edu",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/teacher/dashboard", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("authenticates coordinator with program access and navigates to /coordinator/dashboard", async () => {
    setupMocks(
      "coordinator",
      "curriculum@noor-international.edu",
      "coord-id-1"
    );
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-coordinator")).not.toBeDisabled();
    });

    const coordBtn = screen.getByTestId("quick-login-coordinator");
    await user.click(coordBtn);

    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "curriculum@noor-international.edu",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/coordinator/dashboard", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("authenticates admin and navigates to /admin/dashboard", async () => {
    setupMocks("admin", "principal@noor-international.edu", "admin-id-1");
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-admin")).not.toBeDisabled();
    });

    const adminBtn = screen.getByTestId("quick-login-admin");
    await user.click(adminBtn);

    await waitFor(
      () => {
        expect(mockSignOut).toHaveBeenCalled();
        expect(mockSignInWithPassword).toHaveBeenCalledWith({
          email: "principal@noor-international.edu",
          password: expect.any(String),
        });
        expect(mockNavigate).toHaveBeenCalledWith("/admin/dashboard", {
          replace: true,
        });
      },
      { timeout: 4000 }
    );
  });

  it("aborts redirect and displays error when account role mismatch occurs", async () => {
    setupMocks("student", "parent01@noor-international.edu", "mismatch-id-1");
    const user = userEvent.setup();
    renderLoginPage();

    await waitFor(() => {
      expect(screen.getByTestId("quick-login-parent")).not.toBeDisabled();
    });

    const parentBtn = screen.getByTestId("quick-login-parent");
    await user.click(parentBtn);

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
      expect(
        screen.getByText(/does not match requested Quick Login role/i)
      ).toBeInTheDocument();
    });
  });
});
