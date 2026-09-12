# FRONTEND INTEGRATION CONTRACT
**Date:** 2026-09-12 | **Status:** ✅ ALL GAPS RESOLVED — QA CONTRACT

## W1: Teacher Assessment Submission ✅
| Layer | Contract |
|-------|----------|
| UI | Teacher → GradingInterface → rubric selections |
| Hook | useCreateGrade.mutate({submission_id, rubric_selections, total_score, score_percent, overall_feedback}) |
| Auth | JWT role=teacher, RLS institution-scoped |
| DB | INSERT grades → trigger_attainment_rollup → evidence + attainment + XP + raw_score |
| Downstream | CLO/PLO/ILO attainment, learner state stale, habit signal, notification |
| Refresh | invalidateQueries: grades, evidence, attainment, submissions |

## W2: Problem Classification ✅
| Layer | Contract |
|-------|----------|
| UI | Coordinator → Unit Close → DecisionIntelligenceSection |
| Hook | useProblemClassification(courseId) → classify_problem_cases_v1 RPC |
| Auth | role=coordinator, institution scoped |
| Response | {course_id, course_avg, section_spread, cases: ProblemCase[]} |

## W3: Intervention Proposal ✅ (was missing)
| Layer | Contract |
|-------|----------|
| UI | DecisionIntelligenceSection → "Submit for Approval" button |
| Hook | useCreateInterventionProposal().mutate({courseId, cloId, studentIds, interventionType, plan, recommendedOwner}) |
| Auth | role IN (coordinator, teacher, admin) |
| RPC | create_learning_intervention_proposal_v1 |
| DB | INSERT agent_action_proposals (action_type=create_learning_intervention, status=pending) |
| Response | {proposalId, status: "pending", approvalRequired: true, approverRole: "coordinator"} |

## W4: Approval + Execution ✅
| Layer | Contract |
|-------|----------|
| UI | Coordinator Dashboard → ApprovalInbox → Approve → Execute |
| Edge | agent-orchestrator: decide_proposal → execute_proposal |
| RPC | execute_approved_learning_intervention_v1(proposal_id, actor_id) |
| DB | INSERT learning_interventions + agent_action_executions |
| Trigger | trg_create_measurement_on_intervention → intervention_measurements |

## W5: Accreditation Report ✅ (was schema drift)
| Layer | Contract |
|-------|----------|
| UI | Coordinator → Reports → Generate Accreditation Report |
| Edge | generate-accreditation-report {program_id, template, semester_id?} |
| Auth | JWT, role IN (admin, coordinator) |
| Response | {success, job_id, storage_path, download_url, plo_count, ilo_count} |
| Templates | IB, QNSA, BSO, CIS, ABET, AACSB, HEC, NCAA, QQA, Generic |

## W6: School Onboarding ✅
| Layer | Contract |
|-------|----------|
| UI | Admin → Institution Settings → Onboarding |
| RPC | start_pilot_onboarding({p_name, p_regime}) |
| Auth | role=admin |
| Response | {institutionId, checklist, timeToFirstAttainment} |
| DB | Institution + programs + courses + mappings (transactional) |

## W7: Intervention Lifecycle (student-visible)
| Layer | Contract |
|-------|----------|
| UI | Student → My Interventions → view/interact |
| Hook | useLearningInterventions(courseId) |
| Auth | RLS: student sees own interventions |
| Status | ⚠️ Start/complete actions need UI |

## W8: Measurement Evaluation
| Layer | Contract |
|-------|----------|
| Edge | intervention-jobs: evaluate_measurements |
| RPC | claim_due_intervention_measurements_v1 → complete_intervention_evaluation_v1 |
| Trigger | intervention_measurement_learning_state_refresh → refresh_student_learning_state_v1 | |