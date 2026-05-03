import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Types ──────────────────────────────────────────────────────────────────

interface GradePayload {
  grade_id: string;
  submission_id: string;
  total_score: number;
  score_percent: number;
  rubric_selections: Array<{ criterion_id: string; level_index: number; points: number }>;
}

type AttainmentLevel = 'Excellent' | 'Satisfactory' | 'Developing' | 'Not_Yet';

// ─── Helpers ────────────────────────────────────────────────────────────────

function classifyAttainment(percent: number): AttainmentLevel {
  if (percent >= 85) return 'Excellent';
  if (percent >= 70) return 'Satisfactory';
  if (percent >= 50) return 'Developing';
  return 'Not_Yet';
}

// ─── Performance Target ─────────────────────────────────────────────────────
// NFR-PERF-02: This function MUST complete within 500ms (wall clock).
// The full cascade (evidence insert → CLO → PLO → ILO rollup + notification)
// must fit within this budget. Monitor via Supabase Edge Function execution logs.
// See: performance-budget.config.ts, Requirements §50.2
// ─────────────────────────────────────────────────────────────────────────────

// ─── Main Handler ───────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Auth: require service role or teacher/admin ──────────────────
    const authHeader = req.headers.get('Authorization') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: 'Missing authorization header' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const userClient = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
      if (authError || !caller) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
      const callerRole = caller.app_metadata?.role ?? caller.user_metadata?.role ?? '';
      if (!['teacher', 'admin'].includes(callerRole)) {
        return new Response(
          JSON.stringify({ error: 'Forbidden: teacher or admin role required' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        );
      }
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const payload: GradePayload = await req.json();
    const { grade_id, submission_id } = payload;

    if (!grade_id || !submission_id) {
      return new Response(
        JSON.stringify({ error: 'Missing grade_id or submission_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 1: Fetch grade context ───────────────────────────────────────

    const { data: grade, error: gradeError } = await supabase
      .from('grades')
      .select('id, submission_id, total_score, score_percent, rubric_selections, graded_at')
      .eq('id', grade_id)
      .maybeSingle();

    if (gradeError || !grade) {
      return new Response(
        JSON.stringify({ error: 'Grade not found', detail: gradeError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: submission, error: subError } = await supabase
      .from('submissions')
      .select('id, assignment_id, student_id')
      .eq('id', submission_id)
      .maybeSingle();

    if (subError || !submission) {
      return new Response(
        JSON.stringify({ error: 'Submission not found', detail: subError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const { data: assignment, error: assignError } = await supabase
      .from('assignments')
      .select('id, course_id, clo_weights, total_marks')
      .eq('id', submission.assignment_id)
      .maybeSingle();

    if (assignError || !assignment) {
      return new Response(
        JSON.stringify({ error: 'Assignment not found', detail: assignError?.message }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const studentId: string = submission.student_id;
    const courseId: string = assignment.course_id;
    const cloWeights: Array<{ clo_id: string; weight: number }> = assignment.clo_weights ?? [];

    if (cloWeights.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No CLO weights on assignment — nothing to roll up' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    // ── Step 2: Create immutable evidence records (one per CLO) ───────────

    const evidenceRows = cloWeights.map((cw) => ({
      student_id: studentId,
      submission_id: submission.id,
      grade_id: grade_id,
      clo_id: cw.clo_id,
      plo_id: null,
      ilo_id: null,
      score_percent: grade.score_percent,
      attainment_level: classifyAttainment(grade.score_percent),
    }));

    const { error: evidenceError } = await supabase
      .from('evidence')
      .insert(evidenceRows);

    if (evidenceError) {
      console.error('Evidence insert failed:', evidenceError.message);
      // Continue with rollup even if evidence insert fails (idempotency)
    }

    // ── Step 3: Calculate CLO attainment (with Sub-CLO weighted rollup) ──

    const affectedCloIds = cloWeights.map((cw) => cw.clo_id);
    const affectedPloIds = new Set<string>();
    const affectedIloIds = new Set<string>();

    for (const cloId of affectedCloIds) {
      try {
        // Check if this CLO has Sub-CLOs (Task 109.4)
        const { data: subCLOs } = await supabase
          .from('learning_outcomes')
          .select('id, weight')
          .eq('type', 'SUB_CLO')
          .eq('parent_outcome_id', cloId);

        let avgPercent: number;
        let sampleCount: number;

        if (subCLOs && subCLOs.length > 0) {
          // Sub-CLO weighted rollup: parent CLO = sum(sub_clo_attainment × weight)
          let weightedSum = 0;
          let totalWeight = 0;
          let totalSamples = 0;

          for (const subCLO of subCLOs) {
            const { data: subAtt } = await supabase
              .from('outcome_attainment')
              .select('attainment_percent, sample_count')
              .eq('outcome_id', subCLO.id)
              .eq('student_id', studentId)
              .eq('scope', 'student_course')
              .maybeSingle();

            if (subAtt && subAtt.attainment_percent != null) {
              const w = subCLO.weight ?? 1;
              weightedSum += subAtt.attainment_percent * w;
              totalWeight += w;
              totalSamples += subAtt.sample_count ?? 0;
            }
          }

          avgPercent = totalWeight > 0 ? weightedSum / totalWeight : 0;
          sampleCount = totalSamples;
        } else {
          // No Sub-CLOs: direct evidence calculation (existing behavior)
          const { data: evidenceList, error: evListErr } = await supabase
            .from('evidence')
            .select('score_percent')
            .eq('student_id', studentId)
            .eq('clo_id', cloId);

          if (evListErr || !evidenceList || evidenceList.length === 0) {
            console.error(`No evidence found for CLO ${cloId}:`, evListErr?.message);
            continue;
          }

          avgPercent =
            evidenceList.reduce((sum: number, e: { score_percent: number }) => sum + e.score_percent, 0) /
            evidenceList.length;
          sampleCount = evidenceList.length;
        }

        // UPSERT CLO attainment
        const { error: upsertErr } = await supabase
          .from('outcome_attainment')
          .upsert(
            {
              outcome_id: cloId,
              student_id: studentId,
              course_id: courseId,
              scope: 'student_course',
              attainment_percent: Math.round(avgPercent * 100) / 100,
              sample_count: sampleCount,
              last_calculated_at: new Date().toISOString(),
            },
            { onConflict: 'outcome_id,student_id,course_id,scope' },
          );

        if (upsertErr) {
          console.error(`CLO attainment upsert failed for ${cloId}:`, upsertErr.message);
          continue;
        }

        // Collect PLO mappings for this CLO
        const { data: ploMappings } = await supabase
          .from('outcome_mappings')
          .select('target_outcome_id, weight')
          .eq('source_outcome_id', cloId);

        if (ploMappings) {
          for (const m of ploMappings) {
            affectedPloIds.add(m.target_outcome_id);
          }
        }
      } catch (err) {
        console.error(`CLO rollup error for ${cloId}:`, err);
      }
    }

    // ── Step 4: Cascade to PLO attainment ─────────────────────────────────

    for (const ploId of affectedPloIds) {
      try {
        // Fetch all CLO→PLO mappings for this PLO
        const { data: cloMappings } = await supabase
          .from('outcome_mappings')
          .select('source_outcome_id, weight')
          .eq('target_outcome_id', ploId);

        if (!cloMappings || cloMappings.length === 0) continue;

        let weightedSum = 0;
        let totalWeight = 0;
        let totalSamples = 0;

        for (const mapping of cloMappings) {
          // Fetch CLO attainment for this student
          const { data: cloAtt } = await supabase
            .from('outcome_attainment')
            .select('attainment_percent, sample_count')
            .eq('outcome_id', mapping.source_outcome_id)
            .eq('student_id', studentId)
            .eq('scope', 'student_course')
            .maybeSingle();

          if (cloAtt && cloAtt.attainment_percent != null) {
            const w = mapping.weight ?? 1;
            weightedSum += cloAtt.attainment_percent * w;
            totalWeight += w;
            totalSamples += cloAtt.sample_count ?? 0;
          }
        }

        if (totalWeight === 0) continue;

        const ploPercent = weightedSum / totalWeight;

        const { error: ploUpsertErr } = await supabase
          .from('outcome_attainment')
          .upsert(
            {
              outcome_id: ploId,
              student_id: studentId,
              course_id: courseId,
              scope: 'course',
              attainment_percent: Math.round(ploPercent * 100) / 100,
              sample_count: totalSamples,
              last_calculated_at: new Date().toISOString(),
            },
            { onConflict: 'outcome_id,student_id,course_id,scope' },
          );

        if (ploUpsertErr) {
          console.error(`PLO attainment upsert failed for ${ploId}:`, ploUpsertErr.message);
          continue;
        }

        // Collect ILO mappings for this PLO
        const { data: iloMappings } = await supabase
          .from('outcome_mappings')
          .select('target_outcome_id')
          .eq('source_outcome_id', ploId);

        if (iloMappings) {
          for (const m of iloMappings) {
            affectedIloIds.add(m.target_outcome_id);
          }
        }
      } catch (err) {
        console.error(`PLO rollup error for ${ploId}:`, err);
      }
    }

    // ── Step 5: Cascade to ILO attainment ─────────────────────────────────

    for (const iloId of affectedIloIds) {
      try {
        // Fetch all PLO→ILO mappings for this ILO
        const { data: ploMappings } = await supabase
          .from('outcome_mappings')
          .select('source_outcome_id, weight')
          .eq('target_outcome_id', iloId);

        if (!ploMappings || ploMappings.length === 0) continue;

        let weightedSum = 0;
        let totalWeight = 0;
        let totalSamples = 0;

        for (const mapping of ploMappings) {
          // Fetch PLO attainment for this student
          const { data: ploAtt } = await supabase
            .from('outcome_attainment')
            .select('attainment_percent, sample_count')
            .eq('outcome_id', mapping.source_outcome_id)
            .eq('student_id', studentId)
            .eq('scope', 'course')
            .maybeSingle();

          if (ploAtt && ploAtt.attainment_percent != null) {
            const w = mapping.weight ?? 1;
            weightedSum += ploAtt.attainment_percent * w;
            totalWeight += w;
            totalSamples += ploAtt.sample_count ?? 0;
          }
        }

        if (totalWeight === 0) continue;

        const iloPercent = weightedSum / totalWeight;

        const { error: iloUpsertErr } = await supabase
          .from('outcome_attainment')
          .upsert(
            {
              outcome_id: iloId,
              student_id: studentId,
              course_id: courseId,
              scope: 'program',
              attainment_percent: Math.round(iloPercent * 100) / 100,
              sample_count: totalSamples,
              last_calculated_at: new Date().toISOString(),
            },
            { onConflict: 'outcome_id,student_id,course_id,scope' },
          );

        if (iloUpsertErr) {
          console.error(`ILO attainment upsert failed for ${iloId}:`, iloUpsertErr.message);
        }
      } catch (err) {
        console.error(`ILO rollup error for ${iloId}:`, err);
      }
    }

    // ── Step 6: Cascade to Graduate Attribute attainment (Task 112.4) ────

    try {
      // Find all GA mappings that reference the affected ILOs
      const iloIdArray = Array.from(affectedIloIds);
      if (iloIdArray.length > 0) {
        const { data: gaMappings } = await supabase
          .from('graduate_attribute_mappings')
          .select('graduate_attribute_id, ilo_id, weight')
          .in('ilo_id', iloIdArray);

        if (gaMappings && gaMappings.length > 0) {
          // Group by GA
          const gaGroups = new Map<string, Array<{ ilo_id: string; weight: number }>>();
          for (const m of gaMappings) {
            const existing = gaGroups.get(m.graduate_attribute_id) ?? [];
            existing.push({ ilo_id: m.ilo_id, weight: m.weight });
            gaGroups.set(m.graduate_attribute_id, existing);
          }

          for (const [gaId, mappings] of gaGroups) {
            let weightedSum = 0;
            let totalWeight = 0;

            for (const mapping of mappings) {
              const { data: iloAtt } = await supabase
                .from('outcome_attainment')
                .select('attainment_percent')
                .eq('outcome_id', mapping.ilo_id)
                .eq('student_id', studentId)
                .eq('scope', 'program')
                .maybeSingle();

              if (iloAtt && iloAtt.attainment_percent != null) {
                weightedSum += iloAtt.attainment_percent * mapping.weight;
                totalWeight += mapping.weight;
              }
            }

            if (totalWeight > 0) {
              const gaPercent = weightedSum / totalWeight;
              await supabase
                .from('outcome_attainment')
                .upsert(
                  {
                    outcome_id: gaId,
                    student_id: studentId,
                    course_id: courseId,
                    scope: 'institution',
                    attainment_percent: Math.round(gaPercent * 100) / 100,
                    sample_count: mappings.length,
                    last_calculated_at: new Date().toISOString(),
                  },
                  { onConflict: 'outcome_id,student_id,course_id,scope' },
                );
            }
          }
        }
      }
    } catch (err) {
      console.error('GA rollup error:', err);
    }

    // ── Step 7: Insert notification for student ───────────────────────────

    try {
      // Build notification metadata
      const notificationMetadata: Record<string, unknown> = {
        assignment_id: assignment.id,
        score_percent: grade.score_percent,
        grade_id: grade_id,
      };

      // Requirement 10.3: Include "Ask Tutor" deep link for low-scoring submissions (below 70%)
      if (grade.score_percent < 70 && cloWeights.length > 0) {
        const cloIdList = cloWeights.map((cw: { clo_id: string }) => cw.clo_id).join(',');
        notificationMetadata.tutor_action_url =
          `/student/tutor?courseId=${courseId}&cloIds=${cloIdList}`;
      }

      await supabase.from('notifications').insert({
        user_id: studentId,
        type: 'grade_released',
        title: 'Grade Released',
        body: grade.score_percent < 70
          ? 'Your assignment has been graded. Need help improving? Ask the AI Tutor.'
          : 'Your assignment has been graded',
        metadata: notificationMetadata,
        read: false,
      });
    } catch (err) {
      console.error('Notification insert failed:', err);
    }

    // ── Response ──────────────────────────────────────────────────────────

    return new Response(
      JSON.stringify({
        success: true,
        evidence_count: evidenceRows.length,
        clo_count: affectedCloIds.length,
        plo_count: affectedPloIds.size,
        ilo_count: affectedIloIds.size,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
