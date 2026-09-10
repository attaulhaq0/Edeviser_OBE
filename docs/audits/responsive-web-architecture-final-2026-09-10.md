# Responsive Web Architecture — Final 2026-09-10

---

## Architecture Overview

Edeviser uses a **CSS-variable-driven app-shell grid** defined in `RoleAppShell.tsx` with a primary breakpoint at **640px**.

```
Desktop (>=640px):
  [Sidebar 264px] [Content 1fr] [Rail (optional, xl)]
  
Mobile (<640px):
  [Content 1fr]
  [MobileTabBar (student, parent)]
```

---

## Breakpoint System

| Breakpoint | Width | Layout |
|---|---|---|
| Mobile | <640px | Single column + bottom tab bar |
| Tablet | 640px–1023px | Sidebar + content (2-col) |
| Desktop | 1024px–1279px | Sidebar + content (2-col) |
| Wide | >=1280px | Sidebar + content + rail (3-col) |

---

## Navigation Strategy

| Role | Desktop | Mobile |
|---|---|---|
| Admin | Sidebar (28 items) | **NONE** (gap — DEF-001) |
| Coordinator | Sidebar (19 items) | **NONE** (gap — DEF-001) |
| Teacher | Sidebar (16 items) | **NONE** (gap — DEF-001) |
| Student | Sidebar (27 items) | MobileTabBar (5 tabs + FAB) |
| Parent | Sidebar (7 items) | MobileTabBar (4 tabs) |

---

## Page Shell Strategy

Single `RoleAppShell` shared by all roles:
- CSS custom properties for sidebar width, gutter, content max-width
- Mobile gutter via `--app-gutter-mobile`
- Content bottom padding accounts for MobileTabBar height
- Right rail optional per-route via prop

---

## Table Strategy

| Approach | Used? |
|---|---|
| `overflow-x-auto` | Not detected in current codebase |
| Card list on mobile | Not implemented |
| Stacked cards | Not implemented |

**Finding:** No explicit responsive table strategy found. Tables inherit Shadcn/Tailwind defaults.

---

## Form / Dialog Strategy

- Shadcn `Dialog` / `Sheet` components — adapt via built-in responsive behavior
- Forms use `React Hook Form` + `Zod` — no device-specific form logic

---

## Safe Area Handling

Only on mobile surfaces:
- `RoleAppShell` — content padding accounts for tab bar + safe area
- `MobileTabBar` — bottom padding with safe area inset
- `index.css` — `.new-mobile-tabbar` spacer rule

---

## Known Exceptions

1. **Non-student mobile nav gap:** Admin, Coordinator, Teacher lack mobile navigation (DEF-001)
2. **No tablet intermediate nav:** Tablet uses desktop sidebar at all widths >= 640px
3. **No responsive table transformation:** Tables use default overflow behavior

---

## Recommended Improvements

1. Add MobileTabBar for admin, coordinator, teacher roles
2. Consider card-list or stacked-card pattern for mobile tables
3. Add tablet-specific navigation considerations (condensed sidebar?)