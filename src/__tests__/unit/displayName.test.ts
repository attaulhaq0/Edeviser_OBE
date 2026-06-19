import { describe, it, expect } from "vitest";
import { getDisplayFirstName } from "@/lib/displayName";

/**
 * Production Bug Fixes — Track A, Item 3 (Requirement 3):
 * honorific-titled names must render the first name, not the title.
 */
describe("getDisplayFirstName", () => {
  it("skips a leading honorific with a trailing dot (Req 3)", () => {
    expect(getDisplayFirstName("Mr. David Okonkwo")).toBe("David");
  });

  it("skips an honorific before a hyphenated surname (Req 3)", () => {
    expect(getDisplayFirstName("Dr. Aisha Al-Mansoori")).toBe("Aisha");
  });

  it("skips an honorific without a trailing dot (Req 3)", () => {
    expect(getDisplayFirstName("Prof Sara")).toBe("Sara");
  });

  it("returns the first token when there is no honorific", () => {
    expect(getDisplayFirstName("Sara Imran")).toBe("Sara");
  });

  it("returns a lone honorific token as-is when no name follows", () => {
    expect(getDisplayFirstName("Mr.")).toBe("Mr.");
  });

  it("returns null for an empty string so the caller can supply a fallback", () => {
    expect(getDisplayFirstName("")).toBeNull();
  });

  it("returns null for whitespace-only input", () => {
    expect(getDisplayFirstName("   ")).toBeNull();
  });

  it("returns null for null and undefined", () => {
    expect(getDisplayFirstName(null)).toBeNull();
    expect(getDisplayFirstName(undefined)).toBeNull();
  });

  it("is case-insensitive for honorific detection", () => {
    expect(getDisplayFirstName("DR. AISHA")).toBe("AISHA");
    expect(getDisplayFirstName("mrs jane doe")).toBe("jane");
  });

  it("collapses extra internal whitespace around tokens", () => {
    expect(getDisplayFirstName("  Mr.   David   Okonkwo ")).toBe("David");
  });
});
