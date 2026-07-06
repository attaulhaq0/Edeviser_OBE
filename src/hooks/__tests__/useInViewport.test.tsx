import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { useInViewport } from "../useInViewport";

// ---------------------------------------------------------------------------
// Mock IntersectionObserver (jsdom does not implement it)
// ---------------------------------------------------------------------------
let ioCallback: IntersectionObserverCallback | null = null;
const observe = vi.fn();
const disconnect = vi.fn();

class MockIntersectionObserver implements IntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds: ReadonlyArray<number> = [];
  constructor(cb: IntersectionObserverCallback) {
    ioCallback = cb;
  }
  observe = observe;
  disconnect = disconnect;
  unobserve = vi.fn();
  takeRecords = () => [];
}

const trigger = (isIntersecting: boolean) => {
  act(() => {
    ioCallback?.(
      [{ isIntersecting } as IntersectionObserverEntry],
      {} as IntersectionObserver
    );
  });
};

// Harness records `inView` across every render so we can assert the latest value.
const renderHarness = () => {
  const states: boolean[] = [];
  const Cmp = () => {
    const { ref, inView } = useInViewport<HTMLDivElement>();
    states.push(inView);
    return <div ref={ref} data-testid="target" />;
  };
  render(<Cmp />);
  return states;
};

describe("useInViewport", () => {
  beforeEach(() => {
    ioCallback = null;
    observe.mockClear();
    disconnect.mockClear();
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts not-in-view and observes the element", () => {
    const states = renderHarness();
    expect(states[0]).toBe(false);
    expect(observe).toHaveBeenCalledTimes(1);
  });

  it("reports in-view once the element intersects, then disconnects (once)", () => {
    const states = renderHarness();
    expect(states[states.length - 1]).toBe(false);

    trigger(true);

    expect(states[states.length - 1]).toBe(true);
    expect(disconnect).toHaveBeenCalled();
  });

  it("stays not-in-view while the element is not intersecting", () => {
    const states = renderHarness();
    trigger(false);
    expect(states[states.length - 1]).toBe(false);
  });

  it("reveals immediately when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const states = renderHarness();
    expect(states[states.length - 1]).toBe(true);
  });
});
