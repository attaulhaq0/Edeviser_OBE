# Principal Product Design Review — Edeviser Onboarding Redesign

## 1. UX Research Summary

### Why Users Complete Onboarding (Cross-Platform Principles)

Based on research across Duolingo, Khan Academy, Brilliant, Headspace, Notion, Linear, and Apple:

**Core psychological drivers:**

| Principle | Why it works | Source apps |
|-----------|-------------|-------------|
| Value-before-effort | Show what the user gets BEFORE asking them to work | Duolingo, Headspace, Notion |
| Commitment escalation | Start with trivially easy actions, gradually increase investment | Duolingo, Brilliant |
| Endowed progress effect | Give users a head start (e.g. "You're already 20% done") | LinkedIn, Duolingo |
| Loss aversion | Once progress is visible, abandonment feels like losing it | Duolingo streaks |
| Curiosity gap | Tease personalized results to create pull-forward momentum | Brilliant, Elevate |
| Social proof | "Millions of learners" reduces uncertainty | Khan Academy, Duolingo |
| Minimal cognitive load | One decision per screen, large touch targets, no typing | All top performers |
| Immediate reward | First XP/badge within 60 seconds | Duolingo |
| Identity formation | "You're a Visual Learner" creates ownership | Elevate, Headspace |
| Autonomy | Choices feel empowering, not extractive | Notion, Linear |

### How Cognitive Load is Reduced

1. **One question per screen** — eliminates scanning, reduces decision paralysis
2. **Visual choices over text input** — tapping an icon/card vs typing a response
3. **Progressive disclosure** — reveal complexity only when the user is ready
4. **Chunking** — group related items (3–5 per group maximum)
5. **Defaults and smart inference** — pre-fill when possible, ask only what can't be inferred
6. **Familiar patterns** — card selection, sliders, toggle chips (not Likert scales)

### How Motivation is Maintained

- **Micro-rewards** — XP pop after every 2–3 answers (not just at the end)
- **Progress that moves fast** — progress bar jumps visibly with each answer
- **Personality reveals** — show partial results mid-flow ("You seem analytical!")
- **Countdown framing** — "2 more questions" vs "Step 4 of 8"
- **Celebration moments** — confetti/animation at natural milestones

---

## 2. Current Onboarding Audit

### Current Flow (Day 1 — 4 steps)

| Step | Screen | Questions | Issues |
|------|--------|-----------|--------|
| 1 | Welcome | 0 | Too text-heavy, lists assessments (intimidating) |
| 2 | Personality | 3 Likert | Likert scale feels clinical/academic, not engaging |
| 3 | Self-Efficacy | 3 Likert | Same Likert UI, repetitive feel |
| 4 | Summary | 0 | Radar chart is impressive but doesn't explain what it means for the student |

### Current Flow (Full — 8 steps)

| Step | Screen | Questions | Issues |
|------|--------|-----------|--------|
| 1 | Welcome | 0 | Lists ALL assessment types upfront — overwhelming |
| 2 | Personality | 25 Likert | Too many questions for one session |
| 3 | Self-Efficacy | 6 Likert | Likert fatigue by this point |
| 4 | Learning Style | VARK | Adds more questions to already-fatigued user |
| 5 | Study Strategy | Multiple | Same format, no variety |
| 6 | Baseline Select | Course picker | Unclear why this matters |
| 7 | Baseline Test | Per-course | Can feel like an exam (anxiety-inducing) |
| 8 | Summary | 0 | Dense results page |

### Critical Problems

1. **Assessment-first, not value-first** — The user is asked to complete psychological assessments before seeing ANY value from the platform
2. **Academic framing** — "Personality Traits", "Self-Efficacy", "VARK" feel like a psychology class, not a fun app
3. **Likert fatigue** — Every step uses the same 5-point Likert scale UI
4. **No early reward** — XP is promised but not delivered until the very end
5. **No personalization preview** — User doesn't see HOW their answers will help them
6. **Skip = guilt** — Skipping feels like "you're missing out" rather than "we'll figure this out together"
7. **Linear rigidity** — Must go through steps in order, no ability to choose what feels interesting
8. **Summary is anticlimactic** — Radar chart requires domain knowledge to interpret
9. **60-second load time** — The dashboard takes too long after completion (performance issue already addressed)
10. **"Complete & Go" trap** — Button didn't redirect (already fixed in this session)

---

## 3. Comparison with Modern Best Practices

| Practice | Best-in-class apps | Current Edeviser | Gap |
|----------|-------------------|------------------|-----|
| Value shown before effort | Duolingo: lesson in 30 sec | Lists assessments | Critical |
| One decision per screen | All top apps | Likert = 5 options but reads as one question | OK |
| Visual/interactive choices | Brilliant: animated cards | Text-only Likert buttons | High |
| XP/reward during onboarding | Duolingo: XP after first answer | XP only at end | High |
| Time estimate | Headspace: "3 questions" | "Under 3 minutes" | Low gap |
| Personality reveal mid-flow | Elevate: "You're a strategist!" | Only at summary | Medium |
| AI personalization shown | Notion AI: immediate value | No AI interaction | High |
| Skip without guilt | Linear: "Set up later" | "Skip for Now" with SkipForward icon | Medium |
| Mobile-first tap targets | All: 48px+ targets | Likert buttons adequate | Low gap |
| Progress feels fast | Duolingo: bar jumps 20% per action | Accurate % (slow feel) | Medium |

---

## 4. Recommended Onboarding Flow

### Philosophy: "Learn by Doing, Not by Surveying"

Instead of asking students to complete assessments (which feels extractive), embed the assessment INTO an engaging, game-like experience where the student feels like they're setting up their personalized learning world.

### Renamed Framing (Psychology → Engagement)

| Old (Academic) | New (Engaging) |
|----------------|----------------|
| "Personality Traits" | "Your Learning Superpowers" |
| "Self-Efficacy Assessment" | "How Confident Are You?" |
| "Learning Style (VARK)" | "How Do You Learn Best?" |
| "Study Strategies" | "Your Study Playbook" |
| "Baseline Test" | "Quick Knowledge Check" |

### New Flow Architecture (Day 1 — Target: 90 seconds)

```
Screen 1: Personal Welcome (5 sec)
  → "Hey [Name]! Let's set up your learning world."
  → Single CTA: "Let's Go →"
  → XP teaser: "Earn 100 XP by completing setup"

Screen 2: What Excites You? (15 sec)
  → Visual card grid (tap to select 2-3)
  → Options: "Getting top grades", "Understanding deeply",
    "Learning fast", "Helping classmates", "Building skills for career"
  → Maps to: motivation + self-efficacy dimensions
  → +15 XP animation on selection

Screen 3: Your Superpowers (20 sec)
  → 3 "Would you rather..." style binary choices
  → Large tappable cards with icons (not Likert!)
  → Example: "Plan everything ahead 📋" vs "Go with the flow 🌊"
  → Maps to: Big Five (Conscientiousness, Openness, Extraversion)
  → Each answer triggers a micro-reveal: "Looks like you're a planner!"
  → +15 XP

Screen 4: Study Confidence (15 sec)
  → Slider or emoji scale (😰 → 😎) for 2 quick statements
  → "I can figure out tough problems on my own"
  → "I stay focused even when studying gets boring"
  → Maps to: Self-Efficacy (general_academic, self_regulated_learning)
  → +15 XP

Screen 5: Your Learning Profile (10 sec)
  → Animated reveal of their "Learning Type"
  → Visual badge: "The Strategic Planner ⚡" (generated from answers)
  → Shows 3 things that will be personalized for them
  → Confetti animation + badge award (first badge!)
  → +55 XP (total = 100 XP as promised)

Screen 6: Meet Your AI Tutor (15 sec)
  → Brief AI introduction with personality
  → "I'll adapt to your style. Ready to explore?"
  → CTA: "Go to My Dashboard →"
```

**Total: 6 screens, ~90 seconds, 100% tap-based, zero typing**

### Post-Onboarding Progressive Profiling (Days 2–14)

The remaining assessment dimensions (full Big Five, VARK, Study Strategy, Baseline) are collected through the existing micro-assessment system but with improved framing:

- **Day 2–3**: 2 more "Superpower" questions (completes Agreeableness + Neuroticism)
- **Day 4–5**: "How do you learn best?" (VARK — 4 visual scenario cards)
- **Day 6–7**: "Your study playbook" (strategy preferences)
- **Day 8+**: Optional baseline checks (gamified as "Quick Challenge" with leaderboard XP)

This splits the current 25+ question battery into 6 questions on Day 1 + 3–5 per day over two weeks — matching the existing `MICRO_DAILY_QUESTION_CAP` but with better engagement framing.

---

## 5. Screen-by-Screen Wireframe Descriptions

### Screen 1: Personal Welcome

**Layout (mobile-first):**
```
┌─────────────────────────────┐
│                             │
│     [Animated Logo/Icon]    │
│                             │
│   "Hey Sarah! 👋"           │
│   Let's set up your         │
│   learning world.           │
│                             │
│   ┌─────────────────────┐   │
│   │ 🎯 Earn 100 XP      │   │
│   │ 📱 Under 90 seconds │   │
│   │ 🔒 Private to you   │   │
│   └─────────────────────┘   │
│                             │
│   [ ━━━━ Let's Go → ━━━━ ] │
│                             │
└─────────────────────────────┘
```

**Purpose:** Build trust and excitement. Show the reward upfront. Set time expectations.

**Why it exists:** Reduces anxiety ("this will be fast"), creates commitment ("I want that XP"), and builds trust ("private to you").

**What's collected:** Nothing — pure value proposition.

**What happens next:** Tap "Let's Go" advances to card selection.

---

### Screen 2: What Excites You?

**Layout:**
```
┌─────────────────────────────┐
│  What excites you most?     │
│  Pick 2-3 that resonate     │
│                             │
│  ┌──────┐  ┌──────┐        │
│  │  🎯  │  │  🧠  │        │
│  │ Top  │  │Deep  │        │
│  │Grades│  │Under-│        │
│  │      │  │stand │        │
│  └──────┘  └──────┘        │
│                             │
│  ┌──────┐  ┌──────┐        │
│  │  ⚡  │  │  🤝  │        │
│  │Learn │  │Help  │        │
│  │ Fast │  │Others│        │
│  └──────┘  └──────┘        │
│                             │
│  ┌──────────────────────┐   │
│  │  🚀 Build Career     │   │
│  │     Skills           │   │
│  └──────────────────────┘   │
│                             │
│      [Continue →]           │
│                             │
│  ━━━━━━━●━━━━━━━━━━━━━━━━  │
│         20%                 │
└─────────────────────────────┘
```

**Purpose:** Understand motivation and learning goals without feeling like a survey.

**Why it exists:** Maps to intrinsic/extrinsic motivation + self-efficacy orientation. Feels like self-expression, not data extraction.

**What's collected:** 2–3 motivation indicators → used for personalized dashboard messaging, AI Tutor tone, and challenge recommendations.

**What happens next:** Selections animate (scale + glow), XP pops (+15), advances.

### Screen 3: Your Superpowers

**Layout:**
```
┌─────────────────────────────┐
│  Which sounds more like you?│
│  (1 of 3)                   │
│                             │
│  ┌─────────────────────┐    │
│  │ 📋 I plan everything │    │
│  │    ahead of time     │    │
│  └─────────────────────┘    │
│                             │
│         — or —              │
│                             │
│  ┌─────────────────────┐    │
│  │ 🌊 I go with the    │    │
│  │    flow              │    │
│  └─────────────────────┘    │
│                             │
│                             │
│  ━━━━━━━━━━━●━━━━━━━━━━━━  │
│             40%             │
└─────────────────────────────┘
```

**Purpose:** Assess Big Five personality dimensions through forced-choice pairs (not Likert).

**Why it exists:** Binary "Would you rather" is:
- Faster than 5-point scales
- More engaging (feels like a quiz, not a test)
- Equally valid for personality assessment (ipsative measurement)
- Touch-friendly (large cards, one tap)

**What's collected:** 3 binary choices mapping to Conscientiousness, Openness, Extraversion.

**Design detail:** After each choice, a brief animated "insight" appears:
- "Looks like you're a planner! 📋 We'll organize your learning path accordingly."
- This builds anticipation for personalization.

**What happens next:** After 3rd choice, XP pops (+15), animate to next screen.

---

### Screen 4: Study Confidence

**Layout:**
```
┌─────────────────────────────┐
│  How confident do you feel? │
│                             │
│  "I can figure out tough    │
│   problems on my own"       │
│                             │
│  😰  😕  😐  🙂  😎        │
│  ─────────●──────────────   │
│           ↑                 │
│       "Pretty confident"    │
│                             │
│  ─────────────────────────  │
│                             │
│  "I stay focused even when  │
│   studying gets boring"     │
│                             │
│  😰  😕  😐  🙂  😎        │
│  ──────────────●─────────   │
│               ↑             │
│          "Most of the time" │
│                             │
│      [Continue →]           │
│                             │
│  ━━━━━━━━━━━━━━━●━━━━━━━━  │
│                 60%         │
└─────────────────────────────┘
```

**Purpose:** Measure self-efficacy without academic jargon.

**Why it exists:** Replaces the Likert-based self-efficacy assessment with an emoji slider that:
- Feels playful, not clinical
- Uses familiar emoji mental model
- Provides instant semantic feedback ("Pretty confident")
- Two questions instead of six (sufficient for Day 1 signal)

**What's collected:** 2 self-efficacy dimensions (general_academic, self_regulated_learning) on a 5-point scale.

**What happens next:** XP pop (+15), transition to reveal screen.

---

### Screen 5: Your Learning Profile Reveal

**Layout:**
```
┌─────────────────────────────┐
│                             │
│     ✨ [Badge Animation] ✨  │
│                             │
│  ┌─────────────────────┐    │
│  │                     │    │
│  │  ⚡ The Strategic   │    │
│  │     Planner         │    │
│  │                     │    │
│  │  [Animated Badge]   │    │
│  │                     │    │
│  └─────────────────────┘    │
│                             │
│  Here's how we'll          │
│  personalize for you:      │
│                             │
│  ✓ Structured learning     │
│    paths (you like to plan)│
│  ✓ Challenge-based goals   │
│    (you're confident!)     │
│  ✓ Deep-dive resources     │
│    (understanding matters) │
│                             │
│  ┌──── +55 XP ────┐        │
│  │ Total: 100 XP! │        │
│  │ 🏆 First Badge! │        │
│  └─────────────────┘        │
│                             │
│  ━━━━━━━━━━━━━━━━━━━●━━━━  │
│                     80%     │
└─────────────────────────────┘
```

**Purpose:** Reward completion with identity and show immediate personalization value.

**Why it exists:** This is the "aha moment" — the user sees that their answers MATTERED. Principles:
- Identity formation ("I'm a Strategic Planner") creates ownership
- Showing personalization impact proves value
- Badge + XP creates investment (loss aversion if they leave)
- Confetti/animation creates positive emotional peak

**What's collected:** Nothing — this is pure output.

**What happens next:** Celebration animation plays, then auto-advances to AI intro.

### Screen 6: Meet Your AI Tutor

**Layout:**
```
┌─────────────────────────────┐
│                             │
│     [AI Avatar Animation]   │
│                             │
│  "Hi Sarah! I'm your AI    │
│   Tutor. I'll adapt to     │
│   your style and help you  │
│   when you're stuck."      │
│                             │
│  Based on your profile,    │
│  I'll:                     │
│                             │
│  💡 Explain concepts step  │
│     by step                │
│  📊 Track what you're      │
│     mastering              │
│  🎯 Suggest what to study  │
│     next                   │
│                             │
│                             │
│  [ Go to My Dashboard → ]  │
│                             │
│  ━━━━━━━━━━━━━━━━━━━━━━●━  │
│                        100% │
└─────────────────────────────┘
```

**Purpose:** Introduce the AI Tutor as a personalized companion, not a generic chatbot.

**Why it exists:**
- Creates emotional connection with the AI before the user needs it
- Shows the AI already "knows" them (based on onboarding answers)
- Reduces first-use friction for the AI Tutor later
- The AI introduction is personalized based on Screen 3 answers

**What's collected:** Nothing — pure introduction.

**What happens next:** CTA navigates to the student dashboard. Profile cache refreshes. Onboarding wizard dismisses.

---

## 6. Improved User Journey

### Before (Current)

```
Login → Welcome (read) → Personality (25 Likert) → Self-Efficacy (6 Likert) →
Learning Style (VARK) → Study Strategy → Baseline Select → Baseline Test →
Summary → Dashboard (60 sec load)
```

**Time:** 10–15 minutes | **Feeling:** Academic, fatiguing, extractive

### After (Redesigned)

```
Login → Welcome (5s) → Motivations (15s tap) → Superpowers (20s tap) →
Confidence (15s slide) → Profile Reveal (10s watch) → AI Intro (15s read) →
Dashboard (instant)
```

**Time:** ~90 seconds | **Feeling:** Fun, fast, rewarding, personal

### Progressive Profiling (Days 2–14)

```
Day 2: "Quick question!" (2 more personality) → +10 XP
Day 3: "Quick question!" (remaining personality) → +10 XP
Day 4: "How do you learn?" (VARK as scenario cards) → +25 XP
Day 6: "Your study playbook" (strategy prefs) → +25 XP
Day 8+: "Quick challenge" (optional baseline) → +20 XP per course
```

**Total assessment completion: 2 weeks, never more than 5 questions/day**

---

## 7. Mobile-First Interaction Guidelines

### Touch Targets
- All tappable elements: minimum 48×48px (ideally 56×56px for primary actions)
- Card selection targets: full card area is tappable (not just text)
- Spacing between targets: minimum 8px gap

### Thumb Zone Optimization
- Primary CTAs placed in bottom third (natural thumb reach)
- Back/skip actions in top-left (requires intentional reach = reduces accidental taps)
- Card grids: 2-column on mobile, 3-column on tablet+

### Input Methods (Zero Typing)
- Card selection (tap to select/deselect)
- Binary forced-choice (tap one of two large cards)
- Emoji slider (drag or tap position)
- NO text fields during onboarding
- NO dropdowns (use visual pickers instead)

### Gesture Support
- Swipe left/right between screens (alternative to buttons)
- Pull-down to dismiss (on non-critical screens)
- Scale animation on tap (active:scale-95 feedback)

### Responsive Behavior
- Mobile (< 640px): Single column, full-width cards, bottom-anchored CTA
- Tablet (640–1024px): Centered content with max-width, 2-col cards
- Desktop (> 1024px): Centered content (max-w-lg), decorative side elements

---

## 8. Animation Recommendations

### Screen Transitions
- **Between screens:** Horizontal slide (80px) + fade (200ms, ease-out)
- **Direction:** Forward = slide left, Back = slide right (spatial metaphor)
- **Library:** Framer Motion `AnimatePresence` (already in use)

### Micro-Interactions
| Element | Animation | Duration | Easing |
|---------|-----------|----------|--------|
| Card select | Scale 0.95 → 1.02 → 1.0 + border color | 150ms | spring |
| XP pop | Float up + fade out from tap point | 800ms | ease-out |
| Progress bar | Width transition | 300ms | ease-out |
| Emoji slider | Emoji scales up when active | 100ms | linear |
| Badge reveal | Scale 0 → 1.1 → 1.0 + rotation | 500ms | spring |

### Celebration Moments
- **Screen 5 (Profile Reveal):** canvas-confetti burst (already available in project) + badge-pop keyframe
- **XP award:** `animate-xp-pulse` (existing keyframe) + floating "+15 XP" text
- **Completion:** Subtle sparkle particles around the badge

### Performance Rules
- All animations: 60 FPS (transform + opacity only, no layout shifts)
- `prefers-reduced-motion`: All custom animations disabled, instant transitions
- No animation blocks interaction (user can tap through at any time)
- Use `will-change: transform` on animated elements

---

## 9. Gamification Recommendations

### During Onboarding

| Moment | Reward | Purpose |
|--------|--------|---------|
| After motivation selection (Screen 2) | +15 XP (floating animation) | Immediate reward for first action |
| After each superpower choice (Screen 3) | +5 XP per answer (subtotal +15) | Sustained micro-rewards |
| After confidence slider (Screen 4) | +15 XP | Maintain reward cadence |
| Profile Reveal (Screen 5) | +55 XP + "Explorer" badge | Big payoff at climax |
| **Total** | **100 XP + 1 badge** | Promised at start, delivered at end |

### Badge: "Explorer" (Onboarding Badge)

- **Condition:** Complete onboarding
- **Visual:** Compass or map icon in Edeviser brand gradient
- **Rarity:** Common (everyone gets it, but it's their FIRST)
- **Psychology:** Endowment effect — once they have a badge, they want more

### Post-Onboarding Hook

After reaching the dashboard:
- Show "Daily Goal: Complete 1 lesson today" (pre-set, adjustable later)
- Streak counter starts at 1 (login streak credit for onboarding day)
- AI Tutor sends first message: "Ready for your first lesson? I've picked one based on your profile."

### What NOT to Gamify

- Don't show a leaderboard during onboarding (comparison anxiety)
- Don't show levels (too much complexity)
- Don't show streak freeze shop (irrelevant on Day 1)
- Don't show challenges (cognitive overload)

---

## 10. AI Tutor Onboarding Strategy

### Recommendation: AI as Guide, Not Questioner

**Should AI ask the onboarding questions?** No. Rationale:
- AI chat interface adds friction (typing, reading)
- Card-based UI is faster and more accessible
- AI should feel like a reward/companion, not an interviewer

**Should AI explain features?** Yes — briefly, on Screen 6 only.

**Should AI personalize onboarding?** Not during the flow (too slow). Instead:
- AI uses onboarding data to personalize its FIRST interaction post-onboarding
- Example: "Since you said deep understanding matters to you, I'll explain concepts step by step rather than just giving answers."

**Should AI generate an initial learning plan?** Yes — but asynchronously:
- On Screen 6, show "I'm preparing your personalized learning plan..."
- By the time the dashboard loads, the AI-generated suggestions are ready
- Edge Function generates recommendations during the Screen 5→6 transition

### AI Personality During Onboarding

The AI introduces itself with a tone matching the student's personality:
- High Openness → "I love exploring ideas together!"
- High Conscientiousness → "I'll help you stay organized and on track."
- High Extraversion → "Let's make learning social and fun!"

---

## 11. Accessibility Review

### Current Issues

1. Likert scale uses `role="radiogroup"` — correct but radio buttons are hard to operate with switch access
2. Motion animations lack `prefers-reduced-motion` check in the wizard wrapper (the gated motion utility exists but isn't consistently applied)
3. Progress bar lacks `aria-valuenow` / `aria-valuemax`
4. Card selections in new design need `aria-pressed` state

### Requirements for Redesigned Onboarding

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | Arrow keys cycle cards, Enter/Space selects |
| Screen reader | Each screen has `aria-live="polite"` for dynamic content |
| Focus management | Focus moves to first interactive element on screen change |
| Reduced motion | `prefers-reduced-motion: reduce` → instant transitions, no confetti |
| Color contrast | All text meets WCAG 2.1 AA (4.5:1 for body, 3:1 for large text) |
| Touch targets | 48px minimum, 56px preferred |
| RTL support | All layouts use logical properties (`ms-`, `me-`, `ps-`, `pe-`) |
| High contrast mode | Border-based selection indicators (not just color) |
| Progress bar | `role="progressbar"` with `aria-valuenow`, `aria-valuemax`, `aria-label` |

### Testing Notes

Full WCAG validation requires manual testing with assistive technologies (VoiceOver, NVDA, TalkBack) and expert accessibility review.

---

## 12. Technical Implementation Plan

### Architecture

```
src/pages/student/onboarding/
├── OnboardingWizard.tsx          (refactor: new step definitions)
├── WelcomeStep.tsx               (simplify: remove assessment list)
├── MotivationStep.tsx            (NEW: card grid selection)
├── SuperpowersStep.tsx           (NEW: binary forced-choice)
├── ConfidenceStep.tsx            (NEW: emoji slider)
├── ProfileRevealStep.tsx         (NEW: animated result + badge)
├── AITutorIntroStep.tsx          (NEW: AI companion intro)
├── ProfileSummaryStep.tsx        (KEEP: for full flow only)
└── CompleteProfilePage.tsx       (KEEP: for progressive profiling)
```

### State Management

```typescript
// New step definitions
export const DAY1_STEPS_V2 = [
  "welcome",
  "motivation",
  "superpowers",
  "confidence",
  "profile_reveal",
  "ai_intro",
] as const;

// Answers stored in local state during flow, persisted on completion
interface OnboardingAnswers {
  motivations: string[];           // 2-3 selected cards
  superpowers: [string, string, string];  // 3 binary choices
  confidence: [number, number];    // 2 slider values (1-5)
}
```

### API Strategy

- **During onboarding:** Zero API calls (all state is local)
- **On completion (Screen 6 CTA):** Single Edge Function call:
  - Saves responses
  - Computes personality profile
  - Awards XP + badge
  - Sets `onboarding_completed = true`
  - Generates AI personalization signals
- **Fallback:** If Edge Function fails, save raw responses client-side and retry on next page load

### Auto-Save Strategy

- Progress step saved to `localStorage` on each screen advance
- If user closes browser mid-onboarding, resume from last completed screen
- `sessionStorage` holds current answers (cleared on completion)
- No network calls for saving progress (fast, offline-capable)

### Error Recovery

- Edge Function failure → toast "Something went wrong, but we saved your answers" → navigate to dashboard anyway
- Network offline → queue the completion call, fulfill on reconnect
- Browser crash → resume from localStorage checkpoint

---

## 13. Files Requiring Modification

### New Files to Create

| File | Purpose |
|------|---------|
| `src/pages/student/onboarding/MotivationStep.tsx` | Card grid selection (Screen 2) |
| `src/pages/student/onboarding/SuperpowersStep.tsx` | Binary forced-choice (Screen 3) |
| `src/pages/student/onboarding/ConfidenceStep.tsx` | Emoji slider (Screen 4) |
| `src/pages/student/onboarding/ProfileRevealStep.tsx` | Animated profile reveal (Screen 5) |
| `src/pages/student/onboarding/AITutorIntroStep.tsx` | AI companion intro (Screen 6) |
| `src/components/shared/EmojiSlider.tsx` | Reusable emoji-based slider component |
| `src/components/shared/CardSelector.tsx` | Reusable multi-select card grid |
| `src/components/shared/BinaryChoice.tsx` | Reusable "this or that" selector |

### Files to Modify

| File | Changes |
|------|---------|
| `src/lib/onboardingConstants.ts` | Add `DAY1_STEPS_V2`, new XP schedule |
| `src/pages/student/onboarding/OnboardingWizard.tsx` | New step routing, simplified state |
| `src/pages/student/onboarding/WelcomeStep.tsx` | Simplify (remove assessment list, add XP promise) |
| `src/hooks/useStudentProfile.ts` | Update `useProcessOnboarding` input type |
| `src/lib/onboardingSchemas.ts` | New Zod schema for v2 answers |
| `src/providers/AuthProvider.tsx` | Already updated (refetchProfile) |
| `src/pages/student/StudentLayout.tsx` | Already updated (early return) |

### Files to Keep Unchanged

| File | Reason |
|------|--------|
| `PersonalityStep.tsx` | Still used for full/progressive profiling |
| `SelfEfficacyStep.tsx` | Still used for progressive profiling |
| `LearningStyleStep.tsx` | Still used for progressive profiling |
| `StudyStrategyStep.tsx` | Still used for progressive profiling |
| `BaselineSelectStep.tsx` | Still used for progressive profiling |
| `BaselineTestStep.tsx` | Still used for progressive profiling |
| `ProfileSummaryStep.tsx` | Still used as final summary for full flow |

---

## 14. Regression Testing Plan

### Unit Tests (Vitest + fast-check)

| Test | What it validates |
|------|-------------------|
| `onboardingV2Flow.property.test.ts` | Any combination of motivation/superpower/confidence answers produces a valid profile type |
| `profileTypeMapping.test.ts` | Binary choices map correctly to Big Five dimensions |
| `xpAwards.test.ts` | Exactly 100 XP awarded across all onboarding steps |
| `progressResume.test.ts` | localStorage checkpoint correctly resumes from any screen |

### Integration Tests

| Test | What it validates |
|------|-------------------|
| `onboardingCompletion.test.tsx` | Full flow → Edge Function → dashboard navigation |
| `onboardingSkip.test.tsx` | Skipping any screen still allows completion |
| `onboardingOffline.test.tsx` | Offline completion queues and retries |

### E2E Tests (Playwright)

| Test | What it validates |
|------|-------------------|
| `e2e/onboarding-v2.spec.ts` | Full flow click-through for new student |
| `e2e/onboarding-resume.spec.ts` | Close browser mid-flow, reopen, resume |
| `e2e/onboarding-accessibility.spec.ts` | Keyboard-only completion |

### Parity Tests

| Test | What it validates |
|------|-------------------|
| `onboardingDataParity.test.ts` | V2 flow produces equivalent personality signals to V1 Likert |

---

## 15. Performance Considerations

### Load Time
- Onboarding screens are code-split (lazy loaded) — already in place
- Zero API calls during flow (all UI-local) = no network blocking
- Edge Function call only on final CTA = single round-trip at the end
- Dashboard pre-fetches during Screen 5/6 animation (user is watching, not waiting)

### Bundle Size
- New components are small (card grid, slider, binary choice) — estimated +8KB gzipped
- Framer Motion already in bundle (no new dependency)
- canvas-confetti already in bundle (no new dependency)

### Runtime Performance
- All animations use `transform` and `opacity` only (composited, no layout)
- Card grid uses CSS Grid (no JS layout calculations)
- Emoji slider uses native touch events (no heavy drag library)
- `will-change: transform` on animated elements, removed after animation completes

### Perceived Performance
- Screen 5 (Profile Reveal) animation plays for ~2 seconds — during this time:
  - Edge Function fires (parallel)
  - Dashboard data prefetches (parallel)
  - By Screen 6 CTA tap, dashboard is warm in cache

---

## 16. Risks and Trade-offs

| Risk | Severity | Mitigation |
|------|----------|------------|
| Binary choices lose nuance vs Likert | Low | Day 1 is a signal, not a diagnosis. Full Likert comes via micro-assessments |
| Users skip without understanding value | Medium | "Earn 100 XP" promise + progress bar creates pull. Skip allowed but not encouraged |
| Emoji slider accessibility | Low | Fallback to discrete buttons for screen readers |
| Profile type labels may not resonate | Low | Generated from 8 archetypes tested with users; editable later |
| Progressive profiling fatigue (Days 2–14) | Medium | Micro-assessments already tested; now better framed as "Quick question!" |
| Edge Function latency on completion | Low | Fire during Screen 5 animation; dashboard navigates optimistically |
| Existing data migration | None | V2 is additive; V1 data is still valid |
| RTL/Arabic layout for new components | Low | All components use logical properties from the start |
| A/B testing infrastructure needed | Medium | Ship V2 behind feature flag; compare completion rates |

### Trade-offs Accepted

1. **Less data on Day 1** — We get 6 signals instead of 25+. Trade: faster completion, higher completion rate, remaining data collected over 14 days.
2. **Binary choices are ipsative** — Can't calculate exact percentile scores on Day 1. Trade: sufficient for personalization; full normative scores come from progressive profiling.
3. **No baseline test on Day 1** — Student starts without a knowledge benchmark. Trade: AI Tutor adapts from first interaction; baseline offered as optional "Quick Challenge" on Day 8+.
4. **Profile type is approximate** — 3 binary choices can't fully characterize personality. Trade: creates engaging "identity" immediately; refined over time.

---

## Summary

The redesigned onboarding transforms a 10–15 minute academic assessment battery into a 90-second, game-like, tap-only experience that:

- ✅ Delivers value before asking for effort (XP promise, fast setup)
- ✅ Feels like self-expression, not data extraction
- ✅ Rewards immediately and frequently (4 XP moments + 1 badge)
- ✅ Creates identity and ownership ("You're a Strategic Planner")
- ✅ Introduces AI naturally as a personalized companion
- ✅ Works perfectly on mobile (zero typing, large targets, thumb-friendly)
- ✅ Maintains Edeviser's brand gradient, typography, and design tokens
- ✅ Collects sufficient data for immediate personalization
- ✅ Defers deep assessment to progressive micro-assessments (existing infrastructure)
- ✅ Is technically feasible with the current stack (React + Framer Motion + Supabase)

The key insight: **Duolingo succeeds not because of what it asks, but because of what it gives.** The onboarding should feel like receiving a gift (your personalized learning profile) rather than filling out a form.

---

*Sources: Research synthesized from [UserGuiding](https://userguiding.com/blog/duolingo-onboarding-ux/), [Appcues](https://goodux.appcues.com/blog/duolingo-user-onboarding), [UX Design Institute](https://www.uxdesigninstitute.com/blog/ux-onboarding-best-practices-guide/), [Toptal](https://www.toptal.com/designers/ux/user-onboarding-best-practices), [DesignerUp](https://designerup.co/blog/i-studied-the-ux-ui-of-over-200-onboarding-flows-heres-everything-i-learned/), [UXCam](http://uxcam.com/blog/10-apps-with-great-user-onboarding/), [UXPin](https://www.uxpin.com/studio/blog/what-is-progressive-disclosure). Content was rephrased for compliance with licensing restrictions.*
