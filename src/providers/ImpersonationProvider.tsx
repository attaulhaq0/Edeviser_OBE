// Task 88.1: Impersonation context provider
// 30-minute auto-expire, read-only mode flag for blocking mutations

import { createContext, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

const IMPERSONATION_DURATION_MS = 30 * 60 * 1000; // 30 minutes

export interface ImpersonatedUser {
  id: string;
  full_name: string;
  role: string;
}

export interface ImpersonationContextValue {
  isImpersonating: boolean;
  impersonatedUser: ImpersonatedUser | null;
  timeRemaining: number; // seconds
  isReadOnly: boolean;
  startImpersonation: (user: ImpersonatedUser) => void;
  stopImpersonation: () => void;
}

// eslint-disable-next-line react-refresh/only-export-components
export const ImpersonationContext = createContext<ImpersonationContextValue>({
  isImpersonating: false,
  impersonatedUser: null,
  timeRemaining: 0,
  isReadOnly: false,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

export const ImpersonationProvider = ({ children }: { children: ReactNode }) => {
  const [impersonatedUser, setImpersonatedUser] = useState<ImpersonatedUser | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const expiryRef = useRef<number>(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopImpersonation = useCallback(() => {
    clearTimer();
    setImpersonatedUser(null);
    setTimeRemaining(0);
    expiryRef.current = 0;
  }, [clearTimer]);

  const startImpersonation = useCallback(
    (user: ImpersonatedUser) => {
      clearTimer();
      setImpersonatedUser(user);
      expiryRef.current = Date.now() + IMPERSONATION_DURATION_MS;
      setTimeRemaining(Math.ceil(IMPERSONATION_DURATION_MS / 1000));

      timerRef.current = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((expiryRef.current - Date.now()) / 1000));
        setTimeRemaining(remaining);
        if (remaining <= 0) {
          stopImpersonation();
        }
      }, 1000);
    },
    [clearTimer, stopImpersonation],
  );

  // Cleanup on unmount
  useEffect(() => clearTimer, [clearTimer]);

  const isImpersonating = impersonatedUser !== null;

  const value = useMemo<ImpersonationContextValue>(
    () => ({
      isImpersonating,
      impersonatedUser,
      timeRemaining,
      isReadOnly: isImpersonating,
      startImpersonation,
      stopImpersonation,
    }),
    [isImpersonating, impersonatedUser, timeRemaining, startImpersonation, stopImpersonation],
  );

  return (
    <ImpersonationContext.Provider value={value}>
      {children}
    </ImpersonationContext.Provider>
  );
};
