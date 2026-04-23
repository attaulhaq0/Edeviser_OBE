---
inclusion: always
---

# Pre-Push CI Checks (Mandatory)

## Branch Protection Rule

Never push directly to `main`. All changes must go through a feature branch + pull request.
Use the auto-git-push hook or manually create a branch and PR.

## Local CI Checks

Before committing or pushing any code changes, ALWAYS run these checks locally in order:

1. `npm run lint` — ESLint with zero warnings tolerance
2. `npx tsc --noEmit` — TypeScript type checking
3. `npm test` — Vitest test suite

If any check fails, fix the issues before committing. Do NOT push code that fails these checks.

This mirrors the GitHub Actions CI pipeline exactly. Catching failures locally saves a round-trip to CI.
