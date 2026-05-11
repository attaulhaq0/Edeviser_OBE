# Edeviser UI/UX Design System — Review Document

**Version:** 2.0 | **Date:** April 12, 2026 | **Status:** Living Document
**Purpose:** Comprehensive design reference for UI/UX review, critique, and improvement recommendations.
**Platform:** OBE (Outcome-Based Education) + Gamification for Higher Education — Qatar market, Arabic/English bilingual.

---

## Table of Contents

1. [Design Philosophy & Principles](#1-design-philosophy--principles)
2. [User Roles & Audience](#2-user-roles--audience)
3. [Design Tokens & Color System](#3-design-tokens--color-system)
4. [Typography](#4-typography)
5. [Spacing & Layout](#5-spacing--layout)
6. [Iconography](#6-iconography)
7. [Component Library](#7-component-library)
8. [Page Patterns & Templates](#8-page-patterns--templates)
9. [Dashboard Patterns](#9-dashboard-patterns)
10. [Gamification UI Patterns](#10-gamification-ui-patterns)
11. [AI Co-Pilot UI Patterns](#11-ai-co-pilot-ui-patterns)
12. [Self-Regulated Learning UI](#12-self-regulated-learning-ui)
13. [Notification Patterns](#13-notification-patterns)
14. [Form & Input Patterns](#14-form--input-patterns)
15. [Animation & Motion](#15-animation--motion)
16. [Responsive Design](#16-responsive-design)
17. [RTL & Internationalization](#17-rtl--internationalization)
18. [Accessibility Standards](#18-accessibility-standards)
19. [Dark Mode](#19-dark-mode)
20. [Prohibited Patterns](#20-prohibited-patterns)
21. [Implementation Checklist](#21-implementation-checklist)
22. [Open Questions for UI/UX Review](#22-open-questions-for-uiux-review)

---

## 1. Design Philosophy & Principles

### Core Principle: “Trust Through Clarity”

Edeviser serves two distinct user mindsets simultaneously:

- **Compliance-driven users** (admins, coordinators, teachers) — need to complete administrative OBE tasks quickly and accurately.
- **Motivation-driven users** (students) — need to _feel_ progress, not just see numbers.

### Five Design Laws

| #   | Law                                     | Rationale                                                                                                 |
| --- | --------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| 1   | **Solid over transparent**              | All data-bearing surfaces use solid backgrounds. Glassmorphism and transparency are decorative only.      |
| 2   | **Hierarchy over decoration**           | Every visual element has a purpose. Decoration serves hierarchy, not the reverse.                         |
| 3   | **Feedback is mandatory**               | Every user action produces an immediate visual response within 100ms.                                     |
| 4   | **Brand consistency is non-negotiable** | The teal-to-blue gradient is the brand fingerprint. Every dashboard, every role, uses it on card headers. |
| 5   | **Mobile is first-class for students**  | Student views are designed mobile-first and scaled up. Admin/Coordinator views are desktop-optimized.     |

### Design Tone

- Professional yet approachable — academic platform, not a social app.
- Data-dense but not overwhelming — progressive disclosure, component-level loading.
- Celebratory for achievements — gamification elements reward effort with visual delight.
- Culturally respectful — full Arabic RTL support, no culturally insensitive imagery.

---

## 2. User Roles & Audience

| Role            | Primary Device   | Key Tasks                                                 | Design Priority                        |
| --------------- | ---------------- | --------------------------------------------------------- | -------------------------------------- |
| **Admin**       | Desktop          | Institution setup, user management, reports, settings     | Data density, efficiency               |
| **Coordinator** | Desktop          | Program management, curriculum matrix, CQI, accreditation | Complex data visualization             |
| **Teacher**     | Desktop + Tablet | Grading, assignment creation, CLO management, attendance  | Workflow speed, grading UX             |
| **Student**     | Mobile + Desktop | Dashboard, assignments, journal, habits, leaderboard      | Engagement, gamification, mobile-first |
| **Parent**      | Mobile + Desktop | Child progress monitoring, attendance, grades             | Read-only clarity, at-a-glance info    |

---

## 3. Design Tokens & Color System

All visual values are defined as CSS custom properties in src/index.css and mapped to Tailwind CSS v4 via @theme blocks. No ailwind.config.ts — Tailwind v4 uses CSS-based configuration.

### 3.1 Brand Colors

| Token                  | Hex Value | Tailwind Equivalent | Usage                             |
| ---------------------- | --------- | ------------------- | --------------------------------- |
| --brand-primary        | #3b82f6   | lue-500             | Primary CTA, active states, links |
| --brand-primary-dark   | #2563eb   | lue-600             | Hover states                      |
| --brand-secondary      | #14b8a6   | eal-500             | Secondary accents, gradient start |
| --brand-secondary-dark | #0d9488   | eal-600             | Teal hover states                 |
| --gradient-start       | #14b8a6   | —                   | Brand gradient start              |
| --gradient-end         | #0382bd   | —                   | Brand gradient end                |

### 3.2 Brand Gradients (The Fingerprint)

The teal-to-blue gradient is the single most recognizable brand element. It appears on all card headers, primary buttons, and the logo.

`css
/_ Standard Brand Gradient — card headers, primary buttons _/
--brand-gradient: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%);

/_ Hero / Welcome Card Gradient — dashboard hero sections _/
--hero-gradient: linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%);
`

### 3.3 Semantic / Functional Colors

| Token                     | Hex                                   | Tailwind  | Usage                                |
| ------------------------- | ------------------------------------- | --------- | ------------------------------------ |
| --color-success           | #22c55e                               | green-500 | Completed states, pass grades        |
| --color-warning           | #f59e0b                               | mber-500  | At-risk alerts, approaching deadline |
| --color-destructive-brand | #ef4444                               |
| ed-500                    | Errors, delete actions, failed states |
| --color-neutral           | #64748b                               | slate-500 | Secondary text, inactive elements    |

### 3.4 Surface Colors

| Token                  | Hex     | Tailwind  | Usage                            |
| ---------------------- | ------- | --------- | -------------------------------- |
| --surface-background   | #ffffff | white     | Page background                  |
| --surface-card         | #ffffff | white     | All card backgrounds             |
| --surface-subtle       | #f8fafc | slate-50  | Alternate rows, inner containers |
| --surface-border       | #e2e8f0 | slate-200 | Card borders, dividers           |
| --surface-input-border | #d1d5db | gray-300  | Form input borders               |

### 3.5 Shadows

`css
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
`

### 3.6 Border Radius

`css
--radius: 0.625rem;                   /* 10px base */
--radius-xl: calc(var(--radius) + 4px);  /* 14px — cards */
--radius-2xl: calc(var(--radius) + 8px); /* 18px — hero cards */
`

### 3.7 Domain-Specific Color Coding

#### Bloom\u2019s Taxonomy Levels

Each CLO has exactly one Bloom\u2019s level. These colors are used consistently across pills, charts, and CLO tags:

| Level      | Color  | Tailwind Class | Text         |
| ---------- | ------ | -------------- | ------------ |
| Remember   | Purple | g-purple-500   | ext-white    |
| Understand | Blue   | g-blue-500     | ext-white    |
| Apply      | Green  | g-green-500    | ext-white    |
| Analyze    | Yellow | g-yellow-500   | ext-gray-900 |
| Evaluate   | Orange | g-orange-500   | ext-white    |
| Create     | Red    | g-red-500      | ext-white    |

#### Outcome Type Colors

| Type                | Background  | Text          | Border          |
| ------------------- | ----------- | ------------- | --------------- |
| ILO (Institutional) | g-red-100   | ext-red-700   | order-red-200   |
| PLO (Program)       | g-blue-100  | ext-blue-700  | order-blue-200  |
| CLO (Course)        | g-green-100 | ext-green-700 | order-green-200 |

#### Grade Attainment Colors

| Level        | Threshold | Text Color     | Background  |
| ------------ | --------- | -------------- | ----------- |
| Excellent    | >= 85%    | ext-green-600  | g-green-50  |
| Satisfactory | 70–84%    | ext-blue-600   | g-blue-50   |
| Developing   | 50–69%    | ext-yellow-600 | g-yellow-50 |
| Not Yet      | < 50%     | ext-red-600    | g-red-50    |

#### Gamification Colors

| Element              | Color          | Tailwind     |
| -------------------- | -------------- | ------------ |
| XP / Gold            | #f59e0b        | mber-500     |
| Streak Flame         | gradient       |
| ed-500 to orange-500 |
| Level Badge          | Brand gradient | teal-to-blue |
| Leaderboard Gold     | #fbbf24        | yellow-400   |
| Leaderboard Silver   | #9ca3af        | gray-400     |
| Leaderboard Bronze   | #d97706        | mber-600     |

---

## 4. Typography

### Font Stack

| Role             | Family           | Fallback                                 |
| ---------------- | ---------------- | ---------------------------------------- |
| Primary (All UI) | Noto Sans        | system-ui, sans-serif                    |
| Arabic (RTL)     | Noto Sans Arabic | Noto Sans, system-ui, sans-serif         |
| Code / Technical | Menlo            | Monaco, Consolas, Courier New, monospace |

Font loading: Google Fonts with display=swap for performance. Preconnect hint included.

### Type Scale

| Role                 | Tailwind Classes                                | Size | Weight | Usage                            |
| -------------------- | ----------------------------------------------- | ---- | ------ | -------------------------------- |
| Page Title (H1)      | ext-2xl font-bold tracking-tight                | 24px | 700    | Dashboard hero title             |
| Section Heading (H2) | ext-lg font-bold tracking-tight                 | 18px | 700    | Card titles, section headings    |
| Subsection (H3)      | ext-base font-semibold                          | 16px | 600    | Widget titles, form group labels |
| KPI Value            | ext-2xl font-black                              | 24px | 900    | Metric numbers on stat cards     |
| Metric Label         | ext-[10px] font-black tracking-widest uppercase | 10px | 900    | Labels beneath metric values     |
| Body                 | ext-sm font-medium antialiased                  | 14px | 500    | General content, descriptions    |
| Caption              | ext-xs text-gray-500                            | 12px | 400    | Helper text, timestamps          |
| Navigation Pill      | ext-sm font-medium                              | 14px | 500    | Tab labels                       |
| Button               | ext-sm font-semibold                            | 14px | 600    | All button text                  |
| Badge Label          | ext-xs font-bold tracking-wide uppercase        | 12px | 700    | Badge chips and tags             |
| Code                 | ont-mono text-sm                                | 14px | 400    | Code snippets, technical IDs     |

### Typography Rules

- Line height: Body text leading-relaxed (1.625); headings leading-tight (1.25).
- Max width: Prose content areas max max-w-prose (65ch) for readability.
- Antialiasing: Always apply ntialiased on text within cards.
- Truncation: Long strings (names, titles) always use runcate — never wrap unexpectedly.

---

## 5. Spacing & Layout

### Spacing Scale (Tailwind defaults — never use arbitrary values)

| Token       | Value | Use                                |
| ----------- | ----- | ---------------------------------- |
| p-2 / gap-2 | 8px   | Icon padding, tight component gaps |
| p-3         | 12px  | Small card padding                 |
| p-4         | 16px  | Standard card padding              |
| p-6         | 24px  | Generous section padding           |
| p-8         | 32px  | Page-level padding                 |
| gap-4       | 16px  | Standard grid/flex gap             |
| gap-6       | 24px  | Section-level gap                  |

### Grid System

- Admin / Coordinator / Teacher: 12-column grid; use grid-cols-12 with col-span-\*.
- Student: Responsive 3-column (grid-cols-1 md:grid-cols-2 lg:grid-cols-3).
- KPI Cards Row: Always grid grid-cols-2 md:grid-cols-4 gap-4.

### Page Layout Structure

`+--------------------------------------------------+
| Top Nav Bar (h-16, fixed, bg-white, border-b)    |
+--------+-----------------------------------------+
| Sidebar | Main Content Area                       |
| w-64    | flex-1, p-6, bg-slate-50, space-y-6     |
| bg-white|                                         |
| border-r| [Hero Card]                             |
|         | [KPI Row: 4 cards]                      |
|         | [Tab Navigation]                        |
|         | [Tab Content / Section Cards]           |
+--------+-----------------------------------------+`

- Sidebar: w-64 fixed width, g-white, order-r border-slate-200
- Main content: lex-1 overflow-auto p-6 bg-slate-50
- Student mobile: sidebar hidden, bottom nav bar instead

---

## 6. Iconography

**Library:** Lucide React (tree-shakeable, 2px stroke, rounded caps/joins)

### Size Rules

| Context              | Size    | Class                             |
| -------------------- | ------- | --------------------------------- |
| Navigation sidebar   | 20x20px | h-5 w-5                           |
| Inside buttons       | 16x16px | h-4 w-4 with gap-2                |
| KPI card icons       | 20x20px | h-5 w-5 inside gradient container |
| Empty state          | 40x40px | h-10 w-10                         |
| Decorative (hero bg) | 64x64px | h-16 w-16 opacity-10              |

### Semantic Icon Map

| Concept           | Icon Name       | Context               |
| ----------------- | --------------- | --------------------- |
| Dashboard         | LayoutDashboard | Navigation            |
| Students/Users    | Users           | Navigation, headings  |
| Teachers          | GraduationCap   | Navigation, badges    |
| ILO / Outcomes    | Target          | OBE section           |
| PLO               | Layers          | Coordinator section   |
| CLO               | BookOpen        | Teacher section       |
| Assignment        | FileText        | Assignment management |
| Rubric            | Grid3X3         | Rubric builder        |
| Evidence          | ShieldCheck     | Evidence/compliance   |
| Report / Export   | Download        | Report actions        |
| Analytics         | BarChart3       | Dashboard sections    |
| XP                | Zap             | XP displays           |
| Streak            | Flame           | Streak counter        |
| Badge             | Award           | Badge display         |
| Level             | Star            | Level indicator       |
| Leaderboard       | Trophy          | Leaderboard section   |
| AI                | Sparkles        | AI Co-Pilot features  |
| Journal           | NotebookPen     | Reflection journal    |
| Warning / At-Risk | AlertTriangle   | Warning states        |
| Add / Create      | Plus            | Creation actions      |
| Edit              | Pencil          | Edit actions          |
| Delete            | Trash2          | Destructive actions   |
| Settings          | Settings        | Config sections       |

### Icon Rules

- Never use icons alone as the only visual affordance — always pair with a label or tooltip.
- All icon-only buttons must have ria-label.

---

## 7. Component Library

Built on Shadcn/ui (New York style, Radix primitives). All interactive elements MUST use Shadcn/ui — never raw HTML.

### Architecture

- Shadcn/ui primitives: `src/components/ui/` (Button, Card, Dialog, Form, Input, Select, Tabs, Badge, etc.)
- Custom shared components: `src/components/shared/` (DataTable, GradientCardHeader, StreakDisplay, BadgeCollection, etc.)
- CVA (class-variance-authority) for component variants
- `cn()` utility from `src/lib/utils.ts` for merging Tailwind classes

### 7.1 Buttons

| Variant                | Style                                                              | Usage                     | Max per Section |
| ---------------------- | ------------------------------------------------------------------ | ------------------------- | --------------- |
| Primary (Gradient CTA) | Teal-to-blue gradient, white text, shadow-md, active:scale-95      | Main action               | 1               |
| Secondary              | Outline, border-gray-200, bg-white, text-gray-700                  | Cancel, secondary actions | Unlimited       |
| Destructive            | bg-red-500, hover:bg-red-600                                       | Delete, remove            | As needed       |
| Ghost (Icon)           | Ghost variant, text-gray-500, hover:text-blue-600 hover:bg-blue-50 | Inline edit/delete        | As needed       |

Button rules:

- Minimum touch target: 44x44px on mobile
- Loading state: replace content with Loader2 spinner (animate-spin)
- Press feedback: active:scale-95 transition-transform duration-100

### 7.2 Cards

| Card Type            | Style                                                                           | When to Use                          |
| -------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| Standard Data Card   | bg-white border-0 shadow-md hover:shadow-lg rounded-xl                          | General content containers           |
| Gradient Header Card | Card with overflow-hidden, header div with brand gradient, white icon + heading | ALL main section cards on dashboards |
| KPI Metric Card      | group bg-white border-0 shadow-lg rounded-xl p-4 with hover icon scale          | Stat/metric displays                 |
| Hero Welcome Card    | Dark gradient (135deg, #0f172a, #1e3a8a, #312e81) with white text               | Top of all role dashboards           |

Card rules:

- All cards: bg-white border-0 shadow-md rounded-xl
- Section card headers use inline style for the brand gradient (not Tailwind class)
- Card must have overflow-hidden for gradient to clip to rounded corners
- KPI cards use group hover with icon scale-110 transition

### 7.3 Tab Navigation (Pill Row)

| State     | Style                                                             |
| --------- | ----------------------------------------------------------------- |
| Container | flex w-full gap-2 (no connected bar)                              |
| Active    | bg-blue-600 text-white shadow-md border-blue-600 — NEVER gradient |
| Inactive  | bg-white text-gray-600 border-gray-200 shadow-sm hover:bg-gray-50 |
| Shape     | rounded-xl with icon + label                                      |

Critical: Never use pink/purple/violet as tab active colors.

### 7.4 Tables / Data Tables

- Wrapper: rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm
- Header row: bg-gray-50 border-b border-gray-200
- Header text: text-xs font-black text-gray-500 tracking-widest uppercase
- Alternating rows: bg-white / bg-gray-50/30
- Hover: hover:bg-slate-50 transition-colors
- Action buttons: ghost icon buttons with blue (edit) and red (delete) hover states
- Always use the shared DataTable component with TanStack Table

### 7.5 Select / Dropdown

- Trigger: bg-white border border-gray-200 rounded-lg shadow-sm
- Content: bg-white border border-gray-200 shadow-lg rounded-xl
- Items: rounded-lg hover:bg-blue-50 cursor-pointer
- CRITICAL: Never bg-transparent or bg-gray-900 for SelectTrigger

### 7.6 Loading States

- Use component-level shimmer skeletons, NEVER full-page blocking loaders
- Shimmer: gradient sweep animation (animate-shimmer)
- Pattern: from-gray-200 via-gray-100 to-gray-200 bg-[length:200% 100%]
- Place shimmer placeholders matching the shape of the content they replace

### 7.7 Empty States

- Centered layout: flex flex-col items-center justify-center py-16 text-center
- Icon in muted container: p-4 bg-gray-100 rounded-2xl
- Heading + description + CTA button
- CTA uses gradient primary button style

### 7.8 Key Shared Components

| Component            | Path                                           | When to Use                                |
| -------------------- | ---------------------------------------------- | ------------------------------------------ |
| DataTable            | src/components/shared/DataTable.tsx            | Any data table with sort/filter/pagination |
| GradientCardHeader   | src/components/shared/GradientCardHeader.tsx   | Section card headers                       |
| ConfirmDialog        | src/components/shared/ConfirmDialog.tsx        | Destructive action confirmation            |
| ErrorBoundary        | src/components/shared/ErrorBoundary.tsx        | Component error boundaries                 |
| BadgeCollection      | src/components/shared/BadgeCollection.tsx      | Badge displays                             |
| StreakDisplay        | src/components/shared/StreakDisplay.tsx        | Streak counters                            |
| LevelProgress        | src/components/shared/LevelProgress.tsx        | XP level bars                              |
| XPAwardToast         | src/components/shared/XPAwardToast.tsx         | XP earned feedback                         |
| BadgeAwardModal      | src/components/shared/BadgeAwardModal.tsx      | Badge unlock celebration                   |
| LevelUpOverlay       | src/components/shared/LevelUpOverlay.tsx       | Level up full-screen celebration           |
| MysteryBadge         | src/components/shared/MysteryBadge.tsx         | Hidden badge silhouettes                   |
| BonusEventBanner     | src/components/shared/BonusEventBanner.tsx     | Active XP multiplier events                |
| HabitTracker         | src/components/shared/HabitTracker.tsx         | 7-day habit grid                           |
| BloomsVerbGuide      | src/components/shared/BloomsVerbGuide.tsx      | CLO creation helper                        |
| RubricPreview        | src/components/shared/RubricPreview.tsx        | Rubric display                             |
| CurriculumMatrix     | src/components/shared/CurriculumMatrix.tsx     | PLO x Course grid                          |
| RealtimeStatusBanner | src/components/shared/RealtimeStatusBanner.tsx | Live update status                         |

---

## 8. Page Patterns & Templates

Every page follows one of these standardized patterns:

### 8.1 List Page Pattern

Used for: User List, Program List, Course List, ILO/PLO/CLO List, Assignment List, etc.

Structure:

1. Page header: title (text-2xl font-bold tracking-tight) + gradient CTA button
2. Filter bar: search input with icon, dropdown filters (nuqs for URL-persisted state)
3. DataTable component with TanStack Table (sort, filter, pagination)

Key rules:

- Always use nuqs for URL-persisted search/filter state
- Always use TanStack Table via the shared DataTable component
- One gradient CTA button max per page header
- Loading state handled by isLoading from TanStack Query

### 8.2 Form Page Pattern

Used for: Create/Edit User, Program, Course, ILO, PLO, CLO, Assignment, etc.

Structure:

1. Card wrapper: bg-white border-0 shadow-md rounded-xl p-6 max-w-2xl
2. React Hook Form + Zod resolver for validation
3. Shadcn Form components (FormField, FormItem, FormLabel, FormControl, FormMessage)
4. Gradient submit button with Loader2 spinner when pending
5. Sonner toast for success/error feedback

### 8.3 Dashboard Page Pattern

Used for: Admin, Coordinator, Teacher, Student dashboards

Structure:

1. Welcome Hero Card (dark gradient, user greeting)
2. KPI Row: grid grid-cols-2 md:grid-cols-4 gap-4
3. Tab Navigation (pill style)
4. Section Cards with gradient headers

### 8.4 Layout Pattern (Sidebar)

Used for: Admin, Coordinator, Teacher layouts

- Sidebar: w-64 fixed, bg-white, border-r border-slate-200
- Active nav item: bg-blue-50 text-blue-600
- Inactive nav item: text-gray-600 hover:bg-slate-50
- Nav icons: h-5 w-5
- Main content area: flex-1 overflow-auto p-6 bg-slate-50

---

## 9. Dashboard Patterns

### 9.1 Welcome / Hero Card

Appears at the top of ALL role dashboards. Contains user greeting and high-level KPI summary.

- Background: hero gradient (135deg, #0f172a -> #1e3a8a -> #312e81)
- Optional texture overlay at 5% opacity
- Dark overlay (bg-black/20) for text readability
- Content: greeting (text-2xl font-bold text-white), subtitle (text-blue-200 text-sm)
- Bottom row: inline KPI stats (label in text-blue-300 text-xs uppercase, value in text-white text-2xl font-black)

### 9.2 Section Card Header (The Brand Fingerprint)

Every main category section card uses this exact background on its header:

```
background: linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)
```

With optional subtle educational pattern overlay at 10% opacity.

Rules:

- Used on EVERY main section card across ALL role dashboards. No exceptions.
- Header: px-6 py-4, white icon (h-5 w-5), white heading text (text-lg font-bold tracking-tight)
- Optional subtitle in text-blue-100 text-sm
- Card body: p-6 on white background

### 9.3 KPI Metric Card

- Container: group bg-white border-0 shadow-lg hover:shadow-xl rounded-xl overflow-hidden
- Layout: flex row, metric info left, icon container right
- Metric title: text-sm font-bold text-gray-800
- Metric value: text-2xl font-black text-gray-900 (hover: text-blue-700)
- Icon container: p-2 bg-gradient-to-br from-blue-400/20 to-blue-600/20 rounded-xl
- Hover: icon container scale-110 rotate-3 transition
- Bottom accent line: h-0.5 gradient from-blue-400 to-teal-500, opacity-0 -> opacity-100 on hover

### 9.4 Attainment Progress Bar

- Label + percentage on same line (justify-between)
- Track: h-2 bg-gray-100 rounded-full overflow-hidden
- Fill: gradient based on attainment level (green >= 70%, yellow >= 50%, red < 50%)
- Animated width transition: transition-all duration-700 ease-out

---

## 10. Gamification UI Patterns

### 10.1 XP Display (Header Chip)

- Container: bg-amber-50 border border-amber-200 rounded-full px-3 py-1
- Icon: Zap h-3.5 w-3.5 text-amber-500
- Text: text-sm font-black text-amber-700

### 10.2 Streak Display

- Container: bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-xl p-3
- Icon: Flame h-6 w-6 text-orange-500 animate-streak-flame
- Value: text-xl font-black text-gray-900
- Label: text-[10px] font-black tracking-widest uppercase text-orange-600

### 10.3 Badge Display

Compact chip:

- Container: bg-purple-50 border border-purple-200 rounded-full px-2.5 py-1
- Emoji + text-xs font-bold text-purple-700

Full card:

- Container: bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md p-4 text-center
- Emoji: text-4xl with group-hover:animate-badge-pop
- Name: text-xs font-bold text-gray-800
- Date: text-[10px] text-gray-400

Mystery badge (unearned):

- Same card but emoji has opacity-30 grayscale
- Name shows "???"
- On unlock: animate-badge-pop + confetti burst

### 10.4 Level Progress Bar

- Label: "Level N — Title" (text-sm font-bold text-gray-700)
- XP counter: "900 / 1,400 XP" (text-xs text-gray-500)
- Track: h-3 bg-gray-100 rounded-full
- Fill: bg-gradient-to-r from-teal-400 to-blue-600, transition-all duration-1000
- Remaining: text-[10px] text-gray-400 "500 XP to Level 6"

### 10.5 Leaderboard Row

- Rank badge: w-6 h-6 rounded-full, gold/silver/bronze/gray based on position
- Avatar: w-8 h-8 rounded-full gradient (blue-400 to teal-500) with initial
- Name + level info
- XP value: text-sm font-black text-amber-600

### 10.6 Bonus Event Banner

- Background: brand gradient
- Icon in white/20 container
- Event title + multiplier description
- Countdown timer on right side

---

## 11. AI Co-Pilot UI Patterns

### 11.1 AI Suggestion Card (Student Dashboard)

- Left border accent: border-l-4 border-l-blue-400
- Sparkles icon in bg-blue-50 container
- "Suggested for you" heading + "AI Draft" italic label
- Suggestion text + supporting stat
- Thumbs up/down feedback buttons at bottom
- "Was this helpful?" prompt

### 11.2 At-Risk Student Row (Teacher Dashboard)

- Background: bg-red-50 with border-l-4 border-l-red-400
- Red avatar with student initial
- Student name + last login + risk reason
- Probability badge: bg-red-100 text-red-700 border border-red-200
- "Send Nudge" action button

### 11.3 AI Feedback Draft (Teacher Grading View)

- Background: bg-amber-50 border border-amber-200 rounded-lg
- Sparkles icon + "AI Draft" italic label
- Draft comment text
- Three action buttons: Accept (green), Edit (outline), Reject (red ghost)

### 11.4 AI-Generated Content Label

All AI-generated content MUST include this transparency label:

- Style: text-xs text-gray-400 italic
- Text: "AI Draft"

---

## 12. Self-Regulated Learning UI

### 12.1 CLO Progress Bar

- Bloom's level pill (color-coded per taxonomy)
- CLO title (truncated)
- Attainment percentage badge (color-coded per attainment level)
- Progress bar with attainment-level gradient fill

### 12.2 XP Transaction Row

- Icon in colored circle (green for positive, red for negative XP)
- Source label + relative timestamp
- Amount: font-black, green for positive, red for negative

### 12.3 Habit Tracker (7-Day Grid)

- 7 columns (one per day), 4 rows (Login, Submit, Journal, Read)
- Day label: text-[10px] text-gray-400
- Completed: w-4 h-4 rounded-sm bg-green-500
- Incomplete: w-4 h-4 rounded-sm bg-gray-200

### 12.4 Learning Path

- Visual node-based path showing assignments ordered by Bloom's level
- Locked nodes: grayed out with lock icon
- Unlocked nodes: colored by Bloom's level
- Completed nodes: checkmark overlay
- Node unlock animation: animate-node-unlock

---

## 13. Notification Patterns

### 13.1 Peer Milestone Toast

- Sonner custom toast layout
- Star icon in bg-blue-50 container
- "Peer Milestone!" heading with emoji
- Classmate name + achievement description

### 13.2 Perfect Day Prompt

- Background: bg-amber-50 border border-amber-200 rounded-xl
- Sparkle emoji
- "Almost a Perfect Day!" heading
- Missing habit highlighted in font-bold text-amber-700
- "Do it now" gradient CTA button

### 13.3 Toast Notifications (General)

- Library: Sonner
- Success: toast.success()
- Error: toast.error()
- Custom: toast.custom() for rich layouts
- Position: top-right (default)

---

## 14. Form & Input Patterns

### Standard Form Field

- Label: text-sm font-semibold text-gray-700
- Required indicator: red asterisk after label
- Input: bg-white border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-lg
- Helper text: text-xs text-gray-400
- Error state: border-red-400 bg-red-50 + red helper text
- Success state: border-green-400
- Disabled state: opacity-50 cursor-not-allowed

### Form Layout Rules

- Field spacing: space-y-4 between field groups
- Submit button: always at bottom, gradient primary style
- Full width submit on mobile sheets
- Always use React Hook Form + Zod resolver
- Always use Shadcn Form components

---

## 15. Animation & Motion

### Motion Philosophy

- Purposeful: Every animation communicates something (progress, success, state change). No animation for decoration alone.
- Fast: Micro-interactions <= 200ms. Celebrations <= 600ms. Never block user action.
- Respectful: Honor prefers-reduced-motion. All animations disabled for users with this preference.

### Standard Easing Functions

| Name          | Value                             | Usage                  |
| ------------- | --------------------------------- | ---------------------- |
| ease-out-expo | cubic-bezier(0.16, 1, 0.3, 1)     | Snappy exits, overlays |
| ease-in-out   | cubic-bezier(0.4, 0, 0.2, 1)      | State transitions      |
| ease-spring   | cubic-bezier(0.34, 1.56, 0.64, 1) | Badge pop, level up    |

### Animation Catalog

| Name           | Duration   | Trigger                | Type                    |
| -------------- | ---------- | ---------------------- | ----------------------- |
| fade-in        | 200ms      | Component mount        | Framer Motion           |
| slide-in-up    | 300ms      | Card mount             | Framer Motion           |
| shimmer        | 1.5s loop  | Loading state          | CSS keyframes           |
| badge-pop      | 500ms      | Badge award            | CSS keyframes (spring)  |
| xp-pulse       | 600ms      | XP earned              | CSS keyframes           |
| xp-count-up    | 800ms      | XP earned              | JS counter              |
| streak-flame   | 800ms loop | Active streak          | CSS keyframes           |
| level-up       | 600ms      | Level up event         | Framer Motion overlay   |
| confetti       | 2s         | Submission/achievement | canvas-confetti library |
| float          | 3s loop    | Background decorations | CSS keyframes           |
| button-press   | 100ms      | Button click           | CSS active:scale-95     |
| node-unlock    | 500ms      | Learning path unlock   | CSS keyframes           |
| mystery-reveal | 600ms      | Mystery badge reveal   | CSS keyframes (spring)  |
| fade-in-up     | 300ms      | Content entrance       | CSS keyframes           |

### Reduced Motion Support

All custom animations are disabled via:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-shimmer,
  .animate-xp-pulse,
  .animate-badge-pop,
  .animate-float,
  .animate-streak-flame,
  .animate-fade-in-up,
  .animate-node-unlock,
  .animate-mystery-reveal {
    animation: none;
  }
}
```

Additionally, a `.reduce-animations` CSS class is available for user-controlled animation preferences.

---

## 16. Responsive Design

### Breakpoints (Tailwind defaults)

| Prefix | Min-width | Target                      |
| ------ | --------- | --------------------------- |
| (none) | 0px       | Mobile: 360-767px           |
| sm:    | 640px     | Large mobile / small tablet |
| md:    | 768px     | Tablet                      |
| lg:    | 1024px    | Desktop                     |
| xl:    | 1280px    | Wide desktop                |

### Responsive Behavior by Role

| View              | Mobile                                | Tablet      | Desktop                   |
| ----------------- | ------------------------------------- | ----------- | ------------------------- |
| Student Dashboard | Single column, bottom nav             | 2-col cards | 3-col cards, sidebar      |
| Teacher Dashboard | Tabs stacked, grading full-screen     | 2-col       | 3-col, split grading view |
| Admin/Coordinator | Limited access notice (or simplified) | 2-col       | Full 3-col + sidebar      |

### Student Mobile Navigation

On mobile (below md: breakpoint), the sidebar is replaced with a fixed bottom navigation bar:

- Position: fixed bottom-0, full width
- Background: bg-white border-t border-gray-200
- Layout: flex justify-around py-2
- Items: icon (h-5 w-5) + label (text-xs)
- z-index: z-50
- Hidden on md: and above (md:hidden)

---

## 17. RTL & Internationalization

### Languages

- English (LTR) — primary
- Arabic (RTL) — full support
- i18next + react-i18next for language switching

### RTL Implementation

- HTML dir attribute: `<html dir="rtl">` when Arabic is active
- Arabic font: "Noto Sans Arabic" loaded via [dir="rtl"] CSS selector
- Logical CSS properties used throughout:
  - `ms-*` / `me-*` instead of `ml-*` / `mr-*` (margin)
  - `ps-*` / `pe-*` instead of `pl-*` / `pr-*` (padding)
  - `start` / `end` instead of `left` / `right` for positioning
- Radix UI popovers respect direction via CSS override
- Locale files: `public/locales/{ar,ur}/` and `src/locales/{en,ar}/`

### Translation File Structure

- Namespaced by role: auth.json, admin.json, teacher.json, student.json, common.json
- Keys follow dot notation: `admin.users.createButton`
- All user-facing strings must be in translation files — no hardcoded English

---

## 18. Accessibility Standards

Target: WCAG 2.1 Level AA compliance on all core learning flows.

### Color Contrast Audit

| Token                           | Hex     | Ratio vs White | WCAG AA Status       |
| ------------------------------- | ------- | -------------- | -------------------- |
| --brand-primary (blue-500)      | #3b82f6 | 3.13:1         | Large text only      |
| --brand-primary-dark (blue-600) | #2563eb | 4.57:1         | All text             |
| --brand-secondary (teal-500)    | #14b8a6 | 2.90:1         | Large text/UI only   |
| --color-success (green-500)     | #22c55e | 2.52:1         | Use on bg-\*-50 only |
| --color-warning (amber-500)     | #f59e0b | 2.15:1         | Use on bg-\*-50 only |
| --color-destructive (red-500)   | #ef4444 | 4.00:1         | Large text           |
| --color-neutral (slate-500)     | #64748b | 4.63:1         | All text             |
| text-gray-500                   | #6b7280 | 4.64:1         | All text             |
| text-gray-900 (body)            | #111827 | 17.4:1         | All text             |

Guidelines:

- Use --brand-primary-dark (#2563eb) for interactive text links (not blue-500)
- Success/warning colors MUST be paired with tinted backgrounds (bg-green-50, bg-yellow-50)
- Never rely on color alone to convey information — always pair with text labels, icons, or patterns

### Attainment Badge Contrast (all pass AA)

- Excellent: text-green-600 on bg-green-50 (7.08:1)
- Satisfactory: text-blue-600 on bg-blue-50 (6.20:1)
- Developing: text-yellow-600 on bg-yellow-50 (4.68:1)
- Not Yet: text-red-600 on bg-red-50 (6.07:1)

### Accessibility Checklist

| Category            | Requirement                                    | Implementation                                              |
| ------------------- | ---------------------------------------------- | ----------------------------------------------------------- |
| Color Contrast      | Body text >= 4.5:1, Large text >= 3:1          | Verified per audit table above                              |
| Focus Indicators    | Visible focus ring on all interactive elements | focus:ring-2 focus:ring-blue-500 focus:ring-offset-2        |
| Keyboard Navigation | All interactions via keyboard                  | Tab order logical; Esc closes modals; Enter/Space activates |
| ARIA Labels         | Meaningful labels for icon-only buttons        | aria-label on all icon buttons                              |
| Alt Text            | All meaningful images have alt text            | alt="" for decorative images                                |
| Form Labels         | All inputs have associated labels              | Label htmlFor or aria-label                                 |
| Error Messages      | Errors announced to screen readers             | role="alert", aria-invalid="true"                           |
| Skip Navigation     | Skip-to-main-content link                      | sr-only focus:not-sr-only at page top                       |
| Motion              | Reduced motion respected                       | @media (prefers-reduced-motion: reduce)                     |

### Additional Accessibility Features (Implemented)

- Dyslexia-friendly font option: `.dyslexia-font` class (OpenDyslexic)
- High contrast mode: `.high-contrast` class (black borders, black text)
- Font size overrides: `html.font-large` (18px), `html.font-x-large` (20px)
- Simplified view: `.simplified-view` hides non-essential decorative elements

---

## 19. Dark Mode

### Current Status: Phase 2 (Student dashboard first)

### Implementation

- Strategy: CSS class `.dark` on `<html>` element
- ThemeProvider: `src/providers/ThemeProvider.tsx`
- Toggle: user preference stored in localStorage

### Dark Mode Token Overrides

| Token                  | Light Value | Dark Value          |
| ---------------------- | ----------- | ------------------- |
| --surface-background   | #ffffff     | #020617 (slate-950) |
| --surface-card         | #ffffff     | #0f172a (slate-900) |
| --surface-subtle       | #f8fafc     | #1e293b (slate-800) |
| --surface-border       | #e2e8f0     | #334155 (slate-700) |
| --surface-input-border | #d1d5db     | #475569 (slate-600) |
| --text-primary         | #0f172a     | #f1f5f9 (slate-100) |
| --text-secondary       | #64748b     | #94a3b8 (slate-400) |

Shadows are intensified in dark mode (0.2-0.3 opacity vs 0.05-0.1 in light).
Shimmer animation uses slate-800/slate-700 gradient in dark mode.

---

## 20. Prohibited Patterns

These patterns are HARD RULES — never use them:

| Pattern                                                       | Why Prohibited                            | Permitted Alternative                       |
| ------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------- |
| Pink, Purple, Violet, Rose, Fuchsia backgrounds on cards/tabs | Off-brand; conflicts with brand palette   | Blue (#3b82f6), Teal (#14B8A6)              |
| Transparent/glassmorphism on data cards                       | Readability fails on varied backgrounds   | Solid bg-white or bg-gray-50                |
| Transparent SelectTrigger backgrounds                         | Input appears invisible on light surfaces | bg-white border border-gray-200             |
| Unicode bullet characters in code                             | Inconsistent rendering                    | Semantic ul/li elements                     |
| Full-page skeleton loaders                                    | Perceived performance loss                | Optimistic UI + component-level shimmer     |
| Raw HTML for interactive elements                             | Inconsistent styling, no accessibility    | Shadcn/ui components                        |
| Arbitrary spacing values                                      | Inconsistent layout                       | Tailwind spacing scale                      |
| Direct Supabase calls in components                           | Breaks architecture pattern               | TanStack Query hooks                        |
| any TypeScript type                                           | Type safety violation                     | unknown with type guards, proper interfaces |
| Hardcoded English strings                                     | Breaks i18n                               | Translation keys via i18next                |
| Physical CSS properties (ml, mr, pl, pr)                      | Breaks RTL                                | Logical properties (ms, me, ps, pe)         |

---

## 21. Implementation Checklist

Use this checklist when building any new dashboard view or component:

### Layout & Structure

- [ ] Page uses bg-slate-50 background
- [ ] Cards use bg-white border-0 shadow-md rounded-xl
- [ ] Main section cards use the brand gradient on header
- [ ] KPI metric row uses grid grid-cols-2 md:grid-cols-4 gap-4
- [ ] Sidebar (if present) is bg-white border-r border-slate-200

### Typography

- [ ] Page title is text-2xl font-bold tracking-tight
- [ ] Section headings are text-lg font-bold tracking-tight
- [ ] Metric values are text-2xl font-black
- [ ] Metric labels are text-[10px] font-black tracking-widest uppercase
- [ ] Body text uses text-sm font-medium antialiased

### Colors & Brand

- [ ] No pink, purple, violet, rose, or fuchsia on cards or tabs
- [ ] Active tabs use bg-blue-600 text-white (never gradient)
- [ ] Select triggers use bg-white border border-gray-200
- [ ] No glassmorphism on data cards
- [ ] Brand gradient used on all section card headers

### Interactions

- [ ] Buttons have active:scale-95 press state
- [ ] Hover states defined and don't cause icons to vanish
- [ ] Edit icon hovers text-blue-600 bg-blue-50
- [ ] Delete icon hovers text-red-600 bg-red-50
- [ ] Loading states use shimmer, not spinners alone

### Accessibility

- [ ] All icon-only buttons have aria-label
- [ ] Focus rings present on all interactive elements (focus:ring-2 focus:ring-blue-500)
- [ ] Color contrast verified for text elements
- [ ] Form inputs have associated labels
- [ ] Error messages use role="alert"
- [ ] Skip navigation link present
- [ ] prefers-reduced-motion respected

### Gamification (Student views)

- [ ] XP displayed in amber chip in header
- [ ] Streak displayed with flame icon and animation
- [ ] Level progress bar present on profile/hero card
- [ ] Badge awards trigger animate-badge-pop
- [ ] Mystery badges show as silhouettes (opacity-30 grayscale) until earned
- [ ] Bonus Event banner uses brand gradient with countdown timer

### AI Co-Pilot

- [ ] AI suggestion cards use border-l-4 border-l-blue-400 with sparkles icon
- [ ] At-risk student rows use bg-red-50 border-l-4 border-l-red-400
- [ ] Feedback drafts use bg-amber-50 border border-amber-200
- [ ] All AI-generated content includes "AI Draft" label (text-xs text-gray-400 italic)
- [ ] Thumbs up/down feedback buttons on all AI suggestions

### Self-Regulated Learning

- [ ] CLO Progress bars include Bloom's level pill (color-coded)
- [ ] CLO attainment colors follow design system (green/blue/yellow/red)
- [ ] XP Transaction rows show positive in green, negative in red
- [ ] Habit Tracker uses 7-day grid with green/gray squares
- [ ] Peer milestone notifications via Sonner toast

### RTL / i18n

- [ ] Logical CSS properties used (ms/me/ps/pe, not ml/mr/pl/pr)
- [ ] All user-facing strings in translation files
- [ ] Arabic font loads correctly in RTL mode
- [ ] Layout mirrors correctly in RTL

---

## 22. Open Questions for UI/UX Review

The following areas are flagged for your constructive criticism and improvement suggestions:

### Brand & Visual Identity

1. Is the teal-to-blue gradient distinctive enough as a brand fingerprint, or does it feel generic?
2. Does the hero card dark gradient (slate-900 -> blue-800 -> violet-900) create sufficient visual hierarchy?
3. Are we over-relying on the brand gradient? Should some section cards use alternative header treatments?
4. Is the color palette sufficiently differentiated for users with color vision deficiencies?

### Information Architecture

5. Is the sidebar navigation structure intuitive for each role? Are there too many items?
6. Does the KPI card row (4 cards) surface the right metrics for each role's primary tasks?
7. Is the tab navigation pattern (pill style) discoverable enough, or should we consider a different pattern?
8. Are empty states providing enough guidance to help users take their first action?

### Gamification UX

9. Is the XP/streak/badge system visually overwhelming or does it enhance the learning experience?
10. Are mystery badges (silhouettes) motivating or frustrating for students?
11. Does the leaderboard design adequately handle the anonymous opt-out case?
12. Is the "Perfect Day" nudge notification timing (6 PM) appropriate, or could it feel intrusive?
13. Are celebration animations (confetti, badge-pop, level-up overlay) too much or just right?

### AI Co-Pilot UX

14. Is the "AI Draft" label sufficient for transparency, or do we need more prominent disclosure?
15. Are the thumbs up/down feedback buttons discoverable enough on AI suggestion cards?
16. Does the at-risk student row design create appropriate urgency without causing alarm?
17. Should AI feedback drafts in the grading view be collapsed by default?

### Accessibility & Inclusion

18. Are the current contrast ratios sufficient? Several brand colors (teal-500, green-500) only pass for large text.
19. Is the dyslexia font option discoverable enough in the settings?
20. Should we offer a "simplified view" toggle more prominently for users who find the gamification distracting?
21. Are the animation durations appropriate for users with vestibular disorders (even with reduced motion)?

### Mobile Experience

22. Is the bottom navigation bar for students sufficient, or do we need a hamburger menu for secondary items?
23. How should the grading interface adapt for tablet use by teachers?
24. Are touch targets consistently 44x44px minimum across all interactive elements?
25. Should the habit tracker grid be replaced with a different visualization on small screens?

### Dark Mode

26. Is the current dark mode token set sufficient, or are there contrast issues in dark mode?
27. Should dark mode be available for all roles or just students (current plan)?
28. How should the brand gradient render in dark mode — same values or adjusted?

### Data Visualization

29. Are Recharts the right choice for our chart needs, or should we consider a more accessible charting library?
30. Is the curriculum matrix (PLO x Course grid) usable at scale (20+ PLOs, 30+ courses)?
31. Does the Sankey diagram for outcome flow provide actionable insights or just visual complexity?

### Cultural Considerations

32. Are there any visual elements that may not translate well to the Qatar/Gulf cultural context?
33. Is the emoji usage in badges and notifications appropriate for an academic setting?
34. Should the greeting pattern ("Good morning, Name") adapt to local customs?

---

_This document consolidates all design decisions currently implemented in Edeviser. It is intended as a complete reference for UI/UX review. When in doubt about any pattern: solid white backgrounds, blue-teal gradient headers, no purple tabs._

_Source files: DESIGN-STYLE-GUIDE.md, .kiro/steering/design-system.md, .kiro/steering/component-patterns.md, .kiro/steering/figma-design-system-rules.md, src/index.css_
