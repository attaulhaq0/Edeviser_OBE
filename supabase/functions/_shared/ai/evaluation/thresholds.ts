/**
 * Task 7.4 threshold wiring (edeviser-agentic-intelligence).
 *
 * Parses `institution_autonomy_settings.evaluation_thresholds` jsonb into
 * harness EvaluationThresholds. Governance rule (fail-closed):
 *   - non-object payloads are UNCONFIGURED (null)
 *   - explicit `enabled: false` disables evaluation for the institution
 *   - an object with no valid numeric dimension is UNCONFIGURED (null);
 *     institutions without configuration are skipped by the batch evaluator
 *   - each dimension must be a finite number within [0, 1]
 */
import type { EvaluationThresholds } from "./harness.ts";

export const THRESHOLD_DIMENSIONS = [
  "overall",
  "citation",
  "integrity",
  "toolCorrectness",
] as const;

const inUnitRange = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;

export const parseEvaluationThresholds = (
  value: unknown
): EvaluationThresholds | null => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  if (record.enabled === false) return null;
  const thresholds: Record<string, number> = {};
  let configured = false;
  for (const dimension of THRESHOLD_DIMENSIONS) {
    const raw = record[dimension];
    if (raw === undefined || raw === null) continue;
    if (!inUnitRange(raw)) return null;
    thresholds[dimension] = raw;
    configured = true;
  }
  return configured ? (thresholds as EvaluationThresholds) : null;
};
