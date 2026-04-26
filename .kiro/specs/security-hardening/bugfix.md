# Bugfix Requirements Document

## Introduction

The Edeviser platform has multiple systemic security vulnerabilities identified across two independent security audit reports (SECURITY-AUDIT-REPORT.md dated 2026-03-24 and SECURITY-AUDIT-2026-03-28.md). These vulnerabilities span authentication bypass, privilege escalation, cross-tenant data leakage, error message information disclosure, missing input validation, and CORS misconfiguration. The combined impact allows unauthenticated attackers to invoke privileged Edge Functions, authenticated users to manipulate other students' gamification data, and staff at one institution to read or write data belonging to other institutions. This bugfix addresses 10 categories of systemic issues affecting 50+ files across the platform.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN a request includes an Authorization header where the service role key appears as a substring (e.g., `Bearer <service_role_key>`) THEN the system accepts it as a valid service-role call in 13 Edge Functions and `_shared/auth.ts` because `authHeader.includes(serviceRoleKey)` performs substring matching instead of strict equality

1.2 WHEN an authenticated user calls `POST /check-badges` with a `student_id` belonging to a different student THEN the system evaluates and awards badges to the target student without verifying that the caller owns or has authority over that `student_id`

1.3 WHEN an authenticated user calls `POST /process-streak` with a `student_id` belonging to a different student THEN the system processes a streak update for the target student without verifying caller ownership, allowing manipulation of another student's streak count, freeze inventory, and milestone XP

1.4 WHEN an unauthenticated caller invokes any of the 15+ Edge Functions that lack authentication checks (including `send-email-notification`, `generate-accreditation-report`, `ai-feedback-draft`, `ai-module-suggestion`, `compute-habit-correlations`, `calculate-attainment-rollup`, `update-question-analytics`, `check-login-rate` check/record_failure actions) THEN the system processes the request using the `SUPABASE_SERVICE_ROLE_KEY` with zero caller verification

1.5 WHEN multiple Edge Functions check the caller's role using the fallback chain `user.app_metadata?.role ?? user.user_metadata?.role` THEN the system trusts user-editable `user_metadata.role` as authoritative, allowing any authenticated user to self-assign admin privileges via `supabase.auth.updateUser({ data: { role: 'admin' } })`

1.6 WHEN an admin or coordinator at Institution A queries tables protected by RLS policies that check role but not `institution_id` (including `student_courses`, `outcome_mappings`, `assignments`, `outcome_attainment`, `attendance_records`, `xp_transactions`, `ai_feedback`, `student_activity_log`, `habit_tracking`, `badges`, `verified_explanations`) THEN the system returns data belonging to all institutions across the platform

1.7 WHEN any of the 19 frontend hooks encounter a Supabase/PostgreSQL error THEN the system displays the raw error message to the user via `toast.error(err.message)`, leaking internal details such as table names, column names, constraint names, and PostgreSQL error codes (42 instances across 19 hooks)

1.8 WHEN 50+ frontend hooks submit data to Supabase without Zod validation THEN the system relies solely on form-level validation, allowing programmatic callers or tampered requests to bypass client-side checks

1.9 WHEN any browser origin sends a cross-origin request to any of the 50+ Edge Functions THEN the system responds with `Access-Control-Allow-Origin: '*'`, allowing any malicious website to invoke these endpoints from a visitor's browser session

1.10 WHEN audit log entries are created via `logAuditEvent()` THEN the system dumps the complete form data object (including email, full_name, grades, rubric_selections, feedback text) into the `changes` field without PII filtering

1.11 WHEN the `award-xp/index.ts` and `check-badges/index.ts` files contain unresolved git merge conflict markers (`<<<<<<< HEAD` / `=======` / `>>>>>>>`) THEN the Deno runtime cannot parse these files, causing the entire XP award and badge evaluation systems to return 500 errors on every invocation

1.12 WHEN the `authenticateCronRequest()` function in `_shared/auth.ts` checks for the service role key THEN it uses the same vulnerable `authHeader.includes(serviceRoleKey)` substring matching, allowing bypass of cron authentication

### Expected Behavior (Correct)

2.1 WHEN a request includes an Authorization header THEN the system SHALL extract the Bearer token via `authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''` and compare it to the service role key using strict equality (`bearerToken === serviceRoleKey`) in all 13 Edge Functions and `_shared/auth.ts`

2.2 WHEN a non-service-role caller invokes `POST /check-badges` with a `student_id` THEN the system SHALL verify that `caller.id === student_id` OR that the caller has a teacher/admin role (from `app_metadata` only), and SHALL return 403 Forbidden if neither condition is met

2.3 WHEN a non-service-role caller invokes `POST /process-streak` with a `student_id` THEN the system SHALL verify that `caller.id === student_id` and SHALL return 403 Forbidden if the caller is not the target student

2.4 WHEN any caller invokes an Edge Function that requires authentication THEN the system SHALL validate the caller's JWT via `supabase.auth.getUser()` before processing the request, and SHALL return 401 Unauthorized if no valid JWT is present; cron-only functions SHALL require a valid `x-cron-secret` header or service-role Bearer token (with strict equality)

2.5 WHEN Edge Functions check the caller's role for authorization THEN the system SHALL use only `user.app_metadata?.role` (server-set, not user-editable) and SHALL NOT fall back to `user.user_metadata?.role`

2.6 WHEN RLS policies grant access based on role THEN the system SHALL additionally filter by `institution_id` using the `auth_institution_id()` helper function, ensuring that admins, coordinators, and teachers can only access data belonging to their own institution across all 13+ affected policies

2.7 WHEN a Supabase/PostgreSQL error occurs in any frontend hook THEN the system SHALL display a generic user-friendly error message (e.g., "Something went wrong. Please try again.") via `toast.error()` and SHALL log the detailed error to the console for debugging purposes only

2.8 WHEN frontend hooks submit data to Supabase THEN the system SHALL validate all input data against Zod schemas before executing the mutation, rejecting invalid data before it reaches the database

2.9 WHEN a cross-origin request is received by any Edge Function THEN the system SHALL check the `Origin` header against an allowlist of approved domains (configured via `ALLOWED_ORIGINS` environment variable) and SHALL only return the matching origin in `Access-Control-Allow-Origin`, defaulting to the production domain

2.10 WHEN audit log entries are created THEN the system SHALL filter the `changes` field through an explicit allowlist of non-PII fields per entity type, excluding sensitive data such as email addresses, full names, and detailed feedback text

2.11 WHEN `award-xp/index.ts` and `check-badges/index.ts` are deployed THEN the system SHALL contain no unresolved merge conflict markers, and both files SHALL parse and execute correctly on the Deno runtime

2.12 WHEN the `authenticateCronRequest()` function in `_shared/auth.ts` checks for the service role key THEN it SHALL extract the Bearer token and use strict equality comparison, consistent with the fix applied to all other Edge Functions

### Unchanged Behavior (Regression Prevention)

3.1 WHEN a legitimate service-role call is made from one Edge Function to another (e.g., `process-streak` calling `award-xp`) using `Authorization: Bearer <service_role_key>` THEN the system SHALL CONTINUE TO accept the call as authorized after the strict equality fix

3.2 WHEN a student calls `POST /process-streak` with their own `student_id` THEN the system SHALL CONTINUE TO process the streak update normally, including streak increment, freeze consumption, comeback challenge logic, and milestone XP awards

3.3 WHEN a student calls `POST /check-badges` with their own `student_id` after a qualifying action THEN the system SHALL CONTINUE TO evaluate badge conditions and award earned badges with XP rewards

3.4 WHEN the 6 Edge Functions that already have proper authentication (`generate-quiz-questions`, `select-adaptive-question`, `generate-starter-week`, `process-onboarding`, `suggest-goals`, `bulk-import-users`) receive authenticated requests THEN the system SHALL CONTINUE TO process them with existing JWT validation and authorization logic unchanged

3.5 WHEN an admin at Institution A queries data scoped to Institution A THEN the system SHALL CONTINUE TO return the correct data for their institution after the cross-tenant RLS fixes are applied

3.6 WHEN a student queries their own data (journal entries, submissions, XP history, habit logs) THEN the system SHALL CONTINUE TO return their data correctly, as student-scoped RLS policies that use `student_id = auth.uid()` are not affected by the institution_id fixes

3.7 WHEN a successful Supabase mutation completes in a frontend hook THEN the system SHALL CONTINUE TO show success toast notifications and invalidate relevant TanStack Query caches

3.8 WHEN the `sanitizePostgrestValue()` function in `src/lib/sanitizeFilter.ts` escapes PostgREST special characters THEN the system SHALL CONTINUE TO function correctly for search/filter operations

3.9 WHEN `export-student-data` Edge Function processes GDPR export requests THEN the system SHALL CONTINUE TO derive `studentId` from the authenticated user's JWT (not request body) and use its existing scoped CORS configuration

3.10 WHEN cron-scheduled functions (`weekly-summary-cron`, `streak-risk-cron`, `ai-at-risk-prediction`, `compute-at-risk-signals`, `perfect-day-prompt`) are invoked by pg_cron with the correct `x-cron-secret` header THEN the system SHALL CONTINUE TO execute normally

3.11 WHEN the XP award system processes legitimate XP awards with adaptive multipliers (level-based, difficulty-based, diminishing returns, bonus events) THEN the system SHALL CONTINUE TO calculate and apply multipliers correctly after the merge conflict resolution

3.12 WHEN the badge evaluation engine checks streak badges, academic badges, engagement badges, mystery badges, habit badges, Bloom's badges, team badges, and study badges THEN the system SHALL CONTINUE TO evaluate all badge conditions correctly after the merge conflict resolution


---

## Bug Condition Derivation

### Bug Condition 1: Substring Auth Bypass

```pascal
FUNCTION isBugCondition_SubstringAuth(X)
  INPUT: X of type EdgeFunctionRequest
  OUTPUT: boolean
  
  // Returns true when the Authorization header contains the service role key
  // as a substring but is NOT a strict Bearer token match
  bearerToken ← extractBearerToken(X.authHeader)
  RETURN X.authHeader.includes(serviceRoleKey) AND bearerToken ≠ serviceRoleKey
END FUNCTION
```

```pascal
// Property: Fix Checking — Strict Bearer Token Equality
FOR ALL X WHERE isBugCondition_SubstringAuth(X) DO
  result ← authenticateRequest'(X)
  ASSERT result.isServiceRole = false
END FOR
```

```pascal
// Property: Preservation Checking — Legitimate Service Role Calls
FOR ALL X WHERE NOT isBugCondition_SubstringAuth(X) DO
  ASSERT authenticateRequest(X) = authenticateRequest'(X)
END FOR
```

### Bug Condition 2: IDOR in check-badges and process-streak

```pascal
FUNCTION isBugCondition_IDOR(X)
  INPUT: X of type GamificationRequest { caller_id: UUID, student_id: UUID, is_service_role: boolean }
  OUTPUT: boolean
  
  // Returns true when a non-service-role caller targets a different student
  RETURN NOT X.is_service_role AND X.caller_id ≠ X.student_id
END FUNCTION
```

```pascal
// Property: Fix Checking — IDOR Prevention
FOR ALL X WHERE isBugCondition_IDOR(X) DO
  result ← processRequest'(X)
  ASSERT result.status = 403 AND result.body.error = "Forbidden"
END FOR
```

```pascal
// Property: Preservation Checking — Self-Triggered Requests
FOR ALL X WHERE NOT isBugCondition_IDOR(X) DO
  ASSERT processRequest(X).status = processRequest'(X).status
END FOR
```

### Bug Condition 3: Unauthenticated Edge Function Access

```pascal
FUNCTION isBugCondition_NoAuth(X)
  INPUT: X of type EdgeFunctionRequest
  OUTPUT: boolean
  
  // Returns true when the request has no valid JWT and no valid service role token
  RETURN NOT hasValidJWT(X) AND NOT hasValidServiceRoleToken(X) AND NOT hasValidCronSecret(X)
END FUNCTION
```

```pascal
// Property: Fix Checking — Authentication Required
FOR ALL X WHERE isBugCondition_NoAuth(X) DO
  result ← handleRequest'(X)
  ASSERT result.status ∈ {401, 403}
END FOR
```

```pascal
// Property: Preservation Checking — Authenticated Requests
FOR ALL X WHERE NOT isBugCondition_NoAuth(X) DO
  ASSERT handleRequest(X).status = handleRequest'(X).status
END FOR
```

### Bug Condition 4: Role Spoofing via user_metadata

```pascal
FUNCTION isBugCondition_RoleSpoofing(X)
  INPUT: X of type AuthenticatedUser
  OUTPUT: boolean
  
  // Returns true when app_metadata.role differs from user_metadata.role
  // (indicating potential spoofing via self-set user_metadata)
  RETURN X.app_metadata.role ≠ X.user_metadata.role AND X.user_metadata.role ∈ {'admin', 'teacher', 'coordinator'}
END FUNCTION
```

```pascal
// Property: Fix Checking — Only app_metadata Trusted
FOR ALL X WHERE isBugCondition_RoleSpoofing(X) DO
  result ← getCallerRole'(X)
  ASSERT result = X.app_metadata.role
END FOR
```

### Bug Condition 5: Cross-Tenant Data Leakage

```pascal
FUNCTION isBugCondition_CrossTenant(X)
  INPUT: X of type RLSQuery { caller_institution_id: UUID, target_institution_id: UUID, caller_role: string }
  OUTPUT: boolean
  
  // Returns true when a staff member queries data from a different institution
  RETURN X.caller_role ∈ {'admin', 'coordinator', 'teacher'} AND X.caller_institution_id ≠ X.target_institution_id
END FUNCTION
```

```pascal
// Property: Fix Checking — Institution Isolation
FOR ALL X WHERE isBugCondition_CrossTenant(X) DO
  result ← executeQuery'(X)
  ASSERT result.rows = ∅
END FOR
```

```pascal
// Property: Preservation Checking — Same-Institution Access
FOR ALL X WHERE NOT isBugCondition_CrossTenant(X) DO
  ASSERT executeQuery(X) = executeQuery'(X)
END FOR
```

### Bug Condition 6: Error Message Information Leakage

```pascal
FUNCTION isBugCondition_ErrorLeak(X)
  INPUT: X of type MutationError { error: PostgresError }
  OUTPUT: boolean
  
  // Returns true when the error message contains internal details
  RETURN X.error.message.containsAny(["relation", "column", "constraint", "violates", "duplicate key"])
END FUNCTION
```

```pascal
// Property: Fix Checking — Generic Error Messages
FOR ALL X WHERE isBugCondition_ErrorLeak(X) DO
  displayedMessage ← handleError'(X)
  ASSERT NOT displayedMessage.containsAny(["relation", "column", "constraint", "violates", "duplicate key"])
END FOR
```

### Bug Condition 7: Wildcard CORS

```pascal
FUNCTION isBugCondition_WildcardCORS(X)
  INPUT: X of type CrossOriginRequest { origin: string }
  OUTPUT: boolean
  
  // Returns true when the request origin is not in the approved allowlist
  RETURN X.origin NOT IN ALLOWED_ORIGINS
END FUNCTION
```

```pascal
// Property: Fix Checking — Origin Allowlist
FOR ALL X WHERE isBugCondition_WildcardCORS(X) DO
  response ← handleCORS'(X)
  ASSERT response.headers['Access-Control-Allow-Origin'] ≠ '*'
  ASSERT response.headers['Access-Control-Allow-Origin'] ≠ X.origin
END FOR
```

```pascal
// Property: Preservation Checking — Approved Origins
FOR ALL X WHERE NOT isBugCondition_WildcardCORS(X) DO
  response ← handleCORS'(X)
  ASSERT response.headers['Access-Control-Allow-Origin'] = X.origin
END FOR
```
