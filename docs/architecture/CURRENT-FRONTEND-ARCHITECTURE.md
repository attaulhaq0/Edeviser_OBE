# Current Frontend Architecture — Assessment

> Evidence-backed, not aspirational.

---

## Design-System Maturity: Level 3 (Strong boundary)

**Why Level 3:**
- ✅ Design tokens centralized in `design-system/design-system/tokens.css`
- ✅ 17 canonical patterns defined in `design-system/patterns/`
- ✅ Automated lint enforcement via `scripts/design-lint/check.mjs`
- ✅ 0 data imports in design-system (verified)
- ✅ 0 UI imports in business logic (verified)
- ⚠️ Typography not tokenized (inline Tailwind across ~200 pages)
- ⚠️ Spacing not tokenized (page-level Tailwind overrides)
- ⚠️ 236-file `components/shared/` mixes concerns (domain UI + generic UI + shims)

## Architecture Scorecard

| Concern | Score | Evidence |
|---|---|---|
| Business/presentation separation | **4** | lib/ has 0 UI imports; design-system has 0 data imports |
| Design-system independence | **4** | Well-isolated module with clean boundaries |
| Design-token architecture | **3** | Colors tokenized; typography/spacing not fully |
| Component modularity | **3** | Canonical components exist; 236 mixed-concern shared files |
| Pattern architecture | **4** | 17 well-defined canonical patterns |
| Layout architecture | **3** | Single RoleAppShell for all roles; responsive via CSS grid |
| Desktop architecture | **4** | 3-col layout with sidebar, content, rail |
| Tablet architecture | **2** | No dedicated tablet strategy — uses desktop layout |
| Mobile architecture | **3** | MobileTabBar for student/parent; admin/coord/teacher gap |
| Role architecture | **3** | Role-specific pages; shared app shell |
| Route architecture | **4** | 140 routes, lazy-loaded, role-guarded |
| Global change propagation | **4** | 17 of 20 concerns change via single file |
| Figma independence | **3** | Tokenized colors; typography/spacing not fully |
| Design-system replacement readiness | **3** | ~30 files would change; typography would affect ~200 |
| Junior-developer navigability | **4** | Clear "where to change" tables |
| AI-agent navigability | **4** | Explicit search-priority guides |
| Automated enforcement | **3** | Design lint exists; no import-boundary enforcement |
| Test isolation | **3** | Component tests isolated; visual tests depend on design |
| Documentation discoverability | **5** | Canonical system established (228 files classified) |
| Migration safety | **3** | No automated rollback; manual verification |

## Largest Architectural Opportunities

| Priority | Issue | Impact |
|---|---|---|
| 1 | Typography tokenization | ~200 pages would gain single-point control |
| 2 | Spacing tokenization | ~200 pages would gain single-point control |
| 3 | `components/shared/` deduplication | 236 files → clearer ownership |
| 4 | Remove legacy re-export shims | 20+ files eliminated |
| 5 | Remove direct Supabase imports from components | 4 files → use hooks |