# Platform deployment boundaries

## Production application and prototype

The production Vercel project builds the repository root (`.`) with
`npm run build` and publishes `dist/`. Its Production branch is `main`.

The frozen prototype is a reference artifact. Its canonical archive is branch
`archive/final-prototype-20260812` at historical SHA
`6ae764594953e0dda5e6c15ba26b4637e5aadc85`. That branch must never be merged
into `main`. Prototype deployment, when needed, starts from inside the
`prototype/` directory and uses `prototype/vercel.json`; it is not an
application deployment.

The executable boundary is `scripts/check-prototype-boundary.mjs`. On every PR
to `main`, the `Prototype Boundary` CI job:

1. rejects additions, modifications, copies, or renames involving `prototype/**`;
2. permits an isolated prototype deletion for a future dedicated cleanup;
3. scans production runtime source for imports or runtime references into the
   prototype; and
4. scans the completed `dist/` artifact for prototype paths, pages, assets, and
   frozen prototype-only markers.

No root `.vercelignore` is used. This avoids coupling the root application
project to the separately rooted prototype deployment; the build artifact scan
enforces the production output boundary directly.

## Edge Function ownership

`scripts/check-edge-function-ownership.mjs` builds its inventory from two live
facts instead of duplicating a long function list:

- source directories under `supabase/functions/`; and
- `supabase functions list` output for the target project.

It derives gateway visibility from `supabase/config.toml`, cron ownership from
`api/cron/` plus source authentication markers, and webhook ownership from the
function name. Small, reviewed exceptions live in
`scripts/edge-function-ownership-policy.json`.

Production check:

```bash
npx supabase@latest functions list \
  --project-ref cdlgtbvxlxjpcddjazzx \
  --output-format json \
  | node scripts/check-edge-function-ownership.mjs --deployed-json - --verbose
```

The scheduled health workflow runs the same comparison. It fails on new
source/deployment drift, a missing important function, a non-active deployment,
or `verify_jwt` drift. Existing known drift stays visible without silently
expanding the allowlist.

The two reviewed exceptions have deliberately different ownership:

- `coordinator-ai-insights` has fail-soft frontend consumers, but invocation is
  disabled unless `VITE_COORDINATOR_AI_INSIGHTS_ENABLED=true`. Production does
  not define that flag, so its legacy Gemini-backed source remains deferred to
  provider cleanup instead of being deployed merely to remove inventory drift.
- `fee-overdue-check` has no repository source and no Vercel HTTP cron route.
  Overdue fee state is owned by the pure-SQL `fee-overdue-check` database cron
  retained by the migration chain. The unknown deployed Edge artifact is a
  legacy cleanup candidate and must not be redeployed without source recovery.
