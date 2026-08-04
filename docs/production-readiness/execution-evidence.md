# Production-readiness execution evidence

This is a local evidence snapshot for the Edeviser execution brief. It is not
a production-readiness sign-off.

## CURRENT PR SNAPSHOT (2026-08-04)

- PR #237 branch head: `2bf22d49` (pushed; no merge performed).
- The original checked-in service-role JWT finding was removed from the current
  tree. The repaired historical migration contains no credential literal and
  the security scanner reports only masked findings.
- Local security audit: passed with 0 findings (run
  `a284fe5c-5635-46ad-bce6-5ff2c5253d7b`).
- Local bundle audit: passed after removing the static optional error-telemetry
  SDK from the production graph: 1,286.2 KB gzip, below the 1,306.4 KB cap
  (previous measurement 1,442.2 KB).
- i18n audit: locale parity passed; technical route/chart prop false positives
  were removed from the scanner. 633 genuine/legacy Minor literal findings
  remain for a separate translation backlog and are not hidden.
- `npm audit` could not reach the registry security endpoint in this sandbox;
  no vulnerability count is claimed. `npm ls --depth=0` completed.
- An isolated Supabase branch was created only for staging at
  `2026-08-04T09:36:08Z` (project ref `ihlinzbozveqleybhxnu`) at the approved
  $0.01344/hour rate. Inherited replay reached `MIGRATIONS_FAILED` after
  `20260504032900`, so no invitation/Parent DDL or functions were applied.
  The branch was deleted and absent from the branch list by
  `2026-08-04T09:39:53Z`; estimated accrued cost is under $0.001.

## VERIFIED live evidence

- Supabase project queried: `cdlgtbvxlxjpcddjazzx`.
- Current counts: 3 institutions, 124 profiles, 35 parent links, 0
  invitations.
- Noor role counts: 40 students, 20 parents, 4 teachers, 3 coordinators, 1
  admin.
- Demo role counts: exactly 1 each of admin, coordinator, teacher, student,
  and parent; no Demo courses, enrollments, assignments, submissions, or
  journals were found.
- Gulf currently has seeded profiles and academic activity, so it is not yet
  the requested clean initial tenant.
- Live `invitations` still stores a raw `token` and has no hashed-token or
  lifecycle columns. Live `parent_student_links` still has the legacy six
  columns and 35 verified rows.
- Deployed functions: `send-invitation-email` version 9 and
  `send-email-notification` version 12. The new preview, accept, parent-link,
  and webhook functions are not deployed.
- Live `handle_new_user` still trusts role/institution metadata, references
  post-migration columns that do not exist, and catches all exceptions.
- Deployed `chat-with-tutor` v12 and `generate-accreditation-report` v14 still
  contain JWT metadata fallbacks; the profile-derived fail-closed versions are
  local only and require an approved Edge Function deployment.
- Supabase Edge Function inventory contains 54 active functions. The deployed
  invitation sender is v9 and the notification sender is v12; preview,
  acceptance, parent-link, and Resend webhook functions are not deployed.
- Supabase advisors currently report 50 security warnings and 811 performance
  notices (539 warnings, 272 informational). The leading security findings
  include anonymous execution of legacy `SECURITY DEFINER` invitation/auth
  RPCs; the leading performance findings include unindexed foreign keys and
  multiple permissive policies.
- The Vault metadata query exposed only the secret name `service_role_key`; it
  did not expose any email or webhook secret names. Secret values were not
  read.
- Migration drift is present: the repository replay checker sees 365 local
  migrations, while the live Supabase migration inventory reports 376. The
  live-only set includes eleven August 2, 2026 repair/hardening migrations
  covering communication participants, analytics RPCs, coordinator workspace,
  ACLs, and AI governance that are not checked into this tree.
- Vercel project `prj_DJFo5rshhylIUSrtFT99dHmfJq8j` is active and its latest
  branch deployment for commit `3cf75a9e` is still building. The latest ready
  preview for `7be00654` is available, while the latest production deployment
  on `main` is ready at deployment `dpl_3pAMKnYPZwxpDXguCpmkA9a62Zih`.
- `https://app.edeviser.com`, `/student/dashboard`, and
  `/accept-invite/test` each returned HTTP 200 from Vercel. The response shell
  references the canonical Supabase API origin and production CSP headers;
  authenticated page behavior remains unverified without a test account.

## IMPLEMENTED locally

- Canonical invitation helpers and email modes in
  `supabase/functions/_shared/invitation.ts`.
- Profile-derived authentication in `supabase/functions/_shared/auth.ts`.
- Hashed-token invitation sender, invitation preview, secure acceptance,
  parent-link workflow, and signed Resend webhook functions.
- Public route JWT configuration for preview, acceptance, and webhook in
  `supabase/config.toml`.
- Browser parent management now calls the server workflow only; it does not
  call `auth.admin`, write profiles, or insert parent links directly.
- Admin invitation UI now sends only normalized recipients and roles; it does
  not submit `institution_id`, and it renders the Edge Function's per-recipient
  partial outcomes instead of claiming every row succeeded.
- Self-registration UI exposes Student only; role and institution claims are
  not submitted by the auth provider.
- Parent dashboards show explicit insufficient-evidence states instead of
  fabricated progress/wellbeing trends.
- Tutor and accreditation AI functions now derive institution scope from an
  active `profiles` row; JWT role/institution metadata is not used as an
  authorization fallback.
- Scheduled streak/weekly-summary and student-export links now use `APP_URL`
  with the canonical `https://app.edeviser.com` fallback.
- RTL physical spacing and design-token violations addressed; baseline course
  lists now use bounded pagination.

## TESTED locally

- `npm run lint` — passed with zero warnings.
- `npx tsc --noEmit` — passed.
- `npm test` / `npm run test:coverage` — 643 files, 6,104 tests passed;
  coverage thresholds passed (33.39% statements, 29.03% branches,
  27.35% functions, 34.65% lines).
- Focused invitation/parent/security tests — passed.
- `npm run db:check-replay` — 365 migrations clean.
- `npm run db:check-dup-names` — no new collisions.
- Edge schema-contract checker — clean with 46 explicitly documented
  pre-migration findings.
- i18n parity — all namespaces passed.
- Production build — passed.
- Local Daily Review visual check — passed at `http://127.0.0.1:4173/student/dashboard`;
  Noor's Aarav Sharma account rendered five pending review schedules and the
  Start Review action navigated to `/student/today`.
- Security audit stage — passed after removing the historical service-role JWT
  literal from `supabase/migrations/20260520063547_store_service_role_key_in_vault.sql`.
  The scanner reports only masked prefixes; the token was not printed.
- Bundle/performance audit — passed at 1,286.2 KB gzip against the 1,306.4 KB
  cap after removing the static optional telemetry SDK from the production
  graph. The existing local error boundary and console safety net remain.
- i18n scanner focused tests — 16 tests passed; route and chart configuration
  props are ignored while visible JSX literals remain reported.
- Design-token audit stage — 0 findings.
- Focused dashboard/auth tests after the latest UI work — 3 files, 34 tests
  passed.
- Invitation contract/security property test — 7 tests passed after removing
  the browser tenant claim and adding partial-result handling.

## BLOCKED / REQUIRES MANUAL ACTION

- The Supabase safety gate rejected the broad invitation/parent-link migration.
  No alternate DDL path was used. Applying the reviewed migration requires
  explicit production approval, a backup/rollback gate, and preferably a
  development branch.
- Edge Function deployment is blocked until the migration contract is live.
- `RESEND_WEBHOOK_SECRET` presence and provider delivery cannot be verified
  without reading secrets or sending an allowlisted sandbox email.
- Full production sign-off remains blocked because the local environment lacks
  `CRON_SECRET`, the preview E2E stage is not backed by a configured preview
  run, and the available isolated Supabase branch could not complete inherited
  migration replay. These are not represented as green production checks.
- Vercel project/environment inspection requires a connector with access to
  team `team_Gvw1Dz7IlxIG5evqwlsNkZHb`; project/deployment metadata is now
  readable, but environment-variable names and Auth URL settings were not
  exposed by the connector.
- Supabase Auth Site URL and redirect URL configuration could not be read or
  changed through the available connectors. **REQUIRES MANUAL ACTION:** in
  Supabase Dashboard → Authentication → URL Configuration, set Site URL to
  `https://app.edeviser.com` and retain redirect patterns
  `https://app.edeviser.com/**`, `https://e-deviser.vercel.app/**`, and
  `http://localhost:5173/**` during the domain transition.
- The exposed legacy key still requires Supabase Dashboard rotation/revocation
  and a separate history-scrub plan. No production key was read, disabled, or
  claimed as rotated.
- Playwright fixture setup now refuses to seed unless
  `E2E_FIXTURES_ENABLED=true`, `SUPABASE_DB_ENV=preview`, and explicit preview
  URL/anon-key values are present; no production fallback key or URL remains in
  the fixture setup.
- The audit E2E stage is now an executable preview-only Playwright stage; its
  current local result is `skipped` with all five required preview settings
  reported missing, rather than the prior “stub” message.
- The live-only migration drift must be reconciled through the approved
  Supabase migration workflow before another production migration is proposed;
  no undocumented SQL was copied into `supabase/migrations`. The attempted
  staging branch inherited the same replay failure and was deleted.
- GitHub Actions for the latest pushed head are still running; their final
  status must be rechecked before any claim that CI or the Audit Report passed.
  No merge has been performed.
- Commit `b1cdbd29` adds a CI-only fetch guard for the loopback Supabase
  fallback URL. It keeps hermetic unit/property tests from opening real
  retrying sockets; the full local coverage suite still passes and no
  application runtime behavior changes.
