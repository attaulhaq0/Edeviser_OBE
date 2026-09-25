import { describe, expect, it } from "vitest";
import {
  classifyPloAttainment,
  safePloBand,
  PLO_BAND_LIMITS,
} from "@/lib/ploAttainmentBand";

describe("admin PLO source bands preserve established 85/70/50 cutoffs", () => {
  it("uses the source's exact non-rounded boundaries and a real recorded zero", () => {
    expect(PLO_BAND_LIMITS).toEqual({
      excellent: 85,
      satisfactory: 70,
      developing: 50,
    });
    for (const [value, band] of [
      [0, "notYet"],
      [49.99, "notYet"],
      [50, "developing"],
      [69.99, "developing"],
      [70, "satisfactory"],
      [84.99, "satisfactory"],
      [85, "excellent"],
      [100, "excellent"],
    ] as const)
      expect(classifyPloAttainment(value)).toBe(band);
  });
  it.each([
    -1,
    -2,
    101,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    null,
    undefined,
    "85",
  ])("keeps absent, malformed or out-of-range %s unmeasured", (value) => {
    expect(classifyPloAttainment(value)).toBe("unmeasured");
  });
  it("does not reclassify a raw 84.7 to excellent because its displayed integer might be 85", () => {
    expect(classifyPloAttainment(84.7)).toBe("satisfactory");
    expect(safePloBand(84.7, "satisfactory")).toBe("satisfactory");
  });
  it("keeps untrusted category and unmeasured numeric data neutral", () => {
    expect(safePloBand(87, "unknown")).toBe("unmeasured");
    expect(safePloBand(-1, "excellent")).toBe("unmeasured");
    expect(safePloBand(0, "notYet")).toBe("notYet");
  });
});
