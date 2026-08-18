# Runtime deployment governance

`scripts/runtime-dependency-manifest.json` is the canonical source for the declared Edge-runtime closure. The resolver receives a Git diff and returns the exact deployment set; workflows must not maintain their own lists.

Shared-code changes fail closed when no declared consumer covers the changed `_shared` path. The current deliberately narrow scope is the Tutor Intelligence and policy-required identity-runtime closures. A new policy-required Edge Function must be declared in the manifest before its change can pass CI.

Production deployment remains merge-to-main plus protected-environment approval. The workflow deploys only the resolver output, then writes one cumulative snapshot for every governed function. Each function's downloaded source is normalized to its logical `functions/**` path, compared byte-for-byte with the reviewed entrypoint and its transitively imported, manifest-declared shared dependencies, and fingerprinted only after that comparison passes. `ACTIVE` is not source parity; a mismatch fails the deployment attestation.

The snapshot is retained for 365 days and has the same explicit expiry. Scheduled health fails closed on missing, expired, incomplete, configuration-drifted, bundle-drifted, or source-drifted evidence. Renewal is never automatic: the protected, manual `bootstrap-runtime-attestation.yml` workflow runs only on reviewed `main`, downloads Production source read-only, and creates a new snapshot only if full parity already passes.

Migration operation is intentionally separate:

- Normal: Supabase Branching applies migrations after merge to `main`.
- Monitor: daily scheduled health verifies branch status and repository migration head against the Production ledger.
- Break glass: `deploy-migrations.yml` is `workflow_dispatch` only, protected by the Production environment, performs order validation, uses the pinned CLI, and verifies the ledger after `db push`.

Never use the break-glass workflow to replay an already-applied migration.
