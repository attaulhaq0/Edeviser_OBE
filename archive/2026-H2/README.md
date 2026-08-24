# archive/2026-H2 — Quarantined Root Artifacts

Moved here (never deleted) to keep the repository root agent- and human-navigable.
Everything in this folder is historical debris: one-off audit scripts, captured HAR files,
stale logs, and PR scratch notes. Do NOT import, grep-index, or extend anything here;
git history preserves full provenance.

| Folder           | Contents                                                           |
| ---------------- | ------------------------------------------------------------------ |
| `logs/`          | build/lint/tsc/vite output captures, gate logs                     |
| `har/`           | e-deviser.vercel.app HAR captures + analysis scripts/notes         |
| `pr-scratch/`    | old PR bodies/comments/state, commit-message drafts                |
| `audit-scripts/` | one-off `__audit_*` / `_verify_*` scripts, diag.js, worktree audit |
| `misc/`          | cr2/cr3.json, stray screenshots, placeholder artifact              |

If something here turns out to be needed, restore it via `git log --follow <path>` /
`git mv` back — do not recreate from memory.
