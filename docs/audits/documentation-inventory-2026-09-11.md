# Documentation Inventory — 2026-09-11

## Summary

| Category | Count |
|---|---|
| Design system docs | 5 |
| Architecture docs | 12 |
| Audit reports (current) | 11 |
| Audit reports (historical) | 15 |
| Product docs | 11 |
| Business docs | 10 |
| Agent/AI docs | 9 |
| ADRs | 3 |
| Audit findings | 5 |
| Engineering steering | 15 (`.kiro/steering/`) |
| Feature specs | 36 (`.kiro/specs/`) |
| AI tool rules | 8 (`.clinerules/`) |
| Agent instructions | 3 (`AGENTS.md`, `src/AGENTS.md`, `supabase/AGENTS.md`) |
| Prototype refs | 77 (HTML) + 2 (shared.css/js) + 1 (README) |
| **TOTAL** | **~228** |

---

## Canonical Documents

| File | Category | Authority |
|---|---|---|
| `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` | Design system | **CANONICAL** |
| `docs/design-system/canonical-ui-pattern-registry.md` | Design system | SUPPORTING |
| `docs/design-system/EDEVISER-DESIGN-SYSTEM-RULES.json` | Design system | **MACHINE-ENFORCED** |
| `docs/design-system/PROTOTYPE-PARITY-BACKLOG.md` | Design system | ACTIVE |
| `docs/CANONICAL-DOCUMENTATION-HIERARCHY.md` | Documentation | **CANONICAL** |
| `docs/INDEX.md` | Documentation | **CANONICAL** (entry point) |
| `docs/architecture/SYSTEM-ARCHITECTURE.md` | Architecture | **CANONICAL** |
| `docs/audits/production-release-readiness-final-2026-09-10.md` | Release | **CANONICAL** |
| `docs/audits/responsive-web-architecture-final-2026-09-10.md` | Responsive | **CANONICAL** |
| `AGENTS.md` | AI instructions | **CANONICAL** (entry point) |
| `prototype/` | Visual design | **CANONICAL** (visual source of truth) |

---

## Files Outside `docs/` That Are Documentation

| File | Type | Purpose |
|---|---|---|
| `AGENTS.md` | AI instruction | Universal entry point for AI agents |
| `src/AGENTS.md` | AI instruction | Frontend-specific rules |
| `supabase/AGENTS.md` | AI instruction | Backend-specific rules |
| `.clinerules/00-08` | AI instruction | Tool-specific mirrors (keep in sync with steering) |
| `.kiro/steering/*.md` | Engineering convention | 15 canonical steering files (do not edit directly) |
| `.kiro/specs/*/` | Feature specification | 36 specs with requirements/design/tasks |
| `prototype/README.md` | Prototype guide | Prototype usage instructions |
| `src/design-system/design-system/PARITY.md` | Design contract | Prototype → code fidelity contract |
| `src/design-system/design-system/README.md` | Design system | Code-level README |
| `src/design-system/design-system/AUTHENTICATION.md` | Auth design | Authentication design notes |
| `scripts/design-lint/check.mjs` | Automation | Machine-enforced design rules |

---

## Duplicate / Similar Documents

| Group | Files | Resolution |
|---|---|---|
| Design system specs | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` vs `.kiro/steering/design-system.md` | Docs version is canonical; steering remains for engineering conventions |
| Component patterns | `docs/design-system/canonical-ui-pattern-registry.md` vs `.kiro/steering/component-patterns.md` | Docs version is canonical; steering remains for engineering conventions |
| UI review docs | `docs/product/EDEVISER-UI-UX-DESIGN-REVIEW-DOCUMENT.md` vs `docs/product/DESIGN-STYLE-GUIDE.md` | Both contain design rules; design-system doc supersedes both for visual rules |
| Architecture docs | `docs/architecture/SYSTEM-ARCHITECTURE.md` vs `docs/architecture/ARCHITECTURE-AUDIT.md` | SYSTEM-ARCHITECTURE.md is canonical overview; ARCHITECTURE-AUDIT.md is historical audit |

---

## Superseded Documents

| File | Superseded By | Reason |
|---|---|---|
| Early audit reports (< 2026-08-21) | Current audits | Dated findings, replaced by newer audits |
| `phase-3-prototype-parity-remediation-2026-09-10.md` | `phase-4-final-prototype-parity-2026-09-10.md` | Phase 4 supersedes Phase 3 scores |
| `full-prototype-parity-2026-09-10.md` initial matrix | Updated matrix in 5x5 gap register | Gap register is more current |