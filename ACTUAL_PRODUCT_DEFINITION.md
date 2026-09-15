# ACTUAL PRODUCT DEFINITION — Edeviser Platform
**Date:** 2026-09-12 | **Version:** Phase 13 Certified

Edeviser is a multi-agent intelligence layer and dual-engine K-12 Learning Experience Platform.

## Core Engines
1. **Outcome-Based Education (OBE)**: CLO → PLO → ILO attainment via evidence chain
2. **BJ Fogg-based Habit Engine**: Behavioral signals from learner activity, fused with OBE

## User Roles (all implemented)
- **Admin** (51 pages): Institution, users, curriculum, frameworks, reports
- **Coordinator** (19 pages): OBE analytics, problem cases, interventions, CQI, accreditation
- **Teacher** (50 pages): Courses, assessments, grading, rubrics, quizzes, attendance
- **Student** (71 pages): Dashboard, learning path, habits, tutor, challenges, interventions
- **Parent** (9 pages): Linked children, progress, attendance, fees, communications

## Intelligence Layer
- Multi-agent system (orchestrator + worker + evaluation + intervention jobs)
- Deterministic problem classification (classify_problem_cases_v1)
- Evidence-grounded recommendations with human approval
- 11-state intervention state machine (server-enforced)

## Assessment Models
- Percent (MoEHE/Qatar National)
- Criterion (IB MYP, A-D 0-8)
- Band Grade (IGCSE, AO-weighted)
- Component (multi-part weighted)

## Accreditation
10 report templates: IB, QNSA, BSO, CIS, ABET, AACSB, HEC, NCAA, QQA, Generic

## Tech Stack
React 18 + TypeScript, Tailwind CSS v4, Shadcn/ui, TanStack Query v5, Supabase (PostgreSQL + RLS), Edge Functions (Deno), Playwright E2E, Vitest (7,140 tests)

## Current Live State
- 7 institutions (1 operational: Noor International)
- 4 courses, 40 students, 4 teachers, 21 parents
- 1,650 evidence, 1,113 attainment
- 3 interventions, 845 agent jobs
- All triggers + RPCs deployed and verified