/**
 * View Transitions wrapper (spec: dashboard-and-ux-performance, Req 11).
 *
 * Wraps an imperative state/section swap in `document.startViewTransition` when
 * the browser supports it AND the user has not requested reduced motion. In any
 * other case it runs the update synchronously, so the swap is always correct and
 * the View Transition is pure progressive enhancement (Req 11.2 fallback).
 *
 * For route-level navigation the React Router `viewTransition` prop is used
 * instead (declarative); this helper is for component-driven swaps (tabs, view
 * toggles). Reduced motion is gated here in JS AND via the `::view-transition-*`
 * `prefers-reduced-motion` rule in `index.css`, so both code paths are covered.
 */

type StartViewTransition = (callback: () => void) => {
  finished?: Promise<void>;
};

/** True when the user asked the OS/browser to minimise motion. */
export const prefersReducedMotion = (): boolean =>
  typeof window !== "undefined" &&
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Runs `update` inside a View Transition when supported and motion is allowed;
 * otherwise runs it synchronously. Never throws on account of the transition.
 */
export const withViewTransition = (update: () => void): void => {
  const doc =
    typeof document !== "undefined"
      ? (document as Document & {
          startViewTransition?: StartViewTransition;
        })
      : undefined;

  if (
    !doc ||
    typeof doc.startViewTransition !== "function" ||
    prefersReducedMotion()
  ) {
    update();
    return;
  }

  try {
    doc.startViewTransition(() => {
      update();
    });
  } catch {
    // If the transition API throws for any reason, the swap must still happen.
    update();
  }
};
