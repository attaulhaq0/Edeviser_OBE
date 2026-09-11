# Edeviser — Documentation Index

> **Start here.** This is the entry point for understanding the Edeviser codebase.

---

## I'm new. What should I read first?

1. `AGENTS.md` — AI agent instructions (if you're an AI)
2. `docs/CANONICAL-DOCUMENTATION-HIERARCHY.md` — Authority structure
3. `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` — Design rules

---

## I want to work on...

### UI / Design System
→ `docs/design-system/`  
→ `docs/design-system/EDEVISER-FRONTEND-DESIGN-SYSTEM.md` (canonical spec)  
→ `docs/design-system/canonical-ui-pattern-registry.md` (reusable patterns)  
→ `docs/design-system/PROTOTYPE-PARITY-BACKLOG.md` (remaining gaps)  
→ `src/design-system/` (implementation)  
→ `scripts/design-lint/check.mjs` (automated checks)

### Frontend Architecture
→ `docs/architecture/SYSTEM-ARCHITECTURE.md`  
→ `docs/architecture/DATA-FLOW-TRACE.md`  
→ `src/AGENTS.md` (frontend layer rules)

### Responsive / Mobile Web
→ `docs/audits/responsive-web-architecture-final-2026-09-10.md`  
→ `docs/audits/prototype-parity-5x5-gap-register-2026-09-10.md`

### Backend / Database
→ `docs/architecture/SUPABASE-HEALTH-REPORT.md`  
→ `supabase/AGENTS.md`  
→ `docs/adr/` (architecture decisions)

### Production Readiness
→ `docs/audits/production-release-readiness-final-2026-09-10.md`  
→ `docs/audits/production-defects-final-2026-09-10.md`  
→ `docs/audits/production-readiness-gauntlet-2026-09-10.md`

### Testing
→ `docs/agent/deployment-runbook.md`  
→ `docs/architecture/EDGE-FUNCTIONS-DEPLOYMENT-PLAN.md`

### Product / Features
→ `docs/product/EDEVISER-COMPLETE-PRODUCT-DOCUMENTATION.md`  
→ `docs/product/PRODUCT-REQUIREMENTS-DOCUMENT.md`  
→ `.kiro/specs/` (36 feature specifications)

### Business / Investor
→ `docs/business/`  
→ `docs/investor/`

---

## Folder Map

| Folder | Purpose |
|---|---|
| `docs/design-system/` | Canonical design system (start here for UI) |
| `docs/architecture/` | System architecture, data flow, Supabase |
| `docs/audits/` | Production audits (current + historical) |
| `docs/product/` | Product documentation, requirements |
| `docs/adr/` | Architecture decision records |
| `docs/business/` | Business plans, investor materials |
| `docs/investor/` | Investor pack, demo storyboard |
| `docs/agent/` | Agent/deployment guides |
| `docs/ai/` | AI architecture, provider config |
| `.kiro/steering/` | Engineering conventions (authoritative) |
| `.kiro/specs/` | Feature specifications |
| `.clinerules/` | AI tool rules (mirrors of steering) |
| `prototype/` | HTML fidelity references (visual source of truth) |
| `src/design-system/` | Design system implementation |