# Review Loop & Domain Knowledge (adapted from Kiro steering/review-loop.md, domain-knowledge.md)

## Review Loop
- After completing a task, review the diff before pushing: check for debug code, leftover TODOs, console.logs, and unintended changes.
- Verify the change matches the requested scope; do not introduce unrelated refactors.
- Run the pre-commit checks (lint, tsc, tests) and confirm they pass before declaring completion.

## Domain Knowledge
- Edeviser implements Outcome-Based Education (OBE): programs → courses → learning outcomes (CLOs/PLOs) → assessments mapped to outcomes.
- Gamification: XP, levels, badges, quests, leaderboards, and marketplace rewards for students.
- Roles: admin, coordinator, teacher, student, parent — each with distinct dashboards and permissions.
- Bilingual: Arabic (RTL) and English (LTR) via i18next; all user-facing strings must be localized.
- Qatar market: academic accreditation (e.g., CAA/QNSA-style) and CQI (continuous quality improvement) workflows are core.