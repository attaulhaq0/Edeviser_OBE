# QA Hardening Record — 2026-09 Senior QA Findings (FAIL-01…04)

> **Source:** Consolidated live QA report (Admin → Teacher → Student → Gradebook),
> testing period 1–2 September 2026, live Vercel + live Supabase.
> **Verification surface:** live DB inspection (`learning_outcomes` rows) + live UI.
> **Purpose:** ensure none of these defects can recur, in the UI **and** in the
> agentic drafting path (defense-in-depth per the intelligence guardrails).
> **Policy:** one finding per work chunk; this file is the resume-point — each
> chunk updates its status line immediately upon completion.

## Findings & Status

| ID | Finding | Root surface | Hardening | Status |
|----|---------|--------------|-----------|--------|
| FAIL-01 | ILO creation accepts meaningless content (whitespace/punctuation-only titles reached `learning_outcomes` — confirmed in live DB) | `src/lib/schemas/ilo.ts` (+ admin ILO form via React Hook Form) | Meaningful-content Zod validation | **DONE** — schema guards wired; `src/__tests__/properties/ilo.property.test.ts` green (fast-check, whitespace/punctuation-only rejected) |
| FAIL-02 | Grade-scale ranges accept overlaps (B=70–90 vs A=85–100 → ambiguous classification zone) | `src/lib/schemas/institutionSettings.ts` (grade scale) | Overlap partition validator | **DONE** — overlap refine in schema; `institutionSettingsSchema.test.ts` SET-03 case green |
| FAIL-03 | Grade-scale ranges accept gaps (B min 70→71 leaves 70 unclassified) | `src/lib/schemas/institutionSettings.ts` (grade scale) | Gap partition validator (same refine) | **DONE** — gap/refuse-incomplete-partition refine in schema; `institutionSettingsSchema.test.ts` SET-04 + start/end coverage cases green |
| FAIL-04 | Gradebook counts completely-ungraded categories as 0% in Final % (88.3% × 20% ≈ 17.7% → F for ungraded work) | `src/hooks/useGradebook.ts` final calc + gradebook UI | Exclude-and-renormalize policy + explicit "excluded categories" notice (en/ar) | **DONE** — Part A: `src/lib/gradebookCalc.ts` (pure calc, `finalPercent` nullable) wired into `useGradebook` matrix; `GradebookView`/`gradebookExport` handle null finals ("—", no misleading 0%/F). Part B: excluded-categories notice (`teacher:gradebook.excludedCategories`, en/ar parity OK) + `notYetGradable` label in Final % cell. Gates: tsc clean, `gradebookCalc.test.ts` (5 cases incl. 88.3 renormalize + all-ungraded→null), `useGradebook.test.ts`, `gradebookView.test.tsx` (incl. FAIL-04 part-B assertions) — 22/22; `npm run i18n:check` OK |

## Agentic-Layer Mirrors (guardrails)

| Finding | Agentic surface | Guard | Status |
|---------|-----------------|-------|--------|
| FAIL-01 | `supabase/functions/_shared/ai/write-tools/outcome-governance.ts` (ILO draft/proposal path) | Same meaningful-content rule as the frontend schema — the LLM drafting path cannot produce what the form rejects | **DONE** — `requireMeaningfulText` (mirrors `meaningfulText` in `src/lib/schemas/ilo.ts`: trimmed text must match `/\p{L}\|\p{N}/u`) applied to `title`/`titleAr` on `draft_ilo`, `propose_create_ilo`, `propose_update_ilo`; provided-but-blank `titleAr` on create/draft is treated as "not provided", on update as an explicit clear (mirrors frontend `""` allowance); module version bumped to 1.1.0. No Deno test file exists for this write-tool and Deno is not installed locally — change verified by targeted read of the edited regions; gate = existing function tests (none local) |
| FAIL-04 | Agent summaries referencing final grades must reflect the renormalized policy | Draft tool output uses the same calc semantics | **DONE** (verified) — codebase search confirms NO agent/Edge-Function surface recomputes final weighted grades; the only calc is `computeFinalWeightedGrade` in `src/lib/gradebookCalc.ts` (canonical, unit-tested), consumed by `useGradebook`. No divergent agent-side calc exists to mirror |

## Decisions

- **FAIL-04 policy: exclude-and-renormalize.** Categories with zero graded
  assessments are excluded from the weighted denominator until they contain at
  least one graded entry; the UI states this explicitly. Rationale: standard
  LMS behavior; counting-empty-as-zero silently produces failing grades for
  ungraded work (the exact QA complaint). Reversal is a one-line calc change.

## Verification Record (close-out, 2026-09-02)

- [x] `npm run lint` — zero warnings
- [x] `npx tsc --noEmit` — 0 errors
- [x] `npm test` — full Vitest suite: 726 files / 6,665 tests, all green
- [x] `npm run i18n:check` — en/ar key parity OK across all namespaces
- [x] `npm run check:runtime-dependencies` — manifest validates, no errors
- [x] Targeted suites: ILO schema (+ fast-check property tests), institutionSettings
      schema (SET-03/SET-04 overlap/gap rejection), `gradebookCalc.test.ts` (5 cases:
      all-ungraded→null, empty→null, 88.3-single-graded→88.3 renormalized, subset
      renormalize→74, full-coverage plain weighted→84), `useGradebook.test.ts`,
      `gradebookView.test.tsx` (incl. excluded-categories notice + "Not yet gradable")

**Surfaces touched:** `src/lib/schemas/ilo.ts`, `src/lib/schemas/institutionSettings.ts`,
`src/lib/gradebookCalc.ts` (new), `src/lib/gradebookExport.ts`, `src/hooks/useGradebook.ts`,
`src/pages/teacher/gradebook/GradebookView.tsx`, `src/locales/{en,ar}/teacher.json`,
`supabase/functions/_shared/ai/write-tools/outcome-governance.ts` (agentic mirror),
plus their unit/property test files and this spec.

**Incidental repair (required for a green gate):** `phase2EdgeFunctionDeployment.test.ts`
expected 7 tutor-intelligence functions but the committed manifest has 8 — HEAD commit
`6aa4e8c2` added `generate-quiz-questions` without updating the stale count. Updated
7→8 per the test's own "tracks the live manifest" contract.

**QA re-test targets (expected):** SET-03/SET-04 grade scales rejected with validation
errors; garbage/whitespace-only ILO rejected (form + agent draft path); gradebook
final = renormalized percentage (88.3 case → 88.3, passing) with an explicit
"Not counted: <categories> — no grades recorded yet." notice; all-ungraded students
show "Not yet gradable" instead of 0%/F.

## Post-merge record (2026-09-02, local bookkeeping — fold into the next PR)

- **Merged:** PR #306 squash-merged to main as `97dcd13e` (all 39 checks green at
  exact head `a4fc11a1`; Git-linked Supabase Preview valid — `git_branch
  fix/qa-hardening-gradebook-outcomes`, `pr_number 306`, `FUNCTIONS_DEPLOYED`).
- **PR #305** closed as superseded (its 2 commits landed via #306; its red CI was
  exactly the stale manifest-count test repaired here). Supersession comment posted.
- **Branch cleanup:** both PR branches (local + remote) deleted; Supabase preview
  branches for 305/306 auto-removed — only `main` remains (live-verified via MCP).
- **Production DB:** live-verified via MCP — `rubrics_created_by_default_auth_uid`
  applied (recorded version `20260901232509`; repo parity mirror
  `20260902090000` is a known/grandfathered duplicate base-name; `db:check-dup-names`
  CLEAN).
- **Edge Runtime deployment: DEPLOYED + ATTESTED (2026-09-02).** Human approved the
  production gate; `Deploy Edge Runtime (production)` run 33630505511 deployed the
  manifest-derived closure (16 functions incl. the 8 tutor-intelligence members)
  and its "Attest deployment and verify ownership/configuration parity" step
  succeeded — the workflow re-downloaded the deployed sources from production and
  verified parity, including `_shared/ai/write-tools/outcome-governance.ts` (the
  requireMeaningfulText change). Independently verified live via MCP: `agent-worker`
  v25 / `agent-orchestrator` v26 / `agent-evaluation-jobs` / `intervention-jobs`
  all `updated_at` 2026-09-02T12:38:54Z. Attestation artifact:
  edge-runtime-attestation-snapshot.zip (ID 9846817466).
- **Pre-existing infra issue (out of scope, reported):** `Release` workflow
  (Changesets) fails on the last 4 main pushes — action version requires Changesets
  CLI v3 but repo pins v2 ("use Changesets action v1 instead"). Needs a separate
  chore PR.
