// @vitest-environment happy-dom
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useRecentActivityClock } from "@/features/student/hooks/useRecentActivityClock";

const visibility = Object.getOwnPropertyDescriptor(document, "visibilityState");
afterEach(() => {
  vi.useRealTimers();
  if (visibility)
    Object.defineProperty(document, "visibilityState", visibility);
  else Reflect.deleteProperty(document, "visibilityState");
});

describe("student recent activity display clock", () => {
  it("revisits cached presence on a 60-second tick, returns from a hidden tab and disposes listeners/timer", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-24T12:00:00.000Z"));
    const { result, unmount } = renderHook(() => useRecentActivityClock());
    const first = result.current;
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(result.current).toBe(first + 60_000);
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    const beforeReturn = result.current;
    vi.setSystemTime(new Date("2026-09-24T12:03:01.000Z"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    act(() => {
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(Date.parse("2026-09-24T12:03:01.000Z"));
    expect(result.current).toBeGreaterThan(beforeReturn);
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
