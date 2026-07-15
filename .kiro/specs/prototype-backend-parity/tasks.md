# Tasks — Prototype ↔ Backend Parity & Presentation Refinements

Scope reminder: **`prototype/` only.** No `src/`, `supabase/`, or build-config edits. Static server serves `prototype/` on `:8080`; prototype dir is untracked on `main` — no commits.

- [x] 1. Parity audit captured (see `design.md` §2–§3). _R2, R3_
- [x] 2. Research-backed design decisions recorded (see `design.md` §4). _R5–R11_

- [ ] 3. Upgrade-to-Premium card → brand colors, student-only
  - Recolor `.side-upgrade` in `shared.css` to brand blue/teal/`--brand-gradient` (remove purple).
  - Confirm `buildSidebarExtra()` in `shared.js` emits it for `student` only; render exactly once.
  - _R4.1, R4.2, R4.3_

- [ ] 4. Sidebar → solid white card, separated
  - `.bottom-bar`: opaque white surface + right border + soft shadow; content canvas stays tinted (slate-50).
  - Keep student treatment gamified, staff restrained.
  - _R5.1, R5.2, R5.3_

- [ ] 5. Top nav + right rail → clean separation
  - `.app-header`: delineate from content (surface + hairline border/shadow).
  - `.right-rail`: independent cards with consistent column gap (not fused).
  - _R6.1, R6.2, R6.3_

- [ ] 6. Icons → subtle depth without colored chips
  - `.sec-h .chip` (+ nav icons): soft inner gradient + soft drop shadow on light neutral surface; no saturated chip.
  - Student glassy/playful; staff monochrome-restrained; legible at nav size.
  - _R7.1, R7.2, R7.3_

- [ ] 7. Accessible on/off toggles
  - Add reusable `.edv-toggle` to `shared.css`: ON = brand gradient + knob right + check; OFF = neutral gray + knob left; never color-only; immediate effect.
  - Use in institution/admin settings (Bilingual, Attainment thresholds, Parent growth reports) + notification prefs on each profile.
  - _R8.1, R8.2, R8.3, R8.4_

- [ ] 8. Admin AI Governance card → default section card
  - Remove dark/gradient top in `admin-governance.html` and the governance link card in `admin-dashboard.html`; use `.pcard`/`.sec-h`.
  - _R9.1, R9.3_

- [ ] 9. Coordinator "Curriculum gap detected" card → default section card
  - Remove `--brand-gradient` top in `coordinator-dashboard.html`; use `.pcard`/`.sec-h`.
  - _R9.2, R9.3_

- [ ] 10. Admin analytics "Weekly active learners" → filled sample chart
  - Render sample mini bar chart in `admin-analytics.html` with subtle "sample data" caption.
  - Add reusable `.chart-empty` state (icon + headline + copy + CTA) to `shared.css`.
  - _R10.1, R10.2, R10.3_

- [ ] 11. Admin "Me"/profile page
  - New `admin-profile.html`: identity header + account/security + platform preferences (language/theme) + notification toggles + role & permissions + recent admin activity/audit. Mirror `coordinator-profile.html`; link from profile chip/nav.
  - _R11.1, R11.3, R11.4_

- [ ] 12. Teacher "Me"/profile page
  - New `teacher-profile.html`: identity header + teaching info (courses/sections) + preferences + notification toggles + security. Mirror `coordinator-profile.html`; link from profile chip/nav.
  - _R11.2, R11.3, R11.4_

- [ ] 13. Build backend-supported gap sections (prototype)
  - Admin: **AI Co-Pilot Performance** (G1 → `useAIPerformance.ts`) + **PLO Attainment Heatmap** (G2 → `useAdminPLOHeatmap.ts`).
  - Teacher: **At-Risk students** list (G3 → `useAtRiskPredictions.ts`) + **Teaching Impact** (G4 → `useTeachingImpact.ts`).
  - Coordinator **Recovery Pathways**: render but label prototype-only (P1, no backend).
  - Use `.pcard`/`.sec-h`; staff-professional treatment.
  - _R12.1, R12.2, R12.3, R12.4_

- [ ] 14. Verify via Playwright (laptop + mobile)
  - `node _verify_proto.cjs`; capture 1440×900 + 402×860 for every changed page; review `prototype/_shots/`; fix + re-verify regressions.
  - _R13.1, R13.2, R13.3_

---

## Round 2 — presentation refinements (from review walkthrough)

- [x] 15. Learning Path laptop layout — balanced toggle+context row; "Recent activity" card fills left column; de-duplicated tree picker (`path.html`). _R14_
- [x] 16. Mobile card consistency — standardized `progress.html` colored header bars → `.sec-h`; `@media(max-width:639px)` refinements in `shared.css`. _R15_
- [x] 17. Student gradient progress bars — `learn.html`, `course.html` → `var(--brand-gradient)`. _R16_
- [x] 18. Semantic meter — `.emeter` (+`.pro`) in `shared.css`; professional review showcase in `_institution-variations.html`. _R17_
- [x] 19. Extra student course — 5th card in `dashboard.html` My Courses. _R18_
- [x] 20. Recently-graded redesign — `learn.html` section-card list. _R19_
- [x] 21. Backend-gap sections built — Admin (AI Co-Pilot perf, PLO heatmap), Teacher (at-risk, teaching impact), Coordinator (recovery pathways / Concept). _R12_
- [ ] 22. Verify all changed pages via Playwright (laptop + mobile). _R13_

### Follow-up notes (not blocking)
- Student mastery **rings** (SVG stroke) still flat blue; converting to gradient needs an SVG `<linearGradient>` def — optional future polish.
- Coordinator "Recovery pathways" is prototype-only (gap P1); needs a backend hook before it can be wired.
