# Canonical UI Pattern Registry

> **Purpose:** Single source of truth for every recurring UI pattern.
> **Version:** 2026-09-10
> **Use:** Before creating any new component, check this registry for the canonical pattern.

---

## PATTERN-ICON-001: Decorative Section Icon Wrapper

**Canonical treatment:** `bg-transparent` (preferred) or `bg-white/80 border border-slate-200/60 backdrop-blur-xs`

**Disallowed:** Any solid colored fill (`bg-*-50`, `bg-*-100`, etc.)

**Allowed exceptions:**
- Semantic status indicators (health, attainment)
- Data visualization (Bloom's dots, progress bars)
- Gamification badges (XP, league tiers)
- Brand accent chips via `var(--brand-gradient)`
- Sidebar Companion icon (gradient badge)

**Consumers:** All section headers, card headers, decorative icon placements across all roles

**Verification (2026-09-10):** 0 violations — fully compliant

---

## PATTERN-HEADER-001: Brand Gradient Header

**Canonical treatment:** `GradientCardHeader` component from `@/design-system/patterns/`

```tsx
<GradientCardHeader icon={Icon} title="Section Title" />
```

**Disallowed:** Raw `var(--brand-gradient)` inline styles on card headers, `from-teal-500 to-blue-600` utility classes

**Allowed exceptions:**
- Brand accent chips (e.g., 404 page compass icon) — single use, not a card header
- Primary CTA buttons via `Button variant="tactile"` — 1 per page section max
- Logo/branding elements

**Consumers:** All dashboard section cards, CQI cards, course file cards, any main section card

**Verification (2026-09-10):** Fully compliant — 0 legacy raw gradient headers remain

---

## PATTERN-CARD-001: Section Card

**Canonical treatment:**
```tsx
<Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
  <GradientCardHeader icon={Icon} title="Title" />
  <div className="p-6">{/* content */}</div>
</Card>
```

**Consumers:** All role dashboards, admin sections, coordinator sections, teacher sections

---

## PATTERN-CARD-002: KPI Card

**Canonical treatment:** `KPICard` component from `@/design-system/patterns/`

**Consumers:** All dashboard KPI grids, analytics summaries

---

## PATTERN-CARD-003: Hero Card

**Canonical treatment:** `WelcomeHero` component from `@/design-system/patterns/`

Uses dark gradient: `linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)`

**Consumers:** Student dashboard, parent dashboard

---

## PATTERN-ICON-002: Semantic Status Icon

**Canonical treatment:** `SeverityIcon` component from `@/design-system/patterns/`

Uses CVA variants for color-coded status tiles. Solid fills are ALLOWED per CVA variant definitions.

**Consumers:** Health reports, status indicators, alert panels

---

## PATTERN-BADGE-001: Attainment Badge

**Canonical treatment:** `getAttainmentBadgeStyle()` from `src/lib/attainmentClassifier.ts`

Color mapping: Excellent (green-50), Satisfactory (blue-50), Developing (yellow-50), Not Yet (red-50)

**Consumers:** All attainment displays across all roles

---

## PATTERN-BADGE-002: Bloom's Level Badge

**Canonical treatment:** `BLOOMS_COLORS` from `src/lib/bloomsVerbs.ts`

Color mapping per Bloom's taxonomy (purple/blue/green/yellow/orange/red at 100 shade)

**Consumers:** CLO forms, assessment rubrics, curriculum views

---

## PATTERN-BADGE-003: Outcome Type Badge

**Canonical treatment:** ILO (red-100), PLO (blue-100), CLO (green-100) with matching text/border

**Consumers:** Outcome lists, mapping tables, curriculum matrix

---

## PATTERN-BADGE-004: League Tier Badge

**Canonical treatment:** `TIER_COLORS` from `src/lib/leagueTier.ts`

Bronze (amber-600), Silver (gray-400), Gold (yellow-400), Diamond (blue-400)

**Consumers:** Leaderboard, student profiles, team displays

---

## PATTERN-BADGE-005: AI Autonomy Badge

**Canonical treatment:** `autonomyBadgeClass()` from `src/lib/aiGovernancePolicy.ts`

A0/A1 (blue-50), A2 (amber-50), A3 (emerald-50)

**Consumers:** AI governance page, agent configuration panels

---

## PATTERN-ROUTE-001: Coordinator Accreditation

**Route:** `/coordinator/accreditation` and `/coordinator/course-file`
**Component:** `CourseFileGenerator` -> `CoordinatorAccreditationNew`
**Prototype:** `coordinator-accreditation.html` + `coordinator-course-file.html`

**Resolution:** RESOLVED. `CoordinatorAccreditationNew` handles both accreditation readiness and course file generation. The redesign matches both prototype references. The legacy "wrong component" finding is obsolete.

---

## PATTERN-ANIMATION-001: Shimmer Loading

**Canonical treatment:** `<Shimmer className="h-32 rounded-xl" />` from `@/design-system`

**Rule:** Never full-page skeletons — always component-level shimmer

---

## PATTERN-ANIMATION-002: XP Pulse

**Canonical treatment:** `animate-xp-pulse` CSS class for XP award feedback

Use sparingly — only for actual XP award moments

---

## PATTERN-LAYOUT-001: Page Shell

**Canonical treatment:**
```tsx
<div className="space-y-6">
  <div className="flex items-center justify-between">
    <h1 className="text-2xl font-bold tracking-tight">Page Title</h1>
    {/* Optional: 1 gradient CTA button max */}
  </div>
  {/* Page content */}
</div>
```

---

## Anti-Patterns (NEVER use)

| Anti-Pattern | Replacement |
|---|---|
| `from-teal-500 to-blue-600` | `GradientCardHeader` or `var(--brand-gradient)` |
| Solid colored icon wrapper in header | `bg-transparent` |
| Physical CSS (`ml-`, `mr-`, `pl-`, `pr-`) | Logical CSS (`ms-`, `me-`, `ps-`, `pe-`) |
| Raw `<button>` / `<input>` | Shadcn `Button` / `Input` |
| Full-page skeleton | Component-level `<Shimmer>` |
| Pink/purple/violet/rose/fuchsia cards | White cards with shadow |
| Raw emoji as chrome | Lucide icons per PARITY.md S-B |