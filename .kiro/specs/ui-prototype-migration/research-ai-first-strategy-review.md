# (Spec annex) AI-First Strategy Review — context for the AI-tutor & curriculum UI work

> **Why this is in the spec:** it grounds the redesign's AI priorities — the AI Tutor as a human-controlled, autonomy-tiered companion, plus AI curriculum tooling — in a code-level audit of what the app _actually_ has today. Use it to keep the UI work honest: **enhance and surface existing backend capability** (tutor personas + L1/L2/L3 autonomy, RAG over course materials, at-risk signals, question/plan generation) and mark anything beyond it (long-term learner memory, platform-wide agentic autonomy, cross-agent orchestration) as **roadmap**, not part of a presentation-only migration.
>
> **Binding takeaways for the UI build:** (1) the AI Tutor already exposes human-controlled autonomy (Hints/Guided/Direct = L1/L2/L3) + personas — the new UI must make that control first-class and legible; (2) AI curriculum tooling already exists as discrete functions — the new UI unifies them into a teacher-in-control "Curriculum Studio"; (3) keep humans in control, every AI action explainable + reversible; (4) re-peg gamification/emphasis to mastery.
>
> **Source of truth:** `docs/product/ai-first-strategy-review.md` (synced copy for build-time context). See **requirements R17** and **design §17** for the concrete enhancement mapping.

---

# Edeviser — Principal Review: From LMS to AI-First Learning Ecosystem

**A multidisciplinary strategic audit, grounded in the actual codebase (not the pitch), anchored to the Variation A student experience.**

> Method note. This review is based on reading the real `src/` and `supabase/` code — the `chat-with-tutor`, `ai-at-risk-prediction`, `compute-at-risk-signals`, `select-adaptive-question`, `compute-habit-correlations` edge functions, the `trigger_attainment_rollup` SQL migration, `useLearningPath`, `useAdaptiveXP`, `plannerUtils`, `tutorIntegrityDetector`, plus an inventory of ~57 edge functions and ~200 hooks. Where a claim is inferred rather than executed, it is marked _(inspection, verify)_. Research claims are cited inline. Content from external sources was rephrased for compliance with licensing restrictions.

---

## 0. The one-sentence verdict

**You have built an unusually complete OBE-and-gamification LMS with a genuinely promising RAG tutor bolted on — but the "AI-first, personalized, agentic" story is mostly aspirational: the intelligence that exists is largely heuristic, siloed, and in several flagship cases cosmetic or dead code. The gap you must close is not more features; it is a coherent learning loop with one memory and one brain.**

That is the founder-vs-manager tension in one line, and the rest of this document is evidence for it.

---

## 1. Maturity scorecard (start here)

| Dimension             | Level today                                          | Ceiling of current design | One-line rationale (from code)                                                                                     |
| --------------------- | ---------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Educational**       | Digitized OBE + engagement layer                     | Transformational          | Outcomes are computed rigorously but used for **reporting**, not to change what the student does next.             |
| **Product**           | Feature-rich LMS with Duolingo paint                 | Category-defining         | ~57 edge functions, ~200 hooks; breadth over depth. Manager mindset dominant.                                      |
| **AI Tutor**          | **Level 2** (context-aware assistant), pockets of L3 | L3                        | Real Gemini+RAG, persona/autonomy, CLO snapshot; but reactive, no long-term memory, link to attainment is fragile. |
| **OBE**               | Strong (real SQL rollup engine)                      | Excellent                 | `trigger_attainment_rollup` genuinely cascades CLO→PLO→ILO. Best-built subsystem. Invisible to learners.           |
| **Habit formation**   | Mechanical (streaks/XP)                              | Identity-based            | Cue→routine→reward partly present; missing identity, implementation intentions, graceful recovery depth.           |
| **Gamification**      | Extrinsic-heavy                                      | Intrinsic-aligned         | XP/levels/leagues/shop rich; rewards **activity**, rarely **mastery**. Some engines cosmetic.                      |
| **Cognitive science** | Named, not delivered                                 | Evidence-based            | "Spaced repetition" = hardcoded `[1,3,7]`; retrieval/interleaving shallow; adaptive quiz is the bright spot.       |
| **Agentic AI**        | **Level 2 of 6**                                     | —                         | One reactive tutor + cron jobs. No orchestration, no agents, no shared memory, no proactivity.                     |
| **SMBTV**             | Mind ✅ / Body ⚠️ / Trust ⚠️ / Soul ❌ / Value ❌    | Aligned                   | Strong on Mind; Soul and Value (anti-bloat) essentially unaddressed.                                               |
| **Founder mindset**   | Manager-leaning                                      | Founder                   | Feature count is the implicit KPI. Few features would be _missed_ if removed.                                      |

**How to read this:** the columns that matter are the last two. Your engineering is strong; your _product judgment about what deserves to exist_ is the constraint.

---

## 2. Grounded current state — what actually exists (the credibility anchor)

Before any recommendation, here is the honest ledger. This is what separates this review from generic consulting.

| Subsystem              | Marketing label               | What the code actually does                                                                                                                                                                                                                                                                              | Reality                                           |
| ---------------------- | ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| AI Tutor               | "AI learning companion"       | Gemini 2.0 Flash stream; optional OpenAI-embedding pgvector RAG over course materials scoped by course+CLO; persona (Socratic/step-by-step/explainer) + autonomy L1/L2/L3 prompt modifiers; injects a per-CLO attainment snapshot + last 10 messages; adaptive "plan update" after 5+ same-CLO turns/7d. | **Real & good, but reactive.** Level 2 assistant. |
| Long-term memory       | "understands student history" | Last **10 messages** of the current conversation only. No persistent learner model fed to the tutor beyond a CLO snapshot.                                                                                                                                                                               | **Missing.**                                      |
| At-risk prediction     | "AI at-risk prediction"       | Deterministic weighted thresholds: login 0.3, trend 0.4, submission 0.3; risk if ≥50; attainment modifier ×1.3/×1.15/×0.7. Attendance signal computed then **ignored**.                                                                                                                                  | **Not AI.** Rules. (Fine — but mislabeled.)       |
| Spaced repetition      | "spaced repetition plans"     | `generateReviewDates` returns a hardcoded `[1, 3, 7]`-day array for everyone.                                                                                                                                                                                                                            | **Not adaptive.** A fixed reminder.               |
| Adaptive quiz          | "adaptive difficulty"         | `select-adaptive-question`: ability from attainment → target difficulty (1.5/2.5/3.5), step +0.3/−0.5, Bloom band per ability.                                                                                                                                                                           | **Real** (rule-based, not IRT/BKT). Bright spot.  |
| Adaptive XP            | "adaptive rewards"            | Multipliers (level, diminishing returns, improvement, difficulty) **computed for display but not applied** in `award-xp`; UI appears unmounted. _(inspection, verify)_                                                                                                                                   | **Cosmetic / dead.**                              |
| Learning Path          | "personalized path"           | Fixed Bloom-order sort, **identical for every student**, + prerequisite locks; component appears unmounted. _(inspection, verify)_                                                                                                                                                                       | **Not personalized; likely dead.**                |
| OBE rollup             | "outcome attainment"          | `trigger_attainment_rollup` SQL: immutable evidence → CLO avg → PLO weighted → ILO weighted, UPSERT `outcome_attainment`.                                                                                                                                                                                | **Real & solid.** The true spine.                 |
| Habit correlations     | "learning analytics"          | Co-occurrence rate difference vs **submissions only** (never grades/attainment); careful non-causal language; 14-day min.                                                                                                                                                                                | **Real but shallow.**                             |
| Orchestration / agents | "agentic AI"                  | None found. Cron jobs + isolated functions. The SQL trigger is the de-facto hub.                                                                                                                                                                                                                         | **Absent.**                                       |

**Board debate (Principal AI Engineer vs Founder).** _AI Engineer:_ "Most of the 'AI' is `if/else`. That is not a criticism — heuristics are cheap, explainable, and privacy-safe. The problem is calling it AI." _Founder:_ "The bigger problem is the dead code. 'Personalized learning path' that renders for no one, 'adaptive XP' that awards nothing — those aren't just tech debt, they're a **trust liability** the day an investor or accreditor opens the repo." **Both are right, and this is the theme.**

---

## 3. Phase 1 — Product vision audit

**Digitizing vs transforming.** _Digitizing_ = taking the analog institution (courses, gradebook, syllabus, attendance, reports) and putting it on a screen. _Transforming_ = changing the loop of how a learner comes to know something — what they do next is decided by what they just demonstrated. Digitizing preserves the teacher's admin burden and the student's passivity; transforming reallocates cognition.

**Where you sit on the spectrum today:**

```
Moodle / Blackboard / Canvas <────────────●───────────> Duolingo / Brilliant / Khanmigo
(system of record)                    YOU ARE HERE            (system of learning)
                                   ~35% toward transform
```

- **Canvas/Moodle DNA (dominant):** programs, courses, sections, enrollments, gradebook, rubrics, attendance, fees, transcripts, accreditation reports, bulk import, course files. This is the mass of the app.
- **Duolingo/Khan DNA (present but thin):** streaks, XP, leagues, a path metaphor, an AI tutor, daily habits, a mascot. Real, but mostly a **motivation skin** over an LMS core rather than a learning engine.

**The honest read:** you are a **well-engineered OBE LMS wearing a Duolingo costume**, moving toward transformation. The costume is good (the Variation A prototype is genuinely nice). The engine underneath still behaves like a system of record. Transformation happens when the OBE data (which you compute better than most) **drives** the next action, the tutor, and the reward — not just a report.

---

## 4. Phase 2 — OBE audit

**What's real (and genuinely strong):** `trigger_attainment_rollup` is a proper evidence-based rollup — immutable `evidence` rows, weighted `outcome_mappings` (CLO→PLO→ILO), scoped attainment, idempotent XP. Most "OBE platforms" fake this with spreadsheets; yours is a live cascade. Credit where due.

**The failure is not correctness — it's direction of flow.** OBE is currently **write-only from the learner's perspective**: attainment flows _up_ into coordinator/accreditation dashboards and _stops_. Evaluate against your own questions:

| Question                               | Verdict                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Is CLO/PLO mapping meaningful?         | **Yes** — weighted, enforced sum-to-100, real rollup.                                                                                                                                                        |
| Is assessment driving learning?        | **Weakly** — it drives _scores/XP_, not the _next lesson_.                                                                                                                                                   |
| Is OBE visible to students?            | **Barely** — attainment shows in a progress view; not framed as "you vs mastery."                                                                                                                            |
| Is OBE only for reporting?             | **Mostly yes** — coordinator heatmaps, course files, accreditation evidence are the primary consumers.                                                                                                       |
| Does OBE influence AI recommendations? | **Almost no** — the tutor reads a CLO snapshot, but the link is fragile _(a `bloom_level` vs `blooms_level` column mismatch appears to sever it — verify)_, and nothing recommends a next action from a gap. |
| Does OBE personalize learning?         | **No** — the "learning path" is identical for all students.                                                                                                                                                  |
| Does OBE identify learning gaps?       | **Computes them, yes; acts on them, no.**                                                                                                                                                                    |

**Recommendation — make OBE the operating system of the student experience, not the reporting layer:**

1. **A CLO is a quest.** Every below-target CLO becomes a first-class, actionable object in the student UI: "Normalization — 62%, Developing → 3 things will move this."
2. **Gap → action.** When `outcome_attainment` drops or a CLO is weak, the system _proposes the next micro-lesson / practice set / tutor session_ for that CLO. This is the single highest-leverage change in the whole review.
3. **Translate for humans.** Students should never see "CLO3 40%." They see "You can normalize a simple schema; you can't yet handle multi-table anomalies. Here's the 10-minute fix." (The `assignment.html` prototype already does "This builds your skills in…" — extend that everywhere.)
4. **Fix the tutor↔attainment link** and feed _real_ per-CLO mastery + trend into every tutor turn.

---

## 5. Phase 3 — Microlearning & curriculum architecture

**Current state:** you have `course_modules`, `course_sections`, assignments, quizzes, rubrics, and an `embed-course-material` function (so uploaded material _is_ chunked + embedded for RAG). But there is **no unit of learning smaller than an assignment** that the student actually moves through. There is no "micro-lesson → check → reflect → retrieve" atom. Teachers upload materials; the system embeds them for search; it does **not** transform them into a structured experience. That is the Canvas pattern.

**The ideal atom (design it once, reuse everywhere) — the "Learning Loop Card":**

```
CONCEPT (2–5 min)  →  WORKED EXAMPLE  →  RETRIEVAL CHECK (active recall)
      ↑                                          │
   REINFORCE  ←  SPACED REVIEW  ←  REFLECT (30s)  ←  AI TUTOR CHECKPOINT (if wrong)
```

Every micro-lesson carries: 1 learning objective, 1 CLO tag + Bloom level, ≤3 retrieval items, a 1-line reflection prompt, and a review schedule. This is the Brilliant/Duolingo lesson unit — and it maps cleanly onto your existing CLO + evidence model.

**AI Curriculum Designer (the highest-value teacher feature you don't have).** You already embed materials; go one step further with a `generate-course-structure` agent that, from an uploaded PDF/slide deck/video transcript, drafts: micro-lesson boundaries → objectives → suggested CLO alignment + Bloom level → retrieval questions → flashcards → reflection prompts → a spaced-review plan. **Teacher stays the editor** (approve/reject/edit — never auto-publish). This converts your teachers from _uploaders_ into _curators_, which is the only way microlearning scales. You have every primitive to build this now (`generate-quiz-questions`, `embed-course-material`, `ai-module-suggestion` already exist — they're unorchestrated pieces of exactly this).

---

## 6. Phase 4 — Cognitive learning science audit

| Technique                          | In the app?   | Evidence from code                                                               | Gap                                                                          |
| ---------------------------------- | ------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Active recall / retrieval practice | Partial       | Quizzes, `useMicroAssessments`, `usePracticeMode`                                | Not woven into lessons as the default mode; testing ≠ retrieval-as-learning. |
| Spaced repetition                  | **Name only** | `plannerUtils` fixed `[1,3,7]`                                                   | No performance-adaptive spacing (SM-2/FSRS). Forgetting curve ignored.       |
| Interleaving                       | No            | —                                                                                | Path is blocked/linear by Bloom; no deliberate mixing of CLOs.               |
| Deliberate practice                | Partial       | Adaptive quiz targets difficulty                                                 | Not tied to specific weak sub-skills over time.                              |
| Mastery learning                   | Partial       | Prerequisite gates on attainment                                                 | Gate exists; the _remediation loop_ to pass the gate is missing.             |
| Scaffolding                        | **Yes**       | Tutor autonomy L1→L2→L3                                                          | Genuinely good; underused outside chat.                                      |
| Cognitive load                     | Implicit      | Compact UI (Variation A)                                                         | Not a design principle in content; no worked-example fading.                 |
| Metacognition                      | **Yes**       | Reflection templates (Gibbs), `score-reflection-quality`, `useIndependenceScore` | Strong primitives, weakly connected to action.                               |
| Self-regulated learning            | Partial       | Goals, weekly planner, flow check-ins                                            | Planning exists; the "plan→do→review" loop isn't closed by the system.       |

**The two highest-ROI fixes, both grounded in seminal science:**

1. **Replace `[1,3,7]` with a real spacing algorithm (FSRS or SM-2).** The testing effect and spacing effect are among the most replicated findings in learning science (Roediger & Karpicke, 2006; Cepeda et al., 2006). A fixed array leaves most of the benefit on the table because it ignores _this_ learner's _this_ item difficulty. FSRS is open-source and drop-in.
2. **Make retrieval the default verb.** Every micro-lesson ends in low-stakes recall, and every wrong answer is _rescheduled_, not just scored. This is the mechanism behind the AI-tutor learning gains in the literature (see §11).

---

## 7. Phase 5 — Habit formation audit

**Frameworks:** Fogg's B=MAP (behavior = motivation × ability × prompt), Clear's cue→craving→response→reward + _identity_, Duhigg's cue→routine→reward, and Deci & Ryan's Self-Determination Theory (autonomy, competence, relatedness).

| Ingredient              | In the app?        | Note                                                                                                           |
| ----------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| Cue                     | Partial            | Notifications (`streak_at_risk`, `perfect_day_nudge`) are prompts, but externally-timed, not context-anchored. |
| Routine                 | Yes                | 4 daily habits (Login/Submit/Journal/Read).                                                                    |
| Reward                  | Yes (over-indexed) | XP everywhere.                                                                                                 |
| **Identity**            | **No**             | Nothing helps the learner say "I am someone who reviews daily." This is Clear's core lever and it's absent.    |
| Small wins              | Yes                | Perfect Day, streak milestones.                                                                                |
| Reflection              | Yes                | Reflection templates + digest.                                                                                 |
| Consistency             | Yes                | Streaks + freeze.                                                                                              |
| **Recovery after miss** | Partial            | `useComebackChallenge` exists — good — but streak loss is still framed as failure (the classic anxiety trap).  |

**Board debate (Habit researcher vs Behavioral scientist).** _Habit researcher:_ "Login as a tracked 'habit' is a vanity metric — it rewards _opening the app_, not learning. Fogg would say you've made the prompt the behavior." _Behavioral scientist:_ "And the streak, unshielded, punishes the exact students you most want back — one bad week and they churn from shame." **Both point the same way:** shift from _activity_ habits to _learning_ habits, and make recovery the default, not a penalty.

**Recommendations:**

1. **Retire "Login" as a habit.** Replace with a genuine learning micro-behavior: "Recall 5 cards," "One retrieval check," "Close one CLO gap."
2. **Add identity reinforcement** (SDT competence + Clear identity): after a streak milestone, "You've reviewed 7 days straight — you're becoming a _consistent learner_." Cheap, powerful, currently missing.
3. **Implementation intentions** (Gollwitzer): let the student set "After [dinner], I'll do [one review] at [desk]." Prompts fire against _their_ cue, not a global 6pm cron.
4. **Reframe recovery, don't just enable it.** "Streak paused, not lost. One review restarts it." Loss-framing drives churn; SDT says protect autonomy and belonging.

---

## 8. Phase 6 — Gamification audit

**What exists (a lot):** XP, levels (`50·n^1.5`), streaks + freezes, leagues + tiers, most-improved / personal-best leaderboards, badges (tiered + mystery), challenges, a marketplace with dynamic pricing + sales + mystery boxes, an "XP economist," bonus events. This is a **more complete gamification stack than most funded EdTech startups ship.**

**The problem (Self-Determination Theory lens):** it predominantly rewards **activity and time**, not **mastery and curiosity**. XP for logging in, submitting, journaling. This is the extrinsic-motivation trap: well-designed points can _support_ competence, but volume-based points _crowd out_ intrinsic motivation and train students to optimize the metric, not the learning (Deci, Koestner & Ryan, 1999). And per §2, some of the cleverest bits (adaptive XP multipliers) **don't actually pay out** — so the sophistication is invisible.

**Board debate (Gamification specialist vs Motivation researcher).** _Gamification specialist:_ "The economy is deep — leagues and shops drive DAU, and DAU is survival." _Motivation researcher:_ "DAU is the Duolingo trap the founder themself flagged: you can win engagement and lose learning ([the 'steal the flow, not the goal' critique]). Tie rewards to _demonstrated mastery_ or you're paying students to farm XP." **Resolution: keep the economy, re-peg the currency to mastery.**

**Recommendations:**

1. **Re-peg XP to mastery gain, not activity.** Biggest XP for _moving a CLO up a band_ (Developing→Satisfactory), for _retrieval success after a delay_ (proving durable memory), and for _helping a peer_. Smallest/zero for logging in.
2. **Make mastery the visible progression**, with XP as secondary. The Variation A course cards already use **mastery rings** — make those the hero metric, not the XP number.
3. **Kill or ship the dead mechanics.** Either wire `useAdaptiveXP` into `award-xp` or delete it. Cosmetic sophistication is worse than none — it's a landmine.
4. **Curiosity hooks (intrinsic):** optional "go deeper" branches, mystery _concepts_ (not just reward boxes), "why does this work?" prompts. Brilliant wins on curiosity, not points.

---

## 9. Phase 7 — AI Tutor maturity & roadmap

**Current maturity: Level 2 (context-aware assistant), with isolated Level 3 behaviors.**

What earns L2 (and it's real, credit due): Gemini 2.0 Flash streaming with fallback + retry; RAG over the _actual course materials_ (not the open web) scoped to course + CLO; three pedagogical personas; three autonomy levels (L1 hints-only → L3 direct) that are a genuine scaffolding mechanism; a per-CLO attainment snapshot in the prompt; an academic-integrity redirect; and an adaptive "learning-plan update" loop that fires after repeated same-CLO struggle. This is a thoughtfully built tutor.

What blocks L3–L4:

- **No long-term memory.** It sees the last 10 messages of _this_ chat. It does not know that last week you struggled with joins, that your streak just broke, or that your Database CLO is trending down. "Understands student history" is not yet true.
- **Reactive only.** It waits to be opened. It never initiates ("You have a quiz in 2 days on the CLO you're weakest at — 10 minutes now?").
- **Fragile OBE link.** The attainment read appears to reference a mismatched column — so even the one personalization signal may be silently empty _(verify)_.
- **Integrity guard is a 21-word regex.** Trivially evaded ("help me understand this so I can write it" bypasses "write my essay"). It's a speed bump, not a guard.
- **No evaluation loop.** Nothing measures whether a tutor session actually improved subsequent retrieval/attainment.

**Where this maps to evidence.** The upside is worth chasing: well-built AI tutors show large gains — a Harvard physics RCT found students learned **more than twice as much in less time** with an AI tutor vs active-learning class time ([Kestin et al., 2024](https://www.researchgate.net/publication/380587627_AI_Tutoring_Outperforms_Active_Learning)); Google's LearnLM-based tutoring reached a **66% success rate on harder follow-on topics vs 61% human-only** ([Stanford NSSA notes, 2025](https://nssa.stanford.edu/news/research-notes-two-emerging-strategies-using-ai-tutoring/)); ITS broadly show ~20% performance improvements ([comprehensive ITS review, 2025](https://arxiv.org/html/2507.18882v1)). **But** satisfaction ≠ learning: a 2025 game-based study found high satisfaction with only marginal accuracy gains ([MDPI, 2025](https://www.mdpi.com/2227-7102/15/11/1502/xml)) — the same "feels good vs learns" gap you flagged in the Duolingo critique. Design the tutor for _durable retrieval_, not chat delight.

**Roadmap L2 → L4:**

- **L2→L3 (personalized tutor) — near term.** (a) Fix the attainment link. (b) Add a **learner memory** table the tutor reads every turn: mastery per CLO + trend, recent errors, current goals, streak/wellbeing state, last plan-update. (c) Harden integrity: keep the regex as a cheap pre-filter, add an LLM intent-check classifier + always-on system policy, and log for the teacher.
- **L3→L4 (coach) — mid term.** (d) **Proactive checkpoints:** the tutor initiates before quizzes / on gap detection / on streak risk (governed — see §16). (e) Close the loop: after a session, schedule retrieval and _measure_ whether attainment moved; feed that back into the plan. (f) Multi-turn teaching state (explain→practice→feedback→assess→remediate) rather than free chat — a deterministic state machine wrapping the LLM is the current best-practice for reliability ([MDPI, 2025](https://www.mdpi.com/2504-2289/10/7/219)).

---

## 10. Phase 8 — Teacher intelligence

**Current:** `compute-at-risk-signals` + `ai-at-risk-prediction` produce a weighted-heuristic risk score → `AtRiskStudentRow` + `at_risk_alert` notification; `ai-feedback-draft`, `generate-quiz-questions`, `ai-module-suggestion`, grading stats, teaching-impact, handoffs. Genuinely more than most LMSs.

**Gaps:**

- The "prediction" is explainable rules (good) but **mislabeled as AI** (trust risk) and **ignores the attendance signal it computes** (bug/waste).
- Insights are **passive**: a risk list the teacher must open and interpret. No prepared _intervention_.
- No **workload reduction loop**: drafting feedback exists, but there's no "here are the 4 students, here's the drafted nudge for each, approve to send."

**Recommendation — proactive, action-shaped, teacher-in-control:** When a teacher logs in, the system has already prepared a ranked, _explained_ triage list ("Sara — declining Normalization, missed 2 submissions, no login 6 days — [Send nudge] [Assign 10-min review] [Book 1:1]"). Keep every action **one-click but human-approved**. Rename "AI prediction" → "Early-warning signals" until it's actually a model. Feed the ignored attendance signal in (or remove it).

---

## 11. Phase 9 — Parent intelligence

**Current:** `useParentDashboard` / `useParentDashboardAggregate`, verified parent-student links (good RLS pattern), read-only. Present but thin.

**The reframe parents actually need:** parents don't want a gradebook mirror — they want _"is my child okay, and what do I do?"_ Focus the parent surface on **growth, wellbeing, habits, strengths, and one supportive action** — never raw scores that provoke pressure. Concretely: "This week Maya studied 4 of 5 days (up from 2), her writing outcomes are improving, and she seems to be avoiding math. **One thing that helps:** ask her to teach you one thing she learned — retrieval practice, and it signals you care." Non-causal, strengths-first, wellbeing-first, with a single conversation prompt. This is also where **Trust** (SMBTV) is won or lost.

---

## 12. Phase 10 — SMBTV alignment

| Pillar                                                      | Status         | Evidence / gap                                                                                                                                         |
| ----------------------------------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Soul** (purpose, character, empathy, ethics, gratitude)   | ❌ **Absent**  | Nothing in the product touches meaning, purpose, or character. Reflection is metacognitive, not values-based. Biggest whitespace.                      |
| **Mind** (understanding, curiosity, critical thinking)      | ✅ **Strong**  | OBE + Bloom + tutor + reflection. Your core competence.                                                                                                |
| **Body** (routines, wellbeing, focus, sleep, breaks)        | ⚠️ **Partial** | `useWellness*`, `useFocusTimer`, flow check-ins exist — but wellbeing is a side-panel, not woven in. No sleep/break awareness.                         |
| **Trust** (transparency, fairness, privacy, responsible AI) | ⚠️ **Partial** | RLS everywhere, audit logs, non-causal habit language (genuinely responsible). Undermined by mislabeled "AI" + dead features + a weak integrity guard. |
| **Value** (every feature earns its place)                   | ❌ **Failing** | ~57 functions / ~200 hooks with cosmetic & dead code is the definition of unearned complexity.                                                         |

**Embedding SMBTV without bolting on more features:**

- **Soul:** a weekly 30-second purpose/gratitude reflection ("what did you learn that mattered to you?"); values framing on milestones; ethical-use framing in the tutor (already implicit in integrity). Small, cheap, high-meaning.
- **Body:** promote break/focus cycles _inside_ study sessions (Pomodoro in `useFocusTimer`), surface a gentle "you've studied 90 min, take 10"; wellbeing check-ins that _adjust the plan_ (burnout → lighten load).
- **Trust:** the single fastest Trust win is **honesty in labeling** — stop calling rules "AI," ship or delete dead features, explain every AI recommendation ("why am I seeing this?").
- **Value:** adopt a **subtraction ritual** (see §14) — the founder's knife.

---

## 13. Phase 11 — Founder-mindset review

**The diagnosis: the product is optimized for feature _coverage_, which is a manager KPI.** The evidence is structural: ~57 edge functions, ~200 hooks, a marketplace with dynamic pricing and mystery boxes, four leaderboard variants — alongside a "personalized learning path" that renders for no one and "adaptive XP" that pays nothing. A founder asks of each feature: _"Would students riot if this vanished?"_ For most of the economy and reporting surface, the answer is no.

Apply the three questions to the actual app:

| Feature                                       | "Why does it exist?"                 | "Would it be missed?"                                                                                 |
| --------------------------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| OBE attainment rollup                         | Accreditation + (should be) learning | Coordinators: yes. Students: not yet — **because it's invisible.** Fix that and it becomes essential. |
| AI Tutor                                      | Help students learn                  | **Yes** — the clearest keeper. Invest here.                                                           |
| Mastery rings / next-step                     | Direct the learner                   | Would be missed _if they drove behavior_.                                                             |
| Marketplace + dynamic pricing + mystery boxes | Engagement economy                   | **No.** Complexity tax. Candidate to gut.                                                             |
| 4× leaderboard variants                       | Competition                          | Keep 1 (most-improved is most pro-social). Cut 3.                                                     |
| Dead learning path / cosmetic adaptive XP     | —                                    | **Remove today.**                                                                                     |

**The founder move:** pick **one loop** — _see your gap → do a 10-minute mastery action → prove retention → watch the ring fill_ — and make it the spine everything else serves. Everything that doesn't serve that loop is a candidate for the cut list (§14).

---

## 14. Phase 12 — Competitive analysis & differentiation

| Platform                    | Does exceptionally                       | Does poorly                                       | Lesson for you                                           |
| --------------------------- | ---------------------------------------- | ------------------------------------------------- | -------------------------------------------------------- |
| **Duolingo**                | Habit, streak psychology, bite-size flow | Shallow mastery; optimizes retention over outcome | Steal the _loop_, peg it to _mastery_ (your OBE edge).   |
| **Brilliant**               | Curiosity, active problem-first learning | No formal outcomes/accreditation                  | Borrow curiosity + active first-attempt lessons.         |
| **Khan / Khanmigo**         | Mastery learning + AI tutor at scale     | Not outcome/accreditation-native                  | You can match the tutor **and** add OBE rigor they lack. |
| **Quizlet**                 | Frictionless retrieval + spaced practice | Not pedagogically structured                      | Make retrieval/SRS first-class (your §6 fix).            |
| **Headspace**               | Wellbeing, calm, habit gentleness        | Not academic                                      | Model your Body/recovery tone on this.                   |
| **Canvas/Moodle/Classroom** | System of record, institutional trust    | Zero transformation, joyless                      | This is what you must _not_ remain.                      |

**Your defensible, category-defining wedge — the thing none of them have:**

> **OBE-native, AI-personalized mastery.** Duolingo has habit but no accreditation-grade outcomes. Canvas has outcomes but no learning engine. Khanmigo has a tutor but not program/CLO/PLO rigor. **You are the only one positioned to make rigorous, accreditation-grade outcome attainment _drive_ a personalized, gamified, AI-tutored daily learning loop** — and prove it to institutions with evidence they already trust. That is a genuine category: _"the learning platform that closes the loop from institutional outcomes to the individual learner's next 10 minutes — and back."_

Don't copy the streak. Own the loop.

---

## 15. Phase 13 — Agentic AI ecosystem review

### 15.1 Current agentic maturity: **Level 2 of 6**

```
L1 Static chatbot
L2 Context-aware assistant   ● YOU ARE HERE
L3 Personalized tutor        ◐ (isolated behaviors: plan-updates, adaptive quiz)
L4 AI coach                  ○
L5 Autonomous companion      ○
L6 Multi-agent education OS   ○ (north star)
```

**Why L2, precisely:** the tutor is context-aware (persona, autonomy, RAG, CLO snapshot, conversation window). But _all six_ agentic hallmarks are absent: (1) no **planning** across sessions, (2) no **long-term memory**, (3) no **proactivity** (everything is user-initiated or a blunt cron), (4) no **tool-using autonomy** (the LLM can't call the quiz generator or scheduler mid-session), (5) no **reflection/self-evaluation**, (6) no **multi-agent collaboration**. The cron jobs (`compute-at-risk-signals`, `perfect-day-prompt`, `weekly-summary-cron`) are _automation_, not _agency_ — fixed scripts, no goals, no adaptation.

**Distance to each stage (realistic):** L3 ≈ 1 quarter (memory + fix links + proactive nudges). L4 ≈ 2–3 quarters (planning + evaluation loop + tool-calling tutor). L5 ≈ 1 year+ (autonomous, governed, cross-domain). L6 ≈ multi-year and **only if justified** — do not build six agents to look modern; build them when a single orchestrated brain provably can't cope.

**Board debate (LLM Architect vs Principal Engineer).** _LLM Architect:_ "Jump to a multi-agent mesh — student, teacher, parent, coordinator agents talking to each other." _Principal Engineer:_ "You have no shared memory and a broken column between the tutor and attainment. Agents talking to each other on top of silos is a distributed-systems horror with student PII. **Earn L3 with one brain and one memory first.**" **Resolution: single orchestrator + specialized _skills_ now; separate _agents_ only where trust/latency/domain boundaries demand it.**

### 15.2 Current vs recommended architecture

**Current (silos):**

```
Student → Tutor (Gemini+RAG, stateless-ish)
Crons → [at-risk] [streak] [perfect-day] [weekly-summary]  → notifications
Grade → SQL trigger → attainment (the only real hub)
(no shared memory · no orchestration · no agent can act)
```

**Recommended near-term (one brain, many skills) — do NOT start with 8 agents:**

```
                 ┌───────────────── Learner Memory Store ─────────────────┐
                 │ profile · mastery(CLO trend) · errors · habits · goals   │
                 │ interventions · prefs · consent  (Postgres + pgvector)   │
                 └───────────▲───────────────────────────────▲─────────────┘
                             │ read/write (RLS-scoped)        │
   Student ─▶ Orchestrator (planner + policy + tool-router) ──┤
                             │ calls skills (tools):          │
             ┌───────────────┼───────────────┬───────────────┼───────────┐
          Tutor skill   Recommender skill  Quiz/SRS skill  Reflection   At-risk skill
          (Gemini+RAG)  (gap→next action)  (FSRS+adaptive) skill        (rules→ML later)
```

The orchestrator is a planning+policy layer over the tools you _already have_ (`chat-with-tutor`, `select-adaptive-question`, `generate-quiz-questions`, `generate-plan-update`, `compute-at-risk-signals`). This is the **80/20**: it delivers "autonomous companion" behavior without a distributed multi-agent system.

**Recommended long-term (specialized agents, only where warranted):** Student Learning, Teacher Intelligence, Parent Companion, Academic Advisor, Program Coordinator, Institution Intelligence, Habit & Wellbeing, AI Curriculum Designer — as **separate agents only when** their data boundary (PII/RLS), latency profile, or ownership differs enough to justify the coordination cost. Most begin life as _skills_ of the one orchestrator and graduate to _agents_ on evidence.

### 15.3 Role-by-role autonomous workflows (the "already prepared" principle)

- **Student logs in →** orchestrator has already computed: weakest CLO + trend, what's due for spaced review today, upcoming deadlines mapped to weak outcomes, streak/wellbeing state, and **one recommended 10-minute action**. Variation A's dashboard becomes a _plan_, not a _report_.
- **Teacher logs in →** ranked, explained triage list with a drafted, approvable action per student; auto-drafted feedback awaiting review; flagged CLOs with suggested remediation.
- **Parent logs in →** growth + wellbeing + strengths summary + one supportive conversation prompt (§11).
- **Coordinator logs in →** CLO/PLO attainment deltas, curriculum-gap flags, draft accreditation evidence — generated, awaiting sign-off.

### 15.4 Human-control & autonomy boundaries (governance)

Reuse the tutor's existing L1/L2/L3 idea as a **platform-wide action-autonomy ladder** (aligns with the 4-mode human-control model in [multi-agent instructional design research, 2025](https://arxiv.org/html/2508.19611v3)):

| Tier                     | AI may…                        | Requires                             | Examples                                        |
| ------------------------ | ------------------------------ | ------------------------------------ | ----------------------------------------------- |
| **A0 Observe**           | compute & display insights     | nothing                              | at-risk signals, mastery trends                 |
| **A1 Suggest**           | propose an action, pre-drafted | user opens                           | "review these 5 cards", drafted feedback        |
| **A2 Act-with-approval** | execute on one click           | explicit human OK                    | send nudge, assign review, book 1:1             |
| **A3 Act-autonomously**  | execute silently               | pre-authorized + logged + reversible | schedule spaced reviews, reorder the daily plan |

**Hard rules:** grading, publishing content, parent communications, and any cross-student action are **never above A2**. Every AI action is logged (you have `audit_logs` — use it), explained ("why am I seeing this?"), reversible, and overridable. Teachers/institutions set the ceiling per action type.

### 15.5 Memory architecture

| Memory                                         | Store                                                | TTL                       | Notes                                                             |
| ---------------------------------------------- | ---------------------------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| Short-term conversation                        | `tutor_messages` (exists)                            | conversation              | Extend window > 10 by summarization, not raw dump.                |
| **Learner model** (mastery/trend/errors/goals) | new `learner_memory` (Postgres)                      | persistent, updatable     | **The missing keystone.** Fed to tutor + orchestrator every turn. |
| Habit/wellbeing memory                         | existing habit/wellness tables                       | rolling 90d               | Feed recovery + load-balancing, not just charts.                  |
| Performance memory                             | `evidence` / `outcome_attainment` (exist, immutable) | permanent                 | Already your best asset.                                          |
| Intervention history                           | new `interventions`                                  | persistent                | What was tried, did it work — enables reflection/eval.            |
| Semantic (course content)                      | pgvector chunks (exist)                              | until content changes     | RAG corpus.                                                       |
| Teacher/parent prefs                           | prefs tables (exist)                                 | persistent                | Autonomy ceilings, comms prefs.                                   |
| Institutional memory                           | aggregates                                           | persistent, de-identified | Trends, never raw cross-student PII to an agent.                  |

**Never store / never feed an LLM:** raw credentials, unminimized PII in prompts (the tutor already forbids echoing name/email/ID — good), off-topic personal disclosures, or another student's data in any learner's context. **Expire:** transient conversational state, stale risk snapshots. **Privacy principle:** memory is per-learner, RLS-scoped, consented, and exportable/deletable (you have `export-student-data` — extend to memory).

### 15.6 Tool-calling architecture (RLS-first)

Let the orchestrator call tools, but **every tool executes under the user's RLS context, never a blanket service-role bypass.** Map per role:

| Tool                          | Student  | Teacher             | Coordinator  | Parent               |
| ----------------------------- | -------- | ------------------- | ------------ | -------------------- |
| Read own mastery/attainment   | ✅       | ✅ (their students) | ✅ (program) | ✅ (linked child)    |
| Quiz/SRS generator            | ✅       | ✅                  | –            | –                    |
| Recommender (next action)     | ✅       | ✅                  | –            | ✅ (suggest support) |
| Send notification/nudge       | –        | A2                  | A2           | –                    |
| Generate report/accreditation | –        | –                   | A2           | –                    |
| Write grades                  | ❌ never | human only          | ❌           | ❌                   |

**Non-negotiable (your own steering rules already demand it):** any `SECURITY DEFINER` RPC an agent calls must have an internal fail-closed guard (`auth_institution_id()` / role check), and PostgREST-exposed functions must `REVOKE EXECUTE ... FROM PUBLIC`. An agent tool-calling layer _multiplies_ the blast radius of a missing guard — treat tool authorization as the #1 security workstream.

### 15.7 Agent collaboration & privacy

The struggling-student cascade (Student→Teacher→Parent→Habit→Advisor→Institution agents) is compelling but is where privacy goes to die if built naïvely. **Rule: agents collaborate through the shared, RLS-scoped memory and _events_, not by passing raw student data to each other.** A "student is struggling" event carries an ID + outcome delta; each downstream consumer re-reads only what _its_ role is permitted to see. De-identify at every aggregation boundary. This keeps collaboration compatible with your tenant isolation guarantees.

### 15.8 Current vs future AI capabilities

| Capability          | Today                  | Future (L4)                                  |
| ------------------- | ---------------------- | -------------------------------------------- |
| Understands history | Last 10 msgs           | Persistent learner model                     |
| Personalization     | CLO snapshot (fragile) | Mastery+trend+habits+goals drive every turn  |
| Proactivity         | None                   | Prepares each role's day; initiates on gaps  |
| Tool use            | None (fixed functions) | Orchestrated tool-calling under RLS          |
| Adaptivity          | Quiz difficulty only   | Path, spacing, difficulty, tone all adapt    |
| Evaluation          | None                   | Measures if a session moved attainment       |
| Memory              | Ephemeral              | Tiered, consented, exportable                |
| Safety              | Regex + prompt         | Classifier + policy + audit + explainability |

---

## 16. Current vs future journeys (anchored to Variation A)

**Student — today:** log in → dashboard shows XP/streak/next assignment/habits (a _status report_) → open an assignment → submit → later a grade appears → attainment silently updates in a place the student rarely looks. _The student is a spectator of their own data._

**Student — future (the loop):** log in → Variation A dashboard leads with **"Today"**: your weakest CLO, the one 10-minute action that moves it, plus due spaced-reviews → do a **Learning Loop Card** (concept→recall→reflect) → get it wrong → **tutor checkpoint** appears in the right rail with your real mastery context → succeed → **mastery ring fills**, XP for the _gain_, review auto-scheduled → tomorrow the plan already reflects it. _The student is the driver; the system is the co-pilot._ Variation A already has the shell (compact hero, mastery rings, right-rail tutor/quests, graded-urgency status) — the work is making it **driven by OBE + memory**, not static data.

**Teacher — today:** open dashboard → read an at-risk list → manually interpret → manually act. **Future:** open → a prepared, explained triage list with one-click approvable actions and pre-drafted feedback; the AI Curriculum Designer has already turned last night's uploaded slides into a draft micro-lesson set awaiting edit.

**Parent — today:** read-only progress mirror. **Future:** a weekly growth/wellbeing/strengths story with one supportive conversation prompt; alerts framed around support, never raw scores.

## 17. Current vs future architecture (one line each)

- **Today:** React SPA ↔ Supabase (Postgres+RLS, ~57 edge functions, cron automation) with **one real intelligence hub** (the SQL attainment trigger) and **N disconnected feature silos**.
- **Future:** same robust substrate + a **Learner Memory store** + a **thin orchestration layer** (planner/policy/tool-router) that turns existing functions into governed skills, so OBE ↔ tutor ↔ SRS ↔ habits ↔ recommendations finally share one brain and one memory.

## 18. AI-first education roadmap → P0/P1/P2/P3

The prioritization test for every item: **"Will this measurably improve how students learn, teachers teach, or institutions create outcomes?"** If it only adds a screen or a metric, it's not P0.

### P0 — Fix the foundation & close the loop (this quarter). _Highest learning ROI._

1. **Make OBE drive the student experience.** Gap → recommended next action on the dashboard. (Turns your best-built subsystem from reporting into learning. **#1 item in this whole review.**)
2. **Fix the tutor↔attainment link** (`bloom_level`/`blooms_level`) and feed real per-CLO mastery+trend into every tutor turn.
3. **Ship or delete dead/cosmetic code:** wire `useAdaptiveXP` into `award-xp` or remove it; revive the learning path as a _real_ personalized sequence or remove it. (Trust + maintainability.)
4. **Honesty pass:** rename "AI at-risk prediction" → "early-warning signals" until it's a model. Use the attendance signal you already compute or drop it.
5. **Replace `[1,3,7]` with FSRS/SM-2.** Real spaced repetition. Drop-in, huge evidence base.
6. **Re-peg XP to mastery gain, not activity;** retire "Login" as a habit.

### P1 — Reach L3 personalized tutor (next quarter).

7. **Learner Memory store** (mastery/errors/goals/habits) read by tutor + a new **Recommender skill**.
8. **Learning Loop Card** micro-lesson atom (concept→recall→reflect→review) as the reusable unit.
9. **Harden the integrity guard** (LLM intent-check + policy + audit) — required before any autonomy.
10. **Teacher triage → action:** prepared, explained, one-click-approvable interventions + drafted feedback.

### P2 — Reach L4 coach + AI Curriculum Designer (2–3 quarters).

11. **Thin orchestration layer** (planner/policy/tool-router) over existing functions; the "Today" plan per role.
12. **AI Curriculum Designer:** uploaded content → draft micro-lessons/objectives/CLO alignment/retrieval/SRS, teacher-approved.
13. **Proactive, governed nudges** (autonomy tiers A0–A3) + **evaluation loop** (did a session move attainment?).
14. **Parent growth/wellbeing narrative** surface.

### P3 — Selective autonomy & (maybe) multi-agent (when evidence justifies).

15. Graduate skills → specialized agents **only** where data/latency/ownership boundaries demand it.
16. Institution Intelligence + Academic Advisor agents; cross-role event collaboration via shared memory (never raw PII passing).
17. Body/Soul depth: focus/break cycles in sessions, purpose/gratitude reflection, burnout-aware load balancing.

## 19. Features to remove, redesign, or add

**Remove (or gut):**

- Cosmetic `useAdaptiveXP` multipliers that never pay out; the unmounted "personalized" learning path (revive properly or delete).
- Marketplace **dynamic pricing + mystery boxes** and the "XP economist" complexity — high maintenance, low learning value.
- 3 of 4 leaderboard variants (keep **most-improved** — most pro-social, least anxiety-inducing).
- "Login" as a tracked habit.

**Redesign:**

- OBE attainment: reporting artifact → **student-facing action engine.**
- Streak: loss-framed penalty → recovery-first, identity-reinforcing.
- At-risk: passive list → prepared, explained, one-click intervention.
- Tutor: reactive chat → memory-backed, proactive, evaluated coach.
- Spaced repetition: fixed `[1,3,7]` → FSRS.

**Add:**

- Learner Memory store (keystone).
- Learning Loop Card micro-lesson atom.
- AI Curriculum Designer (teacher force-multiplier).
- Recommender skill (gap→next action) + orchestration layer.
- Identity/implementation-intention habit mechanics; Soul (purpose/gratitude) + Body (break/focus) touches.

## 20. Long-term vision

**Become the learning platform that closes the loop from institutional outcomes to the individual's next ten minutes — and back — with a trusted, governed AI companion.** Not the smartest chatbot; the most _coherent_ learning system: one memory, one brain, OBE-native, evidence-backed, gamified for mastery (not activity), gentle on wellbeing, honest by construction, and always leaving the human — student, teacher, institution — in control. You are closer than the code's current sprawl suggests, because the two hardest, most defensible pieces — **rigorous outcome attainment** and **a real RAG tutor** — already exist. The work is not _more_; it is _connection, honesty, and subtraction._

---

## References (key sources; rephrased for licensing compliance)

- Comprehensive review of AI-based Intelligent Tutoring Systems, 2025 — [arXiv:2507.18882](https://arxiv.org/html/2507.18882v1)
- Kestin et al., AI tutoring vs active learning (Harvard physics RCT), 2024 — [summary](https://www.researchgate.net/publication/380587627_AI_Tutoring_Outperforms_Active_Learning)
- LearnLM tutoring outcomes — [Stanford NSSA research notes, 2025](https://nssa.stanford.edu/news/research-notes-two-emerging-strategies-using-ai-tutoring/)
- AI-guided individualized language learning meta-analysis (d=1.18 within / 0.39 between), 2024 — [ResearchGate](https://www.researchgate.net/publication/381091797_The_effects_of_AI-guided_individualized_language_learning_A_meta-analysis)
- Satisfaction ≠ learning gains (game-based CFL), 2025 — [MDPI](https://www.mdpi.com/2227-7102/15/11/1502/xml)
- Deterministic state-machine + LLM tutoring orchestrator, 2025 — [MDPI](https://www.mdpi.com/2504-2289/10/7/219)
- Multi-agent instructional design, human-control modes, 2025 — [arXiv:2508.19611](https://arxiv.org/html/2508.19611v3)
- Multi-turn interactive teaching modules (curriculum/assessment/strategy/reflection/memory) — [arXiv:2601.04219](https://arxiv.org/html/2601.04219v1)
- The tension between automation and learning — [arXiv:2606.04543](https://arxiv.org/html/2606.04543v1)
- Foundational learning science: Roediger & Karpicke (testing effect, 2006); Cepeda et al. (spacing, 2006); Deci, Koestner & Ryan (rewards & intrinsic motivation, 1999); Deci & Ryan (Self-Determination Theory); Fogg (B=MAP); Clear (Atomic Habits); Duhigg (habit loop); Bloom (2-sigma; taxonomy); Gollwitzer (implementation intentions). _Cited from established literature._

> **Scope note:** current-state claims are from direct code inspection of `src/` and `supabase/`; items marked _(verify)_ (e.g., the unmounted learning path, the `bloom_level` mismatch, cosmetic adaptive-XP) are strong inferences from static reading and should be confirmed at runtime before acting. This document evaluates the platform as a future personalized-learning ecosystem, not as a traditional LMS, per the brief.
