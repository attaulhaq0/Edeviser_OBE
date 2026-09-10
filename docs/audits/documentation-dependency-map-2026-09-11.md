# Documentation Dependency Map — 2026-09-11

Shows which documents reference or are referenced by others.

---

## Design System Documents

```
docs/INDEX.md
├── references → docs/CANONICAL-DOCUMENTATION-HIERARCHY.md
├── references → docs/design-system/README.md
└── references → docs/audits/README.md

docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md (CANONICAL)
├── references → docs/design-system/canonical-ui-pattern-registry.md
├── references → docs/design-system/EDEVISER-DESIGN-SYSTEM-RULES.json
├── references → src/design-system/design-system/tokens.css
├── references → src/lib/attainmentClassifier.ts, bloomsVerbs.ts, leagueTier.ts
├── enforced by → scripts/design-lint/check.mjs
└── referenced by → all design-system consumers

docs/design-system/EDEVISER-DESIGN-SYSTEM-RULES.json (MACHINE-ENFORCED)
├── consumed by → scripts/design-lint/check.mjs
└── referenced by → design system spec

docs/design-system/canonical-ui-pattern-registry.md
├── references → design system spec
├── references → src/design-system/patterns/
└── referenced by → developers implementing UI

docs/design-system/PROTOTYPE-PARITY-BACKLOG.md
---

## Audit Reports

```
docs/audits/production-release-readiness-final-2026-09-10.md (CANONICAL)
├── references → docs/audits/production-defects-final-2026-09-10.md
├── references → docs/audits/responsive-web-architecture-final-2026-09-10.md
└── supersedes → earlier production-readiness reports

docs/audits/prototype-parity-5x5-gap-register-2026-09-10.md (CANONICAL)
├── references → docs/audits/full-prototype-parity-2026-09-10.md
├── references → prototype/ (77 HTML references)
└── supersedes → earlier parity reports

docs/audits/responsive-web-architecture-final-2026-09-10.md
├── references → src/app/RoleAppShell.tsx
├── references → src/components/shared/MobileTabBar.tsx
└── referenced by → responsive development
```

## Agent/AI Instructions

```
AGENTS.md (CANONICAL entry point)
├── references → .kiro/steering/ (15 files)
├── references → src/AGENTS.md, supabase/AGENTS.md
├── references → prototype/
└── referenced by → all AI tools (Kiro, Codex, Jules, Claude, Cline)

src/AGENTS.md → frontend-layer rules
supabase/AGENTS.md → backend-layer rules
```

## Script / Automation

```
scripts/design-lint/check.mjs
├── scans → src/**/*.tsx, src/**/*.ts
└── invoked by → npm run lint:design (package.json)
```

## Prototype References

```
prototype/ (77 HTML + shared.css + shared.js)
├── referenced by → docs/audits/full-prototype-parity-2026-09-10.md
├── referenced by → src/design-system/design-system/PARITY.md
├── consumed by → playwright visual tests
└── consumed by → scripts/check-prototype-boundary.mjs
```

---

## Critical Paths

### Change a design rule:
`docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` → `src/design-system/` → `scripts/design-lint/check.mjs` → `npm run lint:design` → `npm test`

### Add a new page:
`src/pages/{role}/NewPage.tsx` → `src/router/AppRouter.tsx` → `src/lib/navItems.ts` → `npm run check:critical-routes`

### Fix responsive issue:
`docs/audits/responsive-web-architecture-final-2026-09-10.md` → `src/app/RoleAppShell.tsx` or `src/design-system/patterns/` → test at 1440/768/375px

## No Circular Dependencies
All references form a directed acyclic graph with clear authority hierarchy.
├── references → docs/audits/full-prototype-parity-2026-09-10.md
└── referenced by → implementation planning