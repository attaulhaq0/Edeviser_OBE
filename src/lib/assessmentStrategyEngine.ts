// =============================================================================
// assessmentStrategyEngine.ts — Assessment Strategy Runtime Engine (Phase 15)
// Makes course.assessment_model change actual runtime behavior
// =============================================================================

export type AssessmentModel = "percent" | "criterion" | "band_grade" | "component";
export interface GradeScaleBand { letter: string; min_percent: number; max_percent: number; gpa_points: number; }

export interface NormalizedAssessment {
  overallPercent: number;
  outcomePercents: Array<{ outcomeId: string; percent: number; nativeBreakdown?: Record<string, unknown> }>;
  native: Record<string, unknown>;
  model: AssessmentModel;
}

export interface ReportingResult {
  displayGrade: string; displayPercent: number; nativeDescription: string; gpaPoints?: number;
}

// Grade mapping helpers
function mapGrade(pct: number, scales: GradeScaleBand[]): string {
  const sorted = [...scales].sort((a, b) => b.min_percent - a.min_percent);
  for (const s of sorted) { if (pct >= s.min_percent && pct <= s.max_percent) return s.letter; }
  for (const s of sorted) { if (pct > s.max_percent) return s.letter; }
  return sorted[sorted.length - 1]?.letter ?? "N/A";
}
function mapGpa(pct: number, scales: GradeScaleBand[]): number {
  const sorted = [...scales].sort((a, b) => b.min_percent - a.min_percent);
  for (const s of sorted) { if (pct >= s.min_percent && pct <= s.max_percent) return s.gpa_points; }
  for (const s of sorted) { if (pct > s.max_percent) return s.gpa_points; }
  return sorted[sorted.length - 1]?.gpa_points ?? 0;
}

// Normalizers
export function normalizePercent(input: { score: number; maxScore: number }): NormalizedAssessment {
  const pct = input.maxScore > 0 ? Math.round((input.score / input.maxScore) * 10000) / 100 : 0;
  return { overallPercent: pct, outcomePercents: [{ outcomeId: "_overall", percent: pct }], native: { kind: "percent", score: input.score, maxScore: input.maxScore }, model: "percent" };
}

export function normalizeCriterion(input: { criteria: Array<{ criterionId: string; criterionName: string; level: number; maxLevel: number }> }): NormalizedAssessment {
  const total = input.criteria.reduce((s, c) => s + (c.maxLevel > 0 ? (c.level / c.maxLevel) * 100 : 0), 0);
  const pct = input.criteria.length > 0 ? Math.round((total / input.criteria.length) * 100) / 100 : 0;
  return { overallPercent: pct, outcomePercents: input.criteria.map((c) => ({ outcomeId: c.criterionId, percent: c.maxLevel > 0 ? Math.round((c.level / c.maxLevel) * 10000) / 100 : 0, nativeBreakdown: { criterionName: c.criterionName, level: c.level, maxLevel: c.maxLevel } })), native: { kind: "criterion", criteria: input.criteria }, model: "criterion" };
}

export function normalizeBandGrade(input: { rawMark: number; maxMark: number; componentCode?: string; weightingPercent?: number }): NormalizedAssessment {
  const rawPct = input.maxMark > 0 ? Math.round((input.rawMark / input.maxMark) * 10000) / 100 : 0;
  const weight = (input.weightingPercent ?? 100) / 100;
  const pct = Math.round(rawPct * weight * 100) / 100;
  return { overallPercent: pct, outcomePercents: [{ outcomeId: "_overall", percent: pct }], native: { kind: "band_grade", rawMark: input.rawMark, maxMark: input.maxMark, componentCode: input.componentCode, weightingPercent: input.weightingPercent }, model: "band_grade" };
}

// Main entry point
export function normalizeAssessment(model: AssessmentModel, rawInput: unknown): NormalizedAssessment {
  switch (model) {
    case "percent": return normalizePercent(rawInput as { score: number; maxScore: number });
    case "criterion": return normalizeCriterion(rawInput as { criteria: Array<{ criterionId: string; criterionName: string; level: number; maxLevel: number }> });
    case "band_grade": return normalizeBandGrade(rawInput as { rawMark: number; maxMark: number; componentCode?: string; weightingPercent?: number });
    case "component": return normalizeComponent(rawInput as { components: Array<{ componentId: string; componentName: string; objectiveCode: string; score: number; maxScore: number; weightPercent: number }> });
    default: throw new Error(`Unknown assessment model: ${model}`);
  }
}

export function normalizeComponent(input: { components: Array<{ componentId: string; componentName: string; objectiveCode: string; score: number; maxScore: number; weightPercent: number }> }): NormalizedAssessment {
  const totalW = input.components.reduce((s, c) => s + c.weightPercent, 0);
  const ws = input.components.reduce((s, c) => s + (c.maxScore > 0 ? (c.score / c.maxScore) * 100 : 0) * (c.weightPercent / (totalW || 100)), 0);
  const pct = Math.round(ws * 100) / 100;
  const outcomes = input.components.map((c) => ({ outcomeId: c.componentId, percent: c.maxScore > 0 ? Math.round((c.score / c.maxScore) * 10000) / 100 : 0, nativeBreakdown: { componentName: c.componentName, objectiveCode: c.objectiveCode, weightPercent: c.weightPercent } }));
  return { overallPercent: pct, outcomePercents: outcomes, native: { kind: "component", components: input.components }, model: "component" };
}

export function toReportingResult(normalized: NormalizedAssessment, gradeScale?: GradeScaleBand[]): ReportingResult {
  const scale = gradeScale && gradeScale.length > 0 ? gradeScale : undefined;
  const native = normalized.native as Record<string, unknown>;
  let desc = "";
  switch (normalized.model) {
    case "percent": { const p = native as unknown as { score: number; maxScore: number }; desc = `${p.score} / ${p.maxScore}`; break; }
    case "criterion": { const c = native as unknown as { criteria: Array<{ criterionName: string; level: number; maxLevel: number }> }; desc = c.criteria.map((x) => `${x.criterionName}: ${x.level}/${x.maxLevel}`).join("; "); break; }
    case "band_grade": { const b = native as unknown as { rawMark: number; maxMark: number; componentCode?: string; weightingPercent?: number }; desc = b.componentCode ? `${b.componentCode}: ${b.rawMark}/${b.maxMark}` : `${b.rawMark}/${b.maxMark}`; break; }
    case "component": { const cp = native as unknown as { components: Array<{ objectiveCode: string; componentName: string; score: number; maxScore: number; weightPercent: number }> }; desc = cp.components.map((x) => `${x.objectiveCode}: ${x.score}/${x.maxScore}@${x.weightPercent}%`).join(" | "); break; }
  }
  return { displayGrade: scale ? mapGrade(normalized.overallPercent, scale) : `${normalized.overallPercent.toFixed(1)}%`, displayPercent: normalized.overallPercent, nativeDescription: desc, gpaPoints: scale ? mapGpa(normalized.overallPercent, scale) : undefined };
}