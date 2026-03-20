import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { logActivity } from '@/lib/activityLogger';

/**
 * Logs a `page_view` activity event whenever the student navigates to a new route.
 * Must be rendered inside a Router context. Only fires for students.
 */
export const usePageViewLogger = (): void => {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const prevPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!profile?.id || profile.role !== 'student') return;
    if (pathname === prevPathRef.current) return;

    prevPathRef.current = pathname;

    logActivity({
      student_id: profile.id,
      event_type: 'page_view',
      metadata: { path: pathname },
    });
  }, [pathname, profile?.id, profile?.role]);
};
