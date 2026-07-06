import { useEffect, useRef, useState } from "react";

interface UseInViewportOptions {
  /**
   * Margin around the root that expands the trigger area, so a section can begin
   * loading just before it scrolls into view. Defaults to "200px".
   */
  rootMargin?: string;
  /** Intersection ratio(s) at which the callback fires. Defaults to 0. */
  threshold?: number | number[];
  /**
   * Once the element has entered the viewport, stay `true` and stop observing.
   * Defaults to true — the intended use is one-shot gating of a section's data
   * hooks, which should not unload when scrolled away.
   */
  once?: boolean;
}

/**
 * Observe an element and report when it enters the viewport (Option J, Phase 1).
 *
 * Use it to defer mounting a section's data hooks until the user actually
 * scrolls the section into view, replacing blind time-based deferral (a fixed
 * timer fires every deferred query at once regardless of whether the section is
 * even on screen; viewport-gating fires them only when needed, which shrinks the
 * initial request burst on a constrained database).
 *
 * SSR-safe and degrades gracefully: if `IntersectionObserver` is unavailable
 * (older browsers, or a jsdom without a polyfill) it starts revealed so content
 * is never withheld; on the server it starts hidden and the client effect takes
 * over after hydration.
 */
export const useInViewport = <T extends Element = HTMLDivElement>(
  options: UseInViewportOptions = {}
): { ref: React.RefObject<T>; inView: boolean } => {
  const { rootMargin = "200px", threshold = 0, once = true } = options;
  const ref = useRef<T>(null);

  // Lazy initial state (computed here, not via setState in the effect, to avoid
  // a cascading-render lint violation): reveal immediately when there is no
  // IntersectionObserver to observe with; stay hidden during server render.
  const [inView, setInView] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return typeof IntersectionObserver === "undefined";
  });

  useEffect(() => {
    // Already resolved and we only care once — nothing left to observe.
    if (inView && once) return;

    const el = ref.current;
    if (!el) return;
    // No observer available — the lazy initializer already revealed us.
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          setInView(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setInView(false);
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [inView, once, rootMargin, threshold]);

  return { ref, inView };
};
