import { describe, it, expect } from "vitest";
import {
  getAssessmentStrategy,
  hasDedicatedStrategy,
  type AttainmentThresholds,
} from "../../../supabase/functions/_shared/ai/strategies/assessment-strategy";

const T: AttainmentThresholds = {
  excellent: 85,
  satisfactory: 70,
  developing: 50,
};

const IB_RAW = {
  model: "criterion",
  criteria: [
    { criterion: "A", level: 6, maxLevel: 8 },
    { criterion: "B", level: 5, maxLevel: 8 },
    { criterion: "C", level: 3, maxLevel: 8 },
    { criterion: "D", level: 7, maxLevel: 8 },
  ],
  totalRaw: 21,
  totalMax: 32,
};

const IGCSE_RAW = {
  model: "band_grade",
  objectives: [
    { objective: "AO1", marks: 42, maxMarks: 60, weight: 0.5 },
    { objective: "AO2", marks: 38, maxMarks: 60, weight: 0.3 },
    { objective: "AO3", marks: 18, maxMarks: 60, weight: 0.2 },
  ],
  band: "C",
};

const QNSA_RAW = { model: "percent", percentage: 62 };

describe("Three Schools Proof", () => {
  it("all 4 strategies registered", () => {
    for (const m of ["percent", "criterion", "band_grade", "component"])
      expect(getAssessmentStrategy(m).model).toBe(m);
  });

  it("hasDedicatedStrategy works", () => {
    expect(hasDedicatedStrategy("percent")).toBe(false);
    expect(hasDedicatedStrategy("criterion")).toBe(true);
    expect(hasDedicatedStrategy("band_grade")).toBe(true);
  });

  describe("IB criterion", () => {
    const s = getAssessmentStrategy("criterion");
    it("validates IB raw score", () => {
      expect(s.validateRawScore(IB_RAW)).toEqual({ valid: true });
    });
    it("normalizes 21/32 = 65.63", () => {
      expect(s.normalizeToPercent(IB_RAW as Record<string, unknown>)).toBe(
        65.63
      );
    });
    it("classifies as Developing", () => {
      expect(s.classifyAttainment(65.63, T)).toBe("Developing");
    });
  });

  describe("IGCSE band_grade", () => {
    const s = getAssessmentStrategy("band_grade");
    it("validates IGCSE raw score", () => {
      expect(s.validateRawScore(IGCSE_RAW)).toEqual({ valid: true });
    });
    it("normalizes AO-weighted = 60", () => {
      expect(s.normalizeToPercent(IGCSE_RAW as Record<string, unknown>)).toBe(
        60
      );
    });
    it("classifies 60 as Developing", () => {
      expect(s.classifyAttainment(60, T)).toBe("Developing");
    });
    it("AO3 is objectively weakest", () => {
      const objs = (IGCSE_RAW as Record<string, unknown>).objectives as Array<
        Record<string, unknown>
      >;
      expect(
        (objs.find((o) => o.objective === "AO3")!.marks as number) / 60
      ).toBe(0.3);
    });
  });

  describe("QNSA percent", () => {
    const s = getAssessmentStrategy("percent");
    it("normalizes 62 directly", () => {
      expect(s.normalizeToPercent(QNSA_RAW as Record<string, unknown>)).toBe(
        62
      );
    });
    it("classifies 62 as Developing", () => {
      expect(s.classifyAttainment(62, T)).toBe("Developing");
    });
  });

  describe("DIFFERENTIATION", () => {
    it("all 3 models produce different normalized percents", () => {
      const ib = getAssessmentStrategy("criterion").normalizeToPercent(
        IB_RAW as Record<string, unknown>
      );
      const ig = getAssessmentStrategy("band_grade").normalizeToPercent(
        IGCSE_RAW as Record<string, unknown>
      );
      const qn = getAssessmentStrategy("percent").normalizeToPercent(
        QNSA_RAW as Record<string, unknown>
      );
      expect(ib).not.toBe(ig);
      expect(ib).not.toBe(qn);
      expect(ig).not.toBe(qn);
    });

    it("raw semantics differ: IB has criteria, IGCSE has objectives, QNSA has neither", () => {
      expect(IB_RAW).toHaveProperty("criteria");
      expect(IGCSE_RAW).toHaveProperty("objectives");
      expect(QNSA_RAW).not.toHaveProperty("criteria");
      expect(QNSA_RAW).not.toHaveProperty("objectives");
    });

    it("custom thresholds work", () => {
      const strict: AttainmentThresholds = {
        excellent: 90,
        satisfactory: 75,
        developing: 60,
      };
      expect(
        getAssessmentStrategy("percent").classifyAttainment(59, strict)
      ).toBe("Not_Yet");
      expect(
        getAssessmentStrategy("percent").classifyAttainment(60, strict)
      ).toBe("Developing");
    });
  });

  describe("Percent backward compat", () => {
    const s = getAssessmentStrategy("percent");
    it("85 = Excellent (classic behavior)", () => {
      expect(s.validateRawScore({ model: "percent", percentage: 85 })).toEqual({
        valid: true,
      });
      expect(
        s.normalizeToPercent({ percentage: 85 } as Record<string, unknown>)
      ).toBe(85);
      expect(s.classifyAttainment(85, T)).toBe("Excellent");
    });
  });
});
