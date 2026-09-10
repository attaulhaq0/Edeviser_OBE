# Agent Context: Framework-Aware AI

> How the Edeviser AI layer interacts with IB MYP, Cambridge IGCSE, and MoEHE National Curriculum frameworks.

---

## Framework-Aware Tutoring

The AI Tutor reads the course assessment_model:

- MYP course -> explains in criterion language (Criterion A: Knowing, B: Investigating...)
- IGCSE course -> references AO1/AO2/AO3 weighting
- MoEHE course -> bilingual responses with learner attributes

The course row carries assessment_model (percent|criterion|band_grade) — the tutor retrieves it via RLS-scoped query and adapts its response framing.

## Curriculum Ingestion

The curriculum-ingest edge function extracts candidate CLOs differently per framework:

- IB syllabus -> Bloom verbs mapped to MYP criteria (A-D)
- Cambridge syllabus -> AO-weighted topic extraction
- MoEHE syllabus -> bilingual topic/outcome extraction (AR/EN)

All ingestion is DRY-RUN -> coordinator approval -> writes through outcome/mapping validators.

## CQI Detector

Framework-agnostic. The CQI detector (classify_problem_cases_v1) works on attainment data regardless of assessment model. It classifies problems as student/teacher/assessment/prerequisite/curriculum-design and routes ownership deterministically.

## Decision Intelligence

The 5-class problem taxonomy applies uniformly. The AI explanation channel (DeepSeek, citation-fail-closed) frames explanations with framework-appropriate language but the underlying logic is model-agnostic.

## Accreditation Evidence Packs

The generate_accreditation_evidence_pack RPC is regime-aware:

- QNSA -> bilingual AR/EN with learner attributes
- BSO/CIS -> evidence matrices with PLO+AO alignment
- IB -> criterion-based with moderation trails

Each pack reads from the same canonical evidence chain; the regime parameter controls output format.

## Guardrails

- AI NEVER writes outcomes, mappings, or grades without approval (PROTECTED_ACTIONS)
- Evidence packets framed UNTRUSTED (OWASP LLM01 check 37)
- Institution-scoped: tutor cannot access another tenant course materials
- Framework isolation: MYP student AI sessions never reference IGCSE grading

> See [Security Checklist](../../.kiro/specs/edeviser-agentic-intelligence/security-checklist.md) for the 46-point guardrail verification.
