# Edeviser Codebase Structure Blueprint — Multi-Agent Era (2026)

**Status:** Active · **Audience:** maintainers + every AI agent working on this repo
**Companion files:** root `AGENTS.md` · `CLAUDE.md` · `src/AGENTS.md` · `supabase/AGENTS.md`
`.clinerules/00-read-first.md` · `.claude/settings.json`

---

## 1. Architecture: Canonical Core, Thin Adapters

One source of truth; every tool reads it natively or through a pointer. Rules are NEVER
duplicated into tool configs (duplication drifts, and conflicting instructions poison agents).

```
CANONICAL CORE:  AGENTS.md (universal standard)  +  .kiro/steering/*.md  +  docs/adr/
        │ thin pointers / native readers — no copied content
   ┌───┴────┬──────────┬───────────┬────────────┐
 Kiro    Claude Code   Codex       Jules        Cline
(.kiro/)  (CLAUDE.md) (AGENTS.md) (AGENTS.md) (.clinerules/)
```

| Tool               | Entry point                                                    | Notes                                         |
| ------------------ | -------------------------------------------------------------- | --------------------------------------------- |
| Kiro (primary IDE) | `.kiro/steering/*`, `.kiro/specs/*`, hooks                     | Canonical knowledge base                      |
| OpenAI Codex       | `AGENTS.md`                                                    | Native support                                |
| Google Jules       | `AGENTS.md`                                                    | Native support                                |
| Claude Code        | `CLAUDE.md` → `AGENTS.md`; `.claude/settings.json` permissions | Committed allowlist reduces approval friction |
| Cline              | `.clinerules/00-read-first.md` → `AGENTS.md`                   | Legacy numbered files kept read-only          |

## 2. Why folders look this way in 2026

1. **Agents are teammates** — every directory self-describes in one read (folder README /
   nested AGENTS.md). Exploration cost = context tokens = money and accuracy.
2. **Context window is the scarce resource** (Anthropic's #1 rule): small cohesive modules,
   barrel exports, quarantined generated code.
3. **Closest-instruction-wins**: nested AGENTS.md scope subsystem rules without bloating root.
4. **Deterministic verification**: every gate is a named script in `scripts/` + npm alias;
   agents self-check instead of guessing ("trust-then-verify").
5. **Deterministic > prose for hard guards**: repo-level mechanisms (husky pre-commit, CI,
   lint boundaries, permission deny-lists) protect paths regardless of which agent runs;
   tool-specific hooks are convenience, not the safety model.
6. **Docs-as-code by proximity**: ADRs and runbooks live next to what they describe so
   retrieval is natural.

## 3. Target tree (delta view)

```
Edeviser-Kiro/
├── AGENTS.md              # ✅ universal entry (tool map, repo map, gates)
├── CLAUDE.md              # ✅ thin pointer + hard guards
├── .claude/settings.json  # ✅ committed permissions (deny: migrations, generated types)
├── .clinerules/00-read-first.md  # ✅ pointer; legacy 01–08 kept read-only
├── src/AGENTS.md          # ✅ frontend layering & conventions
├── supabase/AGENTS.md     # ✅ migration/edge-function/RLS rules
│
├── src/app/               # ✅ exists (app shell)
├── src/features/          # ✅ exists — keep new domain work here behind barrel exports
├── docs/adr/              # ✅ seeded: 0001-rls-everywhere · 0002-deepseek-single-provider
│                          #    · 0003-agentic-autonomy-model
├── docs/runbooks/deploy.md   # ✅ deployment & release runbook
├── docs/sentinel.md       # ✅ engineering-lessons log (moved from root)
├── e2e/intelligence-chain-obe.spec.ts  # ✅ recovered from mangled root filename "e"
└── archive/2026-H2/       # ✅ 47+ stray root artifacts quarantined (logs/har/pr-scratch/
                           #    audit-scripts/misc) — moved with git mv, nothing deleted
```

✅ done · Remaining known deviations (intentional / flagged): `github-mcp-server.exe(+.local)`
stays at repo ROOT because `.kiro/settings/mcp.json` references it by relative path; root
`README.md` currently contains unrelated GitHub-MCP-server content and needs a real project
README; `Review P1.docx` is a user document left untouched pending owner review.

## 4. Migration checklist (incremental, non-breaking)

1. [x] Root AGENTS.md rewritten to universal standard (tool map + repo map + gates)
2. [x] CLAUDE.md pointer created
3. [x] `.claude/settings.json` committed permissions (safe allowlist + deny-list)
4. [x] `.clinerules/00-read-first.md` pointer added
5. [x] Nested `src/AGENTS.md`, `supabase/AGENTS.md`
6. [x] `src/app/` confirmed already present (no extraction needed)
7. [x] `src/features/` confirmed present — enforce barrel imports for new domain work
8. [x] `docs/adr/` seeded (0001 RLS, 0002 DeepSeek single provider, 0003 agentic autonomy)
9. [x] Stray root artifacts moved → `archive/2026-H2/` (git mv, nothing deleted) + archive README
10. [x] `.gitignore` gap closed (`pdf-forge-exports/`; others were already covered)
11. [x] `docs/runbooks/deploy.md` created; `docs/sentinel.md`, `docs/design-qa.md`,
        `docs/architecture/query-performance.md`, `docs/agent/CODEX-MASTER-AGENTIC-GOAL.md`
        relocated from root
12. [x] Real project root `README.md` written (old GitHub-MCP content preserved at
        `archive/2026-H2/old-root-README-github-mcp-content.md`)
13. [ ] Decide placement of `Review P1.docx` (left untouched — owner review)
14. [x] Recovered E2E spec made safe-by-default via opt-in guard
        (`RUN_INTELLIGENCE_CHAIN_E2E=1` or explicit `E2E_ADMIN_EMAIL`; self-skips otherwise,
        keeping `--project=legacy-smoke` green). Guide: `CODEBASE-STRUCTURE-GUIDE.md`.
15. [x] Gate evidence recorded 2026-08-24: lint PASS · tsc/vitest failures traced
        exclusively to pre-existing untracked WIP (`src/__tests__/security/`,
        `agentCertification.property.test.ts`) + 8 modified src files from an earlier
        session — none of this reorganization's paths.

## 5. Archive proposal (NOT executed — review then move)

Candidates currently polluting the repo root (every future grep pays for them):

- `_*.mjs`, `_*.cjs`, `_*.txt`, `_*.json` one-off audit/verify scripts (`__audit_*`,
  `_verify_dash_fix*`, `_tscout.txt`, `gate-*.log`, `lint-out.txt`, `tsc-out.txt`, …)
- HAR captures: `e-deviser.vercel.app*.har.txt`, `har-*-analysis.txt`, `analyze-har*.ps1`
- Stale PR scratch: `pr-body.md`, `pr-comment*.md`, `pr-state.json`, `_commitmsg.txt`, `_prbody.md`
- Misc: `cr2.json`, `cr3.json`, `build-out.txt`, `vite*.log`, `rls-fail.log`, `ABSENT } }`

Proposed command shape (run manually after review):
`git mv <file> archive/2026-H2/` per file, single commit `chore(repo): archive legacy root artifacts`.

## 6. Principles reference

- AGENTS.md open standard (agents.md) — closest-file-wins, plain Markdown, tool-agnostic.
- Anthropic Claude Code best practices — verification-first tasks, ruthless CLAUDE.md brevity,
  context-window management, adversarial review subagents.
- Senior hygiene that predates agents but matters more now: barrels as public APIs,
  feature colocation vs shared-layer discipline, generated-code quarantine, ADR culture.
