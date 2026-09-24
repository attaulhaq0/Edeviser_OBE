import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { observeThemeColor } from "@/lib/themeColor";

let style: HTMLStyleElement;
let initial: HTMLMetaElement;
let originalClass: string;
let originalStyle: string | null;
const releases: Array<() => void> = [];
const start = () => { const release = observeThemeColor(document); releases.push(release); return release; };
const value = () => document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')?.content;
beforeEach(() => {
  originalClass = document.documentElement.className;
  originalStyle = document.documentElement.getAttribute("style");
  document.documentElement.className = "";
  document.documentElement.removeAttribute("style");
  style = document.createElement("style");
  style.textContent = ":root{--background:#ffffff}.dark{--background:#0a1628}.high-contrast{--background:#ffffff}.dark.high-contrast{--background:#000000}";
  document.head.append(style);
  initial = document.createElement("meta"); initial.name = "theme-color"; initial.content = "#123456"; document.head.append(initial);
});
afterEach(() => {
  for (const release of releases.splice(0)) release();
  style.remove(); initial.remove();
  document.querySelectorAll('meta[name="theme-color"]').forEach((node) => node.remove());
  document.documentElement.className = originalClass;
  if (originalStyle === null) document.documentElement.removeAttribute("style");
  else document.documentElement.setAttribute("style", originalStyle);
});

describe("browser chrome follows the actual semantic theme", () => {
  it("updates for light/dark and high-contrast round trips", async () => {
    start(); expect(value()).toBe("#ffffff");
    document.documentElement.classList.add("dark");
    await waitFor(() => expect(value()).toBe("#0a1628"));
    document.documentElement.classList.add("high-contrast");
    await waitFor(() => expect(value()).toBe("#000000"));
    document.documentElement.classList.remove("dark");
    await waitFor(() => expect(value()).toBe("#ffffff"));
  });
  it("reacts to root style overrides without a second palette", async () => {
    start(); document.documentElement.style.setProperty("--background", "#abcdef");
    await waitFor(() => expect(value()).toBe("#abcdef"));
  });
  it("keeps the existing fallback if CSS has not supplied a color", () => {
    style.remove(); start(); expect(value()).toBe("#123456");
  });
  it("shares one metadata node until the last owner releases it", async () => {
    const first = start(), second = start();
    expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    first(); first();
    document.documentElement.classList.add("dark");
    await waitFor(() => expect(value()).toBe("#0a1628"));
    second(); expect(value()).toBe("#123456");
    document.documentElement.classList.add("high-contrast");
    document.dispatchEvent(new Event("load"));
    await Promise.resolve(); expect(value()).toBe("#123456");
  });
  it.each([true, false])("removes an owned created node even when CSS is available=%s", (cssReady) => {
    initial.remove(); if (!cssReady) style.remove();
    const release = start(); expect(document.querySelectorAll('meta[name="theme-color"]')).toHaveLength(1);
    release(); expect(document.querySelector('meta[name="theme-color"]')).toBeNull();
  });
  it("does not overwrite a later metadata writer during cleanup", () => {
    const release = start(); initial.content = "#fedcba"; release(); expect(value()).toBe("#fedcba");
  });
  it("resynchronizes when a stylesheet load completes", () => {
    style.remove(); start(); expect(value()).toBe("#123456");
    document.head.append(style); document.dispatchEvent(new Event("load"));
    expect(value()).toBe("#ffffff");
  });
  it("is connected through the existing ThemeProvider and starts at the light token", () => {
    const provider = readFileSync(resolve("src/providers/ThemeProvider.tsx"), "utf8");
    expect(provider).toContain("useEffect(() => observeThemeColor(document), [])");
    const tokens = readFileSync(resolve("src/design-system/tokens.css"), "utf8");
    const light = /--background:\s*(#[\da-f]+)/i.exec(tokens)?.[1];
    expect(light).toBeTruthy();
    expect(readFileSync(resolve("index.html"), "utf8")).toContain(`<meta name="theme-color" content="${light}"`);
  });
});
