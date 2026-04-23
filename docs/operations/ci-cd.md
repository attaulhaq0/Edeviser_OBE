# CI/CD Pipeline Documentation

## Branch Protection Rules

Configure these on GitHub under Settings → Branches → Branch protection rules for `main`:

- Require pull request reviews before merging (1 reviewer minimum)
- Require status checks to pass: `lint`, `typecheck`, `test`, `build`, `lighthouse`, `bundle-size`
- No direct pushes to `main`
- Require branches to be up to date before merging

## CI Pipeline Steps

| Job | Trigger | Description |
|-----|---------|-------------|
| lint | push/PR | ESLint with zero warnings |
| typecheck | push/PR | `tsc --noEmit` |
| test | push/PR | Vitest unit + property tests |
| build | after lint+typecheck+test | Vite production build |
| lighthouse | after build | Performance budget assertions |
| bundle-size | after build | Gzipped JS < 500KB check |
| e2e | after build | Playwright E2E tests (chromium) |
| sentry-release | main push only | Source map upload to Sentry |

## Required Secrets

| Secret | Purpose |
|--------|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `SENTRY_AUTH_TOKEN` | Sentry release upload |
| `SENTRY_ORG` | Sentry organization slug |
| `SENTRY_PROJECT` | Sentry project slug |
| `LHCI_GITHUB_APP_TOKEN` | Lighthouse CI GitHub integration |

## Local Pre-Push Checks

Run before pushing:
```bash
npm run lint
npx tsc --noEmit
npm test
```
