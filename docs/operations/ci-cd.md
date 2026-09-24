# CI/CD Pipeline Documentation

## Branch Protection Rules

Recommended configuration for `main` under GitHub Settings → Branches. This document is not evidence that each check is currently required; verify the live ruleset before a release:

- Require pull request reviews before merging (1 reviewer minimum)
- Require status checks to pass: `lint`, `typecheck`, `test`, `build`, `lighthouse`, `bundle-size`
- No direct pushes to `main`
- Require branches to be up to date before merging

## CI Pipeline Steps

| Job            | Trigger                   | Description                     |
| -------------- | ------------------------- | ------------------------------- |
| lint           | push/PR                   | ESLint with zero warnings       |
| typecheck      | push/PR                   | `tsc --noEmit`                  |
| test           | push/PR                   | Vitest unit + property tests    |
| build          | after lint+typecheck+test | Vite production build           |
| lighthouse     | after build               | Three local built-surface runs: error-level accessibility, best-practices, SEO and network byte-weight; performance scores/timings are warn-only. Not authenticated role performance. |
| bundle-size    | after build               | All emitted route JS chunks combined: 1800KB gzipped ceiling, **not** initial transfer. |
| e2e            | after build               | Playwright E2E tests (chromium) |
| sentry-release | main push only            | Source map upload to Sentry     |

LHCI collection failure is a failed check, not a passing performance result. `lighthouserc.cjs` uploads reports to temporary public storage in hosted autorun; use synthetic/approved data and review contents before calling them publishable. Local `lhci collect`/`lhci assert` can be run separately without upload. A green warn-only performance score is not a customer-ready or full-route speed attestation.

## Required Secrets

| Secret                   | Purpose                          |
| ------------------------ | -------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase project URL             |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key                |
| `SENTRY_AUTH_TOKEN`      | Sentry release upload            |
| `SENTRY_ORG`             | Sentry organization slug         |
| `SENTRY_PROJECT`         | Sentry project slug              |
| `LHCI_GITHUB_APP_TOKEN`  | Lighthouse CI GitHub integration |

## Local Pre-Push Checks

Run before pushing:

```bash
npm run lint
npx tsc --noEmit
npm test
```
