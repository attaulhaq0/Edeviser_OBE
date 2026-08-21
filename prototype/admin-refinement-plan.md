# Admin / Institution Experience Refinement Plan

## Scope and safeguards

- Work only in `prototype/`; production code, Supabase, packages, deployment, and environment files remain untouched.
- Preserve the existing Admin shell, sidebar and icon language, top bar, right rail proportions, card system, palette, typography, and responsive conventions.
- Preserve all unrelated dirty work recorded before implementation, including existing edits to `prototype/admin-dashboard.html`, `prototype/shared.css`, and `prototype/shared.js`.

## Audited routes

- Institutional intelligence: `admin-dashboard.html`, `admin-analytics.html`, `admin-governance.html`.
- Operational administration: `admin-users.html`, `admin-structure.html`, `admin-import.html`, `admin-marketplace.html`, `admin-badges.html`, `admin-security.html`, `admin-fees.html`, `admin-profile.html`.
- Shared operational routes: `announcements.html`, `notifications.html`, and `settings.html`.
- Shared prototype foundations: `shared.css`, `shared.js`, `demo-data.js`, and `demo-data-dictionary.md`.
- Missing institution-level capabilities: dedicated Outcomes and Evidence & Readiness routes.

## Implementation sequence

1. Centralize deterministic Gulf Academy Admin facts, academic-term state, evidence/CQI data, approvals, governance metrics, and operational summaries in `demo-data.js`.
2. Add an Admin-only refinement stylesheet and behavior layer that preserve the existing shell while providing compact grids, responsive tables, drawers, dialogs, tabs, filters, RTL-safe layout, and reduced-motion handling.
3. Rebuild Home around institution quality, ILO health, contribution, evidence, CQI, approvals, and a non-duplicative contextual rail.
4. Rebuild Analytics around ILO-first trends, program/department contribution, evidence confidence, measured CQI impact, and secondary engagement/retention signals.
5. Create `admin-outcomes.html` and `admin-readiness.html` because no existing Admin page owns institution outcome governance or institution-wide evidence readiness.
6. Expand AI Governance to show the A2 effective ceiling, A3 capping, provider/usage/cost/latency, safety, protected approvals, governed activity, and confirmation-gated controls.
7. Refine People and Institution Structure with correct active navigation, complete desktop-width workflows, deterministic Summer 2026 term status, filtering, accordions, and setup health.
8. Polish Import, Marketplace, Badges, Security, Fees, Profile, Announcements, and Notifications so each has a complete operational workflow and no learning-quality metric leakage.
9. Normalize every Admin sidebar route and remove duplicate top/MORE destinations; verify all CTAs and active states.
10. Document metric ownership, page-aware Admin capabilities, centralized data, and QA evidence.
11. Run static link/data checks and browser QA at 1440, 1680, 1920, 390, and 768 widths; inspect key screenshots for empty space, repetition, navigation, dialogs/drawers, mobile order, RTL, and accessibility.

## Acceptance focus

- Home answers the institution-quality question without leading with learner counts.
- Analytics explains what changed, where, why, and with what evidence.
- Outcomes governs ILO definitions, hierarchy, mappings, and approval-gated official changes.
- Readiness distinguishes evidence completeness from accreditation guarantees.
- AI Governance makes the effective A2 limit, protected approvals, cost, safety, and tool authorization explicit.
- Operational pages remain purpose-specific, compact, navigable, and complete.
