# Production-readiness execution evidence

This is a local evidence snapshot for the Edeviser execution brief. It is not
a production-readiness sign-off.

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
- Self-registration UI exposes Student only; role and institution claims are
  not submitted by the auth provider.
- Parent dashboards show explicit insufficient-evidence states instead of
  fabricated progress/wellbeing trends.
- RTL physical spacing and design-token violations addressed; baseline course
  lists now use bounded pagination.

## TESTED locally

- `npm run lint` — passed with zero warnings.
- `npx tsc --noEmit` — passed.
- `npm test` — 643 files, 6,102 tests passed.
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
- Security audit stage — blocked by one historical service-role JWT literal in
  the managed migration `supabase/migrations/20260520063547_store_service_role_key_in_vault.sql`.
  The scanner reports only a masked prefix; the token was not printed.
- Design-token audit stage — 0 findings.
- Focused dashboard/auth tests after the latest UI work — 3 files, 34 tests
  passed.

## BLOCKED / REQUIRES MANUAL ACTION

- The Supabase safety gate rejected the broad invitation/parent-link migration.
  No alternate DDL path was used. Applying the reviewed migration requires
  explicit production approval, a backup/rollback gate, and preferably a
  development branch.
- Edge Function deployment is blocked until the migration contract is live.
- `RESEND_WEBHOOK_SECRET` presence and provider delivery cannot be verified
  without reading secrets or sending an allowlisted sandbox email.
- Full audit remains No-Go because the local environment lacks `CRON_SECRET`,
  the locked bundle budget is above its historical baseline (1,442.2 KB gzip
  versus a 1,216.1 KB baseline), and the E2E audit stage is still not backed by
  a configured preview run. These are not represented as green production
  checks.
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
- The repository contains a historical service-role JWT literal in
  `supabase/migrations/20260520063547_store_service_role_key_in_vault.sql`.
  It was not printed or modified because migrations are managed and the
  current safety gate forbids an unreviewed production DDL change. The key
  must be rotated/revoked and the repository/history scrubbed through an
  approved security response before sign-off.
- Playwright fixture setup now refuses to seed unless
  `E2E_FIXTURES_ENABLED=true`, `SUPABASE_DB_ENV=preview`, and explicit preview
  URL/anon-key values are present; no production fallback key or URL remains in
  the fixture setup.
- The audit E2E stage is now an executable preview-only Playwright stage; its
  current local result is `skipped` with all five required preview settings
  reported missing, rather than the prior “stub” message.
- The live-only migration drift must be reconciled through the approved
  Supabase migration workflow before another production migration is proposed;
  no undocumented SQL was copied into `supabase/migrations`.
- The current draft PR #237 has Vercel, lint, type-check, SQL migration lint,
  RLS smoke, RLS isolation, security audit, and preflight checks passing. The
  full Test and Unit + Property Tests jobs remain in progress; no merge has
  been performed.
