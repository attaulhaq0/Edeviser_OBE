# PRODUCT CONSTITUTION — Edeviser Platform
**Date:** 2026-09-12 | **Phase 13 Certified**

## CORE PRINCIPLES
1. **No incomplete core user journey** — Every exposed role must have working workflows
2. **Real data only** — No mock state, no hardcoded metrics, no seed-only success
3. **Customer-driven** — School activity → platform intelligence → measurable improvement
4. **Human-approved AI** — Agent recommendations require human approval for official mutations
5. **Privacy-first** — Parent sees summaries, never raw agent data or other children
6. **Framework-agnostic core** — Assessment strategies are pluggable, no if(IB) in core

## CERTIFICATION STANDARDS
- **Unit**: 7,140 tests, zero failures, tsc clean
- **E2E**: 32 Playwright specs across all 5 roles
- **DB**: RLS enforced, triggers verified, state machine enforced
- **Live**: At least one institution with real operational data

## LAUNCH SCOPE
- Current Qatar K-12 institutions
- IB MYP, MoEHE, IGCSE frameworks (as configured)
- Future frameworks in registry, marked ROADMAP

## GOVERNANCE
- No manual SQL in customer workflow
- No bypass of RLS
- No service-role keys in browser
- Migration changes via MCP only
- Types regenerated from live schema