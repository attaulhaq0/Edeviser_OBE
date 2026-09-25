// @vitest-environment happy-dom
import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";
import {
  AccessibilityPreferencesContext,
  type AccessibilityPreferencesContextValue,
} from "@/providers/AccessibilityPreferencesContext";
import HeroCarousel from "@/design-system/patterns/HeroCarousel";

const slides = [
  <button key="first" type="button">
    First action
  </button>,
  <button key="second" type="button">
    Second action
  </button>,
];

afterEach(async () => {
  vi.useRealTimers();
  await act(async () => {
    await i18n.changeLanguage("en");
  });
});

describe("HeroCarousel shared contract", () => {
  it("keeps one slide visible without carousel controls or automatic rotation", () => {
    render(<HeroCarousel slides={[slides[0]]} />);
    expect(
      screen.getByRole("region", { name: "Highlights" })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Previous slide" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Pause automatic slides" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "First action" })
    ).toBeInTheDocument();
  });

  it("makes inactive actions inert, uses 44px control classes and announces manual navigation", async () => {
    const user = userEvent.setup();
    render(<HeroCarousel slides={slides} theme="light" />);
    const first = screen.getByRole("group", {
      name: "1 of 2",
    }) as HTMLDivElement;
    const second = first.nextElementSibling as HTMLDivElement;
    const next = screen.getByRole("button", { name: "Next slide" });
    const previous = screen.getByRole("button", { name: "Previous slide" });
    const dot = screen.getByRole("button", { name: "Go to slide 2" });
    for (const target of [
      next,
      previous,
      dot,
      screen.getByRole("button", { name: "Pause automatic slides" }),
    ]) {
      expect(target).toHaveClass("h-11", "w-11");
    }
    expect(first.inert).toBe(false);
    expect(second.inert).toBe(true);
    expect(second).toHaveAttribute("aria-hidden", "true");
    await user.click(next);
    expect(first.inert).toBe(true);
    expect(second.inert).toBe(false);
    expect(dot).toHaveAttribute("aria-current", "true");
    expect(first.parentElement).toHaveStyle({ transform: "translateX(-100%)" });
    expect(screen.getByRole("status")).toHaveTextContent("2 of 2");
    expect(
      screen.getByRole("button", { name: "Resume automatic slides" })
    ).toBeInTheDocument();
    await user.click(previous);
    expect(first.inert).toBe(false);
    expect(second.inert).toBe(true);
  });

  it("keeps the inverse dark control hover behind the named component token", () => {
    render(<HeroCarousel slides={slides} theme="dark" />);
    const dot = screen.getByRole("button", { name: "Go to slide 2" });
    expect(dot).toHaveClass(
      "hover:bg-[var(--hero-inverse-control-hover)]",
      "dark:hover:bg-[var(--hero-inverse-control-hover)]"
    );
    expect(dot).not.toHaveClass("hover:bg-white/20");
  });
  it("holds keyboard focus on a visible control when a focused slide is replaced", () => {
    render(<HeroCarousel slides={slides} />);
    const action = screen.getByRole("button", { name: "First action" });
    action.focus();
    const next = screen.getByRole("button", { name: "Next slide" });
    fireEvent.click(next);
    expect(next).toHaveFocus();
    expect((action.parentElement as HTMLDivElement).inert).toBe(true);
    expect(
      screen.getByRole("button", { name: "Second action" })
    ).toBeInTheDocument();
  });

  it("mirrors the native track and semantic swipe in Arabic without intercepting vertical scrolling", async () => {
    await act(async () => {
      await i18n.changeLanguage("ar");
    });
    render(<HeroCarousel slides={slides} />);
    const root = screen.getByRole("region", { name: "أبرز الأخبار" });
    const first = screen.getByRole("group", { name: "1 من 2" });
    const track = first.parentElement;
    expect(root).toHaveAttribute("dir", "rtl");
    expect(track).toHaveAttribute("dir", "rtl");
    expect(
      screen.getByRole("button", { name: "الشريحة التالية" })
    ).toHaveTextContent("‹");
    fireEvent.touchStart(track!, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(track!, {
      changedTouches: [{ clientX: 80, clientY: 110 }],
    });
    expect(track).toHaveStyle({ transform: "translateX(0%)" });
    fireEvent.touchStart(track!, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchEnd(track!, {
      changedTouches: [{ clientX: 85, clientY: 15 }],
    });
    expect(track).toHaveStyle({ transform: "translateX(100%)" });
    expect(screen.getByRole("status")).toHaveTextContent("2 من 2");
    fireEvent.touchStart(track!, { touches: [{ clientX: 85, clientY: 15 }] });
    fireEvent.touchCancel(track!);
    fireEvent.touchEnd(track!, {
      changedTouches: [{ clientX: 5, clientY: 15 }],
    });
    expect(track).toHaveStyle({ transform: "translateX(100%)" });
  });

  it("stops after user interaction and only restarts on the explicit play control", () => {
    vi.useFakeTimers();
    render(<HeroCarousel slides={slides} autoAdvanceMs={5000} />);
    const first = screen.getByRole("group", { name: "1 of 2" });
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(first.parentElement).toHaveStyle({ transform: "translateX(-100%)" });
    expect(screen.getByRole("status")).toHaveTextContent(""); // No chatter for timer-driven changes.
    fireEvent.click(screen.getByRole("button", { name: "Previous slide" }));
    act(() => {
      vi.advanceTimersByTime(15000);
    });
    expect(first.parentElement).toHaveStyle({ transform: "translateX(-0%)" });
    fireEvent.click(
      screen.getByRole("button", { name: "Resume automatic slides" })
    );
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(first.parentElement).toHaveStyle({ transform: "translateX(-100%)" });
  });

  it("disables auto-rotation for stored reduction and invalid intervals without disabling manual controls", () => {
    vi.useFakeTimers();
    const context = {
      controls: { effective: { reduced_animations: true } },
    } as unknown as AccessibilityPreferencesContextValue;
    const { rerender } = render(
      <AccessibilityPreferencesContext.Provider value={context}>
        <HeroCarousel slides={slides} autoAdvanceMs={5000} />
      </AccessibilityPreferencesContext.Provider>
    );
    const first = screen.getByRole("group", { name: "1 of 2" });
    act(() => {
      vi.advanceTimersByTime(25000);
    });
    expect(first.parentElement).toHaveStyle({
      transform: "translateX(-0%)",
      transitionDuration: "0ms",
    });
    expect(
      screen.queryByRole("button", { name: "Pause automatic slides" })
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Next slide" }));
    expect(first.parentElement).toHaveStyle({ transform: "translateX(-100%)" });
    rerender(<HeroCarousel slides={slides} autoAdvanceMs={Number.NaN} />);
    expect(
      screen.queryByRole("button", { name: "Pause automatic slides" })
    ).not.toBeInTheDocument();
  });
  it("keeps changing slide counts within the current owner and clears unused chrome", () => {
    const { rerender } = render(<HeroCarousel slides={[slides[0]]} />);
    expect(
      screen.queryByRole("button", { name: "Next slide" })
    ).not.toBeInTheDocument();
    rerender(<HeroCarousel slides={slides} />);
    fireEvent.click(screen.getByRole("button", { name: "Go to slide 2" }));
    expect(
      screen.getByRole("button", { name: "Second action" })
    ).toBeInTheDocument();
    rerender(<HeroCarousel slides={[slides[0]]} />);
    expect(
      screen.queryByRole("button", { name: "Next slide" })
    ).not.toBeInTheDocument();
    expect(
      (screen.getByRole("group", { name: "1 of 1" }) as HTMLDivElement).inert
    ).toBe(false);
    rerender(<HeroCarousel slides={slides} />);
    expect(screen.getByRole("group", { name: "1 of 2" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Go to slide 1" })
    ).toHaveAttribute("aria-current", "true");
  });

  it("suspends rotation while the document is hidden and resumes only when visible", () => {
    vi.useFakeTimers();
    const original = Object.getOwnPropertyDescriptor(
      document,
      "visibilityState"
    );
    try {
      render(<HeroCarousel slides={slides} autoAdvanceMs={5000} />);
      const first = screen.getByRole("group", { name: "1 of 2" });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "hidden",
      });
      fireEvent(document, new Event("visibilitychange"));
      act(() => {
        vi.advanceTimersByTime(15000);
      });
      expect(first.parentElement).toHaveStyle({ transform: "translateX(-0%)" });
      Object.defineProperty(document, "visibilityState", {
        configurable: true,
        value: "visible",
      });
      fireEvent(document, new Event("visibilitychange"));
      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(first.parentElement).toHaveStyle({
        transform: "translateX(-100%)",
      });
    } finally {
      if (original)
        Object.defineProperty(document, "visibilityState", original);
      else Reflect.deleteProperty(document, "visibilityState");
    }
  });
});
