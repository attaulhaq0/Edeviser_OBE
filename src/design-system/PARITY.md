# PARITY.md — Prototype → React fidelity contract (Path A)

This file **pins fidelity before screens are built**. It is the single reference the
rebuild targets so "make it look exactly like the prototype" is a fixed, reviewable
spec instead of a moving one. It has three locked parts:

- **§A — Class → Component parity map:** every structural prototype CSS class →
  the one React primitive/pattern that reproduces it.
- **§B — Emoji → Lucide icon map:** every prototype emoji → its `lucide-react`
  replacement (emoji are OS-variant and never pixel-stable), with the categories
  that must **not** be converted (content/gamification art).
- **§C — Per-screen diff tolerances:** a tier per `visual/screen-map.ts` id, the
  number that lands in that screen's `maxDiffRatio` when its parity check activates.

Plus **§D** (demo-only artifacts we never port) and **§E** (fidelity caveats).

> Source of truth = the prototype (`prototype/*.html`, `shared.css` ≈64 KB / 312
> classes, `shared.js`). Those files never ship (guardrail G.2); only their
> **values and structure** are reproduced. Ground truth here was extracted directly
> from those files, not assumed.

> **Scope:** the prototype defines **light mode + LTR only**. Everything below is the
> light/LTR contract. Dark mode and Arabic/RTL are **net-new** deliverables gated
> separately (§E) — they cannot be diffed against a prototype that lacks them.

---

## How this plugs into the harness

1. Build the screen in the new design system using **§A** (primitives) + **§B**
   (icons), reproducing the token values from `tokens.css`.
2. In `visual/screen-map.ts` set the screen's `appPath`, flip `rebuilt: true`, and
   set `maxDiffRatio` to its **§C** tier value (Tier B = the 0.12 default, no
   override needed).
3. `npm run test:visual:capture` (if the reference is stale) → `npm run test:visual`.
   Iterate until the diff is within tolerance at all four viewports.

Primitive locations: Shadcn wrappers in `src/components/ui/*`; shared
patterns/chrome in `src/components/shared/*`. Both are **reused** as the design
system's L2 layer (rebuild `tasks.md` 0.3/0.4) — this map names the exact target.

---

## §A — Class → Component parity map

The prototype's structural classes and the React primitive that reproduces each.
"Match" = same padding / radius / shadow / color / typography / motion, driven by
`tokens.css`.

> **Built (P0.4) — screens build from `@/design-system`.** The prototype design
> system now ships these patterns as prototype-faithful components (import from
> `@/design-system` or `@/design-system/patterns`): `PageHeader`, `PCard`,
> `SectionCard`, `SectionHeader`, `KPICard`, `HeroCard`, `StatusDot`, `StatePanel`,
> `EMeter`, plus `MascotCharacter`/`MascotCompanion`. **Primitives** are the Shadcn
> `ui/*` re-exported via `@/design-system` (`Button` incl. `tactile`, `Card`,
> `Badge`, `Input`, `Select`, `Dialog`, `Tabs`, `Switch`, …). New screens import
> from `@/design-system` — NOT `@/components/shared/*` (legacy). Reference
> migration already on the design system: the student + parent **Fees** vertical.
>
> **Self-contained + reskinned (prototype-fidelity pass).** `MasteryRing`,
> `WelcomeHero`, `SeverityIcon`, and `GradientCardHeader` are now **internalized**
> into `src/design-system/patterns/` (the design system no longer depends on
> `@/components/shared/*`; those legacy files were deleted). `PCard`/`SectionHeader`/
> `KPICard`/`StatusDot` were reskinned to their **exact** `shared.css` values
> (`.pcard` 20px + `#eef2f6` + two-layer shadow + hover-lift; `.sec-h .chip`
> 26px/9px + teal halo + 13px/800 title; `.kpi-ic` 38px/11px; `.dot` 8px). Per the
> strict `prototype-fidelity.md` rule, the raw `shared.css` values win over any
> earlier deployed-flavored simplification.
> The rows below remain the prototype-class → component reference.

### A.1 Surfaces & layout

| Prototype class | Role | React target | Notes |
| --- | --- | --- | --- |
| `.pcard` | standard card | `ui/card` `Card` | base surface: white, `border-0`, `shadow-md`, `rounded-xl` |
| `.pcard` + gradient top | section card w/ header | `shared/GradientCardHeader` inside `Card` | header uses **93.65deg** brand gradient; body `p-6` |
| `.sec-h` + `.chip` | section header + icon chip | `shared/SectionHeader` | `.chip` icon → Lucide (see §B); title `text-lg font-bold tracking-tight` |
| `.kpi`, `.kpi-ic`, `.stat-tile`, `.stat-chip` | KPI/metric tile | `shared/KPICard` | label `text-[10px] font-black tracking-widest uppercase`; value `text-2xl font-black` |
| `.page-content` | main scroll region | role layout `<main>` in `src/app/` | `bg-slate-50` canvas so white chrome stands apart |
| `.card-select`, `.opt` | selectable option card | `Card` + `data-state` selected ring | |

### A.2 Chrome (the frame)

| Prototype class | Role | React target | Notes |
| --- | --- | --- | --- |
| `.app-header` | top header | `shared/GlobalHeader` | delineated by surface + hairline border/shadow |
| `.bottom-bar` | sidebar (misnamed) | `shared/Sidebar` | solid white, right border + soft shadow; `w-64` |
| `.side-link`, `.side-profile`, `.side-lvlbar`, `.side-ava`, `.side-name`, `.side-sep`, `.side-label` | sidebar internals | `shared/Sidebar` subparts | student shows level bar; staff restrained |
| `.side-upgrade`, `.sidebar-extra`, `.su-btn` | upgrade card | `shared/Sidebar` (student-only slot) | brand blue/teal, **student role only** |
| `.right-rail`, `.rail-row`, `.rail-btn`, `.rail-card`, `.rail-h`, `.rail-check` | right insight rail | `shared/CoordinatorInsightRail` (pattern) + `features/{role}` composition | independent cards, consistent column gap |
| `.top-search` | ⌘K search entry | `shared/SearchCommand` | |
| `.cmdk`, `.cmdk-item`, `.cmdk-list`, `.cmdk-sec`, `.cmdk-back`, `.kbd` | command palette | `shared/SearchCommand` | custom (no `ui/command`); `.kbd` = keycap styling |
| `.hdr-profile`, `.hdr-brand`, `.hdr-right` | header profile/brand | `shared/ProfileDropdown` + header slots | |
| `.tutor-fab` | floating tutor button | `shared/TutorEntryButton` | |
| `.notif-*` (`item/panel/bell/badge/dot/backdrop`) | notifications | `shared/NotificationBell` + `shared/NotificationCenter` | |
| `.mode-laptop`, `.mode-mobile`, `.demo-*`, `.dock-*` | device/demo toggle | **NOT PORTED** | demo aid (§D) — real breakpoints replace it |

### A.3 Buttons & interactive

| Prototype class | Role | React target | Notes |
| --- | --- | --- | --- |
| `.btn3d` (the primary tactile button, 40× uses) | button | `shared/PrimaryCTA` / tactile `Button` variant (`ui/button`) | `active:scale-95`; one gradient CTA per section |
| `.b-soft`, `.b-ghost`, `.b-danger`, `.b-teal`, `.b-amber`, `.b-blue` | button variants | `Button` variants (`variant`/`className`) | `.b-danger` = destructive |
| `.sm`, `.full` | size/width mods | `Button` `size` + `w-full` | |
| `.cta-brand/-indigo/-sky/-violet/-emerald/-sunset/-aurora` | CTA color skins | `Button` gradient variants | keep brand as default; others are accent options |
| `.tap-bounce`, `.pcard-tap`, `.hover-lift` | press/hover motion | `active:scale-95` + `tokens` motion | honor `prefers-reduced-motion` |
| `.edv-toggle` + `.etk` + `.on` | on/off switch | `ui/switch` `Switch` | see §B.5 (state, not emoji); ON=brand, OFF=neutral, never color-only |
| `.tab-btn`, `.tab-ic`, `.tri-tab`, `.tri-tabs`, `.tier-seg` | pill tabs | `ui/tabs` `Tabs` (pill style) | active = solid `bg-blue-600 text-white`, never gradient |

> **CTA gradient (decision):** the canonical primary-button fill is
> `var(--brand-gradient)` (93.65deg). **New rebuild components (`features/*`)
> use it directly.** The legacy `from-teal-500 to-blue-600` utility (~180 `src/`
> usages, and the current steering design-system rule) is intentionally left
> as-is — consolidating the CTA gradient is a **token-canonicalization (P0.2 /
> cutover)** concern, not a per-component edit: changing one component would
> desync it from ~180 others, and mass-replacing would churn legacy code that P5
> deletes.

### A.4 Data, meters & status

| Prototype class | Role | React target | Notes |
| --- | --- | --- | --- |
| `.emeter` (+`.strong/.good/.attention/.critical`) | semantic meter | `design-system/patterns/EMeter` | **built (P0.4)** — default fill = 93.65deg brand gradient; `strong/good/attention/critical` = status-by-color; `role="meter"`. Distinct from `shared/AttainmentBar` (the attainment-LEVEL *labeled* bar: Excellent/Satisfactory/Developing/Not-Yet). |
| `.emeter.pro` | professional (institution) meter | `EMeter` `pro` | flat, muted, inset; no gradient |
| `.progress-track`, `.progress-fill`, `.bar-fill`, `.lz-prog` | progress bar | `AttainmentBar` / `ui` progress | **student** fills use 93.65deg gradient; staff flat |
| `.ring-mini` | mini mastery ring | `shared/MasteryRing` (sm) | SVG ring |
| `.mini-bar`, `.spark` | mini chart/sparkline | Recharts mini or `features` viz | |
| `.pill`, `.pill-red/-amber/-green/-blue/-slate` | status pill | `ui/badge` `Badge` variants | |
| `.dot`, `.notif-dot` | status dot | `.dot` span (semantic color) | 🟢🔴🟡🔵⚪ → colored dot, not an icon (§B.4) |
| `.trend`, `.trend-up/-down/-flat` | trend indicator | Lucide `ArrowUpRight`/`ArrowDownRight`/`ArrowRight` + color | ↗↘➡ (§B.4) |
| `.sev-`, `.sev-high/-med/-low/-brand/-info/-violet` | severity | `shared/SeverityIcon` | |
| `.i-blue/-green/-amber/-red/-violet/-teal` | icon color token | `text-*` token classes | |
| `.dtable` | data table | `shared/DataTable` | sort/filter/paginate |
| `.wk-tile`, `.wk-grid`, `.wk-col`, `.wk-legend`, `.wk-today`, `.wk-empty` | week/habit grid | `shared/HabitGrid` / `shared/WeeklyCalendarGrid` | |
| `.hm-blue/-teal/-violet/-sunset` | heatmap cells | `shared/HeatmapGrid` | |

### A.5 Overlays, chat, forms, profile, celebration

| Prototype class | Role | React target | Notes |
| --- | --- | --- | --- |
| `.edv-modal` (+`-back/-head/-body/-foot/-x`) | modal | `ui/dialog` `Dialog` | |
| `.edv-toast` | toast | Sonner `toast()` (`ui/sonner`) | |
| confirm/delete modal | destructive confirm | `shared/ConfirmDialog` | |
| `.bubble-ai`, `.bubble-user`, `.msg`, `.typing-dot` | tutor chat bubbles | `shared/ChatMessage` | tutor conversation |
| `.chr`, `.chr-*` (`float/in/wave/pop/nudge/xs..xl`) | mascot/character | `design-system/mascot/MascotCharacter` | **built (P0.5)** — Foxi/Owlie/Pengu; emotion→pose catalog; 46–200px; 5 motion presets; reduced-motion safe. Assets ported to `design-system/mascot/assets/`. |
| `.chr-bubble` (+`.tail-l/-b`, `.b-teal/-amber/-blue`, `.chr-onhero`) | mascot speech bubble | `design-system/mascot/MascotCompanion` | **built (P0.5)** — character + speech; RTL logical tail |
| `.chr-row` | companion row | `MascotCompanion` | character + bubble layout |
| `.ef-field`, `.ef-row2`, `.ef-avatar-pick`, `.ava-cam`, `.ava-edit` | form field/avatar | `ui/form` + `ui/input` + `shared/AvatarUpload` | |
| `.phdr`, `.phdr-me`, `.phdr-stat(-ic/-v/-l/-tx)`, `.phdr-av`, `.phdr-name`, `.phdr-role`, `.phdr-contact`, `.phdr-c-ic`, `.phdr-btn` | profile header | `shared/ProfileSummaryCard` + `shared/ProfileCompletenessBar` | admin/teacher/coordinator/parent profile headers |
| `.reveal-*`, `.flip`, `.front`, `.back`, `.reveal-rays` | reward reveal | `shared/BadgeAwardModal` / `shared/MysteryRewardBox` | |
| `.badge-pop`, `.xp-float`, `.streak-flame`, `.pop-in`, `.glow-pulse`, `.confetti-piece`, `.fade-in-up` | celebration motion | `index.css` keyframes (`animate-badge-pop`, `animate-xp-pulse`, `animate-float`, `animate-streak-flame`, `animate-fade-in-up`) + `shared/XPAwardToast`, `shared/LevelUpOverlay`, canvas-confetti | honor `prefers-reduced-motion` |
| `.tree-stage`, `.node-current`, `.camp`, `.marker`, `.milestone`, `.hero-arrow` | learning-path journey | `features/student` path composition + `shared/LockedNode` | camp icons §B.6 |

> **To add (cited by the L2 plan but not yet in `ui/`):** `Tooltip`. There is no
> `ui/tooltip.tsx` today — add a Radix tooltip primitive before screens that need
> hover affordances, or use `ui/popover`.

---

## §B — Emoji → Lucide icon map

**Rule:** prototype emoji fall into two buckets.

- **Chrome / iconography** (nav, section chips, buttons, status, form affordances)
  → replace with a `lucide-react` icon (imports below). Emoji render differently
  per OS/browser and are never pixel-stable; Lucide is the pixel-stable equivalent.
- **Content / gamification art** (marketplace items, companions, mascot,
  celebration, role-picker avatars) → **do NOT convert.** These are data/assets
  (§B.7), not UI chrome.

Icon sizing (design-system rule): nav `h-5 w-5`; in buttons `h-4 w-4` with `gap-2`.
Always pair an icon with a label or an accessible name.

### B.1 Navigation icons (1:1 — must match `Sidebar`/`MobileTabBar` order)

From the per-page nav arrays in the prototype (`shared.js`, page headers).

| Emoji | Nav item | Lucide |
| --- | --- | --- |
| 🏠 | Home / Dashboard | `Home` |
| 📚 | Learn / Courses | `BookOpen` |
| ★ | Learning Path | `Route` |
| 📈 | Progress | `TrendingUp` |
| 🤖 | AI Tutor | `Bot` |
| 🏆 | Leaderboard | `Trophy` |
| 🛍️ | Marketplace | `ShoppingBag` |
| 👥 | Team | `Users` |
| 📅 | Calendar | `Calendar` |
| ✍️ | Grading | `PenLine` |
| 🧬 | Curriculum | `Dna` |
| 🧑‍🎓 | Students | `GraduationCap` |
| 🗂️ | Matrix | `LayoutGrid` |
| 🌱 | Growth | `Sprout` |
| 💬 | Support / Discussions | `MessageCircle` |
| 🗓️ | Attendance | `CalendarCheck` |
| 📐 | Rubric Builder | `Ruler` |
| 📘 | Course File | `BookMarked` |
| 👤 | Me / Profile | `User` |
| ⚙️ | Settings | `Settings` |
| 🔔 | Notifications | `Bell` |
| 🔐 | Sign in | `LogIn` |

### B.2 Section-header chips (`.sec-h .chip`) & common UI glyphs

Semantic mapping; where several emoji share a meaning they collapse to one icon.

| Emoji | Lucide | Emoji | Lucide |
| --- | --- | --- | --- |
| 🎯 | `Target` | 📊 | `BarChart3` |
| 📈 | `TrendingUp` | 📉 | `TrendingDown` |
| 🧠 | `Brain` | 🤖 | `Bot` |
| ⚠️ | `AlertTriangle` | ✅ | `CheckCircle2` |
| ❌ | `XCircle` | ❓ | `HelpCircle` |
| 💡 | `Lightbulb` | 📣 📢 | `Megaphone` |
| 🔎 🔍 | `Search` | 🗺️ | `Map` |
| 🧭 | `Compass` | 🔗 | `Link` |
| 📋 | `ClipboardList` | 📝 | `NotebookPen` |
| 📄 📃 📜 | `FileText` | 🧾 | `ReceiptText` |
| 📂 🗂️ 🗃️ | `FolderOpen` | 📦 | `Package` |
| 🔄 🔁 | `RefreshCw` | 🔌 | `Plug` |
| 🏫 | `School` | 🏛️ | `Building2` |
| 🎨 | `Palette` | 🌐 | `Globe` |
| ⚔️ | `Swords` | 🏷️ | `Tag` |
| 📔 📖 📓 📕 📗 📘 📙 | `BookOpen` | 🎒 | `Backpack` |
| 📥 | `Inbox` | 📤 | `Upload` |
| ⬇️ | `Download` | 📎 | `Paperclip` |
| 🚫 | `Ban` | 🔒 🔐 | `Lock` |
| 🔑 | `KeyRound` | 🛡️ | `ShieldCheck` |
| 🎚️ 🎛️ | `SlidersHorizontal` | ⚙️ | `Settings` |
| 🔥 | `Flame` | ⚡ | `Zap` |
| ✨ 🌟 ⭐ | `Sparkles` / `Star` | 🎉 | `PartyPopper` |
| 🎓 | `GraduationCap` | 👥 | `Users` |
| ✉️ 📧 | `Mail` | 📞 | `Phone` |
| 📍 | `MapPin` | 💳 | `CreditCard` |
| 💾 | `Save` | 💻 🖥️ | `Monitor` |
| 📱 | `Smartphone` | 👁️ | `Eye` |
| 🗑️ | `Trash2` | ➕ | `Plus` |
| ✏️ ✍️ | `Pencil` / `PenLine` | 👋 | `Hand` |
| ⏰ ⏱️ 🕐 🕒 | `Clock` / `Timer` | ⏳ | `Hourglass` |
| 🧪 | `FlaskConical` | 🧩 | `Puzzle` |
| 🎥 | `Video` | 📷 | `Camera` |
| 🌙 | `Moon` | ☀️ | `Sun` |
| ❄️ | `Snowflake` | 🤝 | `Handshake` |
| 🚀 | `Rocket` | 👑 | `Crown` |
| 💬 💭 | `MessageCircle` | 🧘 | `HeartPulse` |
| 🌊 | `Waves` | 🔧 🔨 | `Wrench` |
| 💪 | `Dumbbell` | 🕶️ | `EyeOff` (privacy/anon) |
| 🩺 | `Stethoscope` | 💼 | `Briefcase` |
| 🆔 | `Contact` | 🔖 | `Bookmark` |
| 📌 | `Pin` | 🌱 | `Sprout` |

### B.3 Medals & ranks

| Emoji | Lucide | Note |
| --- | --- | --- |
| 🥇 | `Medal` (gold) | leaderboard/badges gold tier — color via token |
| 🥈 | `Medal` (silver) | |
| 🥉 | `Medal` (bronze) | |
| 🏆 | `Trophy` | overall leaderboard |
| 🏅 🎖️ | `Award` | earned badge |

### B.4 Status dots & trend arrows (not glyph icons)

| Emoji | Target | Note |
| --- | --- | --- |
| 🟢 🔴 🟡 🔵 ⚪ | `.dot` span, semantic color | on-track/critical/attention/monitor/neutral — a colored dot, **not** a Lucide glyph (see `.dot` in §A.4). If an icon is required, `Circle` filled. |
| ↗ | `ArrowUpRight` (or `TrendingUp`) | rising |
| ↘ | `ArrowDownRight` (or `TrendingDown`) | falling |
| ➡️ | `ArrowRight` (or `Minus`) | flat/stagnant |
| ↔ | `ArrowLeftRight` | comparison |
| ▶ ▶️ | `Play` (media) or `ChevronRight` (pager) | context-dependent |
| ◀ ◀️ | `ChevronLeft` | pager |
| ⏸ | `Pause` | timer |
| 🔻 🔺 | `TriangleAlert` / `ArrowDown`·`ArrowUp` | delta emphasis |

### B.5 Toggle-state pairs → `Switch` state (NOT icons)

The prototype encodes on/off with an emoji pair as a second cue (good a11y
instinct). In React the `Switch` (`.edv-toggle`) conveys state via **knob position +
a check mark**, so these pairs collapse into switch state — do not render the emoji:

`🔔/🔕` (notifications), `🌙/☀️` or `🌙/⚪` (theme/dark), `✨/⚪`, `🌐/⚪` (bilingual),
`📊/⚪`, `📐/⚪`, `🔆` (contrast), `🔊/🔇` (sound), `👁️/🕶️` (leaderboard anonymity).

Rule (from `prototype-backend-parity` R8 research): ON = brand accent + knob right +
check; OFF = neutral gray + knob left; **never red for a plain off**, never
color-only.

### B.6 Bloom's Learning-Path camp metaphor (`path.html`)

Decorative journey art tied to Bloom levels (which carry canonical colors from the
design-system rule). Lucide is the fallback; the Learning Path may keep richer SVG /
`prototype/characters` art where flat icons lose fidelity.

| Emoji | Camp | Bloom level | Lucide fallback |
| --- | --- | --- | --- |
| 🏕️ | Base camp | Remember | `Tent` |
| ⛺ | Camp I | Understand | `Tent` (+ level color) |
| ⛰️ | Camp II | Apply | `Mountain` |
| 🧗 | Camp III | Analyze | `Footprints` |
| 🏔️ | High camp | Evaluate | `MountainSnow` |
| 🏁 | Summit | Create | `Flag` |
| 🌳 | Knowledge Tree view | — | `Network` / `GitBranch` |
| 🚩 | Next milestone | — | `Flag` |

### B.7 Content / gamification art — DO NOT convert

These are **data or illustration**, not chrome. Keep them as the item's `icon`
data field or port them as illustration assets from `prototype/characters` +
`prototype/brand`. Swapping them for Lucide would strip product identity.

| Category | Examples | Handling |
| --- | --- | --- |
| Marketplace companions | 🦉 🦊 🐧 | **built (P0.5)** `CHARACTER_SKINS` (design-system/mascot) — real character art via `MascotCharacter`; item `icon` data for non-character items |
| Marketplace cosmetics | 🖼️ 🎟️ 👑 🌅 🌌 🎨(theme) ❄️(shield) | item `icon` data / `shared/CosmeticPreview` |
| Mascot / character | 🦊 Foxi · 🦉 Owlie · 🐧 Pengu | **built (P0.5)** `design-system/mascot` — emotion→pose catalog + `MascotCharacter`/`MascotCompanion`; `pickMascot`/`mascotForMoment` resolvers; assets in `design-system/mascot/assets`. (`shared/Mascot` remains the i18n coaching-text bubble.) |
| Celebration | 🎉 (confetti burst) | canvas-confetti, not an icon |
| Role-picker avatars | 🧑‍🏫 🧑‍🎓 👨‍👩‍👧 🏛️ | large avatar art in auth/role picker may stay illustration; **as chrome** (profile chips, nav) use `GraduationCap`/`Users`/`Building2` |
| Mood pickers | 😖 😕 😐 🙂 😃 😄 😰 😎 | `features` mood component using Lucide face set `Angry`/`Frown`/`Meh`/`Smile`/`Laugh` — a 3–5 point scale, not free emoji |

---

## §C — Per-screen diff tolerances

Cross-implementation parity (prototype HTML vs React) is never byte-identical
(font hinting, emoji→Lucide, dynamic data), so each screen gets a **tolerance tier**.
The tier value is what goes into that screen's `maxDiffRatio` in
`visual/screen-map.ts` when its parity check activates.

| Tier | maxDiffRatio | Applies to |
| --- | --- | --- |
| **A — tight** | `0.08` | text/form/settings/auth — few icons, little dynamic data |
| **B — standard** | `0.12` (the `DEFAULT`) | typical dashboards, lists, tables, detail pages |
| **C — loose** | `0.16` | chart/heatmap/ring-heavy, mascot/gamified, or emoji-dense |

Guidance: start at the tier value; **tighten** once a real baseline is stable.
Mobile (360) may diverge more than desktop — if only mobile exceeds tier, allow up
to +0.02 on that viewport before loosening the whole screen. Tier B needs no
override (it equals the default).

Grouped by tier (every `screen-map.ts` id appears exactly once):

**Tier A — `0.08` (7):** `auth-login`, `student-settings`, `student-profile`,
`teacher-profile`, `parent-profile`, `coordinator-profile`, `admin-profile`.

**Tier C — `0.16` (24):**
- Student (12): `student-dashboard`, `student-path`, `student-tutor`,
  `student-progress`, `student-leaderboard`, `student-marketplace`, `student-team`,
  `student-calendar`, `student-wellness`, `student-focus`, `student-quests`,
  `student-badges`.
- Teacher (3): `teacher-dashboard`, `teacher-gradebook`, `teacher-attendance`.
- Parent (2): `parent-dashboard`, `parent-progress`.
- Coordinator (3): `coordinator-dashboard`, `coordinator-curriculum`,
  `coordinator-teams`.
- Admin (4): `admin-dashboard`, `admin-analytics`, `admin-marketplace`,
  `admin-badges`.

**Tier B — `0.12` / default (33):**
- Student (9): `student-lesson`, `student-review`, `student-journal`,
  `student-portfolio`, `student-courses`, `student-course-detail`,
  `student-assignment`, `student-transcript`, `student-learning-profile`.
- Teacher (7): `teacher-grading`, `teacher-students`, `teacher-curriculum`,
  `teacher-rubrics`, `teacher-questions`, `teacher-materials`, `teacher-handoffs`.
- Parent (1): `parent-support`.
- Coordinator (5): `coordinator-outcomes`, `coordinator-accreditation`,
  `coordinator-cqi`, `coordinator-competencies`, `coordinator-course-file`.
- Admin (6): `admin-users`, `admin-fees`, `admin-governance`, `admin-security`,
  `admin-structure`, `admin-import`.
- Shared (5): `shared-announcements`, `shared-notifications`, `shared-discussions`,
  `shared-surveys`, `shared-fees`.

Tier counts: **A** ×7 · **C** ×24 · **B** ×33 = **64**.

---

## §D — Demo-only prototype artifacts (never ported)

The prototype is a clickable demo; these exist only to simulate an app and must not
leak into `src/` (rebuild guardrails G.2, R7):

- **Device toggle** `.mode-laptop` / `.mode-mobile` and the demo dock `.demo-menu` /
  `.demo-dock` / `.demo-seg` / `.demo-btn` / `#dock-screens` → replaced by **real CSS
  breakpoints** (360/768/1024/1440) and the sidebar↔bottom-tab swap at `lg`.
- **CDN Tailwind** + **Google Fonts `<link>`** → real Vite Tailwind v4 build; fonts
  self-hosted/bundled.
- **`shared.css` / `shared.js`** → never imported; their values live in `tokens.css`
  and their behavior in React components/hooks.
- **Hardcoded demo data** and `toast()`/`confirm()` stubs → replaced by real hooks
  (no new backend).
- **Raw emoji as icons** → Lucide per §B (except §B.7 content art).
- **`localStorage` role/`edv-role` switching** → real `useAuth` role + `RouteGuard`.

---

## §E — Fidelity caveats (what "pixel-perfect" does NOT cover)

Pinned so scope stays honest (rebuild design.md §4 / risks R2):

1. **Light + LTR only.** The prototype has no dark mode and no RTL. Dark tokens and
   Arabic/RTL are **net-new** design deliverables with their own review + gates;
   they cannot be diffed against the prototype.
2. **Dynamic data differs.** Real hooks return different values than the mock's
   hardcoded content; tolerances (§C) absorb this. Parity is about layout/treatment,
   not identical text.
3. **Icons are equivalents, not identical.** Emoji→Lucide (§B) changes glyph shape by
   design; this is the intended, pixel-stable outcome.
4. **Motion** is verified for correctness + `prefers-reduced-motion`, not diffed
   (animations are frozen during capture).
5. **A11y** (axe/keyboard/contrast/44px targets) is a separate gate, not a visual
   diff.

---

### Change log

- **v1** — Initial contract. §A from `shared.css` (312 classes) + `src/components`
  inventory; §B from a full emoji scan of `prototype/` (190 distinct glyphs); §C tiers
  the 64 `screen-map.ts` ids. Adopted brand gradient `93.65deg` (see `tokens.css`).
