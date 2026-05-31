// Form-level unit tests for password reveal/mask + mutual exclusion as adopted
// on the auth forms (Task 14.1/14.2). The pure reducer and the standalone
// PasswordInput/PasswordVisibilityGroup are covered by passwordInput.test.tsx;
// this suite verifies the toggle and the at-most-one-revealed invariant hold
// when the components are wired into a real auth form (UpdatePasswordPage),
// which renders two password fields inside a PasswordVisibilityGroup.
//
// Covers Requirements 5.2, 5.3, 5.4, 5.5.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@/lib/i18n";

// ---------------------------------------------------------------------------
// Mock Supabase client — toggling visibility never touches the network. The
// page nests a LanguageSwitcher that reads auth context, so AuthProvider needs
// getSession/onAuthStateChange/from to resolve cleanly during mount.
// ---------------------------------------------------------------------------
const mockUpdateUser = vi.fn();
const mockGetSession = vi.fn();
const mockOnAuthStateChange = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import { AuthProvider } from "@/providers/AuthProvider";
import UpdatePasswordPage from "@/pages/UpdatePasswordPage";

const NEW_PASSWORD_PLACEHOLDER = "Minimum 8 characters";
const CONFIRM_PASSWORD_PLACEHOLDER = "Re-enter your password";

const renderUpdatePasswordPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <UpdatePasswordPage />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const getNewPasswordInput = () =>
  screen.getByPlaceholderText(NEW_PASSWORD_PLACEHOLDER);
const getConfirmPasswordInput = () =>
  screen.getByPlaceholderText(CONFIRM_PASSWORD_PLACEHOLDER);

describe("Auth form password visibility (UpdatePasswordPage)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateUser.mockResolvedValue({ data: { user: {} }, error: null });
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
  });

  it("renders both password fields masked, each with a Show password toggle (R5.2)", () => {
    renderUpdatePasswordPage();

    expect(getNewPasswordInput()).toHaveAttribute("type", "password");
    expect(getConfirmPasswordInput()).toHaveAttribute("type", "password");

    // One toggle per password field, all offering to reveal while masked.
    expect(
      screen.getAllByRole("button", { name: "Show password" })
    ).toHaveLength(2);
  });

  it("reveals a field in plain text and flips the toggle's accessible name (R5.2, R5.4)", async () => {
    const user = userEvent.setup();
    renderUpdatePasswordPage();

    const newPassword = getNewPasswordInput();
    // The first toggle is the new-password field's control.
    const [showToggle] = screen.getAllByRole("button", {
      name: "Show password",
    });
    await user.click(showToggle as HTMLElement);

    // Field is now plain text and the control offers to hide.
    expect(newPassword).toHaveAttribute("type", "text");
    expect(
      screen.getByRole("button", { name: "Hide password" })
    ).toBeInTheDocument();
  });

  it("masks the field again when the hide control is activated (R5.3, R5.4)", async () => {
    const user = userEvent.setup();
    renderUpdatePasswordPage();

    const newPassword = getNewPasswordInput();
    const [showToggle] = screen.getAllByRole("button", {
      name: "Show password",
    });
    await user.click(showToggle as HTMLElement);
    expect(newPassword).toHaveAttribute("type", "text");

    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(newPassword).toHaveAttribute("type", "password");
    // Both controls offer to show once more.
    expect(
      screen.getAllByRole("button", { name: "Show password" })
    ).toHaveLength(2);
  });

  it("reveals at most one password field at a time across the group (R5.5)", async () => {
    const user = userEvent.setup();
    renderUpdatePasswordPage();

    const newPassword = getNewPasswordInput();
    const confirmPassword = getConfirmPasswordInput();

    // Reveal the new-password field.
    const [firstShow] = screen.getAllByRole("button", {
      name: "Show password",
    });
    await user.click(firstShow as HTMLElement);
    expect(newPassword).toHaveAttribute("type", "text");
    expect(confirmPassword).toHaveAttribute("type", "password");

    // Revealing the confirm field must mask the new-password field — only one
    // "Show password" control remains (the now-masked new-password field).
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(confirmPassword).toHaveAttribute("type", "text");
    expect(newPassword).toHaveAttribute("type", "password");

    // The invariant: never more than one field revealed simultaneously.
    const revealed = [newPassword, confirmPassword].filter(
      (el) => el.getAttribute("type") === "text"
    );
    expect(revealed).toHaveLength(1);
  });
});
