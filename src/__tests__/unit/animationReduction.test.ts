// Feature: i18n-rtl-support, Property 13: Animation Reduction Respects Both OS and User Preferences
// **Validates: Requirements 25.4, 25.5**

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  shouldReduceAnimations,
  applyAnimationReduction,
} from "@/lib/animationPreferences";

describe("animationReduction", () => {
  beforeEach(() => {
    document.documentElement.classList.remove("reduce-animations");
  });

  describe("shouldReduceAnimations", () => {
    it("returns false when both OS and user pref are disabled", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as MediaQueryList);
      expect(shouldReduceAnimations(false)).toBe(false);
    });

    it("returns true when user pref is enabled (OS disabled)", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: false,
      } as MediaQueryList);
      expect(shouldReduceAnimations(true)).toBe(true);
    });

    it("returns true when OS pref is enabled (user disabled)", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as MediaQueryList);
      expect(shouldReduceAnimations(false)).toBe(true);
    });

    it("returns true when both OS and user pref are enabled", () => {
      vi.spyOn(window, "matchMedia").mockReturnValue({
        matches: true,
      } as MediaQueryList);
      expect(shouldReduceAnimations(true)).toBe(true);
    });
  });

  describe("applyAnimationReduction", () => {
    it("adds reduce-animations class when true", () => {
      applyAnimationReduction(true);
      expect(
        document.documentElement.classList.contains("reduce-animations")
      ).toBe(true);
    });

    it("removes reduce-animations class when false", () => {
      document.documentElement.classList.add("reduce-animations");
      applyAnimationReduction(false);
      expect(
        document.documentElement.classList.contains("reduce-animations")
      ).toBe(false);
    });
  });
});
