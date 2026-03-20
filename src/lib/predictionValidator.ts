// =============================================================================
// predictionValidator — Validates at-risk predictions against actual grades
// Validates: Requirements 49.2
// =============================================================================

import { supabase } from '@/lib/supabase';

/** Threshold below which a student is considered "at risk" (prediction was correct). */
const AT_RISK_THRESHOLD = 70;

export interface PredictionValidationResult {
  updatedCount: number;
  errors: string[];
}

/**
 * After a grade is submitted, look up any unvalidated at-risk predictions
 * for the given student + CLO IDs and mark them as 'correct' or 'incorrect'
 * based on the student's current attainment.
 *
 * - correct: attainment < 70% (the at-risk prediction was right)
 * - incorrect: attainment >= 70% (the student is doing fine)
 *
 * This is fire-and-forget — errors are collected but never thrown.
 */
export async function validateAtRiskPredictions(
  studentId: string,
  cloIds: string[],
): Promise<PredictionValidationResult> {
  const result: PredictionValidationResult = { updatedCount: 0, errors: [] };

  if (!studentId || cloIds.length === 0) return result;

  try {
    // 1. Fetch unvalidated at-risk predictions for this student
    const { data: predictions, error: predError } = await supabase
      .from('ai_feedback')
      .select('id, suggestion_data')
      .eq('student_id', studentId)
      .eq('suggestion_type', 'at_risk_prediction')
      .is('validated_outcome', null);

    if (predError) {
      result.errors.push(`Failed to fetch predictions: ${predError.message}`);
      return result;
    }

    if (!predictions || predictions.length === 0) return result;

    // 2. Filter predictions whose at_risk_clo_id matches any of the graded CLOs
    const relevantPredictions = predictions.filter((p) => {
      const data = p.suggestion_data as Record<string, unknown> | null;
      const predCloId = data?.at_risk_clo_id as string | undefined;
      return predCloId && cloIds.includes(predCloId);
    });

    if (relevantPredictions.length === 0) return result;

    // 3. Fetch current attainment for the student on the relevant CLOs
    const relevantCloIds = [
      ...new Set(
        relevantPredictions.map(
          (p) => (p.suggestion_data as Record<string, unknown>).at_risk_clo_id as string,
        ),
      ),
    ];

    const { data: attainments, error: attError } = await supabase
      .from('outcome_attainment')
      .select('outcome_id, attainment_percent')
      .eq('student_id', studentId)
      .in('outcome_id', relevantCloIds);

    if (attError) {
      result.errors.push(`Failed to fetch attainment: ${attError.message}`);
      return result;
    }

    const attainmentMap = new Map<string, number>(
      (attainments ?? []).map((a) => [a.outcome_id as string, a.attainment_percent as number]),
    );

    // 4. Validate each prediction
    for (const prediction of relevantPredictions) {
      const cloId = (prediction.suggestion_data as Record<string, unknown>).at_risk_clo_id as string;
      const attainment = attainmentMap.get(cloId);

      // If no attainment record exists yet, treat as at-risk (correct prediction)
      const validatedOutcome =
        attainment === undefined || attainment < AT_RISK_THRESHOLD ? 'correct' : 'incorrect';

      const { error: updateError } = await supabase
        .from('ai_feedback')
        .update({ validated_outcome: validatedOutcome })
        .eq('id', prediction.id);

      if (updateError) {
        result.errors.push(`Failed to update prediction ${prediction.id}: ${updateError.message}`);
      } else {
        result.updatedCount++;
      }
    }
  } catch (err) {
    result.errors.push(`Unexpected error: ${err instanceof Error ? err.message : String(err)}`);
  }

  return result;
}
