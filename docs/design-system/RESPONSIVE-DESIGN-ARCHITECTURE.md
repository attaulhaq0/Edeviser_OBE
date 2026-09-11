# Responsive Design Architecture

---

## Breakpoint System

| Name | Width | Layout |
|---|---|---|
| **Mobile** | <640px | Single column + bottom tab bar (student/parent) |
| **Tablet/Desktop** | >=640px | Sidebar (264px) + Content (1fr) + Rail (optional, xl) |

**Primary breakpoint:** 640px (`min-[640px]` in Tailwind)

---

## Desktop Web (>=640px)

- Sidebar visible (w-64, 264px)
- Content area: flexible 1fr
- Optional right rail (xl breakpoint)
- Full navigation via sidebar
- Multi-column card grids
- Dense data tables

## Tablet Web (640px-1023px)

- Same as desktop — sidebar + content
- No dedicated tablet layout
- Right rail hidden (only on xl)
- Tables may need horizontal scroll

## Mobile Web (<640px)

- Sidebar hidden
- Bottom tab bar visible (student: 5 tabs, parent: 4 tabs)
- **Admin/Coordinator/Teacher: no mobile navigation** (known gap)
- Single-column content
- Mobile gutter via `--app-gutter-mobile`
- Content padding accounts for tab bar + safe area

---

## Navigation by Role + Device

| Role | Desktop | Mobile |
|---|---|---|
| Admin | Sidebar (28 items) | None |
| Coordinator | Sidebar (19 items) | None |
| Teacher | Sidebar (16 items) | None |
| Student | Sidebar (27 items) | MobileTabBar (5 tabs + FAB) |
| Parent | Sidebar (7 items) | MobileTabBar (4 tabs) |

---

## Component Responsive Behavior

| Component | Mobile | Desktop |
|---|---|---|
| KPI cards | 2-col grid | 4-col grid |
| Tables | Default overflow | Full width |
| Hero | Carousel (same) | Carousel (same) |
| Dialogs | Shadcn responsive | Shadcn responsive |
| Forms | Full-width inputs | Constrained width |

---

## Role + Responsive Matrix

| Role × Device | Navigation | Shell | Dashboard | Tables |
|---|---|---|---|---|
| Admin Desktop | Sidebar | 3-col | KPI + sections | Full |
| Admin Mobile | None | 1-col | Scaled | Scroll |
| Coordinator Desktop | Sidebar | 3-col | KPI + sections | Full |
| Coordinator Mobile | None | 1-col | Scaled | Scroll |
| Teacher Desktop | Sidebar | 3-col | KPI + sections | Full |
| Teacher Mobile | None | 1-col | Scaled | Scroll |
| Student Desktop | Sidebar | 3-col | Hero + KPI + sections | Full |
| Student Mobile | Tab bar | 1-col | Hero + stacked | Scroll |
| Parent Desktop | Sidebar | 3-col | Story + sections | Full |
| Parent Mobile | Tab bar | 1-col | Story + stacked | Scroll |

---

## Recommendations

1. Add MobileTabBar items for Admin, Coordinator, Teacher roles
2. Consider tablet-specific layout at 768px (condensed sidebar)
3. Add responsive table strategy (card-list fallback on mobile)