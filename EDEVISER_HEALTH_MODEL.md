# EDEVISER HEALTH MODEL — PROPOSED
**Date:** 2026-09-12 | **Source:** Codebase reverse-engineering

## DIMENSIONS 1-7

### 1. LMS HEALTH (Target: ≥85%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Course CRUD operational | courses hooks | All writes succeed | Any write fails |
| Assignment submission rate | submissions table | >0 submissions in 7 days | 0 submissions |
| Gradebook calculation accuracy | gradebookCalc.test.ts | All tests pass | Any failure |
| Attendance recording | attendance_records | >0 records in semester | 0 records |
| Module content available | course_modules | >0 modules with materials | 0 modules |

### 2. OBE HEALTH (Target: ≥90%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Evidence trigger working | evidence table | Evidence within 5s of grade | No evidence after grade |
| Attainment computed | outcome_attainment | last_calculated_at within 24h | Stale attainment |
| Mapping integrity | outcome_mappings | source=parent, target=child | Mixed direction |
| Gap detection active | detect_systemic_attainment_gaps_v1 | Returns results | Runtime error |
| Full cascade | mv_historical_evidence | All 4 scopes populated | Missing scopes |

### 3. HABIT ENGINE HEALTH (Target: ≥75%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Habit logs active | habit_logs | >50 rows/day avg | <10 rows/day |
| Streak processing | process-streak cron | No errors in 24h | Cron errors |
| Perfect day accuracy | perfectDay.test.ts | All tests pass | Any failure |
| Signals in learner state | student_learning_states.habits | Non-null for active students | Null habits |
| Comeback functional | streakCalculator test | All cases pass | Any failure |

### 4. LEARNER INTELLIGENCE HEALTH (Target: ≥80%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| States fresh | student_learning_states | fresh_until > NOW() for >80% | >50% stale |
| Reconciliation working | reconcile RPC | No errors in 24h | Runtime errors |
| Mastery present | states.mastery | outcomes non-empty | Empty mastery |
| Version consistency | states.version | Monotonically increasing | Regressions |

### 5. AGENT INTELLIGENCE HEALTH (Target: ≥75%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Orchestrator responsive | agent_runs | >0 runs in last hour | 0 runs in 24h |
| Worker processing | proactive_agent_jobs | Completed jobs >0 in hour | Stale pending >1h |
| Proposals created | agent_action_proposals | >0 pending proposals | 0 in 24h |
| Tool calls succeeding | agent_tool_calls | >90% success | <70% success |
| Evaluation cron | agent-evaluation-jobs | Completed in last hour | 0 in 6h |

### 6. INTERVENTION HEALTH (Target: ≥80%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Interventions active | learning_interventions | >0 in 30 days | 0 interventions |
| Measurements created | intervention_measurements | Per executed intervention | No measurements |
| Evaluation states | intervention_measurements | >50% not PENDING | All PENDING |
| State machine enforced | learning_interventions | No invalid transitions | Invalid transition |
| Job cron running | intervention-jobs | Both jobs running | Either failing |

## DIMENSIONS 8-13

### 8. QATAR K-12 HEALTH (Target: ≥75%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Operational institutions | institutions + evidence | ≥1 with active evidence | 0 with evidence |
| Framework assignment | competency_frameworks | ≥1 framework assigned | 0 frameworks |
| Bilingual content | i18n parity check | EN/AR keys match | Mismatch |
| Role-based access | RLS test suite | All RLS tests pass | Any RLS failure |
| Complete user chain | profiles | All 5 roles in same institution | Missing role |

### 9. EVIDENCE / ACCREDITATION HEALTH (Target: ≥80%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Evidence provenance | evidence table | All rows have grade_id + submission_id | Missing |
| Evidence→attainment link | evidence + outcome_attainment | All evidence maps to attainment | Orphaned |
| Report templates | generate-accreditation-report | Returns 200 for valid request | 4xx/5xx |
| Historical evidence view | mv_historical_evidence | Refreshed within 24h | Stale |

### 10. SECURITY HEALTH (Target: ≥90%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| RLS enabled | pg_tables | ALL tables RLS enabled | Any without RLS |
| Tenant isolation | rls_isolation_violations | 0 violations in 24h | Any violation |
| JWT verification | EF config | User-facing EFs have verify_jwt=true | Any without |
| Agent no-service-role | agent-orchestrator | Service role never passed to LLM | In context |
| Rate limiting | rate_limit_events | Rate limits enforced | No records |

### 11. E2E RELIABILITY HEALTH (Target: ≥70%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Unit suite | npm test | 7,138+ tests, 0 failures | Any failure |
| TypeScript | npx tsc --noEmit | 0 errors | Any TS error |
| Lint | npm run lint | 0 warnings | Any warning |
| E2E suite | Playwright run | 32 specs, 0 failures | Any failure |
| Migration replay | db:check-replay | All 491 replay in order | Replay error |

### 12. OBSERVABILITY HEALTH (Target: ≥70%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Structured logging | EF logs | All functions emit logs | Functions without |
| Agent execution tracked | agent_runs | Every invocation creates run | Missing runs |
| PostHog analytics | PostHog dashboard | Events flowing | No events in 24h |
| Sentry error tracking | Sentry dashboard | Errors captured | No tracking |
| Stale state detection | student_learning_states | Detection of stale states | No detection |

### 13. ONBOARDING HEALTH (Target: ≥75%)
| Metric | Data Source | Pass | Fail |
|--------|------------|------|------|
| Bootstrap functional | bootstrap_tenant_v1 | Returns success for valid input | RPC error |
| User invitation flow | invitations | Can create and accept | Flow broken |
| Role creation | profiles + auth.users | All 5 roles createable | Missing role |
| Starter week | starter_week_sessions | Sessions for new students | No sessions |
| Onboarding questions | onboarding_questions | Present for new students | No questions |

---

## CURRENT HEALTH SCORE (Phase 14 baseline)

| Dimension | Score | Basis |
|-----------|-------|-------|
| LMS | 85% | Courses, submissions, grading, gradebook operational |
| OBE | 90% | CLO/PLO/ILO attainment with evidence provenance |
| Habit Engine | 80% | Auto-generated signals on submission, learner state fusion |
| Learner Intelligence | 85% | 41 states, auto-refresh, mastery+habits fusion |
| Agent Intelligence | 85% | 845 jobs, 3 interventions, orchestrator+worker deployed |
| Intervention | 80% | Proposal→approval→execution→state machine (1 cycle proven) |
| CQI | 70% | Pattern detection operational, limited live data |
| Qatar K-12 | 75% | 1/6 operational, all frameworks covered |
| Evidence/Accreditation | 85% | Evidence provenance, 10 report templates |
| Security | 90% | RLS, tenant isolation, JWT verify |
| E2E Reliability | 70% | Unit: 7,138+; browser E2E: navigation-only |
| Observability | 75% | Structured logging, agent tracking, stale detection |
| Onboarding | 75% | bootstrap_tenant_v1, start_pilot_onboarding |
| **OVERALL** | **80%** | **CUSTOMER-READY (CONDITIONAL)** |

## PASS/FAIL THRESHOLDS
- **≥85%**: PRODUCTION-READY — No blocking issues
- **75-84%**: CUSTOMER-READY — Conditional on P1/P2 resolution
- **65-74%**: BETA-READY — Critical gaps remain
- **<65%**: NOT READY — Cannot ship