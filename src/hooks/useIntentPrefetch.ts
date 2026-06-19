import { useCallback, useRef } from "react";

/**
 * Prefetch-on-intent (spec: dashboard-and-ux-performance, Req 9).
 *
 * Returns a factory that builds `onMouseEnter` / `onFocus` handlers for a
 * navigation target. On a pointer that truly hovers (desktop), the first
 * hover/focus warms the target (route chunk + optionally its primary query) so
 * the JS/data are ready before the click. On touch devices hover ≠ intent, so
 * `matchMedia('(hover: hover)')` gates it off there (Req 9.2). Each target runs
 * at most once per mount (dedupe), and any failure is a silent no-op so the
 * click always still works (Req 9.3).
 *
 * Usage:
 * ```tsx
 * const getIntentHandlers = useIntentPrefetch();
 * <NavLink {...getIntentHandlers(item.to, () => prefetchRoute(item.to))} />
 * ```
 */
export const useIntentPrefetch = () => {
  // `(hover: hover)` is resolved lazily on first intent and cached. null = unknown.
  const canHoverRef = useRef<boolean | null>(null);
  // Targets already warmed this mount — prevents repeat work on re-hover.
  const warmedRef = useRef<Set<string>>(new Set());

  const supportsHover = (): boolean => {
    if (canHoverRef.current !== null) return canHoverRef.current;
    const ok =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(hover: hover)").matches;
    canHoverRef.current = ok;
    return ok;
  };

  return useCallback((key: string, prefetch: () => void | Promise<unknown>) => {
    const run = () => {
      // No prefetch on touch (hover ≠ intent) and only once per target.
      if (!supportsHover()) return;
      if (warmedRef.current.has(key)) return;
      warmedRef.current.add(key);
      try {
        // Swallow both sync throws and async rejections — prefetch is
        // best-effort; the navigation click must never depend on it.
        Promise.resolve(prefetch()).catch(() => {});
      } catch {
        /* no-op */
      }
    };
    return { onMouseEnter: run, onFocus: run };
  }, []);
};
