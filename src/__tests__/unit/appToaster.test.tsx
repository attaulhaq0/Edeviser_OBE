// @vitest-environment happy-dom
// Actual AppToaster -> generated primitive -> Sonner. Only preference hooks are
// isolated; no App import (offlineQueue.init), backend, CSS geometry or paint claim.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { toast } from "sonner";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import en from "@/locales/en/common.json";
import ar from "@/locales/ar/common.json";

const preferences = vi.hoisted(() => ({
  resolvedTheme: "light" as "light" | "dark",
  direction: "ltr" as "ltr" | "rtl",
}));
vi.mock("@/providers/ThemeProvider", () => ({
  useTheme: () => ({ theme: "system", resolvedTheme: preferences.resolvedTheme }),
}));
vi.mock("@/providers/LanguageProvider", () => ({
  useLanguage: () => ({ direction: preferences.direction }),
}));

import AppToaster from "@/components/shared/AppToaster";

async function mountToaster(language: "en" | "ar" = "en") {
  const i18n = createInstance();
  await i18n.use(initReactI18next).init({
    lng: language,
    fallbackLng: false,
    defaultNS: "common",
    resources: { en: { common: en }, ar: { common: ar } },
    interpolation: { escapeValue: false },
  });
  const view = render(<I18nextProvider i18n={i18n}><AppToaster /></I18nextProvider>);
  return { ...view, i18n };
}

beforeEach(() => {
  preferences.resolvedTheme = "light";
  preferences.direction = "ltr";
});

afterEach(async () => {
  act(() => { toast.dismiss(); });
  await waitFor(() => expect(document.querySelector("[data-sonner-toast]")).toBeNull());
  cleanup();
});

describe("AppToaster shared Sonner adoption", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const language of ["en", "ar"] as const) {
      it(`uses resolved ${theme} theme and real ${language} labels, replacing every generated important default`, async () => {
        preferences.resolvedTheme = theme;
        preferences.direction = language === "ar" ? "rtl" : "ltr";
        const copy = language === "ar" ? ar : en;
        await mountToaster(language);
        act(() => {
          toast("Adapter message", {
            description: "Owned description for the real Sonner node",
            duration: Infinity,
            action: { label: copy.buttons.save, onClick: vi.fn() },
            cancel: { label: copy.buttons.cancel, onClick: vi.fn() },
          });
        });
        await screen.findByText("Adapter message");
        const host = document.querySelector<HTMLOListElement>("[data-sonner-toaster]");
        expect(host).toHaveAttribute("data-sonner-theme", theme);
        expect(host).toHaveAttribute("dir", preferences.direction);
        expect(host).toHaveAttribute("data-x-position", language === "ar" ? "left" : "right");
        expect(host).toHaveAttribute("data-y-position", "bottom");
        expect(host).toHaveClass("app-toaster");
        expect(host?.className).not.toContain("132px");
        // Verify the actual native element's inline API contract. Happy DOM's
        // computed-style matcher cannot resolve the app's absent token sheet;
        // emitted CSS, resolved paint and offset geometry belong to Chromium.
        for (const [property, value] of [
          ["--normal-bg", "var(--popover)"],
          ["--normal-text", "var(--popover-foreground)"],
          ["--offset-bottom", "var(--app-toast-bottom)"],
          ["--mobile-offset-bottom", "var(--app-toast-bottom)"],
        ] as const) {
          expect(host?.style.getPropertyValue(property)).toBe(value);
        }
        expect(screen.getByRole("region", { name: `${copy.notifications} alt+T` })).toHaveAttribute("aria-live", "polite");
        expect(screen.getByRole("button", { name: copy.buttons.close })).toHaveClass("app-toast-close");
        const expectedClasses = [
          ["[data-sonner-toast]", "app-toast"],
          ["[data-title]", "app-toast-title"],
          ["[data-description]", "app-toast-description"],
          ["[data-action]", "app-toast-action"],
          ["[data-cancel]", "app-toast-cancel"],
        ] as const;
        for (const [selector, className] of expectedClasses) {
          const node = host?.querySelector(selector);
          expect(node).toHaveClass(className);
          expect(node?.className).not.toContain("!");
        }
        expect(host?.querySelector("[data-sonner-toast]")).toHaveAttribute("data-rich-colors", "false");
      });
    }
  }

  it("reacts to preference and locale changes while retaining the native toast identity", async () => {
    const view = await mountToaster();
    let toastId!: string | number;
    act(() => { toastId = toast("Survives preference changes", { duration: Infinity }); });
    await screen.findByText("Survives preference changes");
    preferences.resolvedTheme = "dark";
    preferences.direction = "rtl";
    await act(async () => { await view.i18n.changeLanguage("ar"); });
    view.rerender(<I18nextProvider i18n={view.i18n}><AppToaster /></I18nextProvider>);
    await waitFor(() => expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute("data-sonner-theme", "dark"));
    expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute("dir", "rtl");
    expect(document.querySelector("[data-sonner-toaster]")).toHaveAttribute("data-x-position", "left");
    expect(screen.getByText("Survives preference changes")).toBeInTheDocument();
    expect(toast.getToasts().find((item) => item.id === toastId)).toMatchObject({ title: "Survives preference changes" });
    expect(screen.getByRole("button", { name: ar.buttons.close })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: `${ar.notifications} alt+T` })).toBeInTheDocument();
  });

  it("keeps native action preventDefault and cancel callbacks", async () => {
    const action = vi.fn((event: React.MouseEvent<HTMLButtonElement>) => event.preventDefault());
    const cancel = vi.fn();
    await mountToaster();
    act(() => {
      toast("Callback contract", {
        duration: Infinity,
        action: { label: "Keep notification", onClick: action },
        cancel: { label: "Cancel notification", onClick: cancel },
      });
    });
    await screen.findByText("Callback contract");
    fireEvent.click(screen.getByRole("button", { name: "Keep notification" }));
    expect(action).toHaveBeenCalledTimes(1);
    expect(document.querySelector("[data-sonner-toast]")).toHaveAttribute("data-removed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Cancel notification" }));
    expect(cancel).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Callback contract")).not.toBeInTheDocument());
  });

  it("reserves touch pointers for native scrolling without intercepting mouse pointers or close clicks", async () => {
    const dismissed = vi.fn();
    await mountToaster();
    act(() => { toast("Input ownership", { duration: Infinity, onDismiss: dismissed }); });
    const title = await screen.findByText("Input ownership");
    // Happy DOM has no browser pointer-capture implementation. Spy only on this
    // real target's capture request; Chromium separately proves actual scrolling.
    const capture = vi.fn();
    title.setPointerCapture = capture;
    fireEvent.pointerDown(title, { pointerType: "touch", pointerId: 1, button: 0, clientX: 40, clientY: 60 });
    expect(capture).not.toHaveBeenCalled();
    expect(title.closest("[data-sonner-toast]")).toHaveAttribute("data-swiping", "false");
    fireEvent.pointerUp(title, { pointerType: "touch", pointerId: 1 });
    fireEvent.pointerDown(title, { pointerType: "mouse", pointerId: 2, button: 0, clientX: 40, clientY: 60 });
    expect(capture).toHaveBeenCalledWith(2);
    expect(title.closest("[data-sonner-toast]")).toHaveAttribute("data-swiping", "true");
    fireEvent.pointerUp(title, { pointerType: "mouse", pointerId: 2 });
    expect(title.closest("[data-sonner-toast]")).toHaveAttribute("data-swiping", "false");
    const close = screen.getByRole("button", { name: en.buttons.close });
    fireEvent.pointerDown(close, { pointerType: "touch", pointerId: 3, button: 0 });
    fireEvent.pointerUp(close, { pointerType: "touch", pointerId: 3 });
    fireEvent.click(close);
    expect(dismissed).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Input ownership")).not.toBeInTheDocument());
  });

  it("keeps Alt+T focus and localized close/onDismiss behavior", async () => {
    const dismissed = vi.fn();
    await mountToaster();
    act(() => { toast("Keyboard notification", { duration: Infinity, onDismiss: dismissed }); });
    await screen.findByText("Keyboard notification");
    fireEvent.keyDown(document, { altKey: true, code: "KeyT" });
    expect(document.querySelector("[data-sonner-toaster]")).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: en.buttons.close }));
    expect(dismissed).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByText("Keyboard notification")).not.toBeInTheDocument());
  });

  for (const type of ["success", "info", "warning", "error"] as const) {
    it(`retains native ${type} status and decorative glyph`, async () => {
      await mountToaster();
      act(() => { toast[type](`Status ${type}`, { duration: Infinity }); });
      await screen.findByText(`Status ${type}`);
      const node = document.querySelector("[data-sonner-toast]");
      expect(node).toHaveAttribute("data-type", type);
      expect(node).toHaveAttribute("data-styled", "true");
      expect(node?.querySelector("[data-icon] svg")).toHaveAttribute("aria-hidden", "true");
    });
  }

  it("keeps promise loading/settlement and the reduced-motion loading glyph", async () => {
    let resolvePromise!: (value: string) => void;
    const promise = new Promise<string>((resolveValue) => { resolvePromise = resolveValue; });
    await mountToaster();
    act(() => {
      toast.promise(promise, { loading: "Saving fixture", success: "Fixture saved", error: "Fixture failed", duration: Infinity });
    });
    await screen.findByText("Saving fixture");
    expect(document.querySelector("[data-sonner-toast]")).toHaveAttribute("data-type", "loading");
    expect(screen.queryByRole("button", { name: en.buttons.close })).not.toBeInTheDocument();
    expect(document.querySelector("[data-icon] svg")).toHaveClass("animate-spin", "motion-reduce:animate-none");
    await act(async () => { resolvePromise("ok"); await promise; });
    await screen.findByText("Fixture saved");
    expect(document.querySelector("[data-sonner-toast]")).toHaveAttribute("data-type", "success");
    expect(screen.getByRole("button", { name: en.buttons.close })).toBeInTheDocument();
  });

  it("keeps shared nav primitives separate from consumer-composed clearance", () => {
    const css = readFileSync(resolve(process.cwd(), "src/index.css"), "utf8");
    const rootPrimitives = css.match(/:root\s*\{[^}]*--app-mobile-nav-h:[^}]*\}/)?.[0];
    expect(rootPrimitives).toBeDefined();
    expect(rootPrimitives).toContain("--app-mobile-nav-safe-area: env(safe-area-inset-bottom, 0px)");
    expect(rootPrimitives).not.toContain("--app-mobile-nav-clearance:");
    expect(css).toMatch(/\.role-app-shell\s*\{\s*--app-mobile-nav-clearance: calc\(var\(--app-mobile-nav-h\) \+ var\(--app-mobile-nav-overhang\) \+ var\(--app-mobile-nav-safe-area\)\);/);
    const adoption = css.slice(css.indexOf("/* AppToaster:"), css.indexOf("/* End AppToaster vendor adoption. */"));
    expect(adoption).toContain(":root:has(.role-app-shell)");
    expect(adoption).toContain("@media (max-width: 639px)");
    expect(adoption).toContain("z-index: var(--z-toast)");
    expect(adoption).toContain(".app-toaster[data-sonner-toaster][data-x-position]");
    expect(adoption).toContain("max-block-size: calc(100dvh - var(--app-toast-bottom) - 1rem)");
    expect(adoption).toContain("overflow-y: auto");
    expect(adoption).toContain("overscroll-behavior: contain");
    expect(adoption).toContain("--app-toast-bottom: calc(var(--app-mobile-nav-safe-area) + 1rem)");
    expect(adoption).not.toContain("!important");
    // These are source ownership guards, NOT computed browser geometry proof.
  });
});
