# Edeviser — Canonical Documentation Hierarchy

> **Read this first** before modifying any code, documentation, or design-system rules.

---

## Authority Levels

| Level | Meaning | Examples |
|---|---|---|
| **CANONICAL** | Current single source of truth. Must be consulted before changes. | Design system spec, architecture docs |
| **SUPPORTING** | Valid working document that supplements canonical docs. | Pattern registry, responsive architecture report |
| **MACHINE-ENFORCED** | Rules enforced by automation (lint, CI, scripts). | `EDEVISER-DESIGN-SYSTEM-RULES.json`, ESLint config |
| **HISTORICAL** | Past audit/report, kept for reference. May be outdated. | Audit reports from previous dates |
| **SUPERSEDED** | Replaced by a newer document. Read the replacement instead. | Old design system drafts |
| **OPERATIONAL** | Development instructions (not design authority). | `.clinerules/`, `AGENTS.md`, CI config |
| **SPECIFICATION** | Feature requirements/design/tasks (`.kiro/specs/`). | Kiro IDE spec files |

---

## Hierarchy

```
1. PRODUCT DECISIONS (Owner-approved)
   ├── prototype/  (77 HTML fidelity references — visual source of truth)
   └── docs/product/EDEVISER-COMPLETE-PRODUCT-DOCUMENTATION.md

2. CANONICAL DESIGN SYSTEM
   ├── docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md  ← START HERE for UI
   ├── docs/design-system/canonical-ui-pattern-registry.md
   ├── docs/design-system/EDEVISER-DESIGN-SYSTEM-RULES.json  ← Machine-enforced
   ├── docs/design-system/PROTOTYPE-PARITY-BACKLOG.md
   └── src/design-system/design-system/tokens.css

3. CANONICAL ARCHITECTURE
   ├── docs/architecture/SYSTEM-ARCHITECTURE.md
   ├── docs/architecture/DATA-FLOW-TRACE.md
   ├── docs/audits/responsive-web-architecture-final-2026-09-10.md
   └── docs/architecture/SUPABASE-HEALTH-REPORT.md

4. ENGINEERING RULES (Operational)
   ├── AGENTS.md  ← AI agent entry point
   ├── .clinerules/  (01-08 steering mirrors)
   ├── .kiro/steering/  (15 canonical steering files)
   ├── src/AGENTS.md  ← Frontend-layer rules
   └── supabase/AGENTS.md  ← Backend-layer rules

5. CURRENT AUDITS & BACKLOGS
   ├── docs/audits/full-prototype-parity-2026-09-10.md
   ├── docs/audits/prototype-parity-5x5-gap-register-2026-09-10.md
   ├── docs/audits/production-release-readiness-final-2026-09-10.md
   └── docs/audits/production-defects-final-2026-09-10.md

6. HISTORICAL REPORTS
   └── docs/audits/  (all other dated audit files)

7. SPECIFICATIONS (.kiro/specs/)
   └── 36 feature specs with requirements/design/tasks
```

---

## Quick Reference: Where to Change What

| I want to change... | Go here |
|---|---|
| Brand colors / gradients | `src/design-system/design-system/tokens.css` + `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §2` |
| Typography | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §6` |
| Card component | `src/design-system/patterns/PCard.tsx` |
| Button styles | `src/design-system/primitives/Button.tsx` (variant=tactile for gradient) |
| Page shell / sidebar | `src/app/RoleAppShell.tsx` |
| Mobile navigation | `src/components/shared/MobileTabBar.tsx` |
| Desktop sidebar | `src/components/shared/Sidebar.tsx` |
| Section cards with gradient header | `src/design-system/patterns/GradientCardHeader.tsx` |
| Icon treatment rules | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §4` |
| Semantic colors | `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md §3` |
| Responsive architecture | `docs/audits/responsive-web-architecture-final-2026-09-10.md` |
| Role-specific features | `src/features/{role}/` |
| Route configuration | `src/router/AppRouter.tsx` + `src/lib/navItems.ts` |
| Business logic | `src/lib/` |
| API / data access | `src/hooks/` |
| Database / RLS | `supabase/migrations/` (via Supabase MCP only) |
| Adding a new page | `src/pages/{role}/` + route in `AppRouter.tsx` + nav item in `navItems.ts` |
| Design-system lint rules | `scripts/design-lint/check.mjs` |
| Prototype fidelity reference | `prototype/` HTML files |
| Feature specifications | `.kiro/specs/{feature-name}/` |