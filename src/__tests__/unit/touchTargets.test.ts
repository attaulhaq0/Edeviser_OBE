// @vitest-environment node
// Report enforcement only. Actual layout is covered by the Chromium regression,
// never by happy-dom fabricated rectangles.
import { describe, expect, it } from "vitest";
import {
  assertTouchTargets, MINIMUM_TOUCH_TARGET, type TouchTargetReport,
} from "../../../tests/e2e/_helpers/touch-targets.mjs";

const clean = (): TouchTargetReport => ({
  minimum: MINIMUM_TOUCH_TARGET,
  checked: 1,
  targets: [{ element: "button#good", name: "Good", width: 44, height: 44 }],
  excluded: [],
  violations: [],
});

describe("touch-target report enforcement (not browser geometry)", () => {
  it("accepts a measured clean report", () => {
    expect(() => assertTouchTargets(clean())).not.toThrow();
  });
  it("fails an undersized report instead of merely logging", () => {
    const target = { element: "button#bad", name: "Bad", width: 43.99, height: 44 };
    expect(() => assertTouchTargets({ ...clean(), targets: [target], violations: [target] }))
      .toThrow(/button#bad.*43.99x44/);
  });
  it("rejects empty coverage rather than certifying a blank/disabled page", () => {
    expect(() => assertTouchTargets({ ...clean(), checked: 0, targets: [] })).toThrow(/no rendered, enabled controls/);
  });
});
