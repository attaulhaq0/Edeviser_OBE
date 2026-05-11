import { describe, it, expect, beforeEach } from "vitest";
import { getDirection, applyDirection } from "@/lib/directionManager";

describe("directionManager", () => {
  beforeEach(() => {
    document.documentElement.removeAttribute("dir");
    document.documentElement.removeAttribute("lang");
    document.documentElement.style.fontFamily = "";
  });

  describe("getDirection", () => {
    it("returns rtl for Arabic", () => {
      expect(getDirection("ar")).toBe("rtl");
    });

    it("returns ltr for English", () => {
      expect(getDirection("en")).toBe("ltr");
    });

    it("returns rtl for Hebrew", () => {
      expect(getDirection("he")).toBe("rtl");
    });

    it("returns ltr for unknown languages", () => {
      expect(getDirection("xyz")).toBe("ltr");
    });
  });

  describe("applyDirection", () => {
    it("sets dir=rtl and lang=ar for Arabic", () => {
      applyDirection("ar");
      expect(document.documentElement.getAttribute("dir")).toBe("rtl");
      expect(document.documentElement.getAttribute("lang")).toBe("ar");
    });

    it("sets dir=ltr and lang=en for English", () => {
      applyDirection("en");
      expect(document.documentElement.getAttribute("dir")).toBe("ltr");
      expect(document.documentElement.getAttribute("lang")).toBe("en");
    });

    it("sets Arabic font family for RTL languages", () => {
      applyDirection("ar");
      expect(document.documentElement.style.fontFamily).toContain(
        "Noto Sans Arabic"
      );
    });

    it("sets default font family for LTR languages", () => {
      applyDirection("en");
      expect(document.documentElement.style.fontFamily).toContain("Noto Sans");
      expect(document.documentElement.style.fontFamily).not.toContain(
        "Noto Sans Arabic"
      );
    });

    it("is idempotent — multiple calls produce same result", () => {
      applyDirection("ar");
      const state1 = {
        dir: document.documentElement.getAttribute("dir"),
        lang: document.documentElement.getAttribute("lang"),
        font: document.documentElement.style.fontFamily,
      };

      applyDirection("ar");
      const state2 = {
        dir: document.documentElement.getAttribute("dir"),
        lang: document.documentElement.getAttribute("lang"),
        font: document.documentElement.style.fontFamily,
      };

      expect(state1).toEqual(state2);
    });
  });
});
