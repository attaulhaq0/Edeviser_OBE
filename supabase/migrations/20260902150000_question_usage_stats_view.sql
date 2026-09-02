-- question_usage_stats_v1 (E2.C): per-question usage analytics built purely
-- from existing tables — question_bank metadata + question_analytics metrics
-- + times-served counts derived from quiz_attempts.question_sequence
-- (JSONB array of {question_id, difficulty_rating, bloom_level}).
-- security_invoker = true so RLS on the underlying tables applies to viewers.

CREATE OR REPLACE VIEW public.question_usage_stats_v1
WITH (security_invoker = true) AS
SELECT
  qb.id AS question_id,
  qb.institution_id,
  qb.course_id,
  qb.clo_id,
  qb.bloom_level,
  qb.question_type,
  qb.difficulty_rating,
  qb.status,
  qb.generation_source,
  qb.created_at,
  COALESCE(usage.times_served, 0) AS times_served,
  qa.total_attempts,
  qa.correct_count,
  qa.success_rate,
  qa.avg_response_time_seconds,
  qa.discrimination_index,
  qa.calibrated_difficulty,
  qa.quality_flag,
  qa.last_calculated_at
FROM public.question_bank qb
LEFT JOIN public.question_analytics qa
  ON qa.question_id = qb.id
LEFT JOIN (
  SELECT
    elem->>'question_id' AS qid,
    count(*)::bigint AS times_served
  FROM public.quiz_attempts att
  CROSS JOIN LATERAL jsonb_array_elements(att.question_sequence) AS elem
  WHERE jsonb_typeof(att.question_sequence) = 'array'
    AND elem->>'question_id' IS NOT NULL
  GROUP BY elem->>'question_id'
) usage ON usage.qid = qb.id::text;
