# Git Workflow (adapted from Kiro steering/auto-git-push.md, pre-push-checks.md, preview-and-test-gate.md)

## Auto Git Push (manual trigger)
- Before any `gh` command, refresh PATH so the CLI is found:
  `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')`
- Check for changes: `git add -A` then `git diff --cached --name-only`. If no changes, say "Nothing to commit".
- If changes: run `git diff --cached --stat`, get current branch via `git branch --show-current`.
- If on `main`, create a feature branch: `feat/<scope>`, `fix/<scope>`, or `chore/<scope>`. Never push directly to main.
- Generate a conventional commit message: `type(scope): short description` (under 72 chars, imperative mood). Types: feat, fix, refactor, test, chore, docs, style.
- Commit, push to the branch, then create a PR with a detailed body: one-line summary, `## Changes` (per-file explanations), `## Why`, and `## Testing` if tests changed. No generic "Auto-generated PR" text.
- Create PR: `gh pr create --base main --head <branch-name> --title "<commit message>" --body "<description>"`.

## Pre-Push Checks
- Run in order before any push/PR:
  1. `npm run lint` — ESLint with zero warnings
  2. `npx tsc --noEmit` — TypeScript type checking
  3. `npm test` — Vitest test suite (`vitest --run`)
- Do not push if any check fails.

## Preview & Test Gate
- Schema/migration/Edge Function/RLS PR validation uses only the Git-linked Supabase Preview for the PR branch.
- A valid Preview must match both `git_branch ==` the PR head branch and `pr_number ==` the current PR number.
- Required schema-bearing sequence: local Docker replay → push branch → open PR → wait for Git-linked Preview → verify `FUNCTIONS_DEPLOYED` and migrations → Preview RLS/runtime validation → exact-head CI → merge → read-only Production verification.
- After merge/closure, verify no unneeded non-main Supabase branches remain; delete stale branches to prevent cost.
- Never manually modify Production to make Preview validation pass.