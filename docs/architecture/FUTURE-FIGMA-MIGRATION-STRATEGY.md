# Future Figma Migration Strategy

> How a new Figma design system translates into Edeviser code.

---

## Translation Pipeline

```
Figma Design System
        │
        ▼
┌───────────────────────┐
│ 1. TOKEN EXTRACTION   │  Extract colors, typography, spacing, radius, shadows
│    (manual analysis)  │  from Figma into design tokens
└───────┬───────────────┘
        ▼
┌───────────────────────┐
│ 2. SEMANTIC MAPPING   │  Map Figma names → Edeviser semantic tokens
│    src/design-system/ │  e.g., Figma "Surface/Primary" → --card-bg
│    design-system/     │
│    tokens.css         │
└───────┬───────────────┘
        ▼
┌───────────────────────┐
│ 3. PRIMITIVE UPDATE   │  Update Shadcn-derived primitives to match
│    src/design-system/ │  new Figma component specs
│    primitives/        │  Button, Card, Input, Select, etc.
└───────┬───────────────┘
        ▼
┌───────────────────────┐
│ 4. PATTERN UPDATE     │  Update canonical patterns for new visual language
│    src/design-system/ │  HeroCarousel, KPICard, SectionHeader, etc.
│    patterns/          │
└───────┬───────────────┘
        ▼
┌───────────────────────┐
│ 5. RESPONSIVE UPDATE  │  Update layout compositions for new breakpoints
│    src/app/           │  RoleAppShell, navigation components
│    RoleAppShell.tsx   │
└───────┬───────────────┘
        ▼
┌───────────────────────┐
│ 6. AUTOMATED LINT     │  Update design-lint rules for new constraints
│    scripts/           │  New icon rules, color rules, etc.
│    design-lint/       │
└───────┬───────────────┘
        ▼
    APPLICATION
    (unchanged business logic, data, APIs)
```

---

## What Stays Untouched

| Layer | Why |
|---|---|
| `src/lib/` | Business logic — no visual dependencies |
| `src/hooks/` | Data access — queries and mutations unaffected |
| `src/types/` | Types unchanged unless schema changes |
| `src/providers/` | Auth/theme providers unaffected |
| `supabase/` | Database, RLS, migrations unaffected |
| Route structure | Routes unchanged unless navigation changes |
| Feature logic | `src/features/` business behavior unchanged |

## What Changes

| Layer | Scope |
|---|---|
| `src/design-system/design-system/tokens.css` | Token values updated from Figma |
| `src/design-system/primitives/` | Shadcn components restyled |
| `src/design-system/patterns/` | Pattern compositions updated |
| `src/app/RoleAppShell.tsx` | Layout tokens updated |
| `docs/design-system/EDEVISER-DESIGN-SYSTEM-RULES.json` | Machine rules updated |
| `scripts/design-lint/check.mjs` | Lint rules updated |

## Estimated Impact

```text
FIGMA REPLACEMENT
        ↓
~30 files changed (design-system + shell)
~200+ files unchanged (business logic, data, features, pages)
```

Pages that use only canonical components see ZERO changes.