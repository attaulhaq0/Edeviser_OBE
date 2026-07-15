# Principal Product Design Review — Student Experience Redesign

## 1. UX Audit of Every Student Screen

### 1.1 Dashboard (StudentDashboard.tsx — 1,070 lines)

**What works well:**
- PrimaryCTA pattern correctly surfaces the single most important action
- WelcomeHero creates warm, personalized greeting with XP/Level stats
- Deferred loading strategy (aggregate → fallback) shows critical data first
- Realtime updates via Supabase Realtime for gamification state

**What feels overwhelming:**
- **17+ distinct sections** stacked vertically — students must scroll through: RealtimeStatusBanner, PrimaryCTA, MicroAssessment, StarterWeekHero, WelcomeHero, ActiveBoost, ProfileCompleteness, KPI Row, ComebackChallenge, BadgeSpotlight, StreakDisplay, Deadlines+Progress (2-col), Announcements, CLO Progress, Team, Challenges, Attendance, HabitTracker, HabitDifficulty, ProfileSummary
- Each section has its own gradient header card, creating a "wall of cards" effect
- Information density exceeds what a student needs at any given moment
- No clear hierarchy between "act now" and "nice to know"

**What creates cognitive load:**
- Too many competing metrics (XP, Level, Streak, Attainment %, Habits, League Tier, Active Days)
- The dashboard tries to be both a "status report" AND an "action launcher"
- Multiple CTAs compete: PrimaryCTA, "View XP History", "Ask Tutor", individual assignment links

**What should be deferred or removed:**
- ProfileSummaryCard (radar chart) — move to Settings/Profile page
- Attendance table — move to individual course details
- Habit Tracker (8×7 grid) — too detailed for dashboard; show only today's habits
- CLO Progress (low-attainment list) — move to Progress page, show only count on dashboard
- Badge Spotlight — nice but secondary; show in a "Highlights" strip, not a full card

### 1.2 Courses (StudentCoursesPage.tsx + CourseCard.tsx)

**What works well:**
- CourseCard is well-designed: color accent, progress bar, next assignment, attainment
- Stretched-link pattern for accessibility
- Teacher name visible (social context)
- "No upcoming work" state handled gracefully

**What feels outdated:**
- Grid of cards without any prioritization — "continue where you left off" is not surfaced
- No sorting by last-accessed or urgency
- No distinction between courses with due assignments and courses at rest
- Progress % alone doesn't tell students what to DO

**Recommendations:**
- Sort courses by urgency: courses with upcoming deadlines first
- Add "Continue" button on the course you last interacted with (pinned to top)
- Add estimated time for next lesson/assignment
- Collapse courses with no upcoming work into a "Completed" or "At Rest" section

---

### 1.3 Assignments (AssignmentListPage.tsx)

**What works well:**
- Clean card list with status badges (Submitted/Pending/Late/Overdue)
- Search and course filter available
- Clear due date formatting

**What causes decision fatigue:**
- Flat list with no grouping — all assignments in one stream
- No visual urgency escalation (a "due today" looks the same size as "due in 2 weeks")
- Missing: XP reward info, estimated effort, difficulty
- Missing: quick-submit action without navigating to detail page

**Recommendations:**
- Group into "Due Today", "Due This Week", "Upcoming", "Submitted"
- Highlight "Due Today" with urgency styling (red border, countdown)
- Add XP reward badge on each card
- Add estimated time/effort indicator
- Show AI Tutor "Get Help" quick action on each card

---

### 1.4 Assignment Detail (AssignmentDetailPage.tsx)

**What works well:**
- Comprehensive info: title, due date, marks, late window, CLO weights
- File upload with retry logic and offline resilience
- Draft persistence so users don't lose work
- TutorEntryButton for contextual AI help
- Difficulty bonus display with Bloom's level

**What feels overwhelming:**
- Two full gradient-header cards stacked (Assignment Details + Submission)
- CLO weights shown as raw badges ("CLO: 40%") — meaningless to students
- "Late Window: 24h after deadline" is implementation detail, not student-friendly

**Recommendations:**
- Single card with clear above-the-fold: Title, Due (countdown), Status, Submit button
- Replace "CLO: 40%" with "This contributes to: Understanding Database Concepts"
- Replace "Late Window" with "You can still submit up to 24h late (with penalty)"
- Make the Submit button the dominant visual element (brand gradient, full-width on mobile)
- Show rubric criteria as a checklist students can self-assess against

---

### 1.5 AI Tutor (TutorPage.tsx)

**What works well:**
- Conversation sidebar with history
- Multiple persona modes (Socratic Guide, etc.)
- Contextual entry from assignments/CLOs
- Streaming responses with token-by-token display
- Error state handling with distinct UI panels

**What feels wrong:**
- **Persona picker as first screen** — students are asked to choose a "tutoring style" before they've even asked a question. This is a configuration screen masquerading as an entry point.
- The picker uses academic language ("Socratic Guide") that may not resonate
- No suggested prompts or quick actions visible on the empty chat state
- The sidebar takes 72px (w-72) on desktop — generous for a secondary nav

**Recommendations:**
- Start with the chat directly — empty state shows suggested actions:
  - "Explain my latest assignment"
  - "Quiz me on [course]"
  - "Help me study for [topic]"
  - "Review my mistakes"
- Move persona selection to a settings gear INSIDE the chat (advanced users only)
- Add contextual awareness: "I see you have an assignment due tomorrow. Want help?"
- Reduce sidebar width to w-56 or make it collapsible

---

### 1.6 Progress (StudentProgressPage.tsx)

**What works well:**
- KPI row with 4 clear metrics (Courses, Average, Excellent, Not Yet)
- Per-course list with attainment bands and progress bars
- Color-coded attainment classification (Excellent/Satisfactory/Developing/Not Yet)
- Links to individual course detail

**What could be improved:**
- No trend data — is the student improving or declining?
- No actionable insight — "Not Yet: 2" but what should they DO about it?
- Missing: weekly comparison, suggested next actions
- Missing: celebration of improvements ("You improved 8% in Database Design this week!")

**Recommendations:**
- Add trend arrows (↑↓) next to each attainment value
- Add "Focus areas" section: "Spend 20 min on Database CLO3 to reach Satisfactory"
- Add weekly progress summary notification
- Celebrate milestones: "You moved from Developing to Satisfactory in 2 courses!"

---

### 1.7 Navigation / Sidebar

**Current state:** 18 nav items in 4 groups (Learn, Growth, Community, Tools)

**Problem:** 18 items is too many for a student sidebar. Research shows that 5–7 is optimal for navigation before cognitive load increases decision time.

**Current groups and items:**
- **Learn (5):** Dashboard, Courses, Assignments, My Content, AI Tutor
- **Growth (4):** Progress, Challenges, Habits, Marketplace
- **Community (2):** Leaderboard, My Team
- **Tools (5):** Planner, Today, Journal, Calendar, Timetable

Plus ungrouped: Portfolio, Surveys, Announcements

**Recommendations:**
- Reduce to 7 primary items + "More" overflow
- Primary (always visible): Dashboard, Courses, Assignments, AI Tutor, Progress
- Secondary (in "More" or bottom section): Habits, Leaderboard, Calendar
- Tertiary (accessible from Dashboard/Profile): Journal, Planner, Today, Portfolio, Marketplace, Challenges, Team, Timetable, Surveys

### 1.8 Mobile Layout

**Current state:** Desktop-first with `lg:ms-52` offset. Sidebar hidden on mobile with hamburger toggle.

**What works well:**
- Sidebar collapses to off-canvas sheet on mobile
- Full-width content on small screens
- Cards stack naturally in single column

**What needs improvement:**
- No bottom navigation bar on mobile (relies on hamburger + sidebar)
- Primary actions (Submit, Ask Tutor) require scrolling to find
- The dashboard's 17+ cards create extreme scroll depth on mobile (~15+ screens)
- KPI row (4 cards in 2×2 grid) takes full viewport height on small phones
- No gesture-based navigation (swipe between sections)

**Recommendations:**
- Add fixed bottom tab bar on mobile: Home, Courses, Assignments, Tutor, More
- Float primary CTA (the PrimaryCTA action) as a bottom-anchored sticky button
- Reduce dashboard to 5 max sections on mobile, with "Show more" expand
- Use horizontal scroll carousels for secondary content (badges, challenges)

---

### 1.9 Loading States (Shimmer)

**What works well:**
- Consistent `Shimmer` component with CSS animation (not JS)
- Component-level shimmer (not full-page skeleton)
- Appropriate shimmer sizing matches final content dimensions

**What could be improved:**
- All shimmers look identical (gray rectangles) — no content-aware shapes
- Multiple shimmers in a row (e.g., 4 KPI cards) feel "twitchy" when they all resolve at different times
- No staggered reveal animation when data arrives

**Recommendations:**
- Content-aware shimmer: KPI shimmer has the layout of a KPI card, deadline shimmer has rows
- Stagger shimmer → content transitions (100ms offset per item) for visual polish
- Consider "ghost content" approach: show the card chrome (header, border) immediately, shimmer only the data area

---

### 1.10 Empty States

**What works well:**
- Dedicated `EmptyState` component with icon, title, description, and action slot
- Named variants for common cases (NoCourses, NoAssignments, etc.)
- Bilingual support via i18next
- Clean dashed-border card style

**What could be improved:**
- Empty states are purely informational — they tell you "nothing here" but don't guide action
- No illustration or personality (just a Lucide icon in a gray circle)
- Missing: contextual suggestion ("You're not enrolled in any courses. Ask your coordinator.")

---

### 1.11 Animations & Micro-interactions

**What works well:**
- `active:scale-95` on primary buttons (haptic feel)
- Framer Motion for page transitions in onboarding
- CSS keyframes for streaks, badges, XP (custom animations in index.css)
- `prefers-reduced-motion` media query disables all custom animations

**What's missing:**
- No transition between dashboard card sections (abrupt paint)
- No animation when KPIs update in realtime
- No celebration moment when a habit is completed
- Cards just "appear" when data loads — no entrance animation
- DataTable `opacity-60` during refetch is jarring (the whole table fades)

---

## 2. Current Pain Points (Prioritized)

| # | Pain Point | Impact | Affected Screen |
|---|-----------|--------|-----------------|
| 1 | Dashboard is a "wall of cards" — 17+ sections, no hierarchy | High | Dashboard |
| 2 | 18 nav items create decision paralysis | High | Sidebar (all) |
| 3 | AI Tutor starts with persona config, not a question | High | Tutor |
| 4 | No mobile bottom navigation — all actions behind hamburger | High | All mobile |
| 5 | Assignments have no urgency grouping or estimated effort | Medium | Assignments |
| 6 | Progress shows numbers without actionable insight | Medium | Progress |
| 7 | Course cards don't surface "continue where you left off" | Medium | Courses |
| 8 | Gamification metrics compete with learning actions | Medium | Dashboard |
| 9 | No celebration/reward animations for habit completion | Low | Dashboard/Habits |
| 10 | Assignment detail shows CLO weights as raw percentages | Low | Assignment Detail |

---

## 3. UX Principles from Industry-Leading Learning Platforms

### Derived from Research (Duolingo, Khan Academy, Brilliant, Headspace, Notion, Linear, Apple, Material Design 3)

| # | Principle | Description | Source |
|---|-----------|-------------|--------|
| 1 | **Single next action** | At any moment, the product should answer: "What should I do next?" with ONE clear answer | Duolingo (lesson tree), Apple (setup) |
| 2 | **Progress as motivation** | Show how far you've come, not just how far you have to go. Use celebration, not obligation | Duolingo (streak), Khan (mastery) |
| 3 | **Progressive disclosure** | Only show what's relevant NOW. Advanced features appear when the user is ready | Notion, Material Design 3 |
| 4 | **Reduce choices** | Fewer visible options → faster decisions. Hick's Law: reaction time ∝ log₂(n choices) | Brilliant (one problem per screen) |
| 5 | **Contextual AI** | AI should appear WHERE the student is struggling, not in a separate "AI page" | Khan Academy (hints), Coursera |
| 6 | **Micro-rewards** | Small, frequent rewards (XP pop, streak count, check mark) sustain engagement better than large infrequent ones | Duolingo, Headspace |
| 7 | **Learning streaks over habit grids** | A single streak number is more motivating than an 8×7 completion grid | Duolingo, Apple (Activity Rings) |
| 8 | **Mobile-native patterns** | Bottom tab bar, thumb-reachable actions, swipe gestures, pull-to-refresh | Apple HIG, Material 3 |
| 9 | **Calm design** | Whitespace, breathing room, one focal point per viewport. Reduce visual noise | Headspace, Linear, Notion |
| 10 | **Smart defaults** | Infer what the user wants instead of asking. Show the right thing at the right time | Notion Calendar, Linear |

---

## 4. Proposed Information Architecture

### Current (18 items, 4 groups)

```
Learn:      Dashboard, Courses, Assignments, My Content, AI Tutor
Growth:     Progress, Challenges, Habits, Marketplace
Community:  Leaderboard, My Team
Tools:      Planner, Today, Journal, Calendar, Timetable
(Other):    Portfolio, Surveys, Announcements
```

### Proposed (7 primary + overflow)

```
Primary Tab Bar (always visible):
  🏠 Home (Dashboard)
  📚 Learn (Courses + Assignments merged)
  🤖 Tutor (AI)
  📊 Progress
  👤 Me (Profile, Settings, Badges, Portfolio)

Accessible from Home (dashboard cards/sections):
  - Streak / Habits (inline widget)
  - Upcoming deadlines (inline widget)
  - Announcements (inline)
  - Challenges (banner)

Accessible from "Me" profile:
  - Journal
  - Marketplace
  - Leaderboard
  - Team
  - Calendar / Timetable / Planner

Contextual (appears where relevant):
  - AI Tutor (entry point ON assignment cards, course pages, progress CLOs)
  - Surveys (notification badge)
```

**Rationale:** Reduce from 18 to 5 primary navigation targets. Everything else is reachable within 2 taps. The student should never wonder "where do I find X?" — the answer is always under one of the 5 tabs.

---

## 5. Wireframes (Text-Based)

### 5.1 Redesigned Dashboard (Mobile-First)

```
┌─────────────────────────────────────┐
│  [Header: Edeviser Logo | Profile]  │
├─────────────────────────────────────┤
│                                     │
│  Good morning, Sarah 👋             │
│  ┌──────────── Streak ─────────┐    │
│  │  🔥 12 days · Level 4       │    │
│  │  ━━━━━━━━━━━●━━━ 14d goal   │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── YOUR NEXT STEP ──────────────   │
│  ┌─────────────────────────────┐    │
│  │ 📝 Database Assignment 3    │    │
│  │    Due in 4 hours           │    │
│  │    +25 XP · Medium          │    │
│  │                             │    │
│  │  [ Start Now → ]            │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── COURSES ─────── See all →       │
│  ┌────┐ ┌────┐ ┌────┐              │
│  │DB  │ │Web │ │AI  │  ← scroll    │
│  │72% │ │45% │ │88% │              │
│  └────┘ └────┘ └────┘              │
│                                     │
│  ── TODAY'S HABITS ──────────────   │
│  ○ Login ✓ Submit ○ Journal ○ Read  │
│  [Complete 2 more for Perfect Day]  │
│                                     │
│  ── COMING UP ───────────────────   │
│  • Web Dev Quiz — Tomorrow          │
│  • AI Essay — Friday                │
│                                     │
├─────────────────────────────────────┤
│  🏠    📚    🤖    📊    👤        │
│  Home  Learn Tutor Progress Me      │
└─────────────────────────────────────┘
```

**Key changes from current:**
- Streak is compact inline, not a full card with milestone progress
- ONE dominant next-step card (not 17 competing sections)
- Courses are a horizontal scroll strip (3 visible), not below-the-fold
- Habits are ONE row of 4 icons, not an 8×7 grid
- Bottom tab bar for primary navigation
- Total scroll: ~2 screens on mobile (not 15+)

---

### 5.2 Redesigned "Learn" Tab (Courses + Assignments Merged)

```
┌─────────────────────────────────────┐
│  Learn                              │
├─────────────────────────────────────┤
│  ── DUE TODAY (1) ─────── 🔴       │
│  ┌─────────────────────────────┐    │
│  │ Database Assignment 3       │    │
│  │ Due at 5:00 PM · 25 XP     │    │
│  │ [ Submit ]  [ Ask Tutor 🤖 ]│    │
│  └─────────────────────────────┘    │
│                                     │
│  ── THIS WEEK (3) ──────────────    │
│  ┌─────────────────────────────┐    │
│  │ Web Dev Quiz · Wed · 15 XP  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ AI Essay · Fri · 30 XP      │    │
│  └─────────────────────────────┘    │
│                                     │
│  ── MY COURSES ──────── See all →   │
│  [Tabs: Active | Completed]         │
│  ┌─────────────────────────────┐    │
│  │ Database Design  [72%]──→   │    │
│  │ Last: Module 5, Lesson 3    │    │
│  │ Next: Assignment 3 (today)  │    │
│  └─────────────────────────────┘    │
│  ┌─────────────────────────────┐    │
│  │ Web Development  [45%]──→   │    │
│  │ Last: Module 3, Video 2     │    │
│  │ Next: Quiz (Wednesday)      │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠    📚    🤖    📊    👤        │
└─────────────────────────────────────┘
```

**Key insight:** Assignments and Courses are currently two separate nav items, but students think "What do I need to do?" not "Am I looking at a course or an assignment?" Merging them into a single "Learn" view organized by urgency eliminates one navigation decision.

---

### 5.3 Redesigned AI Tutor

```
┌─────────────────────────────────────┐
│  AI Tutor                    [⚙️]   │
├─────────────────────────────────────┤
│                                     │
│         🤖                          │
│   "What can I help with?"           │
│                                     │
│  ┌───────────────────────────┐      │
│  │ 📝 Help with Database     │      │
│  │    Assignment 3            │      │
│  │    (due today)            │      │
│  └───────────────────────────┘      │
│  ┌───────────────────────────┐      │
│  │ 🧠 Quiz me on Web Dev     │      │
│  └───────────────────────────┘      │
│  ┌───────────────────────────┐      │
│  │ 📊 Explain my weak CLOs   │      │
│  └───────────────────────────┘      │
│  ┌───────────────────────────┐      │
│  │ 📖 Create a study plan    │      │
│  └───────────────────────────┘      │
│                                     │
│  ─── Recent Conversations ───────   │
│  • DB Assignment help (2h ago)      │
│  • Web Dev quiz prep (yesterday)    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ Ask anything...         [→] │    │
│  └─────────────────────────────┘    │
│                                     │
├─────────────────────────────────────┤
│  🏠    📚    🤖    📊    👤        │
└─────────────────────────────────────┘
```

**Key changes:**
- No persona picker gate — jump straight into suggested actions
- Suggested actions are CONTEXTUAL (derived from current assignments, weak CLOs)
- Persona settings moved to gear icon (advanced users)
- Recent conversations immediately accessible
- Free-text input always visible at bottom
- The tutor "meets you where you are" instead of asking what you want

---

## 6. Updated Component Hierarchy

### Before (Dashboard: 23 imported components + 50 hooks)

```
StudentDashboard
├── RealtimeStatusBanner
├── PrimaryCTA
├── MicroAssessmentCard
├── StarterWeekHeroCard
├── WelcomeHero
├── ActiveBoostIndicator
├── ProfileCompletenessBar
├── KPICard × 4
├── ComebackChallengeBanner
├── BadgeSpotlightCard
├── StreakDisplay
├── Card (Deadlines)
├── Card (Progress summary)
├── StreakFreezeShop
├── AnnouncementsSection
├── Card (CLO Progress)
├── StudentTeamSection
├── Card (Challenges)
├── Card (Attendance)
├── HabitTracker
├── HabitDifficultyIndicator
└── ProfileSummaryCard
```

### After (Proposed: 8 focused sections)

```
StudentDashboard
├── CompactStreakBar (inline, not a card)
├── NextStepCard (single dominant action)
├── CourseStrip (horizontal scroll, max 5)
├── TodayHabits (4 circles, one row)
├── UpcomingList (next 3 deadlines, compact)
├── AchievementToast (non-blocking notification)
└── [Conditional: AnnouncementBanner]
```

Components removed from dashboard (moved elsewhere):
- MicroAssessmentCard → Notification/modal trigger
- StarterWeekHeroCard → Only for first week, then gone
- ActiveBoostIndicator → Inside XP History page
- ProfileCompletenessBar → Profile/Settings page
- KPICard row → Progress tab
- ComebackChallengeBanner → Modal/notification
- BadgeSpotlightCard → Me/Badges page
- StreakFreezeShop → Marketplace
- CLO Progress details → Progress tab
- StudentTeamSection → Community/Team page
- Attendance → Course Detail page
- HabitTracker (full grid) → Habits page
- HabitDifficultyIndicator → Habits page
- ProfileSummaryCard → Settings/Profile page

---

## 7. Navigation Redesign

### Mobile: Bottom Tab Bar (5 tabs)

| Position | Tab | Icon | Destination |
|----------|-----|------|-------------|
| 1 | Home | 🏠 `LayoutDashboard` | `/student/dashboard` |
| 2 | Learn | 📚 `BookOpen` | `/student/learn` (merged courses + assignments) |
| 3 | Tutor | 🤖 `Bot` | `/student/tutor` |
| 4 | Progress | 📊 `TrendingUp` | `/student/progress` |
| 5 | Me | 👤 `UserCircle` | `/student/profile` |

### Desktop: Left sidebar (simplified)

| Section | Items |
|---------|-------|
| **Primary** | Dashboard, Courses, Assignments, AI Tutor, Progress |
| **Divider** | — |
| **Secondary** | Habits, Calendar, Leaderboard |
| **Divider** | — |
| **Bottom** | Journal, Settings |

Collapsed on tablets (icon-only), expanded on desktop.

### Contextual Entry Points (not in sidebar)

| Feature | Accessed From |
|---------|--------------|
| Marketplace | Dashboard CTA or Profile → Marketplace |
| Challenges | Dashboard banner or Progress → Challenges |
| Team | Leaderboard → My Team |
| Planner/Today | Calendar tab or Dashboard habit section |
| Surveys | Notification badge → inline |
| Portfolio | Me/Profile → Portfolio |
| Timetable | Calendar → Timetable view |
| Announcements | Dashboard section or Course Detail |
| My Content | Courses → My Content |

---

## 8. AI Tutor Redesign

### Current Problems

1. Persona picker blocks chat initiation
2. No contextual awareness (doesn't know what the student is working on)
3. Empty chat state offers no guidance
4. Separate page feels disconnected from learning workflow

### Proposed Redesign

**Entry points (contextual, not just the nav):**
- Assignment detail → "Ask Tutor about this" (pre-fills context)
- Course page → "Explain this material" (pre-fills course + module)
- Progress page → "Help me improve [weak CLO]" (pre-fills learning gap)
- Dashboard → "Help with my next assignment" (pre-fills the deadline)
- Always: free-text in the Tutor tab

**Empty state behavior:**
```typescript
// Instead of PersonaSelector, show smart suggestions:
const suggestions = useTutorSuggestions(studentId);
// Returns:
// - "Help with [next due assignment]" (if deadline within 48h)
// - "Quiz me on [last course visited]" (if course visited today)
// - "Explain [lowest CLO]" (if any CLO below 50%)
// - "Create study plan for [upcoming exam]" (if exam scheduled)
// - Fallback: "Quiz me", "Explain a topic", "Review mistakes"
```

**Persona as background, not foreground:**
- Default persona: "Adaptive" (system picks based on query type)
- Advanced users: settings gear in chat header to manually select
- Never gate the chat behind a persona choice

---

## 9. Gamification Improvements

### Current Issues

| Element | Problem | Fix |
|---------|---------|-----|
| Streak Display | Full card with milestone bar, freeze count, sabbatical, total days — too complex for dashboard | Compact inline: "🔥 12 · 4 more to milestone" |
| Habit Tracker | 8×7 grid with 8 habit types — cognitive overload | Show today's 4 core habits as circles on dashboard; full grid on dedicated Habits page |
| Badge Spotlight | Dedicated card competing with learning actions | Toast notification when spotlight changes; small badge strip on Me page |
| XP Display | XP Balance, Level, XP Available, XP History button — scattered | Single "Level 4 (750/1000 XP)" progress bar in profile or header |
| Comeback Challenge | Full banner on dashboard | One-time modal on return, then dismiss |
| League Tier | Shown in gamification summary | Small badge on profile avatar |

### Gamification Hierarchy (what students should see, in order)

1. **Streak** (daily motivation) — always visible, compact
2. **Level progress** (long-term growth) — header or profile
3. **Next reward** (immediate pull) — "15 XP if you submit today"
4. **Daily habits** (routine building) — 4 circles max on dashboard
5. **Badges/Achievements** (collection) — dedicated page, notifications on earn
6. **Leaderboard** (social competition) — opt-in, separate tab
7. **Marketplace/Cosmetics** (expression) — dedicated page, not dashboard

---

## 10. Mobile-First Layouts

### Dashboard (Mobile)
- **Viewport 1:** Welcome + Streak (compact) + Next Step card
- **Viewport 2:** Course strip (horizontal) + Today's habits
- **Viewport 3:** Upcoming deadlines (3 max)
- **Total scroll depth:** 3 viewports (down from 15+)

### Learn Tab (Mobile)
- **Above fold:** "Due Today" section with urgency card
- **Below fold:** "This Week" collapsible + "My Courses" list

### Tutor (Mobile)
- Full-screen chat with floating input
- Suggestions as horizontal chip scroll above input
- Conversation list via swipe-right gesture or header button

### Touch Target Sizes
- All tappable: minimum 44×44px
- Primary CTAs: minimum 48×48px
- Bottom tab bar items: 56px height with label

### Safe Areas
- Bottom tab bar: respect `env(safe-area-inset-bottom)` for notched devices
- Keyboard: input fields scroll into view when keyboard opens

---

## 11. Motion and Interaction Guidelines

### Transitions

| Interaction | Animation | Duration | Easing |
|-------------|-----------|----------|--------|
| Tab switch | Crossfade | 150ms | ease-out |
| Card entrance | Fade-in-up (8px) | 200ms | ease-out (staggered 50ms) |
| KPI number change | Flip counter | 300ms | spring |
| Streak count increment | Number pop + XP float | 400ms | spring |
| Submit button press | Scale 0.95 + ripple | 150ms | ease-in-out |
| Pull-to-refresh | Spinner drop from top | Physics-based | spring |
| Bottom sheet open | Slide up + backdrop fade | 250ms | ease-out |
| Page transition | Shared element morph (card → detail) | 300ms | ease-in-out |

### Celebration Moments (use sparingly)
- **First submission of the day:** Subtle confetti + "+25 XP" float
- **Streak milestone (7, 14, 30):** Full-screen confetti for 1 second
- **Level up:** Modal with badge reveal animation
- **Perfect Day (all habits):** Firework burst behind habit circles

### Performance Rules
- All animations: `transform` and `opacity` only (GPU composited)
- 60 FPS minimum — drop frames = skip animation entirely
- `prefers-reduced-motion: reduce` → instant transitions, no particles
- No animation should block user interaction (can tap through)
- Remove `will-change` after animation completes (prevent layer promotion)

---

## 12. Accessibility Improvements

### Current Gaps

| Issue | Location | Fix |
|-------|----------|-----|
| Progress bars lack `aria-valuenow` | StreakDisplay, CourseCard | Add `role="progressbar"` with value attributes |
| Habit grid cells lack descriptions | HabitTracker | Add `aria-label="Login habit, Monday: completed"` |
| Gradient cards have no text alternative for the color | Section headers | Already white text on gradient — OK, but ensure 4.5:1 contrast |
| Bottom tab bar (proposed) needs `role="tablist"` | New component | Implement with proper ARIA tabs pattern |
| DataTable opacity fade during refetch | DataTable | Use `aria-busy="true"` + announce update |
| Focus order skips card content | CourseCard (stretched link) | Ensure all interactive elements are keyboard-reachable |

### Required Standards (WCAG 2.2 AA)

- **Color contrast:** 4.5:1 for normal text, 3:1 for large text and UI components
- **Focus indicators:** 2px solid outline with 2px offset on all interactive elements
- **Reduced motion:** All animations honor `prefers-reduced-motion`
- **Screen reader:** Every section has a heading (`<h2>`) and sections use `role="region"` with `aria-label`
- **Font scaling:** Layout doesn't break at 200% zoom
- **Touch targets:** 44×44px minimum (Apple HIG), 48×48px preferred (Material)
- **Keyboard:** All features reachable without a mouse (Tab, Enter, Escape, Arrows)

Full WCAG validation requires manual testing with assistive technologies (VoiceOver, NVDA, TalkBack) and expert accessibility review.

---

## 13. Design System Recommendations

### Reduce Card Variants

Currently, every dashboard section uses:
```
Card + gradient header + white body
```

This creates visual monotony ("wall of gradient cards"). Introduce hierarchy:

| Level | Usage | Style |
|-------|-------|-------|
| **Hero** | 1 per page max (Welcome, Next Step) | Dark gradient, full-width |
| **Section** | 2–3 per page (Deadlines, Progress) | White card, text header (no gradient) |
| **Inline** | Compact info (habits, streak) | Borderless, bg-slate-50 |
| **Interactive** | Tappable items (assignment cards) | White card, hover:shadow-lg |

### Gradient Usage

- Reduce gradient headers to max 2 per screen
- Use gradient ONLY for the single most important section
- Other sections: plain `text-lg font-bold text-gray-900` header with a bottom border

### Typography Scale

Add a "stat" size for gamification numbers:
```css
.stat-value { @apply text-3xl font-black tabular-nums; }
.stat-label { @apply text-[10px] font-bold tracking-widest uppercase text-gray-500; }
```

### Component Library Additions

| Component | Purpose |
|-----------|---------|
| `BottomTabBar` | Mobile navigation (5 tabs) |
| `CompactStreak` | Inline streak display (not a card) |
| `NextStepCard` | Single dominant action card |
| `HabitCircles` | 4 circles showing today's habit status |
| `CourseStrip` | Horizontal scrolling course cards |
| `SmartSuggestion` | AI Tutor suggestion chip |

---

## 14. Prioritized Implementation Roadmap

### P0 — Critical (Ship within 2 weeks)

| # | Change | Impact | Effort |
|---|--------|--------|--------|
| 1 | **Dashboard: Reduce to 7 sections** — Move HabitTracker (full), Attendance, CLO details, ProfileSummary, Challenges, Team to their respective pages | High (reduces scroll 60%) | Medium |
| 2 | **Dashboard: Replace 4-KPI row with a single "Next Step" card** — Keep KPIs on Progress page | High (answers "what should I do?") | Low |
| 3 | **Mobile: Add BottomTabBar** — 5 tabs: Home, Learn, Tutor, Progress, Me | High (mobile usability) | Medium |
| 4 | **AI Tutor: Remove persona picker gate** — Show suggested actions + direct chat | High (reduces friction to AI) | Low |
| 5 | **Assignments: Group by urgency** — "Due Today", "This Week", "Upcoming", "Done" | Medium (reduces decision fatigue) | Low |

### P1 — Important (Ship within 4 weeks)

| # | Change | Impact | Effort |
|---|--------|--------|--------|
| 6 | **Merge Courses + Assignments into "Learn" tab** — Unified urgency-first view | Medium (simplifies mental model) | Medium |
| 7 | **Sidebar: Reduce to 8 items** — Primary + Secondary, remove tertiary | Medium (reduces nav paralysis) | Low |
| 8 | **Dashboard: Compact streak + habits inline** — Not full cards | Medium (visual calm) | Low |
| 9 | **AI Tutor: Contextual suggestions** — Derive from deadlines, weak CLOs, recent courses | Medium (AI feels smarter) | Medium |
| 10 | **Progress page: Add trend arrows + actionable insights** — "Spend 20 min on X" | Medium (guides action) | Medium |

### P2 — Enhancement (Ship within 8 weeks)

| # | Change | Impact | Effort |
|---|--------|--------|--------|
| 11 | **Horizontal course strip on dashboard** — Scroll through enrolled courses | Low-Med | Low |
| 12 | **Card entrance animations** — Staggered fade-in-up | Low (polish) | Low |
| 13 | **Celebration animations for milestones** — Confetti on streak, badge pop | Low (delight) | Low |
| 14 | **Smart empty states** — Illustrations + actionable suggestions | Low (polish) | Medium |
| 15 | **Shared element transitions** — Card → Detail page morph | Low (polish) | High |
| 16 | **Content-aware shimmers** — Shimmer shapes match final content | Low (polish) | Low |
| 17 | **Reduce gradient headers** — Max 2 per screen, use text headers for others | Low (visual calm) | Low |
| 18 | **Pull-to-refresh on mobile** — Native-app feel | Low (UX) | Medium |

---

## 15. Phased Migration Plan

### Phase 1: Dashboard Simplification (Week 1–2)

**Goal:** Reduce dashboard from 17 sections to 7 without breaking existing features.

**Strategy:** Move sections to appropriate pages, don't delete them.

```
Files to modify:
- src/pages/student/StudentDashboard.tsx (remove sections, add NextStepCard)
- src/pages/student/progress/StudentProgressPage.tsx (add KPI row, CLO details)
- src/pages/student/habits/HabitsPage.tsx (add full HabitTracker, Difficulty)
- src/pages/student/StudentLayout.tsx (add BottomTabBar on mobile)

New files:
- src/components/shared/NextStepCard.tsx
- src/components/shared/CompactStreak.tsx
- src/components/shared/HabitCircles.tsx
- src/components/shared/BottomTabBar.tsx
```

**Risk mitigation:**
- Keep all removed sections accessible from their new locations
- Feature flag: `useCompactDashboard` toggle to A/B test
- Measure: scroll depth, time-to-first-action, dashboard abandonment rate

### Phase 2: Navigation + AI Tutor (Week 3–4)

**Goal:** Simplify navigation and make AI Tutor frictionless.

```
Files to modify:
- src/lib/navItems.ts (reduce student items)
- src/lib/navGroups.ts (simplify groups)
- src/components/shared/Sidebar.tsx (add secondary/overflow)
- src/pages/student/tutor/TutorPage.tsx (remove persona gate, add suggestions)

New files:
- src/hooks/useTutorSuggestions.ts (contextual suggestion logic)
- src/components/shared/TutorSuggestionChips.tsx
```

### Phase 3: Learn Tab + Mobile Polish (Week 5–8)

**Goal:** Merge courses/assignments into urgency-first view. Polish mobile experience.

```
Files to modify:
- src/pages/student/assignments/AssignmentListPage.tsx (urgency grouping)
- src/pages/student/courses/StudentCoursesPage.tsx (sort by urgency)
- src/router/AppRouter.tsx (add /student/learn route)

New files:
- src/pages/student/LearnPage.tsx (unified view)
- src/components/shared/CourseStrip.tsx
- src/components/shared/UrgencyCard.tsx
```

### Migration Safety

- **Zero breaking changes:** All existing routes remain valid (redirects added if needed)
- **Feature flags:** Each phase behind a flag for rollback
- **Progressive rollout:** Internal testing → 10% students → 50% → 100%
- **Measurement:** Track completion rates, session duration, AI Tutor usage before/after
- **Accessibility regression:** Run axe-core on every modified page before merge

---

## Summary

The current student experience is feature-rich but architecturally resembles an admin dashboard — it reports status rather than guiding action. The core insight from studying Duolingo, Khan Academy, and Brilliant is:

> **Great learning products answer one question at all times: "What should I do next?"**

The redesign proposes:
1. **Dashboard → Action launcher** (not status report) — from 17 sections to 7
2. **Navigation → 5 tabs** (not 18 items) — eliminate decision paralysis
3. **AI Tutor → Contextual companion** (not persona-gated chat) — appear where needed
4. **Gamification → Background motivation** (not dashboard clutter) — streak inline, badges on their own page
5. **Mobile → Native-app feel** (not responsive desktop) — bottom tab bar, thumb-reachable actions

All changes preserve Edeviser's brand identity (gradient accent, Shadcn/ui components, Noto Sans, teal-to-blue gradient system) while applying the UX principles that make modern learning products feel effortless, motivating, and focused.

---

*Research sources: [UserGuiding Duolingo UX Breakdown](https://userguiding.com/blog/duolingo-onboarding-ux/), [Appcues Duolingo Onboarding](https://goodux.appcues.com/blog/duolingo-user-onboarding), [UX Design Institute 2025 Onboarding](https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/), [Toptal Onboarding Patterns](https://www.toptal.com/designers/ux/user-onboarding-best-practices), [DesignerUp 200 Onboarding Flows](https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/), [UXCam 12 Best Onboarding 2026](http://uxcam.com/blog/10-apps-with-great-user-onboarding/), [UXPin Progressive Disclosure](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure), [Apple HIG Progressive Disclosure](https://developer.apple.com/videos/play/wwdc2022/10059). Content was rephrased for compliance with licensing restrictions.*
