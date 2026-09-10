# Future Design System Replacement

> How to swap the visual layer while preserving the application.

---

## Current State: Level 3

The design system is isolated but typography/spacing are not fully tokenized.

## Target State: Level 4

Full visual independence with semantic token architecture.

## Replacement Playbook

### Step 1: Extract New Tokens from Figma
- Colors → `--brand-primary`, `--brand-gradient`, semantic colors
- Typography → `--font-heading`, `--font-body`, `--text-2xl`, etc.
- Spacing → `--section-gap`, `--card-padding`, etc.
- Radius → `--radius-card`, etc.
- Shadows → `--shadow-card`, etc.

### Step 2: Update tokens.css
Replace values in `src/design-system/design-system/tokens.css`.

### Step 3: Verify Canonic Components
Each pattern should render correctly with new tokens without code changes.

### Step 4: Update Design Lint
Update machine rules for new visual constraints.

### Step 5: Run Visual Regression
`npm run test:visual` — compare before/after.

## What Must NOT Change

- `src/lib/` — business logic
- `src/hooks/` — data access
- `src/types/` — type definitions
- `src/router/` — routing
- `supabase/` — database/RLS
- `src/providers/` — auth/theme

## What MAY Change

- `src/design-system/design-system/tokens.css`
- `src/design-system/primitives/` (restyle Shadcn)
- `src/design-system/patterns/` (update compositions)
- `src/app/RoleAppShell.tsx` (layout tokens)
- `scripts/design-lint/check.mjs` (lint rules)
- `docs/design-system/` (documentation)

## Success Criteria

After replacement:
1. All 7017 tests pass
2. Visual regression shows only intentional changes
3. Business logic unchanged
4. API contracts unchanged
5. All 5 roles functional
6. Desktop, tablet, mobile all work