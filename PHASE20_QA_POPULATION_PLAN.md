# PHASE20 — CONFIGURATION PRESCRIPTIONS + QA POPULATION
**Date:** 2026-09-12

## PRINCIPLE: Never use arbitrary SQL — use bootstrap functions

All population must go through legitimate onboarding:
1. `bootstrap_tenant_v1` RPC (admin-only, idempotent) — creates institution+programs+courses
2. `bootstrap-first-admin` Edge Function — creates first admin
3. `send-invitation-email` / `accept-invitation` — role onboarding
4. Normal frontend CRUD for outcomes, assignments, submissions

## CONFIGURATION PRESCRIPTIONS

### IB MYP (Noor International School)
```sql
-- Set IB MYP grade scale (1-7)
UPDATE institution_settings
SET grade_scales = '[
  {"letter":"7","min_percent":88,"max_percent":100,"gpa_points":4.0},
  {"letter":"6","min_percent":75,"max_percent":88,"gpa_points":3.7},
  {"letter":"5","min_percent":63,"max_percent":75,"gpa_points":3.3},
  {"letter":"4","min_percent":50,"max_percent":63,"gpa_points":3.0},
  {"letter":"3","min_percent":38,"max_percent":50,"gpa_points":2.0},
  {"letter":"2","min_percent":25,"max_percent":38,"gpa_points":1.0},
  {"letter":"1","min_percent":0,"max_percent":25,"gpa_points":0.0}
]'::jsonb,
attainment_thresholds = '{"excellent":88,"satisfactory":63,"developing":38}'::jsonb,
success_threshold = 63
WHERE institution_id = '00000000-0000-4000-8000-000000000003';

-- Set all courses to criterion model
UPDATE courses SET assessment_model = 'criterion'
WHERE id IN (
  SELECT c.id FROM courses c
  JOIN programs p ON p.id = c.program_id
  WHERE p.institution_id = '00000000-0000-4000-8000-000000000003'
);
```

### IGCSE (Doha British School — to be onboarded)
```sql
-- After bootstrap_tenant_v1 creates the institution:
UPDATE institution_settings
SET grade_scales = '[
  {"letter":"9/A*","min_percent":90,"max_percent":100,"gpa_points":4.0},
  {"letter":"8/A*","min_percent":80,"max_percent":90,"gpa_points":4.0},
  {"letter":"7/A","min_percent":70,"max_percent":80,"gpa_points":3.7},
  {"letter":"6/B","min_percent":60,"max_percent":70,"gpa_points":3.3},
  {"letter":"5/C","min_percent":50,"max_percent":60,"gpa_points":3.0},
  {"letter":"4/D","min_percent":40,"max_percent":50,"gpa_points":2.0},
  {"letter":"3/E","min_percent":30,"max_percent":40,"gpa_points":1.0},
  {"letter":"2/F","min_percent":20,"max_percent":30,"gpa_points":0.0},
  {"letter":"1/G","min_percent":0,"max_percent":20,"gpa_points":0.0}
]'::jsonb,
attainment_thresholds = '{"excellent":90,"satisfactory":60,"developing":40}'::jsonb,
success_threshold = 60,
accreditation_bodies = ARRAY['BSO','QNSA']
WHERE institution_id = '<doha_british_id>';

UPDATE courses SET assessment_model = 'band_grade'
WHERE program_id IN (
  SELECT id FROM programs WHERE institution_id = '<doha_british_id>'
);
```

### MoEHE National (Al Jazeera Academy — to be onboarded)
```sql
UPDATE institution_settings
SET grade_scales = '[
  {"letter":"A","min_percent":85,"max_percent":100,"gpa_points":4.0},
  {"letter":"B","min_percent":70,"max_percent":85,"gpa_points":3.0},
  {"letter":"C","min_percent":55,"max_percent":70,"gpa_points":2.0},
  {"letter":"D","min_percent":50,"max_percent":55,"gpa_points":1.0},
  {"letter":"F","min_percent":0,"max_percent":50,"gpa_points":0.0}
]'::jsonb,
attainment_thresholds = '{"excellent":85,"satisfactory":70,"developing":50}'::jsonb,
success_threshold = 70,
accreditation_bodies = ARRAY['QNSA','MoEHE'],
default_language = 'ar'
WHERE institution_id = '<al_jazeera_id>';

UPDATE courses SET assessment_model = 'percent'
WHERE program_id IN (
  SELECT id FROM programs WHERE institution_id = '<al_jazeera_id>'
);
```

### Multi-Track (Qatar Multi-Track Academy — to be onboarded)
Each TRACK gets its own configuration. The institution settings store the DEFAULT (MoEHE percent). Individual courses in the MYP track set `assessment_model='criterion'`; IGCSE track courses set `assessment_model='band_grade'`. The `competency_frameworks` table has 3 framework assignments for this institution.

## QA POPULATION — REALISTIC DATA REQUIREMENTS

### Per Institution Minimum
| Role | Count | Data |
|------|-------|------|
| Admin | 1 | Full permissions |
| Coordinator | 1 | Program-level oversight |
| Teacher | 2 | Different subjects, different courses |
| Student | 5 | Varied performance patterns (see below) |
| Parent | 2 | Linked to 2 different students |
| Courses | 2 | Different assessment models where applicable |
| CLOs | 4 per course | At least 2 mapped to PLOs |
| PLOs | 3 per program | Mapped to ILOs |
| ILOs | 3 | Institution-wide |
| Assignments | 3 per course | Different types (quiz, essay, project) |
| Submissions | 15 total | With varying scores |
| Evidence | 15 rows | Auto-generated from grades |

### Student Performance Patterns
| Student Pattern | Attainment | Habits | Purpose |
|----------------|-----------|--------|---------|
| High performer | 85-95% | Strong consistency | Test: high attainment → correct reporting |
| Mid performer | 60-75% | Moderate | Test: grade scale boundaries |
| Low performer | 30-50% | Weak | Test: risk signal generation |
| Improving | 40→70% | Improving | Test: growth measurement |
| Inconsistent | 85% then 40% | Declining | Test: habit-OBE fusion signals |

## ONBOARDING SEQUENCE

1. **Admin**: `bootstrap-first-admin` EF → creates first admin user
2. **Bootstrap tenant**: `bootstrap_tenant_v1` RPC → creates institution, programs, courses, CLOs, PLOs, mappings
3. **Framework assignment**: Run `framework-tenants.sql` for framework → institution mapping
4. **Settings**: Apply institution_settings prescription (grade scale, thresholds, language, accreditation)
5. **Users**: Invite coordinator → accept → invite teachers → accept → invite students → accept → invite parents → link
6. **Outcomes**: Review auto-generated CLO/PLO/ILO mappings
7. **Assessments**: Create assignments via teacher UI
8. **Submissions**: Students submit → teacher grades → evidence auto-generated
9. **Verification**: Check attainment cascade, habit signals, dashboards populate