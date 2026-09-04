# Seed Accounts Registry (LOCKED)

Live-verified 2026-02 (Supabase project `cdlgtbvxlxjpcddjazzx`). Treat these as the
permanent QA/demo population for PostHog filtering, chain tests, and persona testing.
**Do not** rename them again without updating `src/lib/seedAccounts.ts`, the PostHog
internal-user filters, and this file together.

| Property         | Value                                                                                                                                                                                                                                                                  |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Total auth users | 74                                                                                                                                                                                                                                                                     |
| Seed accounts    | **73** (all carry `account_type=seed`)                                                                                                                                                                                                                                 |
| Seed group A     | 5 × `*@demo.com` — universal QA personas (admin/coordinator/teacher/parent/student), institution `00000000-0000-0000-0000-000000000001` ("QA Demo")                                                                                                                    |
| Seed group B     | 68 × `*@noor-international.edu` — Noor International School cohort: 40 students (student01–40), parents (parent01–05, 11–15, 21+), teachers (kim, okonkwo, tanaka), coordinators (assessment, curriculum, welfare), institution `4de6a0a2-758b-47f3-ab7e-984bb974d88b` |
| Real user        | 1 × `atta@edeviser.com` (owner/admin) — `account_type=real`                                                                                                                                                                                                            |

## History

- 2026-02: renamed `@noor-international.test` → `@noor-international.edu` (legitimacy
  request). Touchpoints updated: `auth.users.email`,
  `auth.identities.identity_data.email` (email column is GENERATED — update
  identity_data only), `public.profiles.email`, `institutions.allowed_email_domains`,
  `login_attempts.email`, `parent_student_links.invited_email`, plus repo files:
  docs/qa manual, docs/QA-Demo-Credentials-and-Testing-Guide.md,
  docs/tenant-readiness/noor-production-audit-2026-08-05.md, `noorSeedPlan.ts`,
  `LoginPage.tsx`, `quickLoginNoor.test.tsx`, `roleProfileScreens.test.tsx`.
- Passwords unchanged (universal demo password in `.env.local`, gitignored).

## Classification rule (runtime)

`src/lib/seedAccounts.ts` classifies by **email domain** (`demo.com`,
`noor-international.edu`) with the demo institution ID as fallback. Never classify by
exact user IDs, and never add new real institutions to the seed list.
