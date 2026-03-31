// =============================================================================
// Quiz Evidence Generator — Wires quiz scores into the CLO attainment pipeline
// =============================================================================

import { supabase } from '@/lib/supabase';

type AttainmentLevel = 'excellent' | 'satisfactory' | 'developing' | 'not_yet';

interface QuizEvidenceInput {
  attemptId: string;
  quizId: string;
  studentId: string;
  scorePercent: number;
  cloIds: string[];
}

/**
 * Generate evidence records from a quiz attempt score, feeding into the same
 * CLO attainment pipeline used by assignment grades.
 *
 * Creates one evidence record per linked CLO, then cascades the attainment rollup.
 */
export async function generateQuizEvidence(input: QuizEvidenceInput): Promise<void> {
  const { attemptId, quizId, studentId, scorePercent, cloIds } = input;

  if (cloIds.length === 0) return;

  const attainmentLevel = classifyAttainment(scorePercent);

  // Insert evidence records (one per CLO)
  // Cast through unknown to handle nullable FK columns for quiz-sourced evidence
  const evidenceRows = cloIds.map((cloId) => ({
    student_id: studentId,
    clo_id: cloId,
    score_percent: scorePercent,
    attainment_level: attainmentLevel,
  }));

  const { error: evidenceErr } = await (supabase.from('evidence') as unknown as {
    insert: (v: unknown) => Promise<{ error: { message: string } | null }>;
  }).insert(evidenceRows.map((r) => ({
    ...r,
    submission_id: attemptId, // re-use submission_id FK for quiz attempt reference
    grade_id: attemptId, // re-use grade_id FK for quiz attempt reference
    plo_id: null,
    ilo_id: null,
  })));

  if (evidenceErr) {
    console.error('[QuizEvidence] Failed to insert evidence:', evidenceErr.message);
  }

  // Fetch the quiz's course_id for attainment rollup
  const { data: quiz } = await supabase
    .from('quizzes')
    .select('course_id')
    .eq('id', quizId)
    .maybeSingle();

  if (!quiz) return;

  // Upsert CLO attainment for each linked CLO
  for (const cloId of cloIds) {
    try {
      const { data: evidenceList } = await supabase
        .from('evidence')
        .select('score_percent')
        .eq('student_id', studentId)
        .eq('clo_id', cloId);

      if (!evidenceList || evidenceList.length === 0) continue;

      const avgPercent =
        evidenceList.reduce((sum, e) => sum + (e.score_percent ?? 0), 0) / evidenceList.length;

      await supabase.from('outcome_attainment').upsert(
        {
          outcome_id: cloId,
          student_id: studentId,
          course_id: quiz.course_id,
          scope: 'student_course',
          attainment_percent: Math.round(avgPercent * 100) / 100,
          sample_count: evidenceList.length,
          last_calculated_at: new Date().toISOString(),
        },
        { onConflict: 'outcome_id,student_id,course_id,scope' },
      );
    } catch (err) {
      console.error(`[QuizEvidence] CLO attainment upsert failed for ${cloId}:`, err);
    }
  }
}

function classifyAttainment(percent: number): AttainmentLevel {
  if (percent >= 85) return 'excellent';
  if (percent >= 70) return 'satisfactory';
  if (percent >= 50) return 'developing';
  return 'not_yet';
}
