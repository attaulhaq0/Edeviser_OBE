import { describe, it, expect } from "vitest";
import {
  canDisplayAssessmentBody,
  shouldRenderAssessmentBody,
} from "@/lib/assessmentIntro";

describe("canDisplayAssessmentBody (R17.2a)", () => {
  it("is displayable when at least one benefit and an estimated time are present", () => {
    expect(
      canDisplayAssessmentBody({
        benefits: ["Personalized study recommendations"],
        estimatedTime: "About 1 minute",
      })
    ).toBe(true);
  });

  it("is not displayable when no benefits resolve", () => {
    expect(
      canDisplayAssessmentBody({
        benefits: [],
        estimatedTime: "About 1 minute",
      })
    ).toBe(false);
  });

  it("treats whitespace-only benefits as absent", () => {
    expect(
      canDisplayAssessmentBody({
        benefits: ["   ", "\n"],
        estimatedTime: "About 1 minute",
      })
    ).toBe(false);
  });

  it("is not displayable when the estimated time is missing", () => {
    expect(
      canDisplayAssessmentBody({
        benefits: ["Bonus XP"],
        estimatedTime: "",
      })
    ).toBe(false);
  });

  it("treats a whitespace-only estimated time as missing", () => {
    expect(
      canDisplayAssessmentBody({
        benefits: ["Bonus XP"],
        estimatedTime: "   ",
      })
    ).toBe(false);
  });
});

describe("shouldRenderAssessmentBody (R17.2a)", () => {
  const content = {
    benefits: ["Personalized study recommendations", "Bonus XP"],
    estimatedTime: "About 1 minute",
  };

  it("keeps the body gated before the student begins, even with full framing", () => {
    expect(shouldRenderAssessmentBody({ hasBegun: false, ...content })).toBe(
      false
    );
  });

  it("renders the body once the student begins and framing is displayable", () => {
    expect(shouldRenderAssessmentBody({ hasBegun: true, ...content })).toBe(
      true
    );
  });

  it("never renders the body when framing is not displayable, regardless of hasBegun", () => {
    expect(
      shouldRenderAssessmentBody({
        hasBegun: true,
        benefits: [],
        estimatedTime: "",
      })
    ).toBe(false);
  });
});
