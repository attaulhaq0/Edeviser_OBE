# Responsive Testing Strategy

## Breakpoints

| Token | Width | Usage |
|-------|-------|-------|
| `sm` | 640px | Mobile landscape |
| `md` | 768px | Tablet / sidebar appears |
| `lg` | 1024px | Desktop |
| `xl` | 1280px | Wide desktop |

## Layout Behavior per Breakpoint

### Admin / Coordinator / Teacher

| Breakpoint | Sidebar | Content grid | Touch targets |
|------------|---------|-------------|---------------|
| < md | Hidden (hamburger menu) | Single column | 44×44px min |
| md–lg | Visible, `w-64` | 2-column grids | Standard |
| ≥ lg | Visible, `w-64` | 4-column KPI row | Standard |

### Student

| Breakpoint | Sidebar | Content grid | Bottom nav |
|------------|---------|-------------|------------|
| < md | Hidden (`hidden md:block`) | Single column, stacked cards | Visible |
| ≥ md | Visible, `w-64` | 2–4 column grids | Hidden |

### Parent

| Breakpoint | Layout | Cards |
|------------|--------|-------|
| < md | Single column | Full-width stacked |
| ≥ md | Sidebar + content | 2-column grid |

## Manual Testing Checklist

For each role dashboard, verify at viewports: 375×667 (mobile), 768×1024 (tablet), 1280×720 (desktop).

### All Roles
- [ ] Page loads without horizontal scroll
- [ ] Text is readable without zooming
- [ ] Interactive elements have ≥ 44×44px touch targets on mobile
- [ ] Modals/dialogs are usable on mobile (not clipped)
- [ ] Toast notifications are visible and dismissible
- [ ] Forms are usable — labels visible, inputs full-width on mobile

### Admin Dashboard
- [ ] KPI cards: 2-col on mobile, 4-col on desktop
- [ ] Data tables: horizontal scroll on mobile, full on desktop
- [ ] Sidebar: hidden on mobile, visible on md+

### Teacher Dashboard
- [ ] Grading queue: card layout on mobile, table on desktop
- [ ] CLO chart: readable at mobile width
- [ ] Attendance grid: scrollable on mobile

### Student Dashboard
- [ ] Hero card: full-width on all viewports
- [ ] Habit tracker: 7-day grid fits mobile width
- [ ] Learning path: scrollable horizontally on mobile
- [ ] Leaderboard: single-column list on mobile

### Coordinator Dashboard
- [ ] Curriculum matrix: scrollable on mobile
- [ ] PLO heatmap: readable with scroll

## Viewport Configurations for E2E

```typescript
// playwright.config.ts or equivalent
const viewports = {
  mobile: { width: 375, height: 667 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 720 },
};
```
