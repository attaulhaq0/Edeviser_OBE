import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { AuthResult, Profile, UserRole } from "@/types/app";
import {
  isLocked,
  getRemainingLockTime,
  recordFailedAttempt,
  clearAttempts,
  checkServerRateLimit,
  recordServerFailedAttempt,
  clearServerAttempts,
} from "@/lib/loginAttemptTracker";
import { logActivity } from "@/lib/activityLogger";
import {
  loadAccessibilityPreferences,
  applyAccessibilityPreferences,
} from "@/lib/accessibilityPreferences";

// ---------------------------------------------------------------------------
// Role → dashboard path mapping
// ---------------------------------------------------------------------------
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: "/admin",
  coordinator: "/coordinator",
  teacher: "/teacher",
  student: "/student",
  parent: "/parent",
};

export interface SignUpOptions {
  email: string;
  password: string;
  fullName: string;
  username?: string;
  institutionId?: string;
  requestedRole?: UserRole;
}

export interface SignUpResult {
  success: boolean;
  error?: string;
  requiresVerification?: boolean;
  redirectTo?: string;
}

// ---------------------------------------------------------------------------
// Context value interface (matches design.md AuthContextValue)
// ---------------------------------------------------------------------------
export interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  institutionId: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  signUp: (options: SignUpOptions) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

// eslint-disable-next-line react-refresh/only-export-components
export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Guard against double-firing in StrictMode
  const initialised = useRef(false);

  // -------------------------------------------------------------------
  // Fetch profile from `profiles` table
  // -------------------------------------------------------------------
  const fetchProfile = useCallback(
    async (userId: string): Promise<Profile | null> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) {
        console.error("Failed to fetch profile:", error.message);
        return null;
      }
      return data as Profile | null;
    },
    []
  );

  // -------------------------------------------------------------------
  // Sync local state from a session
  // -------------------------------------------------------------------
  const syncSession = useCallback(
    async (session: Session | null) => {
      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      setUser(session.user);

      const userProfile = await fetchProfile(session.user.id);
      setProfile(userProfile);
      setIsLoading(false);
    },
    [fetchProfile]
  );

  // -------------------------------------------------------------------
  // Bootstrap: restore persisted session + subscribe to auth changes
  // -------------------------------------------------------------------
  useEffect(() => {
    // Apply accessibility preferences from localStorage on startup
    applyAccessibilityPreferences(loadAccessibilityPreferences());
  }, []);

  useEffect(() => {
    if (initialised.current) return;
    initialised.current = true;

    // 1. Restore session from localStorage (persisted by Supabase client)
    supabase.auth.getSession().then(({ data: { session } }) => {
      syncSession(session);
    });

    // 2. Listen for auth state changes (token refresh, sign-out, etc.)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "SIGNED_OUT":
          // Explicitly clear state on sign-out (session expiry or manual)
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          break;

        case "TOKEN_REFRESHED":
        case "SIGNED_IN":
        case "INITIAL_SESSION":
          // Re-sync profile on token refresh to keep state fresh
          syncSession(session);
          break;

        default:
          // Handle any other events (USER_UPDATED, PASSWORD_RECOVERY, etc.)
          syncSession(session);
          break;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [syncSession]);

  // -------------------------------------------------------------------
  // signIn
  // -------------------------------------------------------------------
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      // 1. Client-side lockout check (immediate UX feedback)
      if (isLocked(email)) {
        const remaining = getRemainingLockTime(email);
        const minutes = Math.ceil(remaining / 60);
        return {
          success: false,
          error: `Account is temporarily locked. Please try again in ${minutes} minute${
            minutes === 1 ? "" : "s"
          }.`,
        };
      }

      // 2. Server-side lockout check (tamper-proof enforcement)
      const serverCheck = await checkServerRateLimit(email);
      if (serverCheck.locked) {
        const minutes = Math.ceil(serverCheck.remaining_seconds / 60);
        return {
          success: false,
          error: `Account is temporarily locked. Please try again in ${minutes} minute${
            minutes === 1 ? "" : "s"
          }.`,
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Record on both client and server
        recordFailedAttempt(email);
        const serverResult = await recordServerFailedAttempt(email);

        // After recording, check if the account just got locked (either side)
        if (isLocked(email) || serverResult.locked) {
          return {
            success: false,
            error:
              "Account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.",
          };
        }

        // Generic message — don't reveal whether email or password was wrong (Req 1.3)
        return { success: false, error: "Invalid email or password." };
      }

      // Successful login — clear attempts on both client and server
      clearAttempts(email);
      clearServerAttempts(email).catch(() => {
        // Fire-and-forget — don't block successful login
      });

      const userProfile = await fetchProfile(data.user.id);
      setUser(data.user);
      setProfile(userProfile);

      const redirectTo = userProfile?.role
        ? ROLE_DASHBOARD_MAP[userProfile.role]
        : "/login";

      // Fire-and-forget: log login activity for students (Req 41.1)
      if (userProfile?.role === "student") {
        logActivity({ student_id: data.user.id, event_type: "login" }).catch(
          () => {}
        );
      }

      return { success: true, redirectTo };
    },
    [fetchProfile]
<<<<<<< Updated upstream
  );

  // -------------------------------------------------------------------
  // signUp — public self-registration
  //
  // Creates the auth.users row; the `handle_new_user()` trigger
  // (migration 20260901000002 + 20260901000006) inserts the matching
  // public.profiles row with role='student' and validates the optional
  // institution_id against the institution's join_mode (ADR-13).
  //
  // For institutions with join_mode='open' the profile is created with
  // status='pending_verification' until the email link is clicked (ADR-14);
  // for domain_restricted / invite_only (student self-signup only) the
  // profile is created with status='active' immediately.
  // -------------------------------------------------------------------
  const signUp = useCallback(
    async (options: SignUpOptions): Promise<SignUpResult> => {
      const {
        email,
        password,
        fullName,
        username,
        institutionId,
        requestedRole,
      } = options;

      const metadata: Record<string, unknown> = {
        full_name: fullName,
      };
      if (username) metadata.username = username;
      if (institutionId) metadata.institution_id = institutionId;
      if (requestedRole) metadata.requested_role = requestedRole;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata,
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      // Supabase returns `session=null` when email confirmation is required
      // (production default). `session` is populated when confirmation is
      // disabled or an auto-confirm hook ran.
      const requiresVerification = !data.session;

      if (requiresVerification) {
        return {
          success: true,
          requiresVerification: true,
        };
      }

      // Session established — fetch the freshly-created profile and route
      // to the appropriate dashboard.
      if (data.user) {
        const userProfile = await fetchProfile(data.user.id);
        setUser(data.user);
        setProfile(userProfile);

        const redirectTo = userProfile?.role
          ? ROLE_DASHBOARD_MAP[userProfile.role]
          : "/login";
        return { success: true, redirectTo };
      }

      return { success: true };
    },
    [fetchProfile]
=======
>>>>>>> Stashed changes
  );

  // -------------------------------------------------------------------
  // signOut
  // -------------------------------------------------------------------
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  // -------------------------------------------------------------------
  // resetPassword
  // -------------------------------------------------------------------
  const resetPassword = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  }, []);

  // -------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------
  const role = profile?.role ?? null;
  const institutionId = profile?.institution_id ?? null;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      role,
      institutionId,
      isLoading,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }),
    [
      user,
      profile,
      role,
      institutionId,
      isLoading,
      signIn,
<<<<<<< Updated upstream
      signUp,
=======
>>>>>>> Stashed changes
      signOut,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
