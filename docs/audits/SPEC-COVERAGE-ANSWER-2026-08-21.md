# Honest Answer: Does the Agentic-Intelligence Spec Cover Everything? (2026-08-21)

## Short answer

**No — and it shouldn't.** The `edeviser-agentic-intelligence` spec covers the AI/OBE/agent
platform layer deeply, but it does **not** cover the whole product. And that is correct by
design: Kiro specs are per-feature/per-domain. One mega-spec would become unmaintainable.

## What the agentic-intelligence spec covers

Everything from the "Edeviser Agentic Intelligence Platform Specification" PDF:

- OBE/ILO canonical layer, mapping direction, RLS, attainment (Phases 0–1)
- DeepSeek provider, tutor, orchestrator, tool registry, approvals, Digital Twin (Phase 2)
- Assistant frontend, autonomy, agents, copilots, A3, observability (Phases 3–8)

Every `[x]` in it was verified against the LIVE database and GitHub main on 2026-08-21
(evidence: `docs/audits/AGENTIC-INTELLIGENCE-CROSSCHECK-2026-08-21.md`).

## What it deliberately does NOT cover

The unmarked work in your other specs is mostly **different domains** that were never part of
the agentic PDF. I audited all unmarked tasks across every spec and folded into
`edeviser-agentic-intelligence/tasks.md` only the ones that ARE agentic-layer work
(e.g., MockProvider, autonomy engine, §18 outcome tools, write-tools audit, observability
tables/jobs, env hygiene). The rest stays where it belongs:

| Spec | Open tasks | Domain | Keep or archive? |
|---|---|---|---|
| prototype-frontend-rebuild | 103 | UI rebuild to prototype fidelity | **Keep** — active product track |
| dashboard-and-ux-performance | 50 | Perf/UX | **Keep** — active product track |
| production-bug-fixes | 28 | Bug backlog | **Keep** — active product track |
| duplication-audit-verification | 26 | Code-quality verification | **Keep** — active product track |
| ui-prototype-migration | 15 open + 15 partial | UI migration | **Keep** — active product track |
| rls-consolidation-and-infra-health | 2 | Infra | **Keep** until the 2 close, then archive |
| edeviser-agentic-intelligence | 35 | AI/agent platform | **Keep** — the active build spec |

All other 25 specs show **zero open tasks** — their work is done.

## So what's the point of keeping the completed specs?

Three honest options — pick one:

1. **Archive completed specs (recommended).** Move the 25 fully-done specs to
   `.kiro/specs/_archive/` (or delete them — git history preserves everything). The folder
   then shows only live work: 6 active specs instead of 32. This is the cleanest signal.
2. **Keep them as historical reference.** Zero cost besides folder noise; they document
   decisions (e.g., `edeviser-platform`'s 774 completed tasks are the platform's history).
3. **Delete them.** Not recommended — you lose the in-repo decision trail that AI agents
   (and humans) use to understand WHY things are built the way they are.

## What I did NOT do (and why)

I did not merge the other open specs' tasks into the agentic spec, because:
- They have different acceptance criteria, owners, and gates (UI/perf/bugs ≠ agent platform).
- Folding them in would make the agentic spec's 35 open tasks look like 250+, destroying
  the signal of "what remains for the AI platform".
- The cross-cutting rule already exists: `.clinerules/08-intelligence-layer.md` + AGENTS.md
  apply globally, so the agentic guardrails govern ALL work regardless of which spec it
  belongs to.

## Bottom line

- Agentic spec = complete and truthful for its domain (verified against live + main).
- Other open specs = separate, still-valid work — keep them.
- Completed specs = archive them when you want a clean folder; nothing is lost either way.