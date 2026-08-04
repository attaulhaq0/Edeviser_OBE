# Server credential consumer inventory

This inventory is intentionally based on repository search only. It never
contains a key value. The checked-in JWT incident is repaired, but legacy
environment consumers remain a migration gate before any key is disabled.

| Consumer group                                                                                                                 | Current source/header                                                                                           | Runtime                 | Active/use                                                                       | Replacement status                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| Invitation, Parent-link, Auth, email notification functions                                                                    | `SUPABASE_SECRET_KEYS` via `_shared/serverSecret.ts`; Supabase client uses `apikey` and `Authorization` headers | Supabase Edge Functions | Active in local/preview code; production deployment must be verified             | Migrated locally; temporary legacy fallback is opt-in only (`ALLOW_LEGACY_SERVICE_ROLE_KEY=true`)                                     |
| `send-invitation-email`, `invitation-preview`, `accept-invitation`, `parent-link`, `resend-webhook`, `send-email-notification` | Shared helper for server calls; public functions use token hashing or Svix signature validation as applicable   | Supabase Edge Functions | New invitation/Parent flow; not all are deployed                                 | Code-ready; staging deployment pending isolated branch and secret configuration                                                       |
| Scheduled/analytics/AI/assessment Edge Functions (the remaining functions under `supabase/functions/*`)                        | Direct `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` reads                                                        | Supabase Edge Functions | Many are active or scheduled; exact deployed versions require platform inventory | **Migration required**: convert to the shared helper before legacy-key disablement                                                    |
| `api/_utils/auth.ts`                                                                                                           | `SUPABASE_SERVICE_ROLE_KEY` process env; bearer/admin client                                                    | Vercel server route     | Active only when API route is called                                             | **Migration required**: use a server-only managed-secret adapter                                                                      |
| Local seed/setup/count scripts                                                                                                 | `SUPABASE_SERVICE_ROLE_KEY` process env                                                                         | Local operator scripts  | Manual/local only; never frontend                                                | Keep local-only and document operator secret handling; do not commit values                                                           |
| pg_net/database trigger calls                                                                                                  | Vault `decrypted_secrets` lookup by secret name; `Authorization: Bearer` plus `apikey`                          | Postgres trigger/cron   | Active where corresponding migrations/functions are enabled                      | Vault name is retained for compatibility; provision through `scripts/provision-vault-secret.ts`; verify secret-key cutover in staging |
| Frontend (`src/**`)                                                                                                            | Publishable Supabase anon key only; no service-role key                                                         | Browser                 | Active                                                                           | No migration needed; security scan blocks JWT-shaped service keys in frontend                                                         |
| Tests/fixtures                                                                                                                 | Explicit service-key env guard for isolated RLS fixtures                                                        | Local/CI test process   | Disabled unless preview opt-in variables are present                             | Keep fail-closed; never point fixtures at production                                                                                  |

## Database/pg_net consumers found

The following checked-in migrations use runtime Vault/GUC lookup rather than a
literal: `20260222124808_add_cron_jobs.sql`,
`20260223100000_add_grade_trigger_for_attainment_rollup.sql`,
`20260324230014_fix_vuln20_secure_attainment_trigger.sql`,
`20260504032700_conditional_pgcron_guard.sql`,
`20260520063639_fix_attainment_trigger_vault_v2.sql`,
`20260520065433_fix_trigger_add_apikey_header.sql`, and
`20260615000001_conditional_pgcron_guard.sql`. They fail closed when the Vault
secret is absent. The repaired historical migration
`20260520063547_store_service_role_key_in_vault.sql` only documents secure
provisioning and stores no value.

## Disablement gate

Do not disable the legacy service-role key until every direct Edge Function and
`api/_utils/auth.ts` consumer has been converted and staging verifies Edge
Functions, pg_net triggers, Database Webhooks, cron calls, and the invitation /
Parent flows. Supabase Dashboard rotation/revocation and Git history scrubbing
remain manual actions after that verification; neither has been claimed here.
