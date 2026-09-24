import { createElement, isValidElement } from "react";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as designSystem from "@/design-system";
import * as hawdex from "@/design-system/hawdex";
import * as gamification from "@/design-system/hawdex/gamification";
import * as primitives from "@/design-system/hawdex/primitives";
import type { BadgeTier as RootBadgeTier } from "@/design-system";
import type { BadgeTier as HawdexBadgeTier } from "@/design-system/hawdex";
import type { BadgeTier } from "@/design-system/hawdex/gamification";

describe("Hawdex public module compatibility", () => {
  it("preserves extensionless module exports and barrel binding identity", () => {
    expect(Object.keys(primitives).sort()).toEqual(["AccentDot", "IconBox", "Logo", "cx"]);
    expect(Object.keys(gamification).sort()).toEqual(["CLAY", "HexBadge", "TIER_COLORS"]);

    for (const name of ["AccentDot", "IconBox", "Logo"] as const) {
      expect(hawdex[name]).toBe(primitives[name]);
      expect(designSystem[name]).toBe(primitives[name]);
    }
    for (const name of ["HexBadge", "TIER_COLORS", "CLAY"] as const) {
      expect(hawdex[name]).toBe(gamification[name]);
      expect(designSystem[name]).toBe(gamification[name]);
    }
  });

  it("preserves tier types, palette values, clay elements, and class joining", () => {
    const tier: BadgeTier = "gold";
    const hawdexTier: HawdexBadgeTier = tier;
    const rootTier: RootBadgeTier = hawdexTier;
    expect(gamification.TIER_COLORS[rootTier]).toEqual({
      outer: "#D4A017", inner: "#FFD966", text: "#7C5200",
    });
    expect(Object.keys(gamification.CLAY).sort()).toEqual([
      "flame", "lightning", "target", "trophy",
    ]);
    for (const icon of Object.values(gamification.CLAY)) {
      expect(isValidElement(icon)).toBe(true);
    }
    expect(primitives.cx("first", undefined, false, null, "", "second")).toBe("first second");
  });

  it("preserves the public Logo geometry and gradient", () => {
    const { container } = render(createElement(primitives.Logo, { size: 80 }));
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "41.2");
    expect(svg).toHaveAttribute("viewBox", "0 0 72 37");
    expect(container.querySelector("linearGradient")).toHaveAttribute("id", "hawdex-lg1");
    expect(Array.from(container.querySelectorAll("stop"), (stop) => stop.getAttribute("stop-color"))).toEqual([
      "#0382BD", "#09B99C",
    ]);
    expect(container.querySelectorAll("rect")).toHaveLength(5);
    expect(container.querySelector("polygon")).toHaveAttribute("points", "22,18.5 26,16 26,21");
  });
});
