// @vitest-environment happy-dom
// =============================================================================
// useIntentPrefetch.test.ts
// Feature: dashboard-and-ux-performance, Req 9 (prefetch on intent).
// -----------------------------------------------------------------------------
// Locks in the guard contract of the hover/focus prefetch handler:
//   - Req 9.1: hover/focus on a hover-capable (desktop) pointer warms the target.
//   - Req 9.2: NO prefetch on touch (matchMedia('(hover: hover)') === false).
//   - Req 9.3: failures are silent no-ops; targets warm at most once (dedupe).
// =============================================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIntentPrefetch } from "@/hooks/useIntentPrefetch";

const setHover = (matches: boolean) => {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query === "(hover: hover)" ? matches : false,
    media: query,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    onchange: null,
    dispatchEvent: vi.fn(),
  }));
};

describe("useIntentPrefetch (dashboard-and-ux-performance Req 9)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warms the target on hover (desktop) exactly once, then dedupes", () => {
    setHover(true);
    const prefetch = vi.fn();
    const { result } = renderHook(() => useIntentPrefetch());

    const handlers = result.current("/admin/users", prefetch);
    handlers.onMouseEnter();
    handlers.onFocus(); // same key → already warmed
    result.current("/admin/users", prefetch).onMouseEnter(); // rebuilt handler, same key

    expect(prefetch).toHaveBeenCalledTimes(1);
  });

  it("does NOT prefetch on a touch device (no hover capability)", () => {
    setHover(false);
    const prefetch = vi.fn();
    const { result } = renderHook(() => useIntentPrefetch());

    result.current("/admin/users", prefetch).onMouseEnter();
    result.current("/admin/users", prefetch).onFocus();

    expect(prefetch).not.toHaveBeenCalled();
  });

  it("warms distinct targets independently", () => {
    setHover(true);
    const prefetchA = vi.fn();
    const prefetchB = vi.fn();
    const { result } = renderHook(() => useIntentPrefetch());

    result.current("/admin/users", prefetchA).onMouseEnter();
    result.current("/admin/courses", prefetchB).onMouseEnter();

    expect(prefetchA).toHaveBeenCalledTimes(1);
    expect(prefetchB).toHaveBeenCalledTimes(1);
  });

  it("swallows synchronous throws and async rejections (never breaks the click)", async () => {
    setHover(true);
    const { result } = renderHook(() => useIntentPrefetch());

    const throwing = result.current("/a", () => {
      throw new Error("sync boom");
    });
    expect(() => throwing.onMouseEnter()).not.toThrow();

    const rejecting = result.current("/b", () =>
      Promise.reject(new Error("async boom"))
    );
    expect(() => rejecting.onMouseEnter()).not.toThrow();
    // Give the rejected promise a tick to ensure it is handled (no unhandled rejection).
    await Promise.resolve();
  });
});
