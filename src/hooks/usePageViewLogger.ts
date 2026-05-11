import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { logActivity } from "@/lib/activityLogger";

/**
 * Logs a `page_view` activity event whenever the student navigates to a new route.
 * Includes `duration_seconds` metadata tracking how long the previous page was viewed.
 * Must be rendered inside a Router context. Only fires for students.
 */
export const usePageViewLogger = (): void => {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const prevPathRef = useRef<string | null>(null);
  const pageEnteredAtRef = useRef<number>(0);

  useEffect(() => {
    if (!profile?.id || profile.role !== "student") return;
    if (pathname === prevPathRef.current) return;

    const now = Date.now();

    // Log the previous page with its duration
    if (prevPathRef.current !== null && pageEnteredAtRef.current > 0) {
      const durationSeconds = Math.round(
        (now - pageEnteredAtRef.current) / 1000
      );
      logActivity({
        student_id: profile.id,
        event_type: "page_view",
        metadata: {
          path: prevPathRef.current,
          duration_seconds: durationSeconds,
        },
      });
    }

    prevPathRef.current = pathname;
    pageEnteredAtRef.current = now;
  }, [pathname, profile?.id, profile?.role]);
};
