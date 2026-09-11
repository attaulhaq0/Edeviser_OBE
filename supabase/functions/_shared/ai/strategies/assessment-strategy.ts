/**
 * v2 — Assessment strategy engine. Pure, deterministic, model-agnostic.
 * Each AssessmentModel gets a strategy that validates raw scores,
 * normalizes to 0-100 percent, and classifies attainment.
 */
import type { AssessmentModel } from "../contracts.ts";

export interface AttainmentThresholds {
  excellent: number;
  satisfactory: number;
  developing: number;
}
export type AttainmentLevel =
  | "Excellent"
  | "Satisfactory"
  | "Developing"
  | "Not_Yet";

export interface AssessmentStrategy {
  readonly name: string;
  readonly model: AssessmentModel;
  validateRawScore(
    raw: unknown
  ): { valid: true } | { valid: false; reason: string };
  normalizeToPercent(raw: Record<string, unknown>): number;
  classifyAttainment(
    percent: number,
    thresholds: AttainmentThresholds
  ): AttainmentLevel;
}

const classify = (
  percent: number,
  t: AttainmentThresholds
): AttainmentLevel => {
  if (percent >= t.excellent) return "Excellent";
  if (percent >= t.satisfactory) return "Satisfactory";
  if (percent >= t.developing) return "Developing";
  return "Not_Yet";
};

const percentStrategy: AssessmentStrategy = {
  name: "Percent (0-100)",
  model: "percent",
  validateRawScore(raw: unknown) {
    if (!raw || typeof raw !== "object")
      return { valid: false, reason: "raw_score must be {model, percentage}" };
    const r = raw as Record<string, unknown>;
    if (r.model !== "percent")
      return { valid: false, reason: `expected model='percent'` };
    if (
      typeof r.percentage !== "number" ||
      r.percentage < 0 ||
      r.percentage > 100
    )
      return { valid: false, reason: "percentage must be 0-100" };
    return { valid: true };
  },
  normalizeToPercent(raw: Record<string, unknown>): number {
    return raw.percentage as number;
  },
  classifyAttainment: classify,
};

const criterionStrategy: AssessmentStrategy = {
  name: "IB MYP Criterion (A-D × 0-8)",
  model: "criterion",
  validateRawScore(raw: unknown) {
    if (!raw || typeof raw !== "object")
      return {
        valid: false,
        reason: "raw_score must be {model, criteria, totalRaw, totalMax}",
      };
    const r = raw as Record<string, unknown>;
    if (r.model !== "criterion")
      return { valid: false, reason: `expected model='criterion'` };
    if (!Array.isArray(r.criteria) || r.criteria.length === 0)
      return { valid: false, reason: "criteria must be non-empty array" };
    for (const c of r.criteria as Record<string, unknown>[]) {
      if (
        typeof c.criterion !== "string" ||
        typeof c.level !== "number" ||
        typeof c.maxLevel !== "number"
      )
        return {
          valid: false,
          reason: "each criterion needs {criterion, level, maxLevel}",
        };
      if (c.level < 0 || c.level > (c.maxLevel as number))
        return { valid: false, reason: "level out of range" };
    }
    if (typeof r.totalRaw !== "number" || typeof r.totalMax !== "number")
      return { valid: false, reason: "totalRaw/totalMax required" };
    return { valid: true };
  },
  normalizeToPercent(raw: Record<string, unknown>): number {
    const tr = raw.totalRaw as number,
      tm = raw.totalMax as number;
    return tm === 0 ? 0 : Math.round((tr / tm) * 10000) / 100;
  },
  classifyAttainment: classify,
};

const bandGradeStrategy: AssessmentStrategy = {
  name: "IGCSE Band Grade (AO-weighted)",
  model: "band_grade",
  validateRawScore(raw: unknown) {
    if (!raw || typeof raw !== "object")
      return { valid: false, reason: "raw_score must be {model, objectives}" };
    const r = raw as Record<string, unknown>;
    if (r.model !== "band_grade")
      return { valid: false, reason: `expected model='band_grade'` };
    if (!Array.isArray(r.objectives) || r.objectives.length === 0)
      return { valid: false, reason: "objectives must be non-empty" };
    let tw = 0;
    for (const o of r.objectives as Record<string, unknown>[]) {
      if (
        typeof o.objective !== "string" ||
        typeof o.marks !== "number" ||
        typeof o.maxMarks !== "number"
      )
        return {
          valid: false,
          reason: "each objective needs {objective, marks, maxMarks}",
        };
      tw += typeof o.weight === "number" ? (o.weight as number) : 1;
    }
    if (Math.abs(tw - 1) > 0.01)
      return { valid: false, reason: `weights must sum to 1.0 (got ${tw})` };
    return { valid: true };
  },
  normalizeToPercent(raw: Record<string, unknown>): number {
    const objs = raw.objectives as Array<{
      marks: number;
      maxMarks: number;
      weight?: number;
    }>;
    let wp = 0;
    for (const o of objs) {
      if (o.maxMarks > 0) wp += (o.marks / o.maxMarks) * 100 * (o.weight ?? 1);
    }
    return Math.round(wp * 100) / 100;
  },
  classifyAttainment: classify,
};

const componentStrategy: AssessmentStrategy = {
  name: "Component (weighted multi-part)",
  model: "component",
  validateRawScore(raw: unknown) {
    if (!raw || typeof raw !== "object")
      return { valid: false, reason: "raw_score must be {model, components}" };
    const r = raw as Record<string, unknown>;
    if (r.model !== "component")
      return { valid: false, reason: `expected model='component'` };
    if (!Array.isArray(r.components) || r.components.length === 0)
      return { valid: false, reason: "components must be non-empty" };
    let tw = 0;
    for (const c of r.components as Record<string, unknown>[]) {
      if (typeof c.componentId !== "string" || typeof c.score !== "number")
        return {
          valid: false,
          reason: "each component needs {componentId, score}",
        };
      tw += typeof c.weight === "number" ? (c.weight as number) : 1;
    }
    if (Math.abs(tw - 1) > 0.01)
      return { valid: false, reason: `weights must sum to 1.0 (got ${tw})` };
    return { valid: true };
  },
  normalizeToPercent(raw: Record<string, unknown>): number {
    const comps = raw.components as Array<{ score: number; weight?: number }>;
    let ws = 0;
    for (const c of comps) {
      ws += c.score * (c.weight ?? 1);
    }
    return Math.round(ws * 100) / 100;
  },
  classifyAttainment: classify,
};

const STRATEGIES: ReadonlyMap<AssessmentModel, AssessmentStrategy> = new Map([
  ["percent", percentStrategy],
  ["criterion", criterionStrategy],
  ["band_grade", bandGradeStrategy],
  ["component", componentStrategy],
]);

export const getAssessmentStrategy = (model: string): AssessmentStrategy =>
  STRATEGIES.get(model as AssessmentModel) ?? percentStrategy;

export const hasDedicatedStrategy = (model: string): boolean =>
  STRATEGIES.has(model as AssessmentModel) && model !== "percent";
