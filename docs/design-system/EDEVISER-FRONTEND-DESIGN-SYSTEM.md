# Edeviser Frontend Design System — Canonical Specification

> **Status:** Canonical — authority for all visual/UX decisions
> **Version:** 2026-09-10
> **Based on:** Prototype fidelity references, `.kiro/steering/design-system.md`, `.kiro/steering/component-patterns.md`, `.kiro/steering/prototype-fidelity.md`
> **Machine-readable rules:** `EDEVISER-DESIGN-SYSTEM-RULES.json`
> **Pattern registry:** `canonical-ui-pattern-registry.md`

---

## 1. Source of Truth

The prototype (`prototype/*.html`, `prototype/shared.css`, `prototype/shared.js`) is the **sole authority** for every visual/UX decision. The production codebase reproduces prototype values and structure via the `@/design-system` module and `src/design-system/tokens.css`.

---

## 2. Brand Identity

### Brand Colors
- **Brand Blue:** `#3b82f6` (blue-500) — primary CTA, active states, links
- **Brand Blue Dark:** `#2563eb` (blue-600) — hover states
- **Teal:** `#14b8a6` (teal-500) — secondary accents, gradient start
- **Brand Gradient:** `linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)` — card headers, primary buttons

### Brand Gradient Usage
- **Card headers:** All main section cards use the brand gradient via `GradientCardHeader` component
- **Primary CTAs:** `Button variant="tactile"` — max 1 per page section
---

## 3. Semantic Color System

### 3.1 Attainment Levels (OBE)
| Level | Background | Text | Border |
|---|---|---|---|
| Excellent (>=85%) | `bg-green-50` | `text-green-800` | `border-green-200` |
| Satisfactory (70-84%) | `bg-blue-50` | `text-blue-700` | `border-blue-200` |
| Developing (50-69%) | `bg-yellow-50` | `text-yellow-800` | `border-yellow-200` |
| Not Yet (<50%) | `bg-red-50` | `text-red-700` | `border-red-200` |

> Source: `src/lib/attainmentClassifier.ts` — `getAttainmentBadgeStyle()`

### 3.2 Bloom's Taxonomy (Domain Coding)
| Level | Background | Text |
|---|---|---|
| Remembering | `bg-purple-100` | `text-purple-700` |
| Understanding | `bg-blue-100` | `text-blue-700` |
| Applying | `bg-green-100` | `text-green-700` |
| Analyzing | `bg-yellow-100` | `text-yellow-700` |
| Evaluating | `bg-orange-100` | `text-orange-700` |
| Creating | `bg-red-100` | `text-red-700` |

> Source: `src/lib/bloomsVerbs.ts` — `BLOOMS_COLORS`

### 3.3 Outcome Type Badges
| Type | Background | Text | Border |
|---|---|---|---|
| ILO | `bg-red-100` | `text-red-700` | `border-red-200` |
| PLO | `bg-blue-100` | `text-blue-700` | `border-blue-200` |
| CLO | `bg-green-100` | `text-green-700` | `border-green-200` |

### 3.4 Gamification
| Element | Color |
|---|---|
| XP | `amber-500` |
| Bronze League | `bg-amber-600 text-white` |
| Silver League | `bg-gray-400 text-white` |
| Gold League | `bg-yellow-400 text-yellow-900` |
| Diamond League | `bg-blue-400 text-white` |

---

## 4. Icon Wrapper Rules (STRICT)

**Icon wrappers in section headers and card headers MUST use:**
- `bg-transparent` (transparent) — preferred
- `bg-white/80 border border-slate-200/60 backdrop-blur-xs` (white liquid glass)

**NEVER:** Solid colored fills on decorative icon containers.

### Allowed Exceptions (solid fills permitted):
1. **Semantic status indicators** (e.g., health check badges)
2. **Data visualization elements** (e.g., Bloom's dots, progress bars)
3. **Gamification badges** (XP chips, league tiers)
4. **Interactive action icon hover states** (`hover:bg-blue-50` on edit/delete buttons)
5. **Brand accent chips** using `var(--brand-gradient)` (e.g., 404 page)
6. **AI Companion sidebar icon** (gradient badge — approved prototype exception)

### Verification (2026-09-10):
- **0 violations** — all icon wrappers in `src/` use compliant backgrounds
- Compliant examples: `ResetPasswordPage.tsx:62`, `UpdatePasswordPage.tsx:92`, `AppRouter.tsx:527`
---

## 5. Component Architecture

### 5.1 Design System Module (`@/design-system`)
Canonical implementation layer. All new pages MUST use `@/design-system` primitives.

### 5.2 Shared Components (`@/components/shared/`)
Legacy compatibility layer. Many components now re-export from `@/design-system`.

### 5.3 UI Primitives (`@/components/ui/`)
Shadcn/ui (New York) base components — used as structural primitives, restyled via tokens.

### Key Design-System Components

| Component | Location | Purpose |
|---|---|---|
| `GradientCardHeader` | `@/design-system/patterns/` | Brand gradient header for section cards |
| `SectionHeader` | `@/design-system/patterns/` | In-page section title with optional icon chip |
| `KPICard` | `@/design-system/patterns/` | Metric card with hover effects |
| `MasteryRing` | `@/design-system/patterns/` | Circular progress ring for attainment |
| `SeverityIcon` | `@/design-system/patterns/` | Color-coded status icon tile |
| `WelcomeHero` | `@/design-system/patterns/` | Dark hero gradient dashboard welcome card |
| `PCard` | `@/design-system/patterns/` | Standard white card with shadow |

---

## 6. Typography

- **Font:** Noto Sans (Google Fonts, display=swap)
- **Page Title:** `text-2xl font-bold tracking-tight`
- **Section Heading:** `text-lg font-bold tracking-tight`
- **KPI Value:** `text-2xl font-black`
- **Metric Label:** `text-[10px] font-black tracking-widest uppercase`
- **Body:** `text-sm font-medium antialiased`
- **Button:** `text-sm font-semibold`

---

## 7. Layout Rules

- **Sidebar:** `w-64 fixed` (Student: hidden on mobile via `hidden md:block`)
- **Card padding:** `p-4` standard, `p-6` for gradient-card content
- **Section gap:** `gap-6`
- **KPI row:** `grid grid-cols-2 md:grid-cols-4 gap-4`
- **RTL compliance:** Use logical CSS properties (`ms-*`, `me-*`, `ps-*`, `pe-*`) — NEVER physical (`ml-*`, `mr-*`, `pl-*`, `pr-*`)

---

## 8. Animation

- **Library:** Framer Motion (complex) + CSS keyframes (simple)
- **Micro-interactions:** <=200ms
- **Honors:** `prefers-reduced-motion`
- **Custom keyframes:** shimmer, xp-pulse, badge-pop, float, streak-flame, fade-in-up
> Source: `src/lib/leagueTier.ts` — `TIER_COLORS`

---

## 9. Prohibited Patterns

| Pattern | Status as of 2026-09-10 |
|---|---|
| `from-teal-500 to-blue-600` utility | REMOVED (0 occurrences) |
| Solid colored icon wrappers in headers | REMOVED (0 violations) |
| Physical CSS properties (ml-/mr-/pl-/pr-) | REMOVED (0 occurrences) |
| Pink/purple/violet/rose/fuchsia on cards | BANNED |
| Glassmorphism on data cards | BANNED |
| Transparent SelectTrigger backgrounds | BANNED |
| Full-page skeleton loaders | BANNED |
| Raw HTML interactive elements | BANNED |

---

## 10. Route Contract

| Route | Component | Prototype | Status |
|---|---|---|---|
| `/coordinator/accreditation` | `CourseFileGenerator` -> `CoordinatorAccreditationNew` | `coordinator-accreditation.html` | REDESIGNED |
| `/coordinator/course-file` | `CourseFileGenerator` -> `CoordinatorAccreditationNew` | `coordinator-course-file.html` | REDESIGNED |

Both routes render `CoordinatorAccreditationNew`, which handles accreditation readiness AND course file generation. The route audit's "wrong component" finding is RESOLVED — the redesigned component matches both prototype references.

---

## 11. Automated Compliance

- **Design lint:** `npm run lint:design` — validates icon wrappers, gradient usage, semantic color rules
- **RTL lint:** Part of ESLint — enforces logical CSS properties
- **Visual parity:** Playwright per `src/design-system/PARITY.md` S-C

See `scripts/design-lint/` for automated check implementations.

---

## 12. Migration Rules

1. New pages: Use `@/design-system` primitives exclusively
2. Legacy pages: Migrate to `@/design-system` during any significant edit
3. NEVER introduce `from-teal-500 to-blue-600` — use `var(--brand-gradient)` or `GradientCardHeader`
4. NEVER introduce solid colored icon wrappers — use `bg-transparent` or liquid glass
5. NEVER use physical CSS properties — use logical equivalents

---

## 13. References

- **Prototype:** `prototype/` directory (75 HTML fidelity references)
- **Tokens:** `src/design-system/tokens.css` (extracted 1:1 from prototype)
- **Parity contract:** `src/design-system/PARITY.md`
- **Pattern registry:** `docs/design-system/canonical-ui-pattern-registry.md`
- **Machine rules:** `docs/design-system/EDEVISER-DESIGN-SYSTEM-RULES.json`
- **Lint scripts:** `scripts/design-lint/`
- **Steering:** `.kiro/steering/design-system.md`, `.kiro/steering/prototype-fidelity.md`
### 3.5 AI Governance Autonomy
| Level | Classes |
|---|---|
| A0 / A1 | `border-blue-200 bg-blue-50 text-blue-700` |
| A2 | `border-amber-200 bg-amber-50 text-amber-700` |
| A3 | `border-emerald-200 bg-emerald-50 text-emerald-700` |

> Source: `src/lib/aiGovernancePolicy.ts` — `autonomyBadgeClass()`

### 3.6 Feedback States
| State | Classes |
|---|---|
| Success | `border-emerald-200 bg-emerald-50 text-emerald-800` |
| Error | Shadcn `Alert variant="destructive"` |
| Warning/Draft | `bg-amber-50 border border-amber-200` |
- **Logo/accent chips:** Allowed for branded accent elements (e.g., 404 page compass icon)
- **NEVER:** `from-teal-500 to-blue-600` utility classes (legacy — all removed as of 2026-09-10)