# Runtime deployment governance

`scripts/runtime-dependency-manifest.json` is the canonical source for the declared Edge-runtime closure. The resolver receives a Git diff and returns the exact deployment set; workflows must not maintain their own lists.

Shared-code changes fail closed when no declared consumer covers the changed `_shared` path. The current deliberately narrow scope is the Tutor Intelligence and policy-required identity-runtime closures. A new policy-required Edge Function must be declared in the manifest before its change can pass CI.

Production deployment remains merge-to-main plus protected-environment approval. The workflow deploys only the resolver output and writes a machine-readable attestation containing the reviewed SHA, function version, JWT policy, Supabase bundle fingerprint, local source-tree fingerprint, downloaded deployed-source fingerprint, and timestamp. `ACTIVE` is not source parity; the scheduled sentinel downloads the live function source, compares its fingerprint and configuration with the latest attestation, and fails if source changed after the attested SHA.

Migration operation is intentionally separate:

- Normal: Supabase Branching applies migrations after merge to `main`.
- Monitor: daily scheduled health verifies branch status and repository migration head against the Production ledger.
- Break glass: `deploy-migrations.yml` is `workflow_dispatch` only, protected by the Production environment, performs order validation, uses the pinned CLI, and verifies the ledger after `db push`.

Never use the break-glass workflow to replay an already-applied migration.
