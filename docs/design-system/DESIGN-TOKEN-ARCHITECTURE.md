# Design Token Architecture

---

## Token Hierarchy

```
SEMANTIC TOKENS (what it means)
    ├── --brand-gradient
    ├── --hero-gradient
    ├── --brand-primary
    └── attainment colors → lib/attainmentClassifier.ts

COMPONENT TOKENS (where it's used)
    ├── GradientCardHeader → --brand-gradient
    ├── Button (tactile) → --brand-gradient
    └── MasteryRing → attainment colors

VISUAL IMPLEMENTATION (actual CSS)
    ├── tokens.css → CSS custom properties
    ├── index.css → Tailwind @theme
    └── Tailwind v4 utility classes
```

---

## Current Token Coverage

| Token Category | Tokenized? | Status |
|---|---|---|
| Brand gradient | ✅ `--brand-gradient` in `tokens.css` | CANONICAL |
| Hero gradient | ✅ `--hero-gradient` inline | PARTIAL |
| Colors (semantic) | ✅ via `lib/attainmentClassifier.ts`, `bloomsVerbs.ts`, `leagueTier.ts` | CANONICAL |
| Typography | ❌ Inline Tailwind across ~200 pages | **NEEDS TOKENIZATION** |
| Spacing | ❌ Page-level Tailwind overrides | **NEEDS TOKENIZATION** |
| Radius | ⚠️ Shadcn default (12px) | PARTIAL |
| Shadows | ⚠️ Shadcn defaults | PARTIAL |
| Breakpoints | ✅ 640px in `RoleAppShell.tsx` | CANONICAL |
| Animation | ✅ keyframes in `index.css` | CANONICAL |

---

## Target Token Architecture

Add to `tokens.css`:

```css
:root {
  /* Typography */
  --text-page-title: text-2xl font-bold tracking-tight;
  --text-section-heading: text-lg font-bold tracking-tight;
  --text-kpi-value: text-2xl font-black;
  --text-body: text-sm font-medium antialiased;

  /* Spacing */
  --section-gap: 1.5rem;  /* gap-6 */
  --card-padding: 1rem;   /* p-4 */
  --page-gutter: 1rem;

  /* Radius */
  --radius-card: 0.75rem; /* rounded-xl (12px) */
  --radius-container: 1.25rem; /* rounded-[20px] (prototype) */
}
```