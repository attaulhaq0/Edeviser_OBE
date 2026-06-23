---
inclusion: manual
description: "Automatically stages, commits, pushes to a feature branch, and creates a PR when triggered by the user"
---

IMPORTANT: First refresh PATH so gh CLI is found: run `$env:Path = [System.Environment]::GetEnvironmentVariable('Path','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('Path','User')` before any gh commands.

Check if there are any staged or unstaged changes by running `git add -A` then `git diff --cached --name-only`. If there are NO changed files, do nothing and say 'Nothing to commit'. If there ARE changes, do the following steps:

1. Run `git diff --cached --stat` to understand what changed (files added, modified, deleted and how much).
2. Determine the current branch by running `git branch --show-current`.
3. If on `main`, create a new feature branch. Use naming: `feat/<scope>` for features, `fix/<scope>` for fixes, `chore/<scope>` for maintenance. Run `git checkout -b <branch-name>`.
4. Generate a conventional commit message: `type(scope): short description` (under 72 chars, imperative mood). Types: feat, fix, refactor, test, chore, docs, style.
5. Run `git commit -m "<your message>"`.
6. Push the branch: `git push origin <branch-name>`.
7. Generate a detailed PR description based on the actual technical changes. The PR body MUST include:
   - A one-line summary of what this PR does
   - A '## Changes' section listing each file or group of files changed with a brief explanation of what was done
   - A '## Why' section explaining the motivation
   - If tests were added/modified, a '## Testing' section
     Use markdown formatting. Do NOT use generic text like 'Auto-generated PR'.
8. Create the PR: `gh pr create --base main --head <branch-name> --title "<commit message>" --body "<your detailed description>"`.
   If `gh` is not available, tell the user: 'Branch pushed. Open a PR manually on GitHub or install GitHub CLI (`winget install GitHub.cli`) for auto-PR creation.'
9. Do NOT push directly to main.
