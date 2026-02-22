# Edeviser Design Style Guide
**Version:** 2.0 | **Status:** Living Document | **Last Updated:** 2026-02-22
**Owners:** Design System Lead | **Tools:** Figma, Tailwind CSS v4, Shadcn/ui, Framer Motion

---

## Table of Contents
1. [Design Philosophy](#1-design-philosophy)
2. [Design Tokens](#2-design-tokens)
3. [Typography](#3-typography)
4. [Color System](#4-color-system)
5. [Spacing & Layout](#5-spacing--layout)
6. [Iconography](#6-iconography)
7. [UI Component Library](#7-ui-component-library)
8. [Animation & Motion](#8-animation--motion)
9. [Dashboard Patterns](#9-dashboard-patterns)
10. [Gamification UI Patterns](#10-gamification-ui-patterns)
11. [AI Co-Pilot UI Patterns](#11-ai-co-pilot-ui-patterns)
12. [Notification Patterns](#12-notification-patterns)
13. [Self-Regulated Learning UI Patterns](#13-self-regulated-learning-ui-patterns)
14. [Form & Input Patterns](#14-form--input-patterns)
15. [Responsive Design](#15-responsive-design)
16. [Accessibility Standards](#16-accessibility-standards)
17. [Dark Mode (Phase 2)](#17-dark-mode-phase-2)
18. [Implementation Checklist](#18-implementation-checklist)

---

## 1. Design Philosophy

### Core Principle: "Trust Through Clarity"
Edeviser serves institutions that demand evidence and students who need motivation. Every design decision must serve one of two outcomes:
1. **Reduce cognitive load for compliance tasks** — teachers and coordinators must be able to do administrative work in seconds, not minutes.
2. **Create emotional reward for learning tasks** — students must *feel* progress, not just see numbers.

### Design Laws
- **Law 1 — Solid over transparent:** All data-bearing surfaces use solid backgrounds. Glassmorphism and transparency are decorative only.
- **Law 2 — Hierarchy over decoration:** Every visual element has a purpose. Decoration serves hierarchy, not the reverse.
- **Law 3 — Feedback is mandatory:** Every user action must produce an immediate visual response within 100ms.
- **Law 4 — Brand consistency is non-negotiable:** The teal-to-blue gradient is the brand fingerprint. Every dashboard, every role, uses it on card headers.
- **Law 5 — Mobile is a first-class citizen for students:** Student views are designed mobile-first and scaled up. Admin/Coordinator views are desktop-optimized.

### Prohibited Patterns (Hard Rules)
| Pattern | Why Prohibited | Permitted Alternative |
|---------|---------------|----------------------|
| Pink, Purple, Violet, Rose, Fuchsia backgrounds on cards/tabs | Off-brand; conflicts with brand palette | Blue (`#3b82f6`), Teal (`#14B8A6`) |
| Transparent/glassmorphism on data cards | Readability fails on varied backgrounds | Solid `bg-white` or `bg-gray-50` |
| Transparent `SelectTrigger` backgrounds | Input appears invisible on light surfaces | `bg-white border border-gray-200` |
| Unicode bullet characters (`•`) in code | Inconsistent rendering across environments | Semantic `<ul>/<li>` elements |
| Full-page skeleton loaders blocking interaction | Perceived performance loss | Optimistic UI + component-level shimmer |

---

## 2. Design Tokens

Design tokens are the single source of truth for all visual values. They are implemented as CSS custom properties and mapped to Tailwind via `tailwind.config.ts`.

### CSS Custom Properties (`index.css` / `:root`)

```css
:root {
  /* === BRAND COLORS === */
  --brand-primary: 217 91% 60%;       /* #3b82f6 - Blue-500 */
  --brand-secondary: 174 72% 40%;     /* #14B8A6 - Teal-500 */
  --gradient-start: 174 72% 40%;      /* Teal */
  --gradient-end: 199 89% 38%;        /* Blue */

  /* === SEMANTIC COLORS === */
  --background: 0 0% 100%;            /* White */
  --foreground: 222 47% 11%;          /* Near-black text */
  --card: 0 0% 100%;                  /* White card background */
  --card-foreground: 222 47% 11%;
  --muted: 210 40% 96%;               /* Slate-100 */
  --muted-foreground: 215 16% 47%;    /* Slate-500 */
  --border: 214 32% 91%;              /* Slate-200 */
  --input: 214 32% 91%;
  --ring: 217 91% 60%;                /* Focus ring = brand blue */
  --destructive: 0 84% 60%;           /* Red-500 */

  /* === TYPOGRAPHY === */
  --font-sans: 'Noto Sans', system-ui, sans-serif;
  --font-mono: 'Menlo', 'Monaco', 'Consolas', 'Courier New', monospace;

  /* === RADIUS === */
  --radius: 0.5rem;                   /* rounded-lg = 8px */
  --radius-xl: 0.75rem;               /* rounded-xl = 12px */
  --radius-2xl: 1rem;                 /* rounded-2xl = 16px */

  /* === SHADOWS === */
  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

  /* === GAMIFICATION XP BAR === */
  --xp-track: 214 32% 91%;            /* Gray track */
  --xp-fill: 174 72% 40%;             /* Teal fill */
}
```

### Tailwind Config Extension (`tailwind.config.ts`)

```typescript
extend: {
  colors: {
    brand: {
      50:  '#eff6ff',
      100: '#dbeafe',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
    },
    teal: {
      400: '#2dd4bf',
      500: '#14b8a6',
      600: '#0d9488',
    }
  },
  fontFamily: {
    sans: ['Noto Sans', 'system-ui', 'sans-serif'],
    mono: ['Menlo', 'Monaco', 'Consolas', 'Courier New', 'monospace'],
  },
  keyframes: {
    'xp-pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.5 } },
    'badge-pop': { '0%': { transform: 'scale(0)', opacity: 0 }, '80%': { transform: 'scale(1.1)' }, '100%': { transform: 'scale(1)', opacity: 1 } },
    'shimmer': { '0%': { backgroundPosition: '-200% 0' }, '100%': { backgroundPosition: '200% 0' } },
    'float': { '0%, 100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
    'streak-flame': { '0%, 100%': { transform: 'scaleY(1)' }, '50%': { transform: 'scaleY(1.1) scaleX(0.95)' } },
  },
  animation: {
    'xp-pulse': 'xp-pulse 2s ease-in-out infinite',
    'badge-pop': 'badge-pop 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
    'shimmer': 'shimmer 2s linear infinite',
    'float': 'float 3s ease-in-out infinite',
    'streak-flame': 'streak-flame 1s ease-in-out infinite',
  },
}
```

---

## 3. Typography

### Font Stack

| Role | Family | Fallback |
|------|--------|----------|
| Primary (All UI) | `Noto Sans` | `system-ui, sans-serif` |
| Code / Technical | `Menlo` | `Monaco, Consolas, 'Courier New', monospace` |

**Loading:** Import via Google Fonts with `display=swap` for performance:
```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
```

### Type Scale

| Role | Class | Size | Weight | Usage |
|------|-------|------|--------|-------|
| Page Title (H1) | `text-2xl font-bold tracking-tight` | 24px / 1.5 | 700 | Dashboard hero title |
| Section Heading (H2) | `text-lg font-bold tracking-tight` | 18px / 1.25 | 700 | Card titles, section headings |
| Subsection (H3) | `text-base font-semibold` | 16px / 1 | 600 | Widget titles, form group labels |
| KPI Value | `text-2xl font-black` | 24px / 1.5 | 900 | Metric numbers on stat cards |
| Metric Label | `text-[10px] font-black tracking-widest uppercase` | 10px | 900 | Labels beneath metric values |
| Body | `text-sm font-medium antialiased` | 14px | 500 | General content, descriptions |
| Caption | `text-xs text-gray-500` | 12px | 400 | Helper text, timestamps |
| Navigation Pill | `text-sm font-medium` | 14px | 500 | Tab labels |
| Button | `text-sm font-semibold` | 14px | 600 | All button text |
| Badge Label | `text-xs font-bold tracking-wide uppercase` | 12px | 700 | Badge chips and tags |
| Code | `font-mono text-sm` | 14px | 400 | Code snippets, technical IDs |

### Typography Rules
- **Line height:** Body text `leading-relaxed` (1.625); headings `leading-tight` (1.25).
- **Max width:** Prose content areas max `max-w-prose` (65ch) to preserve readability.
- **Antialiasing:** Always apply `antialiased` on text within cards.
- **Truncation:** Long strings (names, titles) always use `truncate` — never wrap unexpectedly.

---

## 4. Color System

### Brand Gradient (The Fingerprint)

The teal-to-blue gradient is the single most recognizable brand element. It appears on all card headers, primary buttons, and the logo.

```css
/* Standard Brand Gradient */
background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%);

/* Hero / Welcome Card Gradient */
background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%);
```

### Color Palette

#### Brand Colors
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Brand Blue | `#3b82f6` | `blue-500` | Active states, primary CTA, links |
| Brand Blue Dark | `#2563eb` | `blue-600` | Hover states, active tabs |
| Teal | `#14b8a6` | `teal-500` | Secondary accents, gradient start |
| Teal Dark | `#0d9488` | `teal-600` | Teal hover states |

#### Semantic / Functional Colors
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Success | `#22c55e` | `green-500` | Completed states, pass grades |
| Warning | `#f59e0b` | `amber-500` | At-risk alerts, approaching deadline |
| Destructive | `#ef4444` | `red-500` | Errors, delete actions, failed states |
| Neutral | `#64748b` | `slate-500` | Secondary text, inactive elements |

#### Surface Colors
| Name | Hex | Tailwind | Usage |
|------|-----|----------|-------|
| Background | `#ffffff` | `white` | Page background |
| Card Surface | `#ffffff` | `white` | All card backgrounds |
| Subtle Surface | `#f8fafc` | `slate-50` | Alternate row, inner containers |
| Border | `#e2e8f0` | `slate-200` | Card borders, dividers |
| Input Border | `#d1d5db` | `gray-300` | Form input borders |

### Domain-Specific Color Coding

#### Bloom's Taxonomy Levels
Each level has a consistent color used across pills, charts, and CLO tags:

| Level | Color | Tailwind Class | Hex |
|-------|-------|----------------|-----|
| Remember | Purple | `bg-purple-500` | `#a855f7` |
| Understand | Blue | `bg-blue-500` | `#3b82f6` |
| Apply | Green | `bg-green-500` | `#22c55e` |
| Analyze | Yellow | `bg-yellow-500` | `#eab308` |
| Evaluate | Orange | `bg-orange-500` | `#f97316` |
| Create | Red | `bg-red-500` | `#ef4444` |

**Implementation:**
```typescript
const BLOOMS_COLORS: Record<string, string> = {
  remembering: 'bg-purple-500 text-white',
  understanding: 'bg-blue-500 text-white',
  applying: 'bg-green-500 text-white',
  analyzing: 'bg-yellow-500 text-gray-900',
  evaluating: 'bg-orange-500 text-white',
  creating: 'bg-red-500 text-white',
};
```

#### Outcome Type Colors
| Type | Light Background | Text Color | Border |
|------|-----------------|------------|--------|
| ILO (Institutional) | `bg-red-100` | `text-red-700` | `border-red-200` |
| PLO (Program) | `bg-blue-100` | `text-blue-700` | `border-blue-200` |
| CLO (Course) | `bg-green-100` | `text-green-700` | `border-green-200` |

#### Grade Attainment Colors
| Level | Threshold | Color |
|-------|-----------|-------|
| Excellent | ≥ 85% | `text-green-600` / `bg-green-50` |
| Satisfactory | 70–84% | `text-blue-600` / `bg-blue-50` |
| Developing | 50–69% | `text-yellow-600` / `bg-yellow-50` |
| Not Yet | < 50% | `text-red-600` / `bg-red-50` |

#### Gamification Colors
| Element | Color | Tailwind |
|---------|-------|----------|
| XP / Gold | `#f59e0b` | `amber-500` |
| Streak Flame | `#ef4444` → `#f97316` | `red-500` → `orange-500` |
| Level Badge | Brand blue gradient | — |
| Leaderboard Gold | `#fbbf24` | `yellow-400` |
| Leaderboard Silver | `#9ca3af` | `gray-400` |
| Leaderboard Bronze | `#d97706` | `amber-600` |

---

## 5. Spacing & Layout

### Spacing Scale (Tailwind defaults — always use these, never arbitrary values)
| Token | Value | Use |
|-------|-------|-----|
| `p-2` / `gap-2` | 8px | Icon padding, tight component gaps |
| `p-3` | 12px | Small card padding |
| `p-4` | 16px | Standard card padding |
| `p-6` | 24px | Generous section padding |
| `p-8` | 32px | Page-level padding |
| `gap-4` | 16px | Standard grid/flex gap |
| `gap-6` | 24px | Section-level gap |

### Grid System
- **Admin / Coordinator / Teacher:** 12-column grid; use `grid-cols-12` with `col-span-*`.
- **Student:** Responsive 3-column (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **KPI Cards Row:** Always `grid grid-cols-2 md:grid-cols-4 gap-4`.

### Page Layout Template
```tsx
<div className="min-h-screen bg-slate-50">
  {/* Top Navigation Bar */}
  <nav className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between fixed top-0 w-full z-50">...</nav>

  <div className="flex pt-16">
    {/* Sidebar (Admin/Coord/Teacher) */}
    <aside className="w-64 min-h-screen bg-white border-r border-slate-200 fixed left-0 top-16 overflow-y-auto">...</aside>

    {/* Main Content */}
    <main className="flex-1 ml-64 p-6 space-y-6">
      {/* Welcome Hero */}
      {/* KPI Cards Row */}
      {/* Tab Navigation */}
      {/* Tab Content */}
    </main>
  </div>
</div>
```

---

## 6. Iconography

**Library:** [Lucide React](https://lucide.dev/) — v0.400+
**Style:** 2px stroke, rounded caps and joins, consistent 20×20px (w-5 h-5) default, 16×16px (w-4 h-4) in dense UI.

### Semantic Icon Mapping
| Concept | Icon | Usage |
|---------|------|-------|
| Dashboard | `LayoutDashboard` | Navigation |
| Students | `Users` | Navigation, headings |
| Teachers | `GraduationCap` | Navigation, badges |
| Outcomes / ILO | `Target` | OBE section |
| PLO | `Layers` | Coordinator section |
| CLO | `BookOpen` | Teacher section |
| Assignment | `FileText` | Assignment management |
| Rubric | `Grid3X3` | Rubric builder |
| Evidence | `ShieldCheck` | Evidence/compliance |
| Report / Export | `Download` | Report actions |
| Analytics / Chart | `BarChart3` | Dashboard sections |
| Gamification / XP | `Zap` | XP displays |
| Streak | `Flame` | Streak counter |
| Badge | `Award` | Badge display |
| Level | `Star` | Level indicator |
| Leaderboard | `Trophy` | Leaderboard section |
| Settings | `Settings` | Config sections |
| Delete | `Trash2` | Destructive actions |
| Edit | `Pencil` | Edit actions |
| Add / Create | `Plus` | Creation actions |
| Warning / At-Risk | `AlertTriangle` | Warning states |
| AI | `Sparkles` | AI Co-Pilot features |
| Journal | `NotebookPen` | Reflection journal |

### Icon Usage Rules
- Icons in navigation: `h-5 w-5` (20px)
- Icons inside buttons: `h-4 w-4` (16px) with `gap-2` to text
- Icons on KPI cards: `h-5 w-5` inside a gradient container
- Never use icons alone as the only visual affordance — always pair with a label or tooltip
- Decorative icons (background/hero) can use `h-16 w-16` with low opacity (`opacity-10`)

---

## 7. UI Component Library

All components are built on [Shadcn/ui](https://ui.shadcn.com/) (Radix primitives) with custom Edeviser styling applied.

### 7.1 Buttons

```tsx
// === PRIMARY (Gradient CTA) ===
<Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white hover:from-teal-600 hover:to-blue-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 active:scale-95">
  Save Changes
</Button>

// === SECONDARY ===
<Button variant="outline" className="border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:text-gray-900 font-semibold">
  Cancel
</Button>

// === DESTRUCTIVE ===
<Button variant="destructive" className="bg-red-500 hover:bg-red-600 font-semibold">
  Delete
</Button>

// === GHOST (Icon Button) ===
<Button variant="ghost" size="icon" className="text-gray-500 hover:text-blue-600 hover:bg-blue-50">
  <Pencil className="h-4 w-4" />
</Button>
```

**Rules:**
- Gradient buttons: only for primary CTAs (max 1 per section).
- All buttons: minimum touch target 44×44px on mobile.
- Loading state: replace text/icon with `<Loader2 className="animate-spin" />`.

---

### 7.2 Cards

#### Standard Data Card
```tsx
<Card className="bg-white border-0 shadow-md hover:shadow-lg transition-shadow duration-300 rounded-xl">
  <CardHeader className="pb-2 pt-4 px-4">
    <CardTitle className="text-base font-semibold text-gray-800">Card Title</CardTitle>
  </CardHeader>
  <CardContent className="px-4 pb-4">
    {/* content */}
  </CardContent>
</Card>
```

#### Gradient Header Card (Standard for main section cards)
```tsx
<Card className="bg-white border-0 shadow-lg rounded-xl overflow-hidden">
  <CardHeader style={{
    background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)',
  }} className="rounded-t-xl">
    <CardTitle className="text-white font-bold tracking-tight text-lg flex items-center gap-2">
      <Icon className="h-5 w-5" />
      Section Title
    </CardTitle>
    <p className="text-blue-100 text-sm">Section description</p>
  </CardHeader>
  <CardContent className="p-4">
    {/* content */}
  </CardContent>
</Card>
```

#### KPI Metric Card
```tsx
<Card className="group bg-white border-0 shadow-lg hover:shadow-xl transition-all duration-500 rounded-xl overflow-hidden relative">
  <CardHeader className="flex flex-row items-center justify-between pb-2 pt-4 px-4 relative z-10">
    <CardTitle className="text-sm font-bold text-gray-800">
      Metric Title
    </CardTitle>
    <div className="p-2 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-xl border border-blue-300/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
      <Zap className="h-5 w-5 text-blue-600" />
    </div>
  </CardHeader>
  <CardContent className="relative z-10 px-4 pb-4">
    <div className="text-2xl font-black text-gray-900 group-hover:text-blue-700 transition-colors duration-300">
      1,248
    </div>
    <p className="text-xs text-gray-500 font-semibold mt-0.5">
      Active students this week
    </p>
    <div className="mt-2 h-0.5 bg-gradient-to-r from-blue-400 to-teal-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
  </CardContent>
</Card>
```

---

### 7.3 Tab Navigation (Pill Row)

```tsx
const tabs = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'outcomes', label: 'Outcomes', icon: Target },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

<div className="flex w-full gap-2">
  {tabs.map((tab) => (
    <button
      key={tab.id}
      onClick={() => setActiveTab(tab.id)}
      className={cn(
        "flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-medium rounded-xl transition-all duration-200",
        "border",
        activeTab === tab.id
          ? "bg-blue-600 text-white shadow-md border-blue-600 hover:bg-blue-700"
          : "bg-white text-gray-600 border-gray-200 shadow-sm hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <tab.icon className="h-4 w-4" />
      {tab.label}
    </button>
  ))}
</div>
```

**Critical Rules for Tabs:**
- Container: `gap-2`, `bg-transparent` — no connected bar styling.
- Active: Solid `bg-blue-600`, never gradient.
- Inactive hover: `hover:bg-gray-50` — subtle, never vanishing.
- Never use pink/purple/violet as tab active colors.

---

### 7.4 Tables / Lists

```tsx
// === DATA TABLE ===
<div className="rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm">
  <table className="w-full text-sm">
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="text-left py-3 px-4 text-xs font-black text-gray-500 tracking-widest uppercase">Name</th>
        <th className="text-left py-3 px-4 text-xs font-black text-gray-500 tracking-widest uppercase">Status</th>
        <th className="text-right py-3 px-4 text-xs font-black text-gray-500 tracking-widest uppercase">Actions</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row, i) => (
        <tr key={row.id} className={cn("border-b border-gray-100 hover:bg-slate-50 transition-colors", i % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
          <td className="py-3 px-4 font-medium text-gray-800">{row.name}</td>
          <td className="py-3 px-4">
            <span className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>
          </td>
          <td className="py-3 px-4 text-right">
            <div className="flex gap-1 justify-end">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-blue-600 hover:bg-blue-50">
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

---

### 7.5 Select / Dropdown

```tsx
// Always use solid white background for selects in lists and forms
<Select>
  <SelectTrigger className="bg-white border border-gray-200 rounded-lg shadow-sm font-medium text-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
    <SelectValue placeholder="Select a program..." />
  </SelectTrigger>
  <SelectContent className="bg-white border border-gray-200 shadow-lg rounded-xl">
    <SelectItem value="option1" className="rounded-lg hover:bg-blue-50 cursor-pointer">
      Option 1
    </SelectItem>
  </SelectContent>
</Select>
```

**Critical:** Never `bg-transparent` or `bg-gray-900` for `SelectTrigger` in standard UI contexts.

---

### 7.6 Loading States

```tsx
// === SHIMMER SKELETON ===
const Shimmer = ({ className }: { className?: string }) => (
  <div className={cn(
    "animate-pulse bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%] animate-shimmer rounded-lg",
    className
  )} />
);

// Usage: Component-level, never full-page blocking
<Card className="bg-white border-0 shadow-md rounded-xl p-4">
  <Shimmer className="h-4 w-1/3 mb-2" />
  <Shimmer className="h-8 w-1/2 mb-1" />
  <Shimmer className="h-3 w-2/3" />
</Card>
```

---

### 7.7 Empty States

```tsx
<div className="flex flex-col items-center justify-center py-16 px-6 text-center">
  <div className="p-4 bg-gray-100 rounded-2xl mb-4">
    <FileText className="h-10 w-10 text-gray-400" />
  </div>
  <h3 className="text-base font-bold text-gray-800 mb-1">No assignments yet</h3>
  <p className="text-sm text-gray-500 max-w-xs mb-4">
    Create your first assignment to start tracking student progress.
  </p>
  <Button className="bg-gradient-to-r from-teal-500 to-blue-600 text-white font-semibold">
    <Plus className="h-4 w-4 mr-2" />
    Create Assignment
  </Button>
</div>
```

---

## 8. Animation & Motion

**Library:** Framer Motion (complex interactions) + CSS keyframes (simple, performance-critical).

### Motion Philosophy
- **Purposeful:** Every animation communicates something (progress, success, state change). No animation for decoration alone.
- **Fast:** Micro-interactions ≤ 200ms. Celebrations ≤ 600ms. Never block user action.
- **Respectful:** Honor `prefers-reduced-motion`. All animations must be disabled or simplified for users with this preference.

### Standard Easing Functions
```css
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);    /* Snappy exits, overlays */
--ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);        /* State transitions */
--ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);   /* Badge pop, level up */
```

### Animation Catalog

| Name | Duration | Trigger | Implementation |
|------|----------|---------|----------------|
| `fade-in` | 200ms | Component mount | Framer Motion `initial={opacity:0} animate={opacity:1}` |
| `slide-in-up` | 300ms | Card mount | `initial={y:16,opacity:0} animate={y:0,opacity:1}` |
| `shimmer` | 2s loop | Loading state | CSS `@keyframes shimmer` |
| `badge-pop` | 400ms | Badge award | CSS `@keyframes badge-pop` with spring easing |
| `xp-count-up` | 800ms | XP earned | JS counter animation |
| `streak-flame` | 1s loop | Active streak display | CSS `@keyframes streak-flame` |
| `level-up` | 600ms | Level up event | Framer Motion full-screen overlay |
| `confetti` | 2s | Assignment submission | CSS particle burst (canvas-confetti library) |
| `float` | 3s loop | Background decorations | CSS `@keyframes float` |
| `button-press` | 100ms | Button click | CSS `active:scale-95 transition-transform` |

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 9. Dashboard Patterns

### 9.1 Welcome / Hero Card

Used at the top of all role dashboards. Contains user greeting and high-level KPI summary.

```tsx
<div
  className="relative overflow-hidden rounded-2xl shadow-xl h-48"
  style={{
    background: 'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)',
  }}
>
  {/* Texture overlay */}
  <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'url("data:image/svg+xml,...")' }} />
  {/* Dark overlay for text readability */}
  <div className="absolute inset-0 bg-black/20 rounded-2xl" />

  {/* Content */}
  <div className="relative z-10 p-6 h-full flex flex-col justify-between">
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-white">
        Good morning, {user.name} 👋
      </h1>
      <p className="text-blue-200 text-sm mt-1">
        Here's what's happening across your institution today.
      </p>
    </div>
    <div className="flex gap-6">
      <div>
        <p className="text-blue-300 text-xs font-black tracking-widest uppercase">Active Users</p>
        <p className="text-white text-2xl font-black">1,248</p>
      </div>
      <div>
        <p className="text-blue-300 text-xs font-black tracking-widest uppercase">Reports Due</p>
        <p className="text-white text-2xl font-black">3</p>
      </div>
    </div>
  </div>
</div>
```

### 9.2 Section Card Header Background (The Brand Fingerprint)

Every main category section card uses this exact background on its `CardHeader`:

```tsx
const BRAND_HEADER_STYLE: React.CSSProperties = {
  background: `
    linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%),
    url("data:image/svg+xml,%3Csvg width='200' height='200' viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cdefs%3E%3Cpattern id='educational' x='0' y='0' width='100' height='100' patternUnits='userSpaceOnUse'%3E%3Cg fill='none' stroke='%23ffffff' stroke-width='1' opacity='0.1'%3E%3Crect x='10' y='10' width='15' height='20'/%3E%3Ccircle cx='65' cy='65' r='12'/%3E%3C/g%3E%3C/pattern%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23educational)'/%3E%3C/svg%3E")
  `,
};

// Usage
<CardHeader style={BRAND_HEADER_STYLE} className="rounded-t-xl">
  <CardTitle className="text-white font-bold tracking-tight text-lg flex items-center gap-2">
    <Target className="h-5 w-5" />
    Learning Outcomes
  </CardTitle>
  <p className="text-blue-100 text-sm mt-0.5">Manage ILOs, PLOs, and CLOs</p>
</CardHeader>
```

**Absolute Rule:** This header style is used on every main section card across ALL role dashboards (Admin, Coordinator, Teacher, Student). No exceptions.

### 9.3 Attainment Progress Bar

```tsx
const AttainmentBar = ({ percent, label }: { percent: number; label: string }) => {
  const color = percent >= 70 ? 'from-green-400 to-green-600'
    : percent >= 50 ? 'from-yellow-400 to-yellow-600'
    : 'from-red-400 to-red-600';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm font-medium text-gray-700 truncate">{label}</span>
        <span className="text-sm font-black text-gray-900 ml-2">{percent}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${color} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
};
```

---

## 10. Gamification UI Patterns

### 10.1 XP Display

```tsx
// Header XP Chip
<div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
  <Zap className="h-3.5 w-3.5 text-amber-500" />
  <span className="text-sm font-black text-amber-700">2,450 XP</span>
</div>
```

### 10.2 Streak Display

```tsx
<div className="flex items-center gap-2 p-3 bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl">
  <Flame className="h-6 w-6 text-orange-500 animate-streak-flame" />
  <div>
    <div className="text-xl font-black text-gray-900">12</div>
    <div className="text-[10px] font-black tracking-widest uppercase text-orange-600">Day Streak</div>
  </div>
</div>
```

### 10.3 Badge Display

```tsx
// Badge Chip (Compact)
<div className="flex items-center gap-1.5 bg-purple-50 border border-purple-200 rounded-full px-2.5 py-1 w-fit">
  <span className="text-base">🏆</span>
  <span className="text-xs font-bold text-purple-700">30-Day Legend</span>
</div>

// Badge Card (Full)
<div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow text-center group">
  <div className="text-4xl mb-2 group-hover:animate-badge-pop">🏆</div>
  <p className="text-xs font-bold text-gray-800 leading-tight">30-Day Legend</p>
  <p className="text-[10px] text-gray-400 mt-0.5">Earned Jan 15</p>
</div>
```

### 10.4 Level Progress

```tsx
<div className="space-y-1">
  <div className="flex justify-between items-center">
    <span className="text-sm font-bold text-gray-700">Level 5 — Achiever</span>
    <span className="text-xs text-gray-500">900 / 1,400 XP</span>
  </div>
  <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
    <div
      className="h-full bg-gradient-to-r from-teal-400 to-blue-600 rounded-full transition-all duration-1000"
      style={{ width: '64%' }}
    />
  </div>
  <p className="text-[10px] text-gray-400">500 XP to Level 6</p>
</div>
```

### 10.5 Leaderboard Row

```tsx
<div className="flex items-center gap-3 py-2.5 px-3 rounded-xl hover:bg-slate-50 transition-colors">
  {/* Rank */}
  <span className={cn(
    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-black",
    rank === 1 ? "bg-yellow-400 text-yellow-900" :
    rank === 2 ? "bg-gray-300 text-gray-700" :
    rank === 3 ? "bg-amber-600 text-white" :
    "bg-gray-100 text-gray-600"
  )}>
    {rank}
  </span>
  {/* Avatar */}
  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-teal-500 flex items-center justify-center">
    <span className="text-xs font-bold text-white">{student.name[0]}</span>
  </div>
  {/* Name & Level */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
    <p className="text-[10px] text-gray-400">Level {student.level}</p>
  </div>
  {/* XP */}
  <div className="text-right">
    <p className="text-sm font-black text-amber-600">{student.xp.toLocaleString()}</p>
    <p className="text-[10px] text-gray-400 tracking-wider uppercase">XP</p>
  </div>
</div>
```

---

## 11. AI Co-Pilot UI Patterns

### 11.1 AI Suggestion Card

Used for personalized module suggestions on the student dashboard. Features a left border accent, sparkles icon, and thumbs up/down feedback buttons.

```tsx
<div className="bg-white border border-gray-200 border-l-4 border-l-blue-400 rounded-xl p-4 shadow-sm">
  <div className="flex items-start gap-3">
    <div className="p-1.5 bg-blue-50 rounded-lg">
      <Sparkles className="h-4 w-4 text-blue-500" />
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-semibold text-gray-800">Suggested for you</p>
        <span className="text-xs text-gray-400 italic">AI Draft</span>
      </div>
      <p className="text-sm text-gray-600 leading-relaxed">
        Your hands-on configuration skills (CLO-3) need attention.
        Try these practice labs to improve.
      </p>
      <p className="text-xs text-gray-400 mt-1">
        Students who completed these scored 34% higher on this CLO.
      </p>
    </div>
  </div>
  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-green-600 hover:bg-green-50 h-8 px-2">
      <ThumbsUp className="h-3.5 w-3.5" />
    </Button>
    <Button variant="ghost" size="sm" className="text-gray-400 hover:text-red-600 hover:bg-red-50 h-8 px-2">
      <ThumbsDown className="h-3.5 w-3.5" />
    </Button>
    <span className="text-xs text-gray-400 ml-auto">Was this helpful?</span>
  </div>
</div>
```

### 11.2 At-Risk Student Row

Used on the teacher dashboard's At-Risk Students widget. Red left border with probability badge.

```tsx
<div className="flex items-center gap-3 py-3 px-4 bg-red-50 border-l-4 border-l-red-400 rounded-r-xl">
  {/* Avatar */}
  <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center">
    <span className="text-xs font-bold text-red-700">{student.name[0]}</span>
  </div>
  {/* Info */}
  <div className="flex-1 min-w-0">
    <p className="text-sm font-semibold text-gray-800 truncate">{student.name}</p>
    <p className="text-xs text-gray-500">Last login: {student.lastLogin} · {student.atRiskReason}</p>
  </div>
  {/* Probability Badge */}
  <span className="px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700 border border-red-200">
    {student.probability}% risk
  </span>
  {/* Action */}
  <Button variant="ghost" size="sm" className="text-blue-600 hover:bg-blue-50 text-xs font-semibold">
    Send Nudge
  </Button>
</div>
```

### 11.3 AI Feedback Draft (Teacher Grading View)

Displayed in the grading interface per rubric criterion. Amber background with accept/edit/reject controls.

```tsx
<div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-2">
  <div className="flex items-center gap-2 mb-2">
    <Sparkles className="h-3.5 w-3.5 text-amber-500" />
    <span className="text-xs text-gray-400 italic">AI Draft</span>
  </div>
  <p className="text-sm text-gray-700 leading-relaxed">
    {draftComment}
  </p>
  <div className="flex items-center gap-2 mt-3">
    <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white text-xs h-7 px-3">
      <Check className="h-3 w-3 mr-1" /> Accept
    </Button>
    <Button size="sm" variant="outline" className="text-xs h-7 px-3 border-gray-200">
      <Pencil className="h-3 w-3 mr-1" /> Edit
    </Button>
    <Button size="sm" variant="ghost" className="text-red-500 hover:bg-red-50 text-xs h-7 px-3">
      <X className="h-3 w-3 mr-1" /> Reject
    </Button>
  </div>
</div>
```

### 11.4 AI-Generated Content Label

All AI-generated content must include this label for transparency:

```tsx
<span className="text-xs text-gray-400 italic">AI Draft</span>
```

---

## 12. Notification Patterns

### 12.1 Peer Milestone Toast

Triggered when a classmate levels up. Uses Sonner toast with a custom layout.

```tsx
toast.custom(() => (
  <div className="flex items-center gap-3 bg-white border border-gray-200 shadow-lg rounded-xl px-4 py-3 w-80">
    <div className="p-2 bg-blue-50 rounded-full">
      <Star className="h-4 w-4 text-blue-500" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-800">Peer Milestone! 🎉</p>
      <p className="text-xs text-gray-500 truncate">
        Your classmate {peerName} just hit Level {level}!
      </p>
    </div>
  </div>
));
```

### 12.2 Perfect Day Prompt Notification

In-app notification for students with 3/4 habits completed at 6 PM.

```tsx
<div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
  <span className="text-xl">✨</span>
  <div className="flex-1">
    <p className="text-sm font-semibold text-gray-800">Almost a Perfect Day!</p>
    <p className="text-xs text-gray-600">
      You're 1 habit away! Complete your <span className="font-bold text-amber-700">{missingHabit}</span> to earn 50 bonus XP.
    </p>
  </div>
  <Button size="sm" className="bg-gradient-to-r from-teal-500 to-blue-600 text-white text-xs h-7 px-3">
    Do it now
  </Button>
</div>
```

---

## 13. Self-Regulated Learning UI Patterns

### 13.1 CLO Progress Bar

Per-CLO attainment bar with Bloom's level pill. Reuses attainment level colors from the design system.

```tsx
const CLOProgressBar = ({ clo }: { clo: CLOProgress }) => {
  const attainmentColor = clo.percent >= 85 ? 'text-green-600 bg-green-50'
    : clo.percent >= 70 ? 'text-blue-600 bg-blue-50'
    : clo.percent >= 50 ? 'text-yellow-600 bg-yellow-50'
    : 'text-red-600 bg-red-50';

  const barColor = clo.percent >= 85 ? 'from-green-400 to-green-600'
    : clo.percent >= 70 ? 'from-blue-400 to-blue-600'
    : clo.percent >= 50 ? 'from-yellow-400 to-yellow-600'
    : 'from-red-400 to-red-600';

  return (
    <div className="py-2">
      <div className="flex items-center gap-2 mb-1">
        <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-bold text-white", BLOOMS_COLORS[clo.bloomsLevel])}>
          {clo.bloomsLevel}
        </span>
        <span className="text-sm font-medium text-gray-700 truncate flex-1">{clo.title}</span>
        <span className={cn("px-2 py-0.5 rounded-full text-xs font-bold", attainmentColor)}>
          {clo.percent}%
        </span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r ${barColor} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${clo.percent}%` }}
        />
      </div>
    </div>
  );
};
```

### 13.2 XP Transaction Row

Single row in the XP transaction history log.

```tsx
<div className="flex items-center gap-3 py-2.5 px-3 border-b border-gray-100 last:border-0">
  <div className={cn(
    "w-8 h-8 rounded-full flex items-center justify-center",
    xp.amount > 0 ? "bg-green-50" : "bg-red-50"
  )}>
    <Zap className={cn("h-4 w-4", xp.amount > 0 ? "text-green-500" : "text-red-500")} />
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-sm font-medium text-gray-800">{xp.sourceLabel}</p>
    <p className="text-xs text-gray-400">{formatDistanceToNow(xp.createdAt)} ago</p>
  </div>
  <span className={cn(
    "text-sm font-black",
    xp.amount > 0 ? "text-green-600" : "text-red-600"
  )}>
    {xp.amount > 0 ? '+' : ''}{xp.amount} XP
  </span>
</div>
```

### 13.3 Habit Tracker (7-Day Grid)

Compact 7-day habit grid showing 4 daily habits (Login, Submit, Journal, Read).

```tsx
<div className="grid grid-cols-7 gap-1">
  {days.map((day) => (
    <div key={day.date} className="flex flex-col items-center gap-0.5">
      <span className="text-[10px] text-gray-400 font-medium">{day.label}</span>
      {['login', 'submit', 'journal', 'read'].map((habit) => (
        <div
          key={habit}
          className={cn(
            "w-4 h-4 rounded-sm",
            day.habits[habit]
              ? "bg-green-500"
              : "bg-gray-200"
          )}
        />
      ))}
    </div>
  ))}
</div>
```

### 13.4 Bonus Event Banner

Displayed on the student dashboard when an active Bonus XP Event is running. Gradient background with countdown timer.

```tsx
<div className="relative overflow-hidden rounded-xl p-4"
  style={{ background: 'linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)' }}>
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-3">
      <div className="p-2 bg-white/20 rounded-lg">
        <Zap className="h-5 w-5 text-white" />
      </div>
      <div>
        <p className="text-white font-bold text-sm">{event.title}</p>
        <p className="text-blue-100 text-xs">{event.multiplier}× XP on all actions!</p>
      </div>
    </div>
    <div className="text-right">
      <p className="text-white text-xs font-medium">Ends in</p>
      <p className="text-white text-lg font-black">{countdown}</p>
    </div>
  </div>
</div>
```

### 13.5 Mystery Badge (Silhouette)

Unearned mystery badges display as greyed-out silhouettes. On unlock, the `badge-pop` animation plays with a confetti burst.

```tsx
// Unearned (silhouette)
<div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
  <div className="text-4xl mb-2 opacity-30 grayscale">🏆</div>
  <p className="text-xs font-bold text-gray-400">???</p>
  <p className="text-[10px] text-gray-300 mt-0.5">Hidden badge</p>
</div>

// Earned (revealed with animation)
<div className="flex flex-col items-center p-4 bg-white border border-gray-200 rounded-xl shadow-sm text-center group">
  <div className="text-4xl mb-2 animate-badge-pop">⚡</div>
  <p className="text-xs font-bold text-gray-800">Speed Demon</p>
  <p className="text-[10px] text-gray-400 mt-0.5">Earned {date}</p>
</div>
```

---

## 14. Form & Input Patterns

### Standard Form Field
```tsx
<div className="space-y-1.5">
  <Label htmlFor="clo-title" className="text-sm font-semibold text-gray-700">
    CLO Title <span className="text-red-500">*</span>
  </Label>
  <Input
    id="clo-title"
    placeholder="e.g., Apply sorting algorithms to solve computational problems"
    className="bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg text-sm"
  />
  <p className="text-xs text-gray-400">Use an action verb from Bloom's Taxonomy.</p>
</div>
```

### Form Layout Rules
- All forms in sheets/dialogs: `space-y-4` between field groups.
- Required field indicator: red asterisk `*` after label.
- Error state: `border-red-400 bg-red-50` on input + red helper text below.
- Success state: `border-green-400` on input.
- Disabled state: `opacity-50 cursor-not-allowed`.
- Submit button: always at bottom, gradient primary style, full width in mobile sheets.

---

## 15. Responsive Design

### Breakpoints (Tailwind defaults)
| Prefix | Min-width | Target |
|--------|-----------|--------|
| (none) | 0px | Mobile: 360–767px |
| `sm:` | 640px | Large mobile / small tablet |
| `md:` | 768px | Tablet |
| `lg:` | 1024px | Desktop |
| `xl:` | 1280px | Wide desktop |

### Responsive Behavior by Role
| View | Mobile | Tablet | Desktop |
|------|--------|--------|---------|
| **Student Dashboard** | Single column, bottom nav | 2-col cards | 3-col cards, sidebar |
| **Teacher Dashboard** | Tabs stacked, grading full-screen | 2-col | 3-col, split grading view |
| **Admin/Coordinator** | Limited access notice (or simplified view) | 2-col | Full 3-col + sidebar |

### Navigation on Mobile (Student)
On mobile, replace sidebar with a bottom navigation bar:
```tsx
<nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50 md:hidden">
  <NavItem icon={Home} label="Home" />
  <NavItem icon={BookOpen} label="Courses" />
  <NavItem icon={Trophy} label="Leaderboard" />
  <NavItem icon={User} label="Profile" />
</nav>
```

---

## 16. Accessibility Standards

**Target:** WCAG 2.1 Level AA compliance on all core learning flows.

### Checklist
| Category | Requirement | Implementation |
|----------|-------------|---------------|
| **Color Contrast** | Body text ≥ 4.5:1, Large text ≥ 3:1 | Verify with `contrast-checker.app`; use `gray-700` on white minimum |
| **Focus Indicators** | Visible focus ring on all interactive elements | `focus:ring-2 focus:ring-blue-500 focus:ring-offset-2` on all inputs/buttons |
| **Keyboard Navigation** | All interactions accessible via keyboard | Tab order logical; Esc closes modals; Enter/Space activates buttons |
| **ARIA Labels** | Meaningful labels for icon-only buttons | `<Button aria-label="Delete assignment">` |
| **Alt Text** | All meaningful images have alt text | `alt=""` for decorative images |
| **Form Labels** | All inputs have associated labels | `<Label htmlFor="...">` or `aria-label` |
| **Error Messages** | Errors are announced to screen readers | `role="alert"` on error messages; `aria-invalid="true"` on invalid inputs |
| **Skip Navigation** | Skip-to-main-content link at page top | `<a href="#main" className="sr-only focus:not-sr-only">Skip to content</a>` |
| **Motion** | Reduced motion respected | `@media (prefers-reduced-motion: reduce)` disables all animations |

---

## 17. Dark Mode (Phase 2)

Dark mode will be implemented using Tailwind's `class` strategy with a `ThemeProvider` toggle. All CSS custom properties will have dark-mode variants:

```css
.dark {
  --background: 222 47% 6%;
  --card: 217 33% 10%;
  --foreground: 210 40% 98%;
  --border: 217 33% 18%;
  --muted: 217 33% 15%;
  --muted-foreground: 215 20% 65%;
}
```

**Phase 2 scope:** Student dashboard dark mode first; Admin/Coordinator remains light-mode primary.

---

## 18. Implementation Checklist

Use this checklist when building any new dashboard view or component:

**Layout & Structure**
- [ ] Page uses `bg-slate-50` background
- [ ] Cards use `bg-white border-0 shadow-md rounded-xl`
- [ ] Main section cards use the brand gradient on `CardHeader`
- [ ] KPI metric row uses `grid grid-cols-2 md:grid-cols-4 gap-4`
- [ ] Sidebar (if present) is `bg-white border-r border-slate-200`

**Typography**
- [ ] Page title is `text-2xl font-bold tracking-tight`
- [ ] Section headings are `text-lg font-bold tracking-tight`
- [ ] Metric values are `text-2xl font-black`
- [ ] Metric labels are `text-[10px] font-black tracking-widest uppercase`
- [ ] Body text uses `text-sm font-medium antialiased`

**Colors & Brand**
- [ ] No pink, purple, violet, rose, or fuchsia on cards or tabs
- [ ] Active tabs use `bg-blue-600 text-white`
- [ ] Select triggers use `bg-white border border-gray-200`
- [ ] No glassmorphism on data cards

**Interactions**
- [ ] Buttons have `active:scale-95` press state
- [ ] Hover states are defined and don't cause icons to vanish
- [ ] Edit icon hovers `text-blue-600 bg-blue-50`
- [ ] Delete icon hovers `text-red-600 bg-red-50`

**Accessibility**
- [ ] All icon-only buttons have `aria-label`
- [ ] Focus rings present on all interactive elements (`focus:ring-2 focus:ring-blue-500`)
- [ ] Color contrast verified for text elements
- [ ] Loading states use shimmer, not spinners alone

**Gamification (Student views)**
- [ ] XP displayed in amber chip in header
- [ ] Streak displayed with flame icon
- [ ] Level progress bar present on profile/hero card
- [ ] Badge awards trigger `animate-badge-pop`
- [ ] Mystery badges show as silhouettes (`opacity-30 grayscale`) until earned
- [ ] Bonus Event banner uses brand gradient with countdown timer

**AI Co-Pilot**
- [ ] AI suggestion cards use `border-l-4 border-l-blue-400` with sparkles icon
- [ ] At-risk student rows use `bg-red-50 border-l-4 border-l-red-400` with probability badge
- [ ] Feedback drafts use `bg-amber-50 border border-amber-200` with accept/edit/reject buttons
- [ ] All AI-generated content includes `text-xs text-gray-400 italic` "AI Draft" label
- [ ] Thumbs up/down feedback buttons on all AI suggestions

**Self-Regulated Learning**
- [ ] CLO Progress bars include Bloom's level pill (color-coded)
- [ ] CLO attainment colors follow design system (green/blue/yellow/red)
- [ ] XP Transaction rows show positive amounts in green, negative in red
- [ ] Habit Tracker uses 7-day grid with green/gray squares
- [ ] Peer milestone notifications delivered via Sonner toast

---

*This document is the source of truth for all Edeviser UI decisions. When in doubt: solid white backgrounds, blue-teal gradient headers, no purple tabs.*
