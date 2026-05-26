import { useEffect, useState } from "react";

/**
 * Returns true after `delayMs` milliseconds have passed since mount.
 * Use this to gate non-critical TanStack Query hooks behind first paint,
 * so above-the-fold content renders quickly and below-the-fold hooks
 * fire after the user can already see something.
 *
 * Pattern:
 *   const ready = useDeferredMount(500);
 *   const { data } = useExpensiveHook(id, { enabled: ready });
 *
 * SSR-safe (returns false during server render).
 *
 * The default 500ms is chosen to:
 * - Give the browser time to paint the critical KPIs
 * - Stay well under the 1s threshold where users notice "loading still going"
 * - Match React 18's automatic batching window
 */
export const useDeferredMount = (delayMs = 500): boolean => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Use requestIdleCallback when available so we don't block the main thread
    const ric =
      typeof window !== "undefined" &&
      "requestIdleCallback" in window
        ? window.requestIdleCallback
        : null;

    if (ric) {
      const handle = ric(() => setReady(true), { timeout: delayMs });
      return () => {
        if ("cancelIdleCallback" in window) {
          window.cancelIdleCallback(handle);
        }
      };
    }

    // Fallback to setTimeout
    const timer = setTimeout(() => setReady(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return ready;
};
