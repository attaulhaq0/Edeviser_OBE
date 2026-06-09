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
import { awardPerfectDayIfComplete } from "@/lib/perfectDay";
import {
  loadAccessibilityPreferences,
  applyAccessibilityPreferences,
} from "@/lib/accessibilityPreferences";
import i18n from "@/lib/i18n";

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
        .select(
          "id, email, full_name, role, institution_id, avatar_url, is_active, onboarding_completed, portfolio_public, theme_preference, language_preference, preferred_language, notification_preferences, last_seen_at, tos_accepted_at, tour_completed_at, status, created_at"
        )
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

      // ThemeProvider handles theme_preference sync via its profilePref effect.
      // We only need to sync language preference here.

      // Hydrate language preference into i18n
      if (userProfile?.language_preference) {
        i18n.changeLanguage(userProfile.language_preference).catch(() => {
          // Fire-and-forget — don't block session hydration
        });
      }

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
        const studentId = data.user.id;
        logActivity({ student_id: studentId, event_type: "login" }).catch(
          () => {}
        );

        // S-1 engagement loop (Req 2.9): advance the streak, award +10 login XP,
        // and record the `login` daily habit so the streak/perfect-day pipeline is
        // fed from real activity. Each call is fire-and-forget and independently
        // guarded so one failure can neither block the login nor the others.
        // (The broken midnight `{type:'midnight_reset'}` cron is left disconnected
        // as a documented no-op; the streak now advances from this per-user login.)
        const todayUtc = new Date().toISOString().split("T")[0] as string;

        // Record the login habit FIRST (before the perfect-day check) so
        // awardPerfectDayIfComplete can observe it when reading today's habit_logs.
        // Idempotent on (student_id, habit_type, date) — a second login same day is a no-op.
        supabase
          .from("habit_logs")
          .upsert(
            {
              student_id: studentId,
              habit_type: "login",
              date: todayUtc,
              completed_at: new Date().toISOString(),
            },
            { onConflict: "student_id,habit_type,date" }
          )
          .then(({ error }) => {
            if (error) {
              console.error("Failed to record login habit:", error.message);
            }
            // Perfect-day check runs after the login habit is recorded.
            // awardPerfectDayIfComplete swallows its own errors.
            return awardPerfectDayIfComplete(studentId);
          })
          .then(() => {});

        // process-streak is idempotent same-day (dayDiff === 0 is a no-op) and
        // authorizes the student's own JWT.
        supabase.functions
          .invoke("process-streak", { body: { student_id: studentId } })
          .catch(() => {});

        // award-xp enforces the canonical 10 XP and a `login:{id}:{date}`
        // idempotent reference server-side; the client-supplied amount is advisory.
        supabase.functions
          .invoke("award-xp", {
            body: { student_id: studentId, source: "login", xp_amount: 10 },
          })
          .catch(() => {});
      }

      return { success: true, redirectTo };
    },
    [fetchProfile]
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
      // Key MUST match the `raw_user_meta_data ->> 'role'` read in
      // public.handle_new_user(). The trigger already forces role='student'
      // for self-signup without an invitation_id, so sending this is purely
      // informational for the server-side validator.
      if (requestedRole) metadata.role = requestedRole;

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
      signUp,
      signOut,
      resetPassword,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
