// Feature: pre-deployment-e2e-audit, Task 11.8: Locale-aware formatter unit tests
// **Validates: Requirements 10.5**
//
// Ensures Intl.NumberFormat + Intl.DateTimeFormat emit correct digits
// under the two locales the product supports. The Arabic locale must
// render Arabic-Indic digits (٠-٩) when the numbering system is pinned
// to "arab"; the English locale always renders Western-Arabic digits
// (0-9). A regression would ship Arabic pages with the wrong digit set
// or vice versa.
//
// Note: we pin `numberingSystem: "arab"` explicitly rather than relying
// on the Node ICU default. Node's small-ICU build (common on CI Linux
// images) returns Latin digits for plain "ar" while full-ICU returns
// Arabic-Indic. Production uses region-specific tags like "ar-QA" for
// the same effect — see src/lib/formatNumber.ts.

import { describe, it, expect } from "vitest";

describe("Locale-aware number formatting (Req 10.5)", () => {
  it("en-US renders Western-Arabic digits for integers", () => {
    const f = new Intl.NumberFormat("en-US");
    expect(f.format(1234)).toMatch(/^[0-9,]+$/);
    expect(f.format(1234)).toBe("1,234");
  });

  it("en-US renders Western-Arabic digits for decimals", () => {
    const f = new Intl.NumberFormat("en-US", { minimumFractionDigits: 1 });
    expect(f.format(1234.5)).toBe("1,234.5");
  });

  it("ar with numberingSystem=arab renders Arabic-Indic digits", () => {
    // Pin the numbering system explicitly instead of relying on the
    // Node ICU default: Node's small-ICU build (common on CI Linux
    // images) returns Western-Arabic digits for plain "ar", while
    // full-ICU returns Arabic-Indic. Production uses the region-specific
    // "ar-QA" tag (see src/lib/formatNumber.ts), but the test asserts
    // the canonical pinned behavior so it's stable across both builds.
    const f = new Intl.NumberFormat("ar", { numberingSystem: "arab" });
    const result = f.format(1234);
    // Arabic-Indic digits are U+0660..U+0669 (٠..٩).
    expect(result).toMatch(/[\u0660-\u0669]/);
    // Must NOT contain Western-Arabic digits.
    expect(result).not.toMatch(/[0-9]/);
  });

  it("ar with numberingSystem=latn forces Western-Arabic digits for technical UIs", () => {
    // When we want Arabic copy but Western digits (e.g. for an English-
    // typed identifier rendered on an Arabic page), nu=latn is the
    // documented override per the i18n steering guide.
    const f = new Intl.NumberFormat("ar", { numberingSystem: "latn" });
    expect(f.format(1234)).toMatch(/^[0-9٬.,]+$/);
  });
});

describe("Locale-aware date formatting (Req 10.5)", () => {
  // Anchor the test to a fixed date so Daylight-Saving / timezone shifts
  // in CI don't perturb the assertions. Use UTC to remove env drift.
  const ANCHOR_DATE = new Date("2026-04-23T12:00:00Z");

  it("en-US renders a month name in English", () => {
    const f = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });
    expect(f.format(ANCHOR_DATE)).toMatch(/April/);
    expect(f.format(ANCHOR_DATE)).toMatch(/23/);
    expect(f.format(ANCHOR_DATE)).toMatch(/2026/);
  });

  it("ar with numberingSystem=arab renders Arabic-Indic digits in dates", () => {
    // Same reasoning as the NumberFormat test above: pin the numbering
    // system explicitly so the test is stable across small-ICU and
    // full-ICU Node builds.
    const f = new Intl.DateTimeFormat("ar", {
      year: "numeric",
      month: "long",
      day: "numeric",
      numberingSystem: "arab",
      timeZone: "UTC",
    });
    const result = f.format(ANCHOR_DATE);
    // Must contain Arabic-Indic digits for day (23 → ٢٣) or year.
    expect(result).toMatch(/[\u0660-\u0669]/);
  });

  it("ar with numberingSystem=latn and calendar=gregory matches en-US digit style", () => {
    // This is what the pre-deployment audit expects when formatters need
    // to round-trip digits across English/Arabic locales for identifier-
    // like outputs (invoice numbers, receipts, etc.).
    const f = new Intl.DateTimeFormat("ar", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      numberingSystem: "latn",
      calendar: "gregory",
      timeZone: "UTC",
    });
    expect(f.format(ANCHOR_DATE)).toMatch(/2026/);
    expect(f.format(ANCHOR_DATE)).toMatch(/[0-9]/);
  });
});
