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
import {
  readCachedProfile,
  writeCachedProfile,
  clearCachedProfile,
  isProfileFresh,
} from "@/lib/profileCache";
import { clearCachedDashboard } from "@/lib/dashboardCache";

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

// ---------------------------------------------------------------------------
// Hydrate the user's language preference into i18n (fire-and-forget). Kept at
// module scope so both the cache-hydration and network-revalidation paths in
// syncSession can reuse it without adding hook dependencies.
// ---------------------------------------------------------------------------
const applyProfileLanguage = (profile: Profile | null): void => {
  if (profile?.language_preference) {
    i18n.changeLanguage(profile.language_preference).catch(() => {
      // Never block session hydration on i18n.
    });
  }
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
  /** Re-fetch the profile from the database and update the cached state. */
  refetchProfile: () => Promise<void>;
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

  // `INITIAL_SESSION` is normally emitted as soon as the listener subscribes.
  // A direct route load must still settle when that event is delayed or missed,
  // otherwise RouteGuard can remain on its spinner indefinitely.
  const initialSessionResolved = useRef(false);
  // Tracks the currently-synced user id so a TOKEN_REFRESHED for the SAME user
  // can skip the redundant profile SELECT (spec: dashboard-and-ux-performance,
  // Req 8.1). A token rotation does not change the profile, so re-fetching it on
  // every refresh is a pure round-trip cost.
  const currentUserIdRef = useRef<string | null>(null);

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
        currentUserIdRef.current = null;
        // No authenticated session — drop any cached profile/dashboard so it
        // can never be hydrated for an unauthenticated (or subsequent) user.
        clearCachedProfile();
        clearCachedDashboard();
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      const uid = session.user.id;
      currentUserIdRef.current = uid;
      setUser(session.user);

      // Shell-first hydration: if a cached profile exists for THIS user, apply
      // it immediately so RouteGuard can resolve the role and the app shell
      // paints without waiting on the network. The cache is non-authoritative
      // UI hydration only — RLS remains the source of truth server-side — and
      // it is identity-guarded so one user can never hydrate another's data.
      const cached = readCachedProfile(uid);
      if (cached) {
        setProfile(cached.profile);
        applyProfileLanguage(cached.profile);
        setIsLoading(false);

        // Freshly cached (e.g. the profiles SELECT that signIn just ran) — skip
        // the redundant refetch entirely. This collapses the interactive-login
        // double fetch (signIn fetch + SIGNED_IN event).
        if (isProfileFresh(cached.cachedAt)) return;

        // Stale cache — revalidate in the background without blocking paint.
        void (async () => {
          const fresh = await fetchProfile(uid);
          // Ignore if the user changed while this was in flight.
          if (currentUserIdRef.current !== uid) return;
          if (fresh) {
            setProfile(fresh);
            writeCachedProfile(uid, fresh);
            applyProfileLanguage(fresh);
          }
        })();
        return;
      }

      // Cache miss (first load on this device): fetch before revealing the
      // route so the guard resolves the correct role on the very first paint.
      const userProfile = await fetchProfile(uid);
      if (currentUserIdRef.current !== uid) return;
      setProfile(userProfile);
      if (userProfile) writeCachedProfile(uid, userProfile);
      applyProfileLanguage(userProfile);
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
    let mounted = true;
    const resolveInitialSession = (session: Session | null) => {
      if (initialSessionResolved.current) return;
      initialSessionResolved.current = true;
      void syncSession(session);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      switch (event) {
        case "SIGNED_OUT":
          // Explicitly clear state on sign-out (session expiry or manual). Also
          // drop the cached profile + dashboard so the next user on this device
          // can never hydrate the previous user's data (cross-user no-leak).
          clearCachedProfile();
          clearCachedDashboard();
          currentUserIdRef.current = null;
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          break;

        case "TOKEN_REFRESHED":
          // Req 8.1: a token rotation for the SAME user does not change the
          // profile, so skip the redundant profile SELECT — just adopt the
          // refreshed session user. Falls through to a full sync only when the
          // user id actually changed (or no profile was synced yet).
          if (session?.user && session.user.id === currentUserIdRef.current) {
            setUser(session.user);
            setIsLoading(false);
            break;
          }
          syncSession(session);
          break;

        case "SIGNED_IN":
          // A fresh interactive sign-in should always hydrate immediately.
          syncSession(session);
          break;

        case "INITIAL_SESSION":
          // The subscription is preferred because it also handles post-redirect
          // sessions. `getSession` below is a guarded fallback for direct loads.
          resolveInitialSession(session);
          break;

        default:
          // Handle any other events (USER_UPDATED, PASSWORD_RECOVERY, etc.)
          syncSession(session);
          break;
      }
    });

    // `INITIAL_SESSION` is Supabase's normal, authoritative cold-load path.
    // Give it a short head start before falling back to the storage-backed
    // read. This preserves the single profile query on a healthy cold load,
    // while still releasing RouteGuard if an embedded/Strict-Mode auth client
    // delays or misses the initial event.
    const fallbackTimer = window.setTimeout(() => {
      if (!mounted || initialSessionResolved.current) return;
      void supabase.auth
        .getSession()
        .then(({ data, error }) => {
          if (!mounted || initialSessionResolved.current) return;
          if (error) {
            setIsLoading(false);
            return;
          }
          resolveInitialSession(data.session);
        })
        .catch(() => {
          if (mounted && !initialSessionResolved.current) {
            initialSessionResolved.current = true;
            setIsLoading(false);
          }
        });
    }, 250);

    return () => {
      mounted = false;
      window.clearTimeout(fallbackTimer);
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
      currentUserIdRef.current = data.user.id;
      setUser(data.user);
      setProfile(userProfile);
      // Do not depend on the asynchronous SIGNED_IN subscription callback to
      // release RouteGuard. The profile request above has already completed, so
      // leaving this true can strand a successful local sign-in on its loading
      // spinner when that callback is delayed or coalesced by the auth client.
      setIsLoading(false);
      // Seed the shell-first cache so the SIGNED_IN event that supabase-js
      // emits right after this hydrates from the fresh cache instead of firing
      // a second `profiles` SELECT for the same user.
      if (userProfile) writeCachedProfile(data.user.id, userProfile);

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
        // fed from real activity. Each step is independently guarded so one
        // failure can neither block the login nor the others.
        // (The broken midnight `{type:'midnight_reset'}` cron is left disconnected
        // as a documented no-op; the streak now advances from this per-user login.)
        //
        // SEQUENCED, not concurrent (root-cause fix, 2026-07): these 3 steps used
        // to fire in parallel (`.catch()` fire-and-forget, no shared chain), each
        // independently reading/writing overlapping tables (`habit_logs`,
        // `student_gamification`, `profiles`) for the SAME student at the SAME
        // instant. Confirmed live in production HAR captures: this concurrent
        // burst is what triggers the `habit_logs` write to exceed the
        // `authenticated` role's 8s `statement_timeout` (57014), after which
        // ~12 unrelated requests in the same window fail with `25P02 current
        // transaction is aborted` for several seconds — a connection-pool-level
        // cascade, not a problem with any single query. None of these 3 steps
        // are on the login critical path (the whole chain stays fire-and-forget
        // — `signIn` already returned above), so running them one-at-a-time
        // costs nothing in perceived speed while cutting this login's peak
        // concurrent DB load to a third of what it was.
        const todayUtc = new Date().toISOString().split("T")[0] as string;

        void (async () => {
          // 1. Record the login habit FIRST (before the perfect-day check) so
          //    awardPerfectDayIfComplete can observe it when reading today's
          //    habit_logs. Idempotent on (student_id, habit_type, date) — a
          //    second login same day is a no-op.
          try {
            const { error } = await supabase.from("habit_logs").upsert(
              {
                student_id: studentId,
                habit_type: "login",
                date: todayUtc,
                completed_at: new Date().toISOString(),
              },
              { onConflict: "student_id,habit_type,date" }
            );
            if (error) {
              console.error("Failed to record login habit:", error.message);
            } else {
              // Perfect-day check runs after the login habit is recorded.
              // awardPerfectDayIfComplete swallows its own errors.
              await awardPerfectDayIfComplete(studentId);
            }
          } catch {
            // Never let a background engagement step throw into signIn's caller.
          }

          // 2. process-streak is idempotent same-day (dayDiff === 0 is a no-op)
          //    and authorizes the student's own JWT.
          try {
            await supabase.functions.invoke("process-streak", {
              body: { student_id: studentId },
            });
          } catch {
            // non-fatal
          }

          // 3. award-xp enforces the canonical 10 XP and a `login:{id}:{date}`
          //    idempotent reference server-side; the client-supplied amount is
          //    advisory.
          try {
            await supabase.functions.invoke("award-xp", {
              body: { student_id: studentId, source: "login", xp_amount: 10 },
            });
          } catch {
            // non-fatal
          }
        })();
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
        currentUserIdRef.current = data.user.id;
        setUser(data.user);
        setProfile(userProfile);
        if (userProfile) writeCachedProfile(data.user.id, userProfile);

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
    clearCachedProfile();
    clearCachedDashboard();
    currentUserIdRef.current = null;
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

  // -------------------------------------------------------------------
  // refetchProfile — callable by consumers to force-refresh after mutations
  // that change fields the AuthProvider holds (e.g. onboarding_completed).
  // -------------------------------------------------------------------
  const refetchProfile = useCallback(async () => {
    const uid = currentUserIdRef.current;
    if (!uid) return;
    const fresh = await fetchProfile(uid);
    if (currentUserIdRef.current !== uid) return; // user changed mid-flight
    if (fresh) {
      setProfile(fresh);
      writeCachedProfile(uid, fresh);
    }
  }, [fetchProfile]);

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
      refetchProfile,
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
      refetchProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
