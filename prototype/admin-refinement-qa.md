# Admin Refinement QA

## Scope and source protection

- Recorded the pre-existing dirty worktree before implementation.
- Task-authored changes are confined to `prototype/`.
- No Supabase, backend, production application, package, migration, environment, deployment, or external API work was performed.
- Centralized values are deterministic and frontend-only; the academic clock is fixed to August 2026.

## Automated and static checks

- `node --check prototype/admin-refinement.js`: passed.
- `node --check prototype/demo-data.js`: passed.
- `node --check prototype/shared.js`: passed.
- `git diff --check -- prototype`: passed (line-ending notices only from pre-existing files).
- Admin MORE navigation: 11 unique destinations, no duplicates, and no missing local route after query-string normalization.
- New UI copy does not use unsupported “prediction accuracy,” black-box failure probability, generic chatbot, or accreditation-guarantee language.
- The protected-action UI exposes pending/reviewed/approved/rejected states and never presents draft-to-executed as a direct transition.

## Screenshot matrix

Temporary QA artifacts were captured outside the repository at:

`C:\Users\hp\AppData\Local\Temp\edeviser-admin-qa`

Captured and dimension-verified:

- 13 Admin routes × 1440 × 900: 13 screenshots.
- 13 Admin routes × 1680 × 900: 13 screenshots.
- 13 Admin routes × 1920 × 900: 13 screenshots.
- 8 key routes × 390 × 900: 8 screenshots.
- 8 key routes × 768 × 900: 8 screenshots.
- Total: 55 screenshots with no unexpected image dimensions.

Desktop routes: Home, Analytics, AI Governance, People, Institution Structure, Profile, Institution Outcomes, Evidence & Readiness, Bulk Import, Marketplace, Badge Definitions, Security, and Fees Management.

Mobile/tablet routes: Home, Analytics, AI Governance, People, Institution Structure, Profile, Institution Outcomes, and Evidence & Readiness.

## Visual review

- Home: quality priority leads; KPI row owns quality/evidence/CQI/approval signals; main rows are balanced; the rail contains inbox, data quality, milestone, and system status only.
- Analytics: ILO health and program contribution lead; the compact dual-line chart communicates attainment versus evidence coverage; department comparison, evidence, CQI impact and retention review follow in the requested order.
- AI Governance: A2 is visually current, A3 is disabled/capped, provider/cost/latency/safety metrics are visible, and protected approvals sit above the authorization matrix.
- Outcomes: institution outcome portfolio, hierarchy health, mapping quality and approval-gated ILO proposals are visible without database implementation language.
- Readiness: readiness is explicitly not an accreditation score; blockers, evidence-family states and evidence-pack preview are visible.
- People / Structure: People owns access; Structure owns departments/programs/terms/setup. Structure highlights only its MORE route, not People or Home.
- Operational routes: Import, Marketplace, Badges, Security, Fees and Profile use complete task-specific workflows with compact content and contextual rails.
- Large screens: center content is capped within the existing sidebar/right-rail shell; cards do not stretch indefinitely.
- Mobile: contextual rail is removed, desktop tables become labelled card rows, quality sections stack in decision order, and bottom navigation remains readable.

## Repetition checks

- `1,240` and `92%` remain global top-bar context rather than Home KPI cards or rail repeats.
- Business Foundations’ contribution is not repeated in the Home hero, secondary insight card and rail; the duplicate Executive Insight card was removed from the rendered experience.
- A2 appears where it has distinct governance meaning; the Home rail does not repeat it.
- Analytics department percentages remain in the comparison canvas, not its rail.
- Readiness detail is owned by Evidence & Readiness rather than duplicated as a full page on Home.

## Navigation and route checks

- Top navigation remains Home, Analytics, AI Gov, People and Me.
- MORE contains Institution Outcomes, Evidence & Readiness, Marketplace, Institution Structure, Bulk Import, Badge Definitions, Security, Fees Management, Announcements, Notifications and Settings.
- Top/MORE duplicates were removed.
- Announcements and Notifications carry `role=admin` when launched from the Admin sidebar, preserving Admin chrome without incorrectly invoking the Admin refinement renderer.
- Home, Analytics, AI Governance, People and Me have correct primary active states.
- Institution Structure and all other operational/institutional MORE pages activate only their own sidebar destination.

## Interaction, accessibility and RTL review

- Outcome, contribution, department, hierarchy, readiness, policy, action-cap, access, setup and badge details use labelled modal drawers.
- Escape closes overlays; backdrop and explicit close controls are implemented.
- Destructive/protected actions use confirmation dialogs.
- Import exposes Upload → Map fields → Validate → Review & import, with final import blocked while errors remain.
- Tables are semantic, controls have labels, focus-visible styling is global, status includes text/icons rather than color alone, and reduced-motion preferences are respected.
- Profile language control switches document `lang` and `dir`; layout uses logical inline positioning for drawers and major responsive surfaces. Arabic translations cover the primary Admin navigation and institutional labels while proper names and deterministic evidence values remain unchanged.

## Known limitations

- This is a deterministic prototype: buttons update visible local state or show confirmation/toast feedback and do not persist after reload.
- Existing legacy Admin HTML shells still reference the project’s established Tailwind/font CDNs, but the refinement renderer, data, responsive layout and core Admin styling are local and continue with system font fallback if those assets are unavailable.
- Announcements and Notifications remain shared product pages; the Admin role supplies their institution chrome and navigation context rather than duplicating them as Admin-only files.
