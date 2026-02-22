import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { AuthResult, Profile, UserRole } from '@/types/app';
import {
  isLocked,
  getRemainingLockTime,
  recordFailedAttempt,
  clearAttempts,
} from '@/lib/loginAttemptTracker';
import { logActivity } from '@/lib/activityLogger';

// ---------------------------------------------------------------------------
// Role → dashboard path mapping
// ---------------------------------------------------------------------------
const ROLE_DASHBOARD_MAP: Record<UserRole, string> = {
  admin: '/admin',
  coordinator: '/coordinator',
  teacher: '/teacher',
  student: '/student',
  parent: '/parent',
};

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
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

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
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch profile:', error.message);
      return null;
    }
    return data as Profile | null;
  }, []);

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
    [fetchProfile],
  );

  // -------------------------------------------------------------------
  // Bootstrap: restore persisted session + subscribe to auth changes
  // -------------------------------------------------------------------
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
        case 'SIGNED_OUT':
          // Explicitly clear state on sign-out (session expiry or manual)
          setUser(null);
          setProfile(null);
          setIsLoading(false);
          break;

        case 'TOKEN_REFRESHED':
        case 'SIGNED_IN':
        case 'INITIAL_SESSION':
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
      // Check lockout before attempting authentication
      if (isLocked(email)) {
        const remaining = getRemainingLockTime(email);
        const minutes = Math.ceil(remaining / 60);
        return {
          success: false,
          error: `Account is temporarily locked. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        recordFailedAttempt(email);

        // After recording, check if the account just got locked
        if (isLocked(email)) {
          return {
            success: false,
            error: 'Account is temporarily locked due to too many failed attempts. Please try again in 15 minutes.',
          };
        }

        // Generic message — don't reveal whether email or password was wrong (Req 1.3)
        return { success: false, error: 'Invalid email or password.' };
      }

      // Successful login — clear any tracked attempts
      clearAttempts(email);

      const userProfile = await fetchProfile(data.user.id);
      setUser(data.user);
      setProfile(userProfile);

      const redirectTo = userProfile?.role
        ? ROLE_DASHBOARD_MAP[userProfile.role]
        : '/login';

      // Fire-and-forget: log login activity for students (Req 41.1)
      if (userProfile?.role === 'student') {
        logActivity({ student_id: data.user.id, event_type: 'login' }).catch(() => {});
      }

      return { success: true, redirectTo };
    },
    [fetchProfile],
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
      signOut,
      resetPassword,
    }),
    [user, profile, role, institutionId, isLoading, signIn, signOut, resetPassword],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ---------------------------------------------------------------------------
// Hook — throws when used outside provider
// ---------------------------------------------------------------------------
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
