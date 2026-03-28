/**
 * k6 Load Test — Authentication Flow
 *
 * Simulates login under load against Supabase GoTrue.
 * Validates NFR-PERF-03 (p95 ≤ 300ms) and NFR-PERF-04 (5,000 concurrent users).
 *
 * Feature: edeviser-platform
 * Requirements: 57
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=https://xxx.supabase.co \
 *          --env SUPABASE_ANON_KEY=eyJ... \
 *          --env TEST_EMAIL=student@example.com \
 *          --env TEST_PASSWORD=password123 \
 *          load-tests/login.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const loginDuration = new Trend('login_duration', true);
const loginFailRate = new Rate('login_failures');

const BASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const TEST_EMAIL = __ENV.TEST_EMAIL || 'student@example.com';
const TEST_PASSWORD = __ENV.TEST_PASSWORD || 'password123';

if (!ANON_KEY) {
  console.error('FATAL: ANON_KEY environment variable is required. Set it via --env SUPABASE_ANON_KEY=...');
  // k6 doesn't have process.exit, but throwing in init context aborts the test
  throw new Error('Missing ANON_KEY');
}

export const options = {
  stages: [
    { duration: '1m', target: 1000 },
    { duration: '2m', target: 5000 },
    { duration: '3m', target: 5000 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<300'],
    login_duration: ['p(95)<300'],
    login_failures: ['rate<0.05'],
  },
};

export default function () {
  const url = `${BASE_URL}/auth/v1/token?grant_type=password`;
  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      apikey: ANON_KEY,
    },
  };

  const res = http.post(url, payload, params);

  loginDuration.add(res.timings.duration);

  const ok = check(res, {
    'status is 200': (r) => r.status === 200,
    'has access_token': (r) => {
      try {
        return JSON.parse(r.body).access_token !== undefined;
      } catch {
        return false;
      }
    },
    'p95 under 300ms': (r) => r.timings.duration < 300,
  });

  loginFailRate.add(!ok);

  sleep(Math.random() * 2 + 1);
}
