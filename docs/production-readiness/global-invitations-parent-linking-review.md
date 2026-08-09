# Global invitations and parent linking — production review

Status: **local implementation and review only; production schema/functions not deployed**.

This document records the live evidence and the bounded rollout needed for the
cross-tenant invitation and parent/student relationship work. It intentionally
contains no tokens, service keys, or recipient data.

## Live evidence captured

The Supabase project inspected was `cdlgtbvxlxjpcddjazzx`.

- The current SQL count is 3 institutions, 124 profiles, 35 parent links, and
  0 invitations. Noor's expected 68-profile tenant is included in that total;
  the count is not a substitute for the tenant-specific role breakdown.
- The tenant role breakdown currently matches Noor's expected 40 students,
  20 parents, 4 teachers, 3 coordinators, and 1 admin. Demo has five profiles;
  Gulf currently has seeded profiles (30 students, 15 parents, 3 teachers,
  2 coordinators, 1 admin), so it is not yet the requested clean initial state.
- Tenant activity evidence shows Demo has no courses, enrollments, assignments,
  submissions, or journals; Gulf and Noor both have connected academic data.
  Gulf cleanup is a separate destructive-data decision and has not been run.
- The Noor International School institution exists and has student, parent,
  teacher, coordinator, and admin profiles.
- `invitations` currently contains no rows. Its live shape stores a raw `token`
  and does not yet expose the status/acceptance fields required by the new
  flow.
- `parent_student_links` currently has 35 rows; all 35 are marked verified and
  the parent/student institution IDs match.
- Existing parent-link RLS permits an admin write when the student belongs to
  the admin's institution, but does not independently constrain the parent
  institution and has no lifecycle status/revocation model.
- The live invitation lookup/consume functions accept raw tokens and are
  executable by `anon`/`authenticated`; this is not acceptable for a public
  production invitation surface.
- The live `handle_new_user` function trusts role/institution metadata and
  catches all exceptions, which can create an orphan profile or a false
  success. It must be replaced by an invitation-bound, fail-closed flow.
- The live Edge Function list does not yet include the new preview, accept,
  parent-link, or Resend webhook functions.

## Local changes ready for review

- Invitation and parent-link Edge Functions now derive tenant/role from the
  canonical `profiles` record, hash random invitation tokens, use the
  canonical app URL, support `EMAIL_MODE=disabled|sandbox|production`, and
  avoid returning or logging raw tokens.
- Invitation acceptance creates the auth user server-side and finalizes the
  invitation through a locked RPC; browser-submitted role and institution are
  ignored.
- Parent linking supports invite-new, link-existing, verify/reject/revoke,
  and relationship changes through one server-side function.
- The parent UI no longer calls `auth.admin`, writes profiles, or inserts
  parent links directly from the browser.
- Parent dashboards no longer fabricate progress, wellbeing, or journal data
  when the tenant has no evidence.
- Resend webhook verification checks the signed raw body, timestamp skew,
  replay ID, and provider message ID before updating delivery state.

The functions reference the RPC/table contract below. They must not be deployed
until that contract is reviewed and applied atomically.

## Required server-side contract

The reviewed migration must be append-only where possible and must preserve the
35 verified parent links while adding:

1. Invitation lifecycle fields: `token_hash`, `status`, `accepted_at`,
   `accepted_by`, `revoked_at`, `last_sent_at`, `send_count`,
   `idempotency_key`, and an optional parent-link invitation context. Raw token
   storage must be removed after the cutover window.
2. Parent-link lifecycle fields: `institution_id`, `status`, `invited_email`,
   `invitation_id`, `verified_at`, `rejected_at`, `revoked_at`, and
   `updated_at`, with a check that parent and student belong to the same
   institution.
3. Delivery tables with unique provider event IDs and provider message IDs;
   RLS must keep them service-side only.
4. Security-definer RPCs with fixed `search_path` and explicit authorization:

   - `preview_invitation(token_hash)` — returns only masked email,
     institution display name, role, and expiry for a pending, unexpired token.
   - `create_invitation(actor_id, email, role, token_hash, idempotency_key)` —
     derives the actor institution, enforces tenant policy, and returns the
     invitation ID and display metadata.
   - `mark_invitation_sent(invitation_id, provider_message_id)`.
   - `finalize_invitation_acceptance(invitation_id, user_id)` — locks the row,
     verifies the auth email, marks it accepted exactly once, and creates or
     attaches the parent link.
   - `create_parent_link_invitation`, `link_existing_parent`, and
     `admin_update_parent_link` — all derive institution from the actor and
     enforce the parent/student same-tenant invariant.
   - Hardened `parent_has_verified_link` and `get_parent_dashboard` — only
     active, verified, same-institution links are visible.

5. A fail-closed `handle_new_user` trigger that accepts only a validated
   invitation (or the explicitly approved student self-registration policy),
   never trusts browser role/institution metadata, and propagates failures.
6. RLS policies with no direct client insert/update path for invitations,
   parent links, or delivery records. Admin reads must be tenant-scoped;
   parents can read only their own active verified links; students can read
   only their own links.

## Rollout and rollback gates

1. Review the exact migration SQL and RPC bodies in a staging project or an
   isolated Supabase branch. Run security and performance advisors.
2. Take a schema/data backup and record row counts for profiles, invitations,
   parent links, and delivery tables.
3. Apply the migration in one reviewed change. Verify constraints, RLS, and
   RPC authorization with anonymous, parent, admin, and cross-tenant test
   identities.
4. Deploy the Edge Functions with `verify_jwt` explicitly configured for each
   route, set `APP_URL=https://app.edeviser.com`, and start with
   `EMAIL_MODE=disabled` or an allowlisted sandbox recipient.
5. Run invitation preview → accept → profile → parent link → dashboard and
   Resend webhook replay tests before enabling production email.
6. Roll back by disabling the new routes/email mode, restoring the previous
   function versions, and applying the reviewed down-migration only if data
   reconciliation confirms it is safe. Never delete user or link rows as part
   of rollback.

## Why this is not applied yet

The Supabase safety gate rejected the broad production migration because it
would rewrite invitation and parent-link schema, RLS policies, and
security-definer functions in one high-blast-radius operation. No alternate
DDL path was used. Production application requires explicit approval of the
bounded migration and rollback plan above, followed by a staged verification.
