/**
 * k6 Load Test — Assignment Submission with File Upload
 *
 * Simulates students submitting assignments (file upload to Supabase Storage
 * + insert into submissions table) under load.
 * Validates NFR-PERF-03 (p95 ≤ 300ms) and NFR-PERF-04 (5,000 concurrent users).
 *
 * Feature: edeviser-platform
 * Requirements: 57
 *
 * Usage:
 *   k6 run --env SUPABASE_URL=https://xxx.supabase.co \
 *          --env SUPABASE_ANON_KEY=eyJ... \
 *          --env ACCESS_TOKEN=eyJ... \
 *          --env ASSIGNMENT_ID=uuid \
 *          --env COURSE_ID=uuid \
 *          load-tests/submission.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const uploadDuration = new Trend('upload_duration', true);
const insertDuration = new Trend('submission_insert_duration', true);
const submissionFailRate = new Rate('submission_failures');

const BASE_URL = __ENV.SUPABASE_URL || 'http://localhost:54321';
const ANON_KEY = __ENV.SUPABASE_ANON_KEY || '';
const ACCESS_TOKEN = __ENV.ACCESS_TOKEN || '';
const ASSIGNMENT_ID = __ENV.ASSIGNMENT_ID || 'test-assignment-id';
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
    upload_duration: ['p(95)<300'],
    submission_insert_duration: ['p(95)<300'],
    submission_failures: ['rate<0.05'],
  },
};

function generateFilePayload() {
  const content = 'x'.repeat(1024);
  return {
    file: http.file(content, `submission-${Date.now()}.txt`, 'text/plain'),
  };
}

export default function () {
  const vuId = __VU;
  const iter = __ITER;
  const fileName = `submissions/${COURSE_ID}/${ASSIGNMENT_ID}/vu${vuId}-${iter}-${Date.now()}.txt`;

  // Step 1: Upload file to Supabase Storage
  const uploadUrl = `${BASE_URL}/storage/v1/object/assignments/${fileName}`;
  const fileData = generateFilePayload();
  const uploadRes = http.post(uploadUrl, fileData.file.data, {
    headers: {
      ...authHeaders,
      'Content-Type': 'text/plain',
    },
  });

  uploadDuration.add(uploadRes.timings.duration);

  const uploadOk = check(uploadRes, {
    'upload status 200': (r) => r.status === 200 || r.status === 201,
  });

  // Step 2: Insert submission record via PostgREST
  const submissionUrl = `${BASE_URL}/rest/v1/submissions`;
  const submissionPayload = JSON.stringify({
    assignment_id: ASSIGNMENT_ID,
    file_url: fileName,
    is_late: false,
    submitted_at: new Date().toISOString(),
  });

  const insertRes = http.post(submissionUrl, submissionPayload, {
    headers: {
      ...authHeaders,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
  });

  insertDuration.add(insertRes.timings.duration);

  const insertOk = check(insertRes, {
    'insert status 2xx': (r) => r.status >= 200 && r.status < 300,
    'insert p95 under 300ms': (r) => r.timings.duration < 300,
  });

  submissionFailRate.add(!uploadOk || !insertOk);

  sleep(Math.random() * 2 + 1);
}
