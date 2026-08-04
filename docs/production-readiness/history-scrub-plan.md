# Service-role credential history-scrub plan

This is a plan only. No ref rewrite, force-push, key revocation, or production
configuration change has been performed.

## Current evidence

- The current tree contains no usable service-role JWT; the security scanner
  passes with zero findings.
- A masked, content-only history scan found one matching historical commit:
  `91985b8f28e336212aca5375c6c0656f06b6ef18`, in
  `supabase/migrations/20260520063547_store_service_role_key_in_vault.sql`.
  The repaired current-tree version is in the later PR history.
- The affected commit is reachable from 98 refs in the local clone (15 local
  heads and 82 remote-tracking refs, plus the symbolic `origin/HEAD` line); no
  tags currently contain it. Re-run the commands below immediately before any
  rewrite because remote refs can change.

## Required execution sequence (manual approval required)

1. In Supabase Dashboard, invalidate the exposed legacy service-role JWT and
   confirm a replacement managed secret key is provisioned. Verify every
   active Edge Function, Vercel server route, cron/pg_net call, Database
   Webhook, and CI fixture before disabling the legacy key.
2. Freeze merges and announce the rewrite to every collaborator and bot. Export
   a protected backup bundle of all refs and record its checksum outside the
   repository. Preserve the PR branch tip and production `main` tip separately.
3. Refresh all refs, then generate an affected-ref manifest without printing
   credential contents:

   ```powershell
   git fetch --all --prune --tags
   git branch -a --contains 91985b8f28e336212aca5375c6c0656f06b6ef18
   git tag --contains 91985b8f28e336212aca5375c6c0656f06b6ef18
   ```

4. Use an approved `git filter-repo`/equivalent rewrite to remove the
   credential-bearing historical blob and replace the historical migration
   with the already-reviewed provisioning-only text. Do not paste the token in
   command arguments, shell history, logs, or the replacement commit.
5. Review the rewritten commit graph, migration file, CI workflows, and all
   refs locally. Create a new backup bundle before publishing.
6. Force-push only the explicitly approved refs, using lease protection and a
   documented order: protected `main`/release refs first through the repository
   owner’s approved process, then the PR and feature refs. Do not rewrite
   unrelated collaborator branches without their consent.
7. Ask collaborators to reclone or delete/re-fetch affected local refs. Request
   Git hosting cache/support invalidation if the provider retains old blobs.
8. Verify post-scrub with a content-only scan across every remote ref and tag,
   confirm the current-tree security audit is still clean, and record the
   invalidated-key authentication failure. Retain the backup bundle securely;
   never commit it.

## Completion gates

History remediation is complete only when the provider confirms invalidation,
all affected refs are rewritten, post-scrub scans find zero credential
matches, collaborators have been notified, and the replacement secret-key
consumers have passed staging verification. Until then, legacy-key disablement
and production invitation/email rollout remain blocked.
