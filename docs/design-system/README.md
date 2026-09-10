# Design System — Documentation

> **Canonical entry point for UI/design decisions.**

---

## Quick Start

Read these in order:
1. `EDEVISER-FRONTEND-DESIGN-SYSTEM.md` — Canonical specification
2. `canonical-ui-pattern-registry.md` — Reusable patterns catalog
3. `PROTOTYPE-PARITY-BACKLOG.md` — Remaining parity gaps

---

## Files

| File | Type | Purpose |
|---|---|---|
| `EDEVISER-FRONTEND-DESIGN-SYSTEM.md` | **CANONICAL** | Complete design rules: colors, typography, icons, components, anti-patterns |
| `canonical-ui-pattern-registry.md` | **SUPPORTING** | Reusable UI patterns with canonical treatments and consumers |
| `EDEVISER-DESIGN-SYSTEM-RULES.json` | **MACHINE-ENFORCED** | Structured rules consumed by `scripts/design-lint/check.mjs` |
| `PROTOTYPE-PARITY-BACKLOG.md` | **ACTIVE** | Remaining prototype-production mismatches with resolution paths |
| `DESIGN-SYSTEM-DOCUMENTATION-MAP.md` | **SUPPORTING** | Design-rule → code location traceability |

---

## Implementation Location

| Concern | Code |
|---|---|
| Tokens | `src/design-system/design-system/tokens.css` |
| Primitives | `src/design-system/primitives/` |
| Patterns | `src/design-system/patterns/` |
| Mascot | `src/design-system/mascot/` |
| Parity contract | `src/design-system/design-system/PARITY.md` |
| Lint enforcement | `scripts/design-lint/check.mjs` |

---

## Change Flow

```
1. Read canonical spec (this folder)
2. Find pattern in registry
3. Modify implementation in src/design-system/
4. Run design lint: npm run lint:design
5. Run tests: npm test
6. Update docs if pattern changed
```