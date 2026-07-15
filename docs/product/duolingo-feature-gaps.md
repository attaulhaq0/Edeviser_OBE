# What Else to Steal from Duolingo — Mapped to Edeviser

Research-based gap analysis. The guiding rule (from your own note): **steal the flow, not the goal.** Every mechanic below is tied to a real learning outcome (a CLO, Bloom level, or mastery) so activation and actual learning stay aligned — not just a retention machine.

## Tier 1 — Flagship gaps (highest impact)

### 1. The Learning Path (added to prototype: `path.html`)
Duolingo's single most important mechanic. A visual, winding path of nodes where the next step is never in question.

- **Edeviser mapping:** Per-course path of nodes **ordered by Bloom's taxonomy** (Remember → Understand → Apply → Analyze → Evaluate → Create). Your domain already defines "Learning Path orders assignments by Bloom's level" and "prerequisite gates use CLO attainment."
- **Why it wins:** Replaces the "wall of courses/assignments" with one obvious next action. Eliminates decision fatigue.
- **Gate = real learning:** A node unlocks only when the prerequisite CLO hits its attainment threshold (e.g. 70%). So progress = genuine mastery, not just clicking.

### 2. Daily Goal commitment + ring (ring added to prototype dashboard)
Duolingo asks you to commit to a daily goal (Casual/Regular/Serious) and shows a ring to close.

- **Edeviser mapping:** During onboarding, pick a daily XP/time goal. Dashboard shows a "close your ring" progress circle.
- **Why it wins:** Self-set commitment + visible daily target drives the return habit. Loss aversion once the ring is partly filled.

### 3. Mistakes Bank + Spaced Repetition (added to prototype: "Review 5 mistakes")
The feature that answers your caveat — this is about **outcome, not just activation.**

- **Edeviser mapping:** Wrong answers on quizzes/micro-assessments are queued and resurfaced on a spaced-repetition schedule. "Review 5 mistakes (+15 XP)."
- **Why it wins:** Retrieval practice + spacing are the two most evidence-backed learning techniques. This makes the gamification actually teach.

## Tier 2 — Strong additions

### 4. Bite-sized sessions with instant feedback
Duolingo lessons are 3–5 min with immediate right/wrong, a combo counter, and an end-of-session summary.

- **Edeviser mapping:** Turn micro-assessments and quiz attempts into short sessions with instant feedback, a "combo" for consecutive correct answers, and a session-end recap ("4/5 correct, +20 XP").

### 5. Double-or-Nothing / XP Wager
A commitment device: wager XP that you'll keep your streak N days; win double.

- **Edeviser mapping:** "Wager 50 XP that you'll study 5 days this week → win 100." Uses your existing XP economy + streak system.

### 6. Unit checkpoints & mastery levels ("Legendary")
After a unit, a checkpoint quiz; nodes can be leveled up to mastery.

- **Edeviser mapping:** End-of-unit **CLO Mastery Quiz** (checkpoint node on the path). Mastery tiers per CLO. Ties directly to attainment rollup.

### 7. A consistent companion character
Duo the owl is an active participant (celebrates, nudges, guides).

- **Edeviser mapping:** Give your **AI Tutor a consistent, friendly persona** that shows up at key moments — celebrates a submission, nudges before a deadline, congratulates a streak milestone. You already have the AI Tutor; lean into personality (keep your own brand, not an owl).

## Tier 3 — Polish & retention

### 8. Warm, personality-driven notifications
Streak reminders and "your streak is at risk" framed encouragingly, not naggy.

### 9. Session-end + weekly recap
"You earned 65 XP and kept your 12-day streak!" and a periodic "your week in review" story (shareable).

### 10. Sound & haptic feedback
Subtle success sounds and haptics on correct answers / XP gains (mobile). Big part of why Duolingo *feels* good. Respect a mute/reduced-motion setting.

## Improvements to what you already have

| Existing feature | Duolingo-style improvement |
|---|---|
| Streak (freeze, sabbatical) | Make it front-and-center; show the streak calendar and "at risk" state warmly |
| Leaderboard / League tier | Already league-based — add the weekly promotion/demotion drama and a countdown |
| Tiered badges | Add badge "reveal" moments + progress-to-next-tier nudges (partly there) |
| Habits (8-habit grid) | Collapse to the day's core habits + a "Perfect Day" ring (done in prototype) |
| Onboarding | Add the daily-goal commitment screen; frame everything as reward |
| Dashboard | Lead with the Path + one Next Step (done in prototype); defer the rest |

## The "flow not goal" guardrail (important)

Duolingo is criticized for optimizing activation over outcome. To avoid building "a retention machine people love but don't grow from," keep these rules:

1. **XP is only earned by outcome-linked work** — submissions, mastery, corrected mistakes — never by idle taps.
2. **The Path is Bloom-ordered and gated by CLO attainment** — you literally cannot advance without demonstrating learning.
3. **The Mistakes Bank drives mastery** — the fun loop *is* the learning loop (retrieval + spacing).
4. **Separate the metrics:** track "did they return" (activation) AND "did attainment improve" (outcome). If XP rises but attainment doesn't, the design is off.

## Prototype status

Added to the live prototype so you can demo them:
- `path.html` — the Learning Path (flagship)
- Dashboard: Daily Goal ring, "Continue Your Path" card, "Review mistakes" practice card
- Desktop phone-frame so it presents cleanly on a laptop

## Desktop presentation note

The app is mobile-first. Two options for laptop/desktop:
- **A (done):** Centered phone frame — best for investor demos; instantly reads as "the mobile app."
- **B (future):** True responsive desktop — left sidebar + multi-column content. More build effort; do this when you convert to the real React app, not for the demo.
