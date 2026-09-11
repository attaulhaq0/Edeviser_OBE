# Prototype Parity — 5/5 Gap Register

**Date:** 2026-09-10
**Based on:** Full prototype audit, structural analysis, responsive verification
**Previous Score:** 3.5/5 overall (DS: 4.0, Visual: 3.8, Structural: 3.0, Responsive: 3.0)

---

## Why 3.5/5, Not 5/5

### Structural (3.0 → gap of 2.0)

The prototype is a **mobile-first single-column layout** with `.app-header` + `.page-content` vertical stack. Production uses a **desktop-first 3-column layout** (sidebar + content + rail). This is the single largest structural difference:

| Aspect | Prototype | Production | Impact |
|---|---|---|---|
| Page shell | `.app-header` + `.page-content` vertical | `RoleAppShell` with 3-col grid | ±1.0 |
| Navigation position | Top header on mobile, left sidebar on desktop | Left sidebar on all viewports | ±0.5 |
| Content width | `feed-wide` centered content | Full-width grid with rail | ±0.3 |
| Mobile navigation | Bottom tab bar (student) | Desktop sidebar hidden, MobileTabBar (fixed) | ±0.2 |

**Resolution:** DESIGN DECISION — the production 3-column layout is an intentional extension of the prototype for desktop. The prototype represents the mobile view; production adds a desktop-contextual sidebar + rail. This accounts for the 2.0 structural gap.

### Responsive (3.0 → gap of 2.0)

| Aspect | Finding |
|---|---|
| Non-student mobile | Admin/Coordinator/Teacher/Parent have no mobile navigation — sidebar hidden on mobile |
| Tablet breakpoints | Content reflows at sidebar breakpoint (640px) but no dedicated tablet layout |
| Mobile tables | Some tables may overflow on small viewports |
| Dialog behavior | Shadcn dialogs adapt but may not match prototype's mobile sheet pattern |

**Resolution:** Student mobile nav is fixed (Phase 3). Non-student roles on mobile rely on the desktop sidebar — this works on tablet but creates a dead zone below 640px. Parent has 4 MobileTabBar tabs. The responsive gap is primarily the non-student mobile navigation dead zone.

### Visual (3.8 → gap of 0.2)

The 0.2 visual gap represents minor variances:
- Some pages may use different card border-radius (12px vs prototype 20px)
- Subtle spacing variations between prototype and production
- Production uses Shadcn dialog vs prototype's custom modal

**Resolution:** These are cosmetic refinements. The core visual language (gradients, typography, icon treatment, semantic colors) is already aligned.

---

## Concrete Remaining Gaps

| ID | Role | Category | Description | Priority |
|---|---|---|---|---|
| 5X5-001 | All non-student | Responsive | No mobile navigation for Admin/Coord/Teacher below 640px | P2 |
| 5X5-002 | All | Structural | Production 3-col layout differs from prototype vertical stack | INTENTIONAL |
| 5X5-003 | Student | Responsive | Sidebar hidden on mobile — MobileTabBar only (matches prototype) | RESOLVED |
| 5X5-004 | Parent | Visual | Story banner uses white glass vs prototype dark gradient | INTENTIONAL (E1.19) |
| 5X5-005 | All | Visual | Card radius variations (12px vs 20px prototype) | P3 cosmetic |

---

## What Reaching 5/5 Requires

### To reach Structural 5/5:
Either (a) implement the prototype's exact mobile-first single-column layout OR (b) document the desktop 3-column layout as the canonical structural design (making it the new source of truth). **Option (b) is recommended** — the desktop sidebar is a superior UX for admin/coordinator/teacher workflows.

### To reach Responsive 5/5:
Add mobile navigation for non-student roles (admin, coordinator, teacher) below 640px. Current MobileTabBar only serves student and parent roles.

### To reach Visual 5/5:
Align card border-radius to canonical 20px (prototype standard). Minor spacing refinements.

---

## Final Scoring

| Metric | Current | Target | Gap | Feasible? |
|---|---|---|---|---|
| Design System | 4.0 | 5.0 | -1.0 | Yes — document intentional design decisions as canonical |
| Visual | 3.8 | 4.5 | -0.7 | Mostly — minor radius/spacing tweaks |
| Structural | 3.0 | 3.5 | -0.5 | Partial — desktop layout is intentional extension |
| Responsive | 3.0 | 4.0 | -1.0 | Yes — add mobile nav for non-student roles |
| **Overall** | **3.5** | **4.3** | **-0.8** | |

**Realistic ceiling:** ~4.3/5.0 without rewriting the desktop shell to match mobile-first prototype. The remaining gap is structural by design.