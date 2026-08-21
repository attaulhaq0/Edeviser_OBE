# Outcome Security Remediation — verified 2026-08-21 (live pg_policy)

## Status: REMEDIATED (live-verified)

The PDF §11 requirement — separate role- and type-scoped policies per command with USING and
WITH CHECK — is fully implemented in the live database.

## learning_outcomes policies (live)

| Policy | Command | Enforcement |
|---|---|---|
| outcomes_institution_read | SELECT | institution_id = auth_institution_id() |
| outcomes_anon_public_portfolio | SELECT | anon read only via public-portfolio attainment join |
| outcomes_admin_ilo_insert | INSERT | role=admin AND type='ILO' AND own institution AND program_id IS NULL AND course_id IS NULL (WITH CHECK) |
| outcomes_admin_ilo_update | UPDATE | same as insert (USING + WITH CHECK) — an ILO form cannot mutate a PLO/CLO via arbitrary ID |
| outcomes_admin_ilo_delete | DELETE | role=admin AND type='ILO' AND own institution |
| outcomes_coordinator_plo_insert | INSERT | role=coordinator AND type='PLO' AND own institution AND course_id IS NULL AND program ∈ coordinator's programs (WITH CHECK) |
| outcomes_coordinator_plo_update | UPDATE | same (USING + WITH CHECK) |
| outcomes_coordinator_plo_delete | DELETE | role=coordinator AND type='PLO' AND program ∈ coordinator's programs |
| outcomes_teacher_clo_insert | INSERT | role=teacher AND type='CLO' AND own institution AND course ∈ teacher's courses (WITH CHECK) |
| outcomes_teacher_clo_update | UPDATE | same (USING + WITH CHECK) |
| outcomes_teacher_clo_delete | DELETE | role=teacher AND type='CLO' AND course ∈ teacher's courses |

Student/Parent: no write policies → read-only (institution read policy only).

## outcome_mappings policies (live)

| Policy | Command | Enforcement |
|---|---|---|
| outcome_mappings_institution_read | SELECT | both endpoints in caller's institution |
| outcome_mappings_coordinator_insert/update/delete | I→P | source.type='ILO' AND target.type='PLO' AND coordinator owns target's program AND same institution both sides (WITH CHECK on writes) |
| outcome_mappings_teacher_insert/update/delete | P→C | source.type='PLO' AND target.type='CLO' AND source.program = target course's program AND teacher owns the course AND same institution (WITH CHECK on writes) |

Cross-institution mappings and invalid hierarchy pairs are impossible through the API.

## Helper-function posture (PDF §12)

- Authorization uses authoritative profile lookups / secure helpers (auth_user_role(), auth_institution_id()) — never user_metadata (enforced in Tutor: "JWT metadata is user-controlled … must never determine AI tenant scope").
- Prior hardening: 37+ REVOKE EXECUTE migrations on internal SECURITY DEFINER functions; search_path qualification spec completed; managed server key (SUPABASE_SECRET_KEYS) replaces raw service-role usage in edge functions.

## Remaining

- Deny-side RLS test matrix in-repo (task 1.6) — the policies are live but not yet certified by automated tests.
- Re-run Security Advisor after any future migration (standing gate).