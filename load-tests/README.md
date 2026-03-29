# Edeviser Load Tests (k6)

Load test scripts validating NFR performance targets from the Edeviser platform spec.

| Target | Value | Source |
|--------|-------|--------|
| Concurrent users | 5,000 | NFR-PERF-04 |
| API p95 response time | ≤ 300ms | NFR-PERF-03 |
| Rollup latency | ≤ 500ms | NFR-PERF-02 |

## Prerequisites

Install [k6](https://k6.io/docs/get-started/installation/):

```bash
# macOS
brew install k6

# Windows
choco install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" \
  | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update && sudo apt-get install k6
```

## Environment Variables

All scripts require these env vars:

| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL (e.g. `https://xxx.supabase.co`) |
| `SUPABASE_ANON_KEY` | Supabase anon/public key |
| `ACCESS_TOKEN` | Valid JWT for authenticated requests (not needed for `login.js`) |
| `TEST_EMAIL` | Test user email (login.js only) |
| `TEST_PASSWORD` | Test user password (login.js only) |

Some scripts accept additional IDs (`ASSIGNMENT_ID`, `COURSE_ID`, `SUBMISSION_ID`, `RUBRIC_ID`, `CLO_ID`) — see each script header for details.

## Scripts

### `login.js` — Authentication flow

Simulates email/password login via Supabase GoTrue. Ramps to 5,000 VUs.

```bash
k6 run --env SUPABASE_URL=https://xxx.supabase.co \
       --env SUPABASE_ANON_KEY=eyJ... \
       --env TEST_EMAIL=student@example.com \
       --env TEST_PASSWORD=password123 \
       load-tests/login.js
```

### `submission.js` — Assignment submission with file upload

Simulates file upload to Supabase Storage + submission record insert. Ramps to 5,000 VUs.

```bash
k6 run --env SUPABASE_URL=https://xxx.supabase.co \
       --env SUPABASE_ANON_KEY=eyJ... \
       --env ACCESS_TOKEN=eyJ... \
       --env ASSIGNMENT_ID=<uuid> \
       --env COURSE_ID=<uuid> \
       load-tests/submission.js
```

### `grading-pipeline.js` — Grade → Evidence → Rollup chain

Simulates grade submission triggering the evidence generator and attainment rollup Edge Function. Uses a lower VU target (2,000) since grading is a teacher-only action.

```bash
k6 run --env SUPABASE_URL=https://xxx.supabase.co \
       --env SUPABASE_ANON_KEY=eyJ... \
       --env ACCESS_TOKEN=eyJ... \
       --env SUBMISSION_ID=<uuid> \
       --env RUBRIC_ID=<uuid> \
       --env CLO_ID=<uuid> \
       load-tests/grading-pipeline.js
```

### `leaderboard.js` — Leaderboard concurrent reads

Simulates heavy concurrent reads on the leaderboard view. Ramps to 5,000 VUs.

```bash
k6 run --env SUPABASE_URL=https://xxx.supabase.co \
       --env SUPABASE_ANON_KEY=eyJ... \
       --env ACCESS_TOKEN=eyJ... \
       --env COURSE_ID=<uuid> \
       load-tests/leaderboard.js
```

## VU Ramping Stages

All scripts (except grading-pipeline) use this profile:

| Stage | Duration | Target VUs |
|-------|----------|------------|
| Ramp up | 1 min | 1,000 |
| Ramp up | 2 min | 5,000 |
| Sustain | 3 min | 5,000 |
| Ramp down | 1 min | 0 |

The grading pipeline uses a reduced peak of 2,000 VUs to reflect realistic teacher concurrency.

## Thresholds

Each script defines k6 thresholds that cause a non-zero exit code on failure:

- `http_req_duration` p95 < 300ms
- Custom metric p95 < 300ms (or 500ms for rollup)
- Failure rate < 5%

## Tips

- Run against a staging environment, not production.
- Seed test data first (users, courses, assignments) using `supabase/seed.sql`.
- Use `k6 run --out json=results.json` to capture detailed results.
- For CI integration, the non-zero exit on threshold breach works with any CI runner.
