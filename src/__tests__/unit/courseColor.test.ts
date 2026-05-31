import { describe, it, expect } from "vitest";
import { resolveCourseColor, COURSE_COLOR_PALETTE } from "@/lib/courseColor";

const HEX = /^#[0-9A-Fa-f]{6}$/;

describe("resolveCourseColor", () => {
  it("uses a valid assigned color verbatim (R9.3)", () => {
    expect(resolveCourseColor("#abcdef", "course-1")).toBe("#abcdef");
  });

  it("falls back to a deterministic palette color when color is null (R9.3)", () => {
    const a = resolveCourseColor(null, "course-1");
    const b = resolveCourseColor(null, "course-1");
    expect(a).toBe(b);
    expect(HEX.test(a)).toBe(true);
    expect(COURSE_COLOR_PALETTE).toContain(a);
  });

  it("treats undefined like null", () => {
    expect(resolveCourseColor(undefined, "course-x")).toBe(
      resolveCourseColor(null, "course-x")
    );
  });

  it("ignores malformed stored colors and uses the deterministic fallback", () => {
    expect(resolveCourseColor("not-a-color", "course-9")).toBe(
      resolveCourseColor(null, "course-9")
    );
    expect(resolveCourseColor("#fff", "course-9")).toBe(
      resolveCourseColor(null, "course-9")
    );
  });

  it("derives different colors for different course ids (best effort spread)", () => {
    const colors = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((id) =>
        resolveCourseColor(null, id)
      )
    );
    // Not guaranteed unique, but the hash should spread across the palette.
    expect(colors.size).toBeGreaterThan(1);
  });

  it("only ever returns a palette color for fallbacks", () => {
    for (let i = 0; i < 50; i++) {
      const c = resolveCourseColor(null, `course-${i}`);
      expect(COURSE_COLOR_PALETTE).toContain(c);
    }
  });
});
