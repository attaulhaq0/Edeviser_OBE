# GAMIFICATION SEPARATION — Phase 17
**Date:** 2026-09-12

## PRINCIPLE

Gamification encourages behavior. It does NOT become academic evidence.

## WHAT IS GAMIFICATION (separate from habit intelligence)

| System | Domain | Tables |
|--------|--------|--------|
| XP | Engagement reward | xp_transactions, xp_events, student_gamification |
| Streaks | Login consistency | streakCalculator.ts, process-streak EF |
| Badges | Achievement recognition | badges, badge_definitions, student_badges |
| Leaderboards | Social motivation | leaderboard_weekly |
| Teams | Collaborative gamification | teams, team_gamification |
| Marketplace | XP economy | marketplace_items, xp_purchases |
| League Tiers | Competitive progression | leagueTierCalculator.ts |
| Comeback Challenge | Engagement recovery | streakCalculator.ts comeback logic |

## WHAT IS HABIT INTELLIGENCE (separate from gamification)

| System | Domain | Evidence Source |
|--------|--------|----------------|
| Habit Signals | Behavioral evidence | habit_logs, study_sessions, journal_entries |
| Behavior Definitions | B=MAP configuration | habitBehaviorModel.ts DEFAULT_BEHAVIOR_CATALOG |
| Learner Dimensions | Personality-agnostic traits | consistency, completion_rate, etc. |
| Motivation Proxies | Observable engagement | OBSERVED only, never inferred as fact |
| Ability Interventions | Simplicity strategies | smaller_task, scaffold, guide, etc. |
| Prompt Tracking | Reminder responsiveness | delivered → responded → latency |
| Fused Intelligence | OBE + Habits → risk | fuseSignals() — academic + behavioral |

## BOUNDARY RULES

1. **XP is NEVER attainment evidence** — streaks give XP for engagement, not academic credit
2. **Badges are NEVER academic grades** — "Perfect Day" badge ≠ assessment result
3. **Leaderboard rank is NEVER learner intelligence** — rank ≠ mastery
4. **Streaks are signals, not habits** — consecutive logins tell consistency, not behavioral change
5. **Gamification encourages; habit intelligence diagnoses**
6. **Both can coexist in the same student view without confusion**

## CANONICAL DATA FLOW

```
habit event (login, submit, journal, read, study_session)
  → habit_logs / habit_tracking table
  → compute-habit-signals Edge Function
  → structured habit signals (student_learning_states.habits.signals[])
  → learner dimension mapping
  ↓
  ↓ SEPARATELY (not conflated):
  ↓
  → process-streak → streak count → XP award (gamification)
  → check-badges → badge award (gamification)
  → leaderboard-refresh → leaderboard rank (gamification)
```

Habit intelligence (signals → dimensions → learner state → agent context) and gamification (streaks → XP → badges → leaderboards) are parallel pipelines that share the same event source (habit_logs) but produce DIFFERENT outputs for DIFFERENT consumers.