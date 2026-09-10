# Documentation Conflict Reconciliation — 2026-09-11

**Method:** Cross-reference all audit reports, design specs, and parity documents.

---

## Resolved Contradictions

| # | Topic | Earlier Doc | Later Doc | Current Truth | Evidence | Action |
|---|---|---|---|---|---|---|
| 1 | HeroCarousel status | `card-inventory.md` (⏸ carousel not built) | `phase-4-final-*.md` (already built + wired) | **BUILT** — exists at `src/design-system/patterns/HeroCarousel.tsx`, wired in 4/5 dashboards | Source code inspection confirmed component exists and is exported | Archive earlier claim |
| 2 | Student mobile nav | `parity backlog PAR-002` (missing) | `phase-3-*.md` (fixed) | **FIXED** — MobileTabBar wired into RoleAppShell | `RoleAppShell.tsx` imports and renders MobileTabBar | Supersede PAR-002 backlog entry |
| 3 | EmptyState coverage | `bugfix.md 1.22` (blank areas) | `phase-3-*.md` (verified sufficient) | **VERIFIED** — EmptyState component + DataTable.emptyState prop provides pattern | Source audit confirms coverage | Archive bug report |
| 4 | Parent story gradient | Prototype has dark gradient | E1.19 changed to white glass | **INTENTIONAL** — white liquid-glass per E1.19 design decision | `ParentDashboardScreen.tsx` uses white card pattern | Document as intentional exception |
| 5 | Parity score (Phase 2 vs Phase 4) | Phase 2: 3.3 overall | Phase 4: 3.5 overall | **3.5** — improvement from MobileTabBar fix + HeroCarousel verification | Phase 4 report is latest | Phase 2 superseded |
| 6 | Design system source | `.kiro/steering/design-system.md` + `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` | Both say similar things but steering is older | **CANONICAL: `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md`** | Created 2026-09-10, supersedes steering doc for visual rules | Steering remains for engineering conventions |
| 7 | Route count | Various docs cite different numbers | Actual AppRouter has 140 routes | **140** — confirmed by source inspection | `Select-String` on AppRouter returns 140 matches | Update all docs to 140 |
| 8 | Test count | Various docs cite 7016-7017 | Actual: 7016 passed, 1 skipped | **755 files, 7016+1 tests** | Vitest output confirms | Standardize on "755 files, 7017 tests" |

---

## Unresolved (Needs Live Verification)

| # | Topic | Question |
|---|---|---|
| 1 | RLS policies | Several historical audits reference RLS checks — need live Supabase verification per AGENTS.md live-state rule |
| 2 | E2E test results | E2E responsive screenshots show sidebar visible on mobile for admin — test may need updating |
| 3 | Console errors | 92 console.error calls detected — need runtime verification to distinguish legitimate vs. defect |

---

## Actions Taken

1. All four parity-phase reports now reference consistent scores (3.5 overall)
2. Route count standardized to 140 across all documentation
3. Design-system authority clarified: `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` is canonical
4. Historical audit reports archived in `docs/audits/` with clear dating
5. Superseded findings marked in parity backlog