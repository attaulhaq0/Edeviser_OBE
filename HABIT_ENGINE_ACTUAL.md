# HABIT ENGINE — ACTUAL IMPLEMENTATION AUDIT
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## 1. WHAT ACTUALLY EXISTS

### Database Tables
| Table | Purpose | Status |
|-------|---------|--------|
| `habit_logs` | Daily habit events (habit_type + date + student_id) | ACTIVE, populated |
| `habit_tracking` | Per-day tracking flags (login, submit, journal, read, is_perfect_day) | ACTIVE |
| `habit_correlations` | Correlation tracking between habits and outcomes | CONTRACT ONLY — table exists |
| `student_habit_levels` | Computed habit level per student | ACTIVE |
| `student_habit_level_history` | Historical habit level snapshots | ACTIVE |
| `wellness_habit_logs` | Wellness habit tracking (separate from academic) | ACTIVE |

### Four Daily Habits (hardcoded in `perfectDay.ts`)
```typescript
const REQUIRED_HABITS = ["login", "submit", "journal", "read"] as const;
```
- **login**: Student logs in
- **submit**: Student submits an assignment/assessment
- **journal**: Student writes a journal entry
- **read**: Student reads course material

### Streak System (`streakCalculator.ts`)
- Streak count incremented on consecutive daily logins
- Milestones at 7, 14, 30, 60, 100 days (with XP awards)
- Streak freezes: prevents streak break on missed day
- Comeback Challenge: restore half of lost streak after 3-day challenge
- `process-streak` edge function handles streak updates (cron-triggered)

### Perfect Day Award (`perfectDay.ts`)
- All 4 habits completed in one day = 50 XP
- Idempotent via `perfect_day:{studentId}:{date}` reference key
- Fires badge check on completion

### Habit Heatmap (`src/pages/student/habits/HabitHeatmapPage.tsx`)
- Visual calendar showing habit completion per day
- Color-coded by habit type and completion status

---

## 2. WHAT IS NOT IMPLEMENTED

| BJ Fogg Concept | Status | Evidence |
|----------------|--------|----------|
| Motivation (M) | NOT IMPLEMENTED | No motivation modeling anywhere |
| Ability (A) | NOT IMPLEMENTED | No ability/simplicity modeling |
| Prompt (P) | NOT IMPLEMENTED | No prompt/trigger modeling |
| B=MAP formula | NOT IMPLEMENTED | No Fogg Behavior Model reference |
| Behavior definitions | NOT IMPLEMENTED | No behavior taxonomy beyond 4 hardcoded habits |
| Habit signal normalization | PARTIAL | JSON blobs in student_learning_states.habits |
| Formal habit taxonomy | NOT IMPLEMENTED | 4 string constants, no registry |
| Motivation wave | NOT IMPLEMENTED | No motivation tracking over time |
| Tiny Habits® methodology | NOT IMPLEMENTED | No anchored behavior design |

### The "Habit Engine" is Actually:
1. A **daily habit tracker** (4 binary events)
2. A **streak counter** with gamification (milestones, freezes, comeback)
3. A **perfect day detector** with XP reward
4. **Habit signal storage** as JSON in `student_learning_states.habits`

It is **not** a BJ Fogg-based behavior model.

---

## 3. HABIT → LEARNER STATE FUSION

The `student_learning_states` table contains a `habits` JSON column:
```typescript
habits: {
  windowDays: number;
  signals: JsonObject;
}
```

### Signal Types (from `StudentLearningStateContract`)
The contract defines but does NOT enforce structured signal types. Signals are passed as JSON blobs. The `compute-habit-correlations` edge function exists but was not verified as producing active correlations.

### Agent Habit Context
The `habit` specialist (agent-orchestrator protocols.ts) receives habit evidence via `get_habit_context` read tool and produces `HabitAnalysis` structured output. The protocol mandates:
- Evidence-based only (no invented scores)
- Every signal must cite evidence IDs
- Focus on: consistency, streaks, session completion, duration, preferred time, late-submission patterns, intervention acceptance

---

## 4. GAMIFICATION VS HABIT INTELLIGENCE

| Feature | Gamification | Habit Intelligence |
|---------|-------------|-------------------|
| Streaks | XP + milestones + leaderboards | Streak count as signal |
| Perfect Day | 50 XP + badge | Daily consistency signal |
| Comeback Challenge | Streak recovery mechanic | Recovery pattern signal |
| Habit Heatmap | Visual calendar | Data source for habit analysis |
| League Tiers | Competitive ranking | Not a habit signal |

The **gamification layer** is fully implemented. The **habit intelligence layer** (signals → learner state → agent → intervention) has the contracts defined but the structured signal computation is shallow.

---

## 5. EDGE FUNCTIONS FOR HABITS

| Function | Purpose | Status |
|----------|---------|--------|
| `process-streak` | Daily streak update + milestone detection | DEPLOYED |
| `streak-risk-cron` | Identifies students at risk of streak break | DEPLOYED |
| `perfect-day-prompt` | Detects and awards perfect day XP | DEPLOYED |
| `compute-habit-correlations` | Correlates habits with outcomes | DEPLOYED (unknown effectiveness) |
| `weekly-summary-cron` | Weekly habit/engagement summary | DEPLOYED |
| `suggest-goals` | Suggests goals based on habits | DEPLOYED |
| `score-reflection-quality` | Scores journal reflection quality | DEPLOYED |

---

## VERDICT: HABIT TRACKER IMPLEMENTED; HABIT INTELLIGENCE IS PARTIAL

The habit **tracking** infrastructure works: events logged, streaks computed, perfect days rewarded. The habit **intelligence** layer (formalized behavior model, signal normalization, correlation computation feeding learner state and agent decisions) is defined in contracts but the runtime data flow is shallow — JSON blobs in learner state without structured signal types. The BJ Fogg model is entirely absent from implementation.