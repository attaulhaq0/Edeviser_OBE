# Student Experience Refinement Plan

## Scope and boundary

Only `prototype/` is in scope. The existing shell, shared CSS/JS, role pages, and production application remain untouched. Existing uncommitted prototype edits were treated as baseline and not overwritten.

## Audit and action

| Page | Current purpose | Works | Needed refinement | Action |
|---|---|---|---|---|
| dashboard.html | Decide what matters next | Desktop shell, streak hero, course row, rail | Deadline and next-step connection were unclear | REFINE |
| path.html | Show learning journey | Apply journey/tree and desktop density | Add explainable context without redesign | REFINE |
| course.html | Course context | Compact module view | Contains stale due-today copy | CONTENT FIX (follow-up) |
| lesson.html | Practice a concept | Guided interaction | Already aligned to CLO story | KEEP |
| assignment.html | Create evidence | Task, reward, upload flow | Deadline contradicted current story; no reason layer | REFINE |
| tutor.html | Contextual learning support | Memory/context and integrity guardrails | Authority and permission were implicit | REFINE |
| review.html | Reinforce before forgetting | Review arena and card interaction | Queue total contradicted canonical data | CONTENT FIX |
| progress.html | Explain what is improving | Existing compact progress cards | Needs learning-state explanation, not new KPI dashboard | REFINE |
| learning-profile.html | Deeper learner view | Two-column content density | Personality profiling is inappropriate for Student UI | REFINE |
| focus.html | Use available study time | Timer and scheduled review card | Needs explicit 25-minute rationale | REFINE |
| wellness.html | Support study routine | Habit engine presentation | Already uses non-medical language | KEEP |
| journal.html | Reflect | Private reflection and habit loop | No automatic sharing implied | KEEP |
| calendar.html | Plan deadlines | Calendar shell and agenda | Stale assignment timing requires follow-up | CONTENT FIX (follow-up) |
| learn.html | Course/task overview | Course list and recently graded | Assignment timing needs follow-up | CONTENT FIX (follow-up) |
| profile.html | Preferences and identity | Existing profile | Could later expose preferences; no change required | KEEP |
| portfolio.html | Evidence portfolio | Outcome/evidence view | Useful supporting proof | KEEP |
| quests.html | Motivation | Gamification contained | Do not tie XP to mastery | KEEP |
| leaderboard.html | Social motivation | Separate league UI | Do not tie rank to mastery | KEEP |
| marketplace.html | Reward spending | Wallet/rules | No intelligence needed | KEEP |
| team.html | Collaboration | Team-safe content | No peer learning-state exposure | KEEP |
| announcements.html | Course updates | Compact list | No change required | KEEP |
| discussions.html | Course discussion | Course context | No change required | KEEP |
| notifications.html | Alerts | Existing stream | No change required | KEEP |
| settings.html | Preferences | Existing settings | No change required | KEEP |

## File-by-file implementation plan

1. Add a prototype-only canonical student data object and its dictionary.
2. Add a scoped CSS/JS overlay for explainable recommendations, policy facts and keyboard-safe drawer behavior.
3. Attach it only to Dashboard, Learning Path, Assignment, Tutor, Daily Review, Progress and Focus.
4. Correct the primary cross-page inconsistencies discovered in the audit without changing the established application shell.
5. Capture desktop/mobile QA and record remaining, intentionally deferred supporting-page copy corrections.