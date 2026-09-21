# Submission authority migration tests

These fixtures are for an **isolated, disposable database replay**, never a shared,
Preview or Production database. They represent historical rows that must exist
before the new authority guards are installed. Do not disable triggers or RLS to
seed them after installation.

## Positive replay sequence

1. Bootstrap the matching Supabase PostgreSQL, Auth and Storage schemas in an
   isolated environment; disable cron execution and external network access.
2. Replay the 491 historical migrations through
   `20260908152429_detect_systemic_attainment_gaps_v2.sql` unchanged.
3. Inspect actual relation privileges. Missing permissions are not grounds for
   adding test-only grants or bypassing RLS.
4. In the fixture's own SQL session, explicitly set
   `test.phase_a_fixture_authorized='isolated-replay-only'`, then run `before.sql`.
5. For the existing-trigger variant only, run `legacy-binding.sql` with the same
   explicit fixture authorization. It installs a deliberately broken binding
   stand-in, not a reproduction of a deployed function's full body.
6. Apply `20260921001942_submission_quiz_authority_habit_repair.sql` normally.
7. Run `supabase/tests/database/submission_authority_phase_a.sql`. Require all
   **118 numbered assertions**, a matching TAP plan, no failures and no skipped or
   TODO assertions. A zero psql exit code alone is insufficient.

Use a fresh replay for each variant. `incompatible-binding.sql` and
`unknown-grade-before.sql` are separate rejection scenarios; `assert-rejected.sql`
checks the expected rollback state. They are not part of the positive sequence
and must not be combined into a successful-run fixture.

## Preview coverage and limits

The separate `generateCourseFile.rls.test.ts` runs through the repository's guarded
TypeScript RLS runner against the exact Git-linked PR Preview. It uses student and
teacher JWTs for academic writes. Its immutable synthetic academic graph is
retained until that Preview is disposed after PR closure; it does not bypass
retention guards to make row cleanup appear successful.

These SQL tests establish bounded authorization/receipt behavior, not physical
Storage-byte retention, Storage API deletion behavior, concurrent exactly-once
execution, native quiz finalization or complete grading/reward functionality.
No test result authorizes a Production deployment.
