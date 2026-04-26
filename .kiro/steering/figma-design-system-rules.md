---
inclusion: always
---

# Edeviser Figma Design System Rules

This document serves as the bridge between Figma designs and the Edeviser codebase. When converting Figma MCP output to production code, follow these rules strictly.

## 1. Token Definitions

### Where Tokens Live
- CSS custom properties: `src/index.css` (`:root` block)
- Tailwind v4 theme: `src/index.css` (`@theme` and `@theme inline` blocks)
- No `tailwind.config.ts` — Tailwind CSS v4 uses CSS-based configuration

### Brand Colors (always use these, never raw hex in components)
| Token | Value | Tailwind | Usage |
|-------|-------|----------|-------|
| `--brand-primary` | `#3b82f6` | `blue-500` | Primary CTA, active states, links |
| `--brand-primary-dark` | `#2563eb` | `blue-600` | Hover states |
| `--brand-secondary` | `#14b8a6` | `teal-500` | Secondary accents, gradient start |
| `--gradient-start` | `#14b8a6` | — | Brand gradient start |
| `--gradient-end` | `#0382bd` | — | Brand gradient end |

### Brand Gradients
```css
/* Card headers, primary buttons */
--brand-gradient: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%);
/* Hero/welcome cards */
--hero-gradient: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%);
```

### Semantic Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--color-success` | `#22c55e` | Completed, pass grades |
| `--color-warning` | `#f59e0b` | At-risk, approaching deadline |
| `--color-destructive-brand` | `#ef4444` | Errors, delete, failed |
| `--color-neutral` | `#64748b` | Secondary text, inactive |

### Surface Colors
| Token | Value | Usage |
|-------|-------|-------|
| `--surface-background` | `#ffffff` | Page background |
| `--surface-card` | `#ffffff` | Card backgrounds |
| `--surface-subtle` | `#f8fafc` | Alternate rows |
| `--surface-border` | `#e2e8f0` | Borders, dividers |

### Shadows
```css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
```

### Radius
```css
--radius: 0.625rem;  /* 10px base */
--radius-xl: calc(var(--radius) + 4px);  /* 14px — cards */
--radius-2xl: calc(var(--radius) + 8px); /* 18px — hero cards */
```

## 2. Component Library

### Location
- Shadcn/ui primitives: `src/components/ui/` (Button, Card, Dialog, Form, Input, Select, Tabs, Badge, etc.)
- Custom shared components: `src/components/shared/` (DataTable, GradientCardHeader, StreakDisplay, BadgeCollection, etc.)
- Page components: `src/pages/{role}/` (admin, coordinator, teacher, student, parent)

### Architecture
- Shadcn/ui (New York style) built on Radix primitives
- CVA (class-variance-authority) for component variants
- `cn()` utility from `src/lib/utils.ts` for merging Tailwind classes
- All interactive elements MUST use Shadcn/ui — never raw HTML

### Key Shared Components to Reuse
| Component | Path | When to Use |
|-----------|------|-------------|
| `DataTable` | `src/components/shared/DataTable.tsx` | Any data table with sort/filter/pagination |
| `GradientCardHeader` | `src/components/shared/GradientCardHeader.tsx` | Section card headers |
| `ConfirmDialog` | `src/components/shared/ConfirmDialog.tsx` | Destructive action confirmation |
| `ErrorBoundary` | `src/components/shared/ErrorBoundary.tsx` | Component error boundaries |
| `Shimmer` | Component-level loading | Never full-page skeletons |
| `BadgeCollection` | `src/components/shared/BadgeCollection.tsx` | Badge displays |
| `StreakDisplay` | `src/components/shared/StreakDisplay.tsx` | Streak counters |
| `LevelProgress` | `src/components/shared/LevelProgress.tsx` | XP level bars |

## 3. Frameworks & Libraries

| Layer | Technology |
|-------|-----------|
| UI Framework | React 18 + TypeScript (strict mode) |
| Bundler | Vite 6 |
| Styling | Tailwind CSS v4 + Shadcn/ui |
| State (server) | TanStack Query v5 |
| State (client) | Zustand |
| Routing | React Router v7 |
| Forms | React Hook Form + Zod |
| Tables | TanStack Table |
| Charts | Recharts |
| Animation | Framer Motion + CSS keyframes |
| Icons | Lucide React |
| Toasts | Sonner |
| URL State | nuqs |
| i18n | i18next + react-i18next |
| DnD | dnd-kit |
| Dates | date-fns |

## 4. Asset Management

- Static assets: `public/` directory
- Locale files: `public/locales/{ar,ur}/` and `src/locales/{en,ar}/`
- PWA manifest: `public/manifest.json`
- Service worker: `public/sw.js`
- User uploads: Supabase Storage (via hooks, never direct)
- Image compression: `src/lib/imageCompressor.ts`

## 5. Icon System

- Library: Lucide React (tree-shakeable)
- Import pattern: `import { IconName } from 'lucide-react'`
- Navigation icons: `h-5 w-5` (20px)
- Button icons: `h-4 w-4` (16px) with `gap-2`
- KPI card icons: `h-5 w-5` inside gradient container
- Always pair icons with labels or tooltips — never icon-only without aria-label

### Semantic Icon Map
| Concept | Icon |
|---------|------|
| Dashboard | `LayoutDashboard` |
| Users/Students | `Users` |
| Outcomes/ILO | `Target` |
| PLO | `Layers` |
| CLO | `BookOpen` |
| Assignment | `FileText` |
| XP | `Zap` |
| Streak | `Flame` |
| Badge | `Award` |
| Level | `Star` |
| Leaderboard | `Trophy` |
| AI | `Sparkles` |
| Journal | `NotebookPen` |
| Warning | `AlertTriangle` |
| Add | `Plus` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| Settings | `Settings` |

## 6. Styling Approach

### Methodology
- Tailwind CSS v4 utility-first with CSS custom properties
- No CSS Modules, no Styled Components
- Global styles in `src/index.css`
- Component-scoped styles via Tailwind classes only

### RTL Support
- Use logical CSS properties: `ms-*`, `me-*`, `ps-*`, `pe-*` (not `ml-*`, `mr-*`)
- Arabic font: `"Noto Sans Arabic"` loaded via `[dir="rtl"]` selector
- i18next handles language switching

### Responsive Breakpoints (Tailwind defaults)
- Mobile-first for student views
- Desktop-optimized for admin/coordinator/teacher
- `md:` (768px) — sidebar appears
- `lg:` (1024px) — wider layouts
- KPI grid: `grid-cols-2 md:grid-cols-4`

### Dark Mode
- CSS class strategy: `.dark` on `<html>`
- All brand tokens have dark overrides in `src/index.css`
- ThemeProvider at `src/providers/ThemeProvider.tsx`

## 7. Project Structure

```
src/
├── components/
│   ├── ui/          # Shadcn/ui primitives (Button, Card, Dialog, etc.)
│   └── shared/      # Custom shared components (DataTable, GradientCardHeader, etc.)
├── pages/
│   ├── admin/       # Admin role pages
│   ├── coordinator/ # Coordinator role pages
│   ├── teacher/     # Teacher role pages
│   ├── student/     # Student role pages
│   ├── parent/      # Parent role pages
│   ├── shared/      # Cross-role pages (Profile, Calendar, etc.)
│   └── public/      # Public pages (Terms, Privacy, Portfolio)
├── hooks/           # TanStack Query hooks + custom hooks
├── lib/             # Business logic, utilities, schemas
│   └── schemas/     # Zod validation schemas
├── providers/       # React context providers
├── router/          # AppRouter + RouteGuard
├── types/           # TypeScript types (database.ts auto-generated)
└── locales/         # i18n translation files
```

## 8. Figma-to-Code Translation Rules

When converting Figma MCP output to Edeviser code:

1. Replace generic Tailwind colors with brand tokens (`blue-500` → brand primary, `teal-500` → brand secondary)
2. Replace raw `<button>` with `<Button>` from `src/components/ui/button`
3. Replace raw `<input>` with `<Input>` from `src/components/ui/input`
4. Replace raw `<select>` with `<Select>` from `src/components/ui/select`
5. Replace raw `<div>` cards with `<Card>` from `src/components/ui/card`
6. Use `cn()` for conditional class merging
7. Use `@/` import alias for all imports
8. Wrap forms in React Hook Form + Zod
9. Use Sonner `toast()` for notifications
10. Use `nuqs` for URL-persisted filters
11. Use TanStack Query hooks for data fetching — never raw supabase in components
12. Validate against Figma screenshot for visual parity

## 9. Component Pattern Templates

### Primary CTA Button
```tsx
<Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700 font-semibold shadow-md active:scale-95">
  <Plus className="h-4 w-4" /> Create
</Button>
```

### Section Card with Gradient Header
```tsx
<Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
  <div className="px-6 py-4 flex items-center gap-2" style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
    <Icon className="h-5 w-5 text-white" />
    <h2 className="text-lg font-bold tracking-tight text-white">Title</h2>
  </div>
  <div className="p-6">{/* content */}</div>
</Card>
```

### KPI Card
```tsx
<Card className="bg-white border-0 shadow-md rounded-xl p-4 group">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-[10px] font-black tracking-widest uppercase text-gray-500">Label</p>
      <p className="text-2xl font-black mt-1">Value</p>
    </div>
    <div className="p-2 rounded-lg bg-blue-50 group-hover:scale-110 transition-transform">
      <Icon className="h-5 w-5 text-blue-600" />
    </div>
  </div>
</Card>
```

### Hero Welcome Card
```tsx
<Card className="border-0 shadow-lg rounded-xl overflow-hidden text-white" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)' }}>
  <div className="p-6">
    <h1 className="text-2xl font-bold tracking-tight">Good morning, {name} 👋</h1>
    <p className="text-sm text-white/70 mt-1">Subtitle</p>
  </div>
</Card>
```

### Pill Tabs
```tsx
<button className={cn(
  "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-xl border transition-all",
  isActive ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
)}>
  <Icon className="h-4 w-4" /> Label
</button>
```

## 10. Domain Color Coding (Must Match Exactly)

### Bloom's Taxonomy
| Level | Class |
|-------|-------|
| Remember | `bg-purple-500 text-white` |
| Understand | `bg-blue-500 text-white` |
| Apply | `bg-green-500 text-white` |
| Analyze | `bg-yellow-500 text-gray-900` |
| Evaluate | `bg-orange-500 text-white` |
| Create | `bg-red-500 text-white` |

### Outcome Types
| Type | Classes |
|------|---------|
| ILO | `bg-red-100 text-red-700 border-red-200` |
| PLO | `bg-blue-100 text-blue-700 border-blue-200` |
| CLO | `bg-green-100 text-green-700 border-green-200` |

### Attainment Levels
| Level | Classes |
|-------|---------|
| Excellent (≥85%) | `text-green-600 bg-green-50` |
| Satisfactory (70-84%) | `text-blue-600 bg-blue-50` |
| Developing (50-69%) | `text-yellow-600 bg-yellow-50` |
| Not Yet (<50%) | `text-red-600 bg-red-50` |

### Gamification
| Element | Color |
|---------|-------|
| XP | `amber-500` |
| Streak | `red-500` → `orange-500` gradient |
| Gold | `yellow-400` |
| Silver | `gray-400` |
| Bronze | `amber-600` |

## 11. Animation Rules

- Micro-interactions: ≤200ms
- Celebrations: ≤600ms
- Always honor `prefers-reduced-motion`
- Button press: `active:scale-95 transition-transform duration-100`
- Custom animations: `animate-shimmer`, `animate-xp-pulse`, `animate-badge-pop`, `animate-float`, `animate-streak-flame`, `animate-fade-in-up`

## 12. Prohibited Patterns

- No pink/purple/violet/rose/fuchsia backgrounds on cards or tabs
- No transparent/glassmorphism on data cards
- No transparent SelectTrigger backgrounds
- No full-page skeleton loaders
- No arbitrary spacing values
- No raw HTML for interactive elements
- No `any` types
- No direct Supabase calls in components
