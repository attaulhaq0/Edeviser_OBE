import { StrictMode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/types/app";

const authMocks = vi.hoisted(() => ({
  listeners: [] as Array<(event: string, session: Session | null) => void>,
  unsubscribe: vi.fn(),
  onAuthStateChange: vi.fn(),
  getSession: vi.fn(),
  maybeSingle: vi.fn(),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      onAuthStateChange: authMocks.onAuthStateChange,
      getSession: authMocks.getSession,
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: authMocks.maybeSingle,
        }),
      }),
    }),
  },
}));

import { AuthProvider } from "@/providers/AuthProvider";
import { useAuth } from "@/hooks/useAuth";

const profile: Profile = {
  id: "student-1",
  email: "student@example.com",
  full_name: "Student Example",
  role: "student",
  institution_id: "institution-1",
  avatar_url: null,
  is_active: true,
  onboarding_completed: true,
  portfolio_public: false,
  theme_preference: "system",
  language_preference: "en",
  notification_preferences: {},
  last_seen_at: null,
  tos_accepted_at: null,
  tour_completed_at: null,
  status: "active",
  created_at: "2026-01-01T00:00:00.000Z",
};

const AuthState = () => {
  const { isLoading, role } = useAuth();
  return <output>{isLoading ? "loading" : role ?? "anonymous"}</output>;
};

describe("AuthProvider Strict Mode hydration", () => {
  it("keeps a live auth subscription after Strict Mode remounting", async () => {
    authMocks.listeners.length = 0;
    authMocks.unsubscribe.mockReset();
    authMocks.onAuthStateChange.mockImplementation(
      (listener: (event: string, session: Session | null) => void) => {
        authMocks.listeners.push(listener);
        return {
          data: { subscription: { unsubscribe: authMocks.unsubscribe } },
        };
      }
    );
    // Keep the fallback pending so this test proves the live listener itself
    // hydrates a direct protected-route load.
    authMocks.getSession.mockReturnValue(new Promise(() => undefined));
    authMocks.maybeSingle.mockResolvedValue({ data: profile, error: null });

    render(
      <StrictMode>
        <AuthProvider>
          <AuthState />
        </AuthProvider>
      </StrictMode>
    );

    expect(authMocks.onAuthStateChange).toHaveBeenCalledTimes(2);
    expect(authMocks.unsubscribe).toHaveBeenCalledTimes(1);

    const persistedSession = {
      user: { id: profile.id },
    } as Session;

    await act(async () => {
      authMocks.listeners[1]?.("INITIAL_SESSION", persistedSession);
    });

    await waitFor(() =>
      expect(screen.getByText("student")).toBeInTheDocument()
    );
  });
});
