# Edeviser Design System Rules

## Token Definitions

Design tokens are defined as CSS custom properties in `src/index.css` and extended via Tailwind CSS v4.

### Brand Colors
- Brand Blue: `#3b82f6` (blue-500) — primary CTA, active states, links
- Brand Blue Dark: `#2563eb` (blue-600) — hover states
- Teal: `#14b8a6` (teal-500) — secondary accents, gradient start
- Brand Gradient: `linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)` — card headers, primary buttons

### Semantic Colors
- Success: `#22c55e` (green-500)
- Warning: `#f59e0b` (amber-500)
- Destructive: `#ef4444` (red-500)
- Neutral: `#64748b` (slate-500)

### Surfaces
- Background: white
- Card: white with `shadow-md` or `shadow-lg`
- Subtle: `slate-50`
- Border: `slate-200`

## Typography

- Font: `Noto Sans` (loaded via Google Fonts with `display=swap`)
- Page Title: `text-2xl font-bold tracking-tight`
- Section Heading: `text-lg font-bold tracking-tight`
- KPI Value: `text-2xl font-black`
- Metric Label: `text-[10px] font-black tracking-widest uppercase`
- Body: `text-sm font-medium antialiased`
- Caption: `text-xs text-gray-500`
- Button: `text-sm font-semibold`
- Badge Label: `text-xs font-bold tracking-wide uppercase`

## Component Library

Built on Shadcn/ui (New York style, Radix primitives). Components live in `src/components/ui/`.

### Key Patterns
- `cn()` utility from `src/lib/utils.ts` for merging Tailwind classes
- CVA (class-variance-authority) for component variants
- All interactive elements use Shadcn/ui — never raw HTML
- Lucide React for icons (`h-5 w-5` in nav, `h-4 w-4` in buttons)

### Button Rules
- Primary CTA: gradient `from-teal-500 to-blue-600` with `active:scale-95`
- Max 1 gradient button per section
- Loading state: `<Loader2 className="animate-spin" />`
- Min touch target: 44x44px on mobile

### Card Rules
- All cards: `bg-white border-0 shadow-md rounded-xl`
- Main section cards: gradient header with `linear-gradient(93.65deg, #14B8A6 5.37%, #0382BD 78.89%)`
- Section card structure: `overflow-hidden` on Card, gradient header div with `px-6 py-4`, white icon + white heading text, content body in `<div className="p-6">`
- Hero cards (dashboards): `linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #312e81 100%)` with white text
- KPI cards: `group` hover effects with scale/rotate icon transitions

### Tab Rules
- Pill-style tabs with `gap-2`, `rounded-xl`
- Active: solid `bg-blue-600 text-white` — never gradient
- Inactive: `bg-white text-gray-600 border-gray-200`

## Prohibited Patterns
- No pink, purple, violet, rose, fuchsia backgrounds on cards/tabs
- No transparent/glassmorphism on data cards
- No transparent SelectTrigger backgrounds
- No full-page skeleton loaders — use component-level shimmer
- No arbitrary spacing values — always use Tailwind scale

## Domain Color Coding

### Bloom's Taxonomy
- Remember: `bg-purple-500 text-white`
- Understand: `bg-blue-500 text-white`
- Apply: `bg-green-500 text-white`
- Analyze: `bg-yellow-500 text-gray-900`
- Evaluate: `bg-orange-500 text-white`
- Create: `bg-red-500 text-white`

### Outcome Types
- ILO: `bg-red-100 text-red-700 border-red-200`
- PLO: `bg-blue-100 text-blue-700 border-blue-200`
- CLO: `bg-green-100 text-green-700 border-green-200`

### Attainment Levels
- Excellent (≥85%): `text-green-600 bg-green-50`
- Satisfactory (70-84%): `text-blue-600 bg-blue-50`
- Developing (50-69%): `text-yellow-600 bg-yellow-50`
- Not Yet (<50%): `text-red-600 bg-red-50`

### Gamification
- XP: `amber-500`
- Streak: `red-500` to `orange-500` gradient
- Leaderboard: Gold `yellow-400`, Silver `gray-400`, Bronze `amber-600`

## Animation

- Library: Framer Motion (complex) + CSS keyframes (simple)
- Micro-interactions: ≤200ms
- Celebrations: ≤600ms
- Always honor `prefers-reduced-motion` (all custom animations disabled via media query)
- Custom keyframes defined in `src/index.css`:
  - `shimmer` — gradient sweep loading effect (replaces `animate-pulse`)
  - `xp-pulse` — scale bounce for XP award feedback
  - `badge-pop` — spring scale-in for badge reveals
  - `float` — gentle vertical bob for decorative elements
  - `streak-flame` — subtle flame flicker for streak display
  - `fade-in-up` — content entrance animation
- Utility classes: `animate-shimmer`, `animate-xp-pulse`, `animate-badge-pop`, `animate-float`, `animate-streak-flame`, `animate-fade-in-up`
- Button press: `active:scale-95 transition-transform duration-100`

## Spacing & Layout
- Standard card padding: `p-4`
- Section gap: `gap-6`
- KPI row: `grid grid-cols-2 md:grid-cols-4 gap-4`
- All roles: sidebar layout with `w-64` sidebar (Student sidebar hidden on mobile via `hidden md:block`)
- Student: mobile-first, sidebar appears on `md:` breakpoint

## Icon System
- Library: Lucide React
- Navigation: `h-5 w-5`
- Buttons: `h-4 w-4` with `gap-2`
- Always pair icons with labels or tooltips

## Figma Integration
- Treat Figma MCP output as design reference, not final code
- Replace generic Tailwind with project design tokens
- Reuse existing Shadcn/ui components
- Validate final UI against Figma screenshot for visual parity
