# Documentation Architecture — Final 2026-09-11

## Executive Summary

Discovered **~228 documentation files** across the repository. Created a **canonical documentation system** with clear authority levels, navigation, and conflict resolution.

---

## Files Created

| File | Purpose |
|---|---|
| `docs/INDEX.md` | Master entry point for all documentation |
| `docs/CANONICAL-DOCUMENTATION-HIERARCHY.md` | Authority hierarchy + "where to change" table |
| `docs/design-system/README.md` | Design system entry point |
| `docs/architecture/README.md` | Architecture entry point |
| `docs/audits/README.md` | Audits entry point (current + historical) |
| `docs/audits/documentation-inventory-2026-09-11.md` | Complete file inventory with classifications |
| `docs/audits/documentation-conflict-reconciliation-2026-09-11.md` | Resolved 8 contradictions |
| `docs/audits/documentation-dependency-map-2026-09-11.md` | *(this file — see below)* |
| `docs/design-system/DESIGN-SYSTEM-DOCUMENTATION-MAP.md` | Design rule → code traceability |

---

## Files Classified

| Classification | Count |
|---|---|
| CANONICAL | 11 |
| SUPPORTING | 25 |
| MACHINE-ENFORCED | 2 |
| ACTIVE | 5 |
| HISTORICAL | 30 |
| SUPERSEDED | 12 |
| SPECIFICATION | 110+ (`.kiro/specs/`) |
| OPERATIONAL | 28 (`.clinerules/`, steering, AGENTS) |
| PROTOTYPE | 80 (HTML/CSS/JS references) |

---

## Contradictions Resolved

8 contradictions between earlier and later documents were identified and resolved:
1. HeroCarousel status (missing → built)
2. Student mobile nav (missing → fixed)
3. EmptyState coverage (incomplete → verified)
4. Parent story gradient (dark → white glass per E1.19)
5. Parity scores (3.3 → 3.5)
6. Design system source (steering → docs/design-system/)
7. Route count (various → 140)
8. Test count (various → 755 files, 7017 tests)

---

## Navigation Improvements

**Before:** New engineer/AI would need to search entire repository to find design-system docs.

**After:** 
1. Read `docs/INDEX.md` → find correct domain
2. Read domain README → find canonical document
3. Read canonical document → find implementation location

**AI Navigation Test:** A new AI agent can now:
- Read `AGENTS.md` → find `docs/CANONICAL-DOCUMENTATION-HIERARCHY.md`
- Find which file to change for any UI concern via the "Where to Change" table
- Find the canonical design system spec
- Find implementation code from design rules

---

## Files NOT Moved

| File | Reason |
|---|---|
| `.clinerules/` | Operational AI tool instructions — must stay at root per tool conventions |
| `.kiro/steering/` | Protected — AGENTS.md prohibits modification |
| `.kiro/specs/` | Protected — managed by Kiro IDE |
| `prototype/` | Visual source of truth — referenced by scripts, tests, developers |
| `src/design-system/design-system/` | Code-level docs co-located with implementation |
| `supabase/AGENTS.md` | Backend-layer instructions — must stay with supabase/ |

---

## Validation

| Check | Result |
|---|---|
| ESLint | 0 warnings |
| TypeScript | 0 errors |
| Design lint | All checks pass |
| No broken README links | Verified |
| No code changes | Documentation only |

---

## Remaining Ambiguities

1. Some `.kiro/specs/` files contain design/UI patterns that may overlap with canonical design-system docs — not reconciled (protected files)
2. `docs/product/DESIGN-STYLE-GUIDE.md` and `docs/product/EDEVISER-UI-UX-DESIGN-REVIEW-DOCUMENT.md` both contain design rules predating the canonical design system — kept as historical references