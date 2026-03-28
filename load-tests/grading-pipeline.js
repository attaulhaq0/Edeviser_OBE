/**
 * k6 Load Test — Grading Pipeline (Grade → Evidence → Rollup)
 *
 * Simulates teachers submitting grades, which triggers the evidence generator
 * and attainment rollup chain via the calculate-attainment-rollup Edge Function.
 * Validates NFR-PERF-02 (rollup ≤ 500ms) and NFR-PERF-03 (p95 ≤ 300ms).
 *
 * Feature: edeviser-platform
 * Requirements: 57
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=https://xxx.supabase.co \
 *          --env SUPABASE_ANON_KEY=eyJ... \
 *          --env ACCESS_TOKEN=eyJ... \
 *          --env SUBMISSION_ID=uuid \
 *          --env RUBRIC_ID=uuid \
 *          --env CLO_ID=uuid \
 *          load-tests/grading-pipeline.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const gradeInsertDuration = new Trend('grade_insert_duration', true);
const rollupDuration = new Trend('rollup_duration', true);
const pipelineFailRate = new Rate('pipeline_failures');

const BASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';
const SUBMISSION_ID = __ENV.SUBMISSION_ID || 'test-submission-id';
const RUBRIC_ID = __ENV.RUBRIC_ID || 'test-rubric-id';
const CLO_ID = __ENV.CLO_ID || 'test-clo-id';

const authHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ACCESS_TOKEN}`,
  'Content-Type': 'application/json',
};

export const options = {
  stages: [
    { duration: '1m', target: 500 },
    { duration: '2m', target: 2000 },
    { duration: '3m', target: 2000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    grade_insert_duration: ['p(95)<300'],
    rollup_duration: ['p(95)<500'],
    pipeline_failures: ['rate<0.05'],
  },
};

export default function () {
  const scorePercent = Math.floor(Math.random() * 50) + 50;

  // Step 1: Insert grade via PostgREST
  const gradeUrl = `${BASE_URL}/rest/v1/grades`;
  const gradePayload = JSON.stringify({
    submission_id: SUBMISSION_ID,
    rubric_id: RUBRIC_ID,
    total_score: scorePercent,
    score_percent: scorePercent,
    overall_feedback: `Load test feedback — score ${scorePercent}%`,
    graded_at: new Date().toISOString(),
  });

  const gradeRes = http.post(gradeUrl, gradePayload, {
    headers: { ...authHeaders, Prefer: 'return=minimal' },
  });

  gradeInsertDuration.add(gradeRes.timings.duration);

  const gradeOk = check(gradeRes, {
    'grade insert 2xx': (r) => r.status >= 200 && r.status < 300,
    'grade p95 under 300ms': (r) => r.timings.duration < 300,
  });

  // Step 2: Trigger attainment rollup Edge Function
  const rollupUrl = `${BASE_URL}/functions/v1/calculate-attainment-rollup`;
  const rollupPayload = JSON.stringify({
    submission_id: SUBMISSION_ID,
    clo_id: CLO_ID,
  });

  const rollupRes = http.post(rollupUrl, rollupPayload, {
    headers: authHeaders,
  });

  rollupDuration.add(rollupRes.timings.duration);

  const rollupOk = check(rollupRes, {
    'rollup status 2xx': (r) => r.status >= 200 && r.status < 300,
    'rollup under 500ms': (r) => r.timings.duration < 500,
  });

  pipelineFailRate.add(!gradeOk || !rollupOk);

  sleep(Math.random() * 3 + 1);
}
