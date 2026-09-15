# WHAT EDEVISER ACTUALLY IS

**Audit:** 2026-09-14 | **Build:** e6f7dc88 | **Source:** Live codebase + DB

---

## EXECUTIVE ANSWER

Edeviser is an **Institutional Intelligence Platform** targeting Qatar's multi-framework K-12 + higher education market. It combines OBE (ILO/PLO/CLO), AI-powered intelligence via DeepSeek, and gamification into a single platform with 5 roles, institution-scoped tenant isolation (RLS on 189 tables), and multi-framework support (IB, QNSA, BSO, CIS, ABET).

## WHAT ACTUALLY WORKS

| Domain | Status | Evidence |
|--------|--------|----------|
| OBE Engine | LIVE | 550 grades → 1650 evidence → 1113 attainment |
| AI Intelligence | LIVE | 10+ calls Sep 13, 20+ messages, v40 orchestrator |
| 5-Role Auth | LIVE | Noor International (68 users) |
| RLS Security | VERIFIED | 189/189 tables, agent tables fail-closed |
| Gamification | LIVE | 2,508 XP transactions, separate from academics |
| Cron Automation | LIVE | 5 pg_cron + 11 Vercel routes |
| Multi-Framework Config | LIVE | 7 institutions, criterion (IB MYP) exercised |

## WHAT HAS INFRASTRUCTURE BUT ZERO LIVE DATA

| Domain | Infrastructure | Live Data |
|--------|---------------|-----------|
| BJ Fogg Habit Engine | 2 triggers, 3 tables, edge function | 0 rows |
| Intervention Measurement | 2 triggers, table | 0 rows |
| Agent Evaluation | edge function (gated off) | 0 rows |
| Accreditation Reports | edge function | 0 rows |
| Quiz System | table | 0 questions |
| AI Feedback/Insights | 3 tables | 0 rows |

## FIVE BIGGEST TRUTHS

1. **RLS is security backbone** — 189/189 tables, agent tables fail-closed
2. **Single orchestrator + specialist protocols** — not true multi-agent
3. **Trigger-driven data pipeline** — grade→evidence→attainment LIVE, habit/intervention triggers never fire
4. **Dual cron** — Vercel canonical for HTTP, pg_cron for SQL
5. **IB MYP criterion only exercised assessment model** — 3 other models architected but unused

## FIVE BIGGEST GAPS

1. 6/7 institutions are shells — only Noor has data
2. BJ Fogg engine has 0 runtime evidence
3. No browser E2E testing (localhost unreachable)
4. Intervention closed loop never completed (0 measurements)
5. Accreditation pipeline never run (0 reports)

## PRODUCT CLASSIFICATION

**Learning Intelligence Platform (LIP)** — not a pure LMS. Goes beyond content management into OBE evidence, AI-augmented workflows, and institutional intelligence. BJ Fogg and intervention loops are architected but not live.