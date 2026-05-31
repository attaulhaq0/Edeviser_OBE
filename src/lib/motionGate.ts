// =============================================================================
// motionGate — shared reduced-motion gating for Framer Motion (R31.2, R31.2a)
// =============================================================================
//
// Student-facing surfaces use Framer Motion for entrance/transition animations.
// Requirement 31 mandates that, while the OS/browser signals a reduced-motion
// preference, NEW animations are suppressed (R31.2) — and specifically that new
// animations are suppressed *while any already-running animation is allowed to
// complete naturally* rather than being snapped mid-flight (R31.2a). The gating
// must live in JavaScript-driven behaviour, not only CSS (R31.3).
//
// `framer-motion`'s `<MotionConfig reducedMotion="user">` (mounted once in
// App.tsx) already reduces transform/layout animations globally. This helper
// complements that by giving components a single, consistent way to express
// "this is a NEW entrance animation — start it in its final visual state when
// the user prefers reduced motion" without each component re-deriving the logic.
//
// The contract is intentionally small and pure-per-render:
//   - `prefersReducedMotion` — the resolved boolean preference.
//   - `enter(initial, animate)` — returns the `initial` prop a `motion.*` should
//     use: the supplied `initial` normally, or the `animate` target when reduced
//     motion is preferred (so the element appears already-settled — no entrance).
//   - `transition(transition)` — returns an instant transition under reduced
//     motion, or the supplied transition otherwise.
//
// Why this satisfies R31.2a: gating only the `initial`/`transition` of *newly
// mounted* nodes means an animation that is already in-flight when the
// preference is read is never interrupted — we only prevent the next entrance
// from animating. We never call `stop()` or force a node to its end value
// mid-animation.
// =============================================================================

import {
  useReducedMotion,
  type TargetAndTransition,
  type Transition,
} from "framer-motion";

/** A Framer Motion target object usable as an `initial`/`animate` value. */
export type MotionTarget = TargetAndTransition;

export interface GatedMotion {
  /**
   * Resolved reduced-motion preference for the current environment.
   * `true` when the user has requested reduced motion.
   */
  readonly prefersReducedMotion: boolean;

  /**
   * Resolve the `initial` prop for a NEW entrance animation.
   *
   * - Normal motion: returns `initialValue` so the element animates in.
   * - Reduced motion: returns `animateValue` (the settled, final state) so the
   *   element is rendered already in place with no entrance animation (R31.2).
   *
   * @param initialValue - The off-screen / pre-animation state.
   * @param animateValue - The final, settled state the element animates to.
   */
  enter(initialValue: MotionTarget, animateValue: MotionTarget): MotionTarget;

  /**
   * Resolve a transition for a NEW animation. Under reduced motion the
   * transition is made instant (`duration: 0`) so no movement is perceived;
   * otherwise the supplied transition is returned unchanged. When no transition
   * is supplied, returns `undefined` (normal) or an instant transition (reduced).
   */
  transition(transition?: Transition): Transition | undefined;
}

const INSTANT_TRANSITION: Transition = { duration: 0 };

/**
 * Hook returning reduced-motion-aware helpers for Framer Motion components.
 *
 * Usage:
 * ```tsx
 * const motionGate = useGatedMotion();
 * <motion.div
 *   initial={motionGate.enter({ opacity: 0, y: 8 }, { opacity: 1, y: 0 })}
 *   animate={{ opacity: 1, y: 0 }}
 *   transition={motionGate.transition({ duration: 0.3 })}
 * />
 * ```
 *
 * `useReducedMotion()` returns `null` until resolved (and in non-DOM
 * environments); we coerce that to `false` so behaviour is well-defined and
 * animations remain enabled by default.
 */
export const useGatedMotion = (): GatedMotion => {
  const prefersReducedMotion = useReducedMotion() ?? false;

  return {
    prefersReducedMotion,
    enter: (initialValue, animateValue) =>
      prefersReducedMotion ? animateValue : initialValue,
    transition: (transition) =>
      prefersReducedMotion ? INSTANT_TRANSITION : transition,
  };
};
