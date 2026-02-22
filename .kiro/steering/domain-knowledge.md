---
inclusion: always
---

# Edeviser Domain Knowledge

## OBE (Outcome-Based Education) Core Concepts

### Outcome Hierarchy
The platform implements a 3-level outcome chain. Every data flow respects this hierarchy:

```
Institution Learning Outcome (ILO)
  └── Program Learning Outcome (PLO)  [many-to-many via outcome_mappings]
        └── Course Learning Outcome (CLO)  [many-to-many via outcome_mappings]
              └── Assessment (Assignment/Quiz)  [linked via assignment.clo_ids]
                    └── Rubric Criteria  [linked via rubric.clo_id]
```

- ILOs are institution-wide. Only admins create them.
- PLOs belong to a program. Coordinators manage them and map to ILOs.
- CLOs belong to a course. Teachers manage them and map to PLOs.
- Each CLO has exactly one Bloom's Taxonomy level.
- Mappings carry weights (0-100). All PLO→ILO weights for a given PLO must sum to 100.

### Attainment Rollup Logic
When a grade is submitted, the Evidence Generator Edge Function cascades:

1. Grade → Evidence record (immutable, append-only)
2. Evidence → CLO attainment (weighted average of all evidence for that CLO + student)
3. CLO attainment → PLO attainment (weighted via outcome_mappings)
4. PLO attainment → ILO attainment (weighted via outcome_mappings)

Attainment is stored in `outcome_attainment` with UPSERT using the unique index on (outcome_id, student_id, course_id, scope).

### Attainment Level Classification
Always use these thresholds (configurable per institution via `institution_settings.attainment_thresholds`):
- Excellent: ≥85%
- Satisfactory: 70–84%
- Developing: 50–69%
- Not Yet: <50%

Default success threshold: 70% (students at or above are "meeting expectations").

## Bloom's Taxonomy

### Levels (ordered lowest → highest cognitive complexity)
1. Remembering — recall facts and basic concepts
2. Understanding — explain ideas or concepts
3. Applying — use information in new situations
4. Analyzing — draw connections among ideas
5. Evaluating — justify a stand or decision
6. Creating — produce new or original work

### Rules
- Each CLO has exactly ONE Bloom's level
- Learning Path orders assignments by Bloom's level (Remembering → Creating)
- Prerequisite gates use CLO attainment: a student must reach X% on a lower-Bloom CLO before unlocking a higher-Bloom assignment
- The Bloom's Verb Guide suggests action verbs per level for CLO title writing

## Gamification Engine

### XP Schedule (base amounts, before multipliers)
| Source | XP | Trigger |
|--------|-----|---------|
| login | 10 | Daily first login |
| submission | 25 | On-time assignment submission |
| grade | 15 | When grade is released |
| journal | 20 | Journal entry saved (≥50 words) |
| streak_milestone | 50 | Every 7-day streak milestone |
| perfect_day | 50 | All 4 habits completed in one day |
| first_attempt_bonus | 10 | First submission for an assignment |
| perfect_rubric | 30 | 100% on all rubric criteria |
| badge_earned | varies | Per badge definition |
| level_up | 0 | Level-up is a consequence, not an XP source |

### XP Multipliers
- Bonus XP Events: admin-created time-bounded multipliers (e.g., 2x weekend)
- Multiplier applies to base XP before insertion into xp_transactions

### Level Thresholds
Levels are calculated from cumulative XP. The formula is progressive:
- Level 1: 0 XP
- Level 2: 100 XP
- Level 3: 250 XP
- Level N: roughly XP = 50 * N^1.5 (defined in app.ts LevelThresholds)

### Streak Rules
- Streak increments on daily first login
- Streak resets to 0 if no login for a calendar day (midnight UTC)
- Streak Freeze: costs 200 XP, protects one missed day, max 2 in inventory
- Streak milestones at 7, 14, 30, 60, 100 days trigger XP + badge checks

### Badge Conditions
- Badges are checked idempotently after XP award, submission, or streak update
- Mystery badges (Speed Demon, Night Owl, Perfectionist) have hidden conditions
- Badge award triggers peer milestone notification to course peers

### Daily Habits
4 tracked habits per day: Login, Submit, Journal, Read
- Perfect Day = all 4 completed before midnight
- Perfect Day Nudge: cron at 6 PM checks for students with 3/4 habits done

## Accreditation Concepts

### Curriculum Matrix
A PLO × Course grid showing which CLOs cover each PLO in each course. Used by coordinators to identify coverage gaps.

### CQI (Continuous Quality Improvement)
The "closing the loop" cycle:
1. Identify gap (PLO/CLO below target attainment)
2. Create action plan with corrective actions
3. Implement actions in next semester
4. Measure result attainment
5. Document in CQI action plan (status: planned → in_progress → completed → evaluated)

### Course File
Auto-generated per course per semester for accreditation. Contains: syllabus, CLO-PLO mapping, assessment instruments, sample student work, attainment analysis, teacher reflection, CQI recommendations.

## Key Invariants (Never Violate These)
- Evidence records are immutable — never UPDATE or DELETE
- Audit logs are append-only — never UPDATE or DELETE
- XP transactions are append-only — xp_total is derived from SUM(xp_transactions)
- RLS is enabled on every table — no exceptions
- All outcome_mappings weights for a given child→parent relationship must sum to 100
- A student cannot submit to a locked (prerequisite-gated) assignment
- Leaderboard respects anonymous opt-out — never reveal opted-out student names