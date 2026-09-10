# Start Here — For AI Agents

> Deterministic file-location rules. No guessing.

---

## Before Any Code Change

1. Read `AGENTS.md` — hard guards
2. Read `docs/architecture/EDEVISER-FRONTEND-MASTER-MAP.md` — layer map
3. Read `docs/architecture/FRONTEND-LAYER-OWNERSHIP.md` — what each layer may do

## Search Priority by Concern

| Concern | Search Here First | Never Search |
|---|---|---|
| Visual/design change | `src/design-system/` | `src/pages/` |
| Business logic | `src/lib/` | `src/design-system/` |
| Data/API | `src/hooks/` | `src/design-system/` |
| Navigation | `src/lib/navItems.ts` + `src/router/` | `src/design-system/` |
| Responsive | `src/app/RoleAppShell.tsx` | `src/lib/` |
| Shared UI | `src/components/shared/` | `src/hooks/` |

## Anti-Duplication Checklist

Before creating a new component, check:
1. `src/design-system/patterns/` — does a canonical version exist?
2. `src/components/shared/` — does a shared version exist?
3. Could this be a variant of an existing component?

## Architecture Violations to Avoid

- ❌ Business logic in `src/design-system/`
- ❌ Visual code in `src/lib/`
- ❌ Direct Supabase in components (use hooks)
- ❌ Role logic in generic primitives
- ❌ Page-specific design tokens
- ❌ Duplicate canonical components

## How to Verify Architecture

```bash
npm run lint           # ESLint
npx tsc --noEmit       # TypeScript
npm run lint:design    # Design-system compliance
npm test               # Full test suite
```