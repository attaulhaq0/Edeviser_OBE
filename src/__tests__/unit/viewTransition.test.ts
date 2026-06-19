// @vitest-environment happy-dom
// =============================================================================
// viewTransition.test.ts
// Feature: dashboard-and-ux-performance, Req 11 (View Transitions).
// -----------------------------------------------------------------------------
// Verifies withViewTransition:
//   - uses document.startViewTransition when supported + motion allowed (11.1)
//   - falls back to a synchronous update when the API is missing (11.2)
//   - runs synchronously (no transition) under prefers-reduced-motion (11.3)
//   - still applies the update if startViewTransition throws (never breaks UI)
// In every case the update runs exactly once.
// =============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { withViewTransition } from "@/lib/viewTransition";

const setReducedMotion = (reduce: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(prefers-reduced-motion: reduce)" ? reduce : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
};

describe("withViewTransition (dashboard-and-ux-performance Req 11)", () => {
  beforeEach(() => {
    setReducedMotion(false);
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete (document as { startViewTransition?: unknown }).startViewTransition;
  });

  it("wraps the update in startViewTransition when supported and motion is allowed", () => {
    const svt = vi.fn((cb: () => void) => {
      cb();
      return { finished: Promise.resolve() };
    });
    (document as { startViewTransition?: unknown }).startViewTransition = svt;

    const update = vi.fn();
    withViewTransition(update);

    expect(svt).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("runs synchronously (no transition) under prefers-reduced-motion", () => {
    setReducedMotion(true);
    const svt = vi.fn();
    (document as { startViewTransition?: unknown }).startViewTransition = svt;

    const update = vi.fn();
    withViewTransition(update);

    expect(svt).not.toHaveBeenCalled();
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("falls back to a direct update when the API is unsupported", () => {
    // No startViewTransition on document (deleted in beforeEach).
    const update = vi.fn();
    withViewTransition(update);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it("still applies the update if startViewTransition throws", () => {
    (document as { startViewTransition?: unknown }).startViewTransition = vi
      .fn()
      .mockImplementation(() => {
        throw new Error("boom");
      });

    const update = vi.fn();
    expect(() => withViewTransition(update)).not.toThrow();
    expect(update).toHaveBeenCalledTimes(1);
  });
});
