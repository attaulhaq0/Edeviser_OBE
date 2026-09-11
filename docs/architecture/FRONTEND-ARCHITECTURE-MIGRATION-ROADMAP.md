# Frontend Architecture — Migration Roadmap

---

## Phase 0: Documentation & Source-of-Truth ✅ COMPLETE

- 228 documentation files classified
- Canonical documentation system established
- 8 contradictions resolved

## Phase 1: Dependency Boundary Corrections

| Item | Files | Impact |
|---|---|---|
| Remove 4 direct Supabase imports from components | 4 | LOW — move to hooks |

## Phase 2: Design-System Boundary Cleanup

| Item | Files | Impact |
|---|---|---|
| Remove legacy re-export shims | 20+ | LOW — migrate consumers to `@/design-system` |
| Move generic patterns from `shared/` to `design-system/patterns/` | ~10 | MEDIUM — audit dependencies first |

## Phase 3: Token Normalization

| Item | Files | Impact |
|---|---|---|
| Typography tokenization | ~200 | HIGH — centralize font sizes/weights |
| Spacing tokenization | ~200 | HIGH — centralize section/card spacing |
| Card radius token | 1 | LOW — add to `tokens.css` |

## Phase 4: Primitive Consolidation

| Item | Files | Impact |
|---|---|---|
| Audit Shadcn primitives for consistency | 23 | LOW |
| Add missing primitives from canonical registry | ~5 | LOW |

## Phase 5: Component Consolidation

| Item | Files | Impact |
|---|---|---|
| Deduplicate `components/shared/` | 236 → ~180 | MEDIUM |
| Move domain-aware UI to `features/` | ~60 | MEDIUM |

## Phase 6-7: Pattern + Layout Architecture

| Item | Files | Impact |
|---|---|---|
| Formalize pattern documentation | ~17 patterns | LOW |
| Document layout contracts | 2 shell files | LOW |

## Phase 8: Responsive Architecture

| Item | Files | Impact |
|---|---|---|
| Add MobileTabBar for Admin/Coordinator/Teacher | 3 | LOW |
| Tablet-specific layout consideration | 2 | MEDIUM |

## Phase 9-10: Role + Page Architecture

| Item | Files | Impact |
|---|---|---|
| Remove legacy flag-gated dashboard wrappers | ~10 | LOW |
| Page composition documentation | Documentation only | LOW |

## Phase 11-13: Enforcement + Validation

| Item | Files | Impact |
|---|---|---|
| Import-boundary lint rules | Config | LOW |
| Figma replacement simulation | Documentation | LOW |
| Automated architecture verification | Script | LOW |

---

## Priority Order (by leverage)

1. **Typography tokenization** — single-point control for 200+ pages
2. **Spacing tokenization** — single-point control for 200+ pages
3. **Remove legacy re-export shims** — eliminate 20+ unnecessary files
4. **Remove direct Supabase from components** — 4 files
5. **Add MobileTabBar for all roles** — mobile navigation gap