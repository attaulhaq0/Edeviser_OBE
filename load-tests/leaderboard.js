/**
 * k6 Load Test — Leaderboard Queries with Concurrent Reads
 *
 * Simulates heavy concurrent reads on the leaderboard endpoint,
 * testing PostgREST read performance under load.
 * Validates NFR-PERF-03 (p95 ≤ 300ms) and NFR-PERF-04 (5,000 concurrent users).
 *
 * Feature: edeviser-platform
 * Requirements: 57
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=https://xxx.supabase.co \
 *          --env SUPABASE_ANON_KEY=eyJ... \
 *          --env ACCESS_TOKEN=eyJ... \
 *          --env COURSE_ID=uuid \
 *          load-tests/leaderboard.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const queryDuration = new Trend('leaderboard_query_duration', true);
const queryFailRate = new Rate('leaderboard_failures');

const BASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';
const COURSE_ID = __ENV.COURSE_ID || 'test-course-id';

const authHeaders = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ACCESS_TOKEN}`,
};

export const options = {
  stages: [
    { duration: '1m', target: 1000 },
    { duration: '2m', target: 5000 },
    { duration: '3m', target: 5000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    leaderboard_query_duration: ['p(95)<300'],
    leaderboard_failures: ['rate<0.05'],
  },
};

export default function () {
  // Query leaderboard view — top 50 students by XP for a course
  const leaderboardUrl =
    `${BASE_URL}/rest/v1/leaderboard_view` +
    `?course_id=eq.${COURSE_ID}` +
    `&order=xp_total.desc` +
    `&limit=50`;

  const res = http.get(leaderboardUrl, { headers: authHeaders });

  queryDuration.add(res.timings.duration);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'returns array': (r) => {
      try {
        return Array.isArray(JSON.parse(r.body));
      } catch {
        return false;
      }
    },
    'p95 under 300ms': (r) => r.timings.duration < 300,
  });

  queryFailRate.add(!ok);

  // Simulate a second read — individual student rank lookup
  const rankUrl =
    `${BASE_URL}/rest/v1/leaderboard_view` +
    `?course_id=eq.${COURSE_ID}` +
    `&select=rank,xp_total,student_id` +
    `&limit=1`;

  const rankRes = http.get(rankUrl, { headers: authHeaders });

  queryDuration.add(rankRes.timings.duration);

  const rankOk = check(rankRes, {
    'rank lookup 200': (r) => r.status === 200,
  });

  queryFailRate.add(!rankOk);

  sleep(Math.random() * 2 + 0.5);
}
