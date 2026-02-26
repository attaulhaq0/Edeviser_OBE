# Design Document — Student Onboarding & Profiling

## Overview

This design covers the Student Onboarding & Profiling feature for the Edeviser platform — a multi-step wizard that captures personality traits (Big Five), learning style preferences (VARK), and baseline competency levels (CLO-mapped diagnostic tests) for new students. The feature adds:

1. A full-screen onboarding wizard triggered when `onboarding_completed = false`, with step-by-step navigation, progress tracking, and resume-on-return capability
2. A personality assessment engine (25 questions, 5 Big Five dimensions, Likert scale scoring)
3. A learning style detector (16 questions, 4 VARK modalities, frequency-based scoring)
4. A baseline testing system with CLO-mapped multiple-choice questions, configurable time limits, and auto-submission
5. A Profile Engine (Edge Function) that validates responses, calculates scores, persists profiles, and triggers XP/badge awards
6. Dashboard integration with a Profile Summary Card (radar chart for Big Five, dominant VARK display)
7. Teacher views for baseline results and Admin views for onboarding analytics
8. Re-assessment flow with 90-day cooldown and version history

The system integrates with the existing auth flow (`onboarding_completed` flag on `profiles`), gamification engine (XP awards, badge checks), OBE outcome hierarchy (CLO-based baseline testing), and Supabase Auth/RLS.

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Assessment storage | Database-driven Question_Bank | Allows institutional customization without code changes |
| Personality model | Big Five (OCEAN) | Well-validated, widely used in educational psychology |
| Learning style model | VARK | Simple, actionable, maps well to content delivery modes |
| Score calculation | Edge Function (Profile_Engine) | Server-side ensures consistency; client cannot tamper with scores |
| Progress persistence | `onboarding_progress` table | Survives browser close, logout, device switch |
| Baseline test format | Multiple-choice only | Simple to auto-grade, sufficient for diagnostic purposes |
| Profile versioning | assessment_version column | Preserves history for re-assessment comparison |
| Profile privacy | Student-only RLS + aggregate views for staff | Balances personalization with privacy |
| Wizard UI | Full-screen overlay with step navigation | Prevents dashboard access until onboarding is complete |
| Re-assessment cooldown | 90 days, enforced server-side | Prevents gaming while allowing genuine profile updates |

## Architecture

### High-Level Data Flow

```mermaid
sequenceDiagram
    actor Student
    participant Wizard as Onboarding Wizard (React)
    participant EF_Profile as process-onboarding (Edge Function)
    participant DB as Supabase PostgreSQL
    participant XP as award-xp (Edge Function)
    participant Badge as check-badges (Edge Function)

    rect rgb(230, 244, 255)
        Note over Student, DB: Onboarding Flow
        Student->>Wizard: First login (onboarding_completed = false)
        Wizard->>DB: Fetch onboarding_progress (resume check)
        Wizard->>DB: Fetch onboarding_questions (personality + VARK)
        Student->>Wizard: Complete personality questions (25)
        Wizard->>DB: Save responses to onboarding_responses
        Wizard->>DB: Update onboarding_progress (step = personality_done)
        Student->>Wizard: Complete VARK questions (16)
        Wizard->>DB: Save responses to onboarding_responses
        Wizard->>DB: Update onboarding_progress (step = learning_style_done)
    end

    rect rgb(230, 255, 240)
        Note over Student, DB: Baseline Testing
        Wizard->>DB: Fetch enrolled courses with active baseline tests
        Student->>Wizard: Select courses & take baseline tests
        Wizard->>DB: Save baseline responses to onboarding_responses
        Wizard->>DB: Update onboarding_progress (step = baseline_done)
    end

    rect rgb(255, 245, 230)
        Note over Student, Badge: Profile Computation & Rewards
        Student->>Wizard: Confirm profile summary
        Wizard->>EF_Profile: POST /process-onboarding { student_id, assessment_version }
        EF_Profile->>DB: Fetch all onboarding_responses for student
        EF_Profile->>EF_Profile: Calculate Big Five scores (weighted avg)
        EF_Profile->>EF_Profile: Calculate VARK scores (frequency)
        EF_Profile->>EF_Profile: Calculate baseline CLO scores (% correct)
        EF_Profile->>DB: INSERT student_profiles record
        EF_Profile->>DB: INSERT baseline_attainment records
        EF_Profile->>DB: UPDATE profiles SET onboarding_completed = true
        EF_Profile->>XP: Award onboarding XP (personality: 25, VARK: 25, baseline: 20/course, complete: 50)
        EF_Profile->>Badge: Check "Self-Aware Scholar" and "Thorough Explorer" badges
        EF_Profile-->>Wizard: { success: true, profile_summary }
        Wizard->>Student: Show profile summary + XP animation + redirect to dashboard
    end
```

### Component Architecture

```
src/
├── pages/student/onboarding/
│   ├── OnboardingWizard.tsx          # Full-screen wizard container with step navigation
│   ├── WelcomeStep.tsx               # Welcome message, time estimate, XP preview
│   ├── PersonalityStep.tsx           # Big Five questionnaire (25 questions, Likert scale)
│   ├── LearningStyleStep.tsx         # VARK questionnaire (16 questions, 4 options each)
│   ├── BaselineSelectStep.tsx        # Course selection for baseline tests
│   ├── BaselineTestStep.tsx          # Timed baseline test per course
│   └── ProfileSummaryStep.tsx        # Results display + confirmation
├── components/shared/
│   ├── ProfileSummaryCard.tsx        # Dashboard card with radar chart + VARK display
│   ├── LikertScale.tsx              # Reusable 5-point Likert scale input
│   ├── QuestionCard.tsx             # Single question display with options
│   └── AssessmentTimer.tsx          # Countdown timer for baseline tests
├── hooks/
│   ├── useOnboardingProgress.ts     # Progress tracking CRUD
│   ├── useOnboardingQuestions.ts    # Question bank queries
│   ├── useOnboardingResponses.ts   # Response persistence
│   ├── useStudentProfile.ts        # Profile data queries
│   └── useBaselineTests.ts         # Baseline test config + results
├── lib/
│   ├── onboardingSchemas.ts        # Zod schemas for all onboarding payloads
│   ├── scoreCalculator.ts          # Big Five + VARK + baseline score computation
│   └── onboardingConstants.ts      # Step definitions, XP amounts, cooldown config
├── pages/teacher/baseline/
│   └── BaselineResultsPage.tsx     # Teacher view of baseline results per course
├── pages/student/settings/
│   └── ReassessmentPage.tsx        # Re-assessment flow with cooldown check
supabase/functions/
└── process-onboarding/index.ts     # Score calculation, profile persistence, XP/badge triggers
```

## Components and Interfaces

### Edge Function: `process-onboarding`

The primary Edge Function that processes all onboarding assessment data, calculates scores, and persists the student profile.

```typescript
// Request payload
interface ProcessOnboardingRequest {
  student_id: string;
  assessment_version: number;
  skipped_sections: ('personality' | 'learning_style' | 'baseline')[];
  baseline_course_ids: string[];  // courses the student took baseline tests for
}

// Response payload
interface ProcessOnboardingResponse {
  success: boolean;
  profile: {
    personality_traits: BigFiveTraits | null;
    learning_style: VARKProfile | null;
    baseline_scores: BaselineResult[];
  };
  xp_awarded: number;
  badges_earned: string[];
}

interface BigFiveTraits {
  openness: number;        // 0-100
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

interface VARKProfile {
  visual: number;          // 0-100
  auditory: number;
  read_write: number;
  kinesthetic: number;
  dominant_style: 'visual' | 'auditory' | 'read_write' | 'kinesthetic' | 'multimodal';
}

interface BaselineResult {
  course_id: string;
  clo_scores: Array<{ clo_id: string; score: number }>;
}
```

Processing pipeline:
1. Validate JWT → extract `student_id` from token
2. Verify `student_id` matches the request (prevent profile creation for other students)
3. Fetch all `onboarding_responses` for this student and assessment_version
4. Fetch `onboarding_questions` to validate responses against active questions
5. Calculate Big Five Trait_Scores (weighted average per dimension, normalized to 0–100)
6. Calculate VARK_Scores (frequency per modality, normalized to 0–100)
7. Determine dominant learning style (highest score, or 'multimodal' if within 10 points)
8. Calculate Baseline_Scores per CLO (% correct per CLO)
9. INSERT into `student_profiles` (personality_traits JSONB, learning_style JSONB)
10. INSERT into `baseline_attainment` (one row per student × course × CLO)
11. UPDATE `profiles` SET `onboarding_completed = true`
12. DELETE `onboarding_progress` record (cleanup)
13. Invoke `award-xp` for each completed section + completion bonus
14. Invoke `check-badges` for "Self-Aware Scholar" and "Thorough Explorer"

### React Components

**OnboardingWizard** — Full-screen overlay container:
- Renders when `onboarding_completed = false` (checked via AuthProvider)
- Step navigation with back/next buttons and progress bar
- Persists progress to `onboarding_progress` on each step completion
- Resumes from last completed step on mount (fetches `onboarding_progress`)
- "Skip for Now" button on each assessment section
- Blocks dashboard access (renders above StudentLayout)

**PersonalityStep** — Big Five questionnaire:
- Fetches 25 personality questions from `onboarding_questions`
- Displays one question at a time with LikertScale component
- Smooth Framer Motion transitions between questions
- Saves responses to `onboarding_responses` in batches of 5 (per dimension)
- Shows dimension progress (e.g., "Question 3 of 5 — Openness")

**LearningStyleStep** — VARK questionnaire:
- Fetches 16 learning style questions from `onboarding_questions`
- Displays one question at a time with 4 radio options
- Each option maps to a VARK modality (mapping stored in question metadata)
- Saves responses on completion of all 16 questions

**BaselineSelectStep** — Course selection:
- Fetches enrolled courses with `baseline_test_active = true`
- Displays course cards with test info (question count, time limit)
- Checkbox selection for multiple courses
- "Skip Baseline Tests" button

**BaselineTestStep** — Timed test per course:
- Fetches baseline questions for selected course from `onboarding_questions`
- Groups questions by CLO with CLO title headers
- AssessmentTimer countdown (configurable per course)
- Auto-submits on timer expiry
- Saves responses immediately on submission

**ProfileSummaryStep** — Results display:
- Radar chart (Recharts) for Big Five traits
- VARK dominant style with icon and description
- Baseline scores per course/CLO as progress bars
- "Confirm & Continue" button triggers `process-onboarding` Edge Function
- XP award animation (XPAwardToast) and badge pop on success

**ProfileSummaryCard** — Dashboard widget:
- Compact radar chart for Big Five
- Dominant VARK style badge with description
- "Retake Assessment" link
- "Complete Assessment" prompt for skipped sections

**LikertScale** — Reusable input:
- 5 radio buttons with labels (Strongly Disagree → Strongly Agree)
- Accessible with keyboard navigation and ARIA labels
- Visual highlight on selected option

**AssessmentTimer** — Countdown component:
- Displays remaining time in MM:SS format
- Warning state (red) when < 2 minutes remaining
- Calls `onExpire` callback when timer reaches 0
- Pauses when browser tab is hidden (visibility API), resumes on focus

### TanStack Query Hooks

```typescript
// useOnboardingProgress.ts
export const useOnboardingProgress = (studentId: string) => useQuery({...});
export const useUpdateProgress = () => useMutation({...});

// useOnboardingQuestions.ts
export const usePersonalityQuestions = () => useQuery({...});
export const useLearningStyleQuestions = () => useQuery({...});
export const useBaselineQuestions = (courseId: string) => useQuery({...});

// useOnboardingResponses.ts
export const useSaveResponses = () => useMutation({...});

// useStudentProfile.ts
export const useStudentProfile = (studentId: string) => useQuery({...});
export const useProcessOnboarding = () => useMutation({...}); // calls Edge Function

// useBaselineTests.ts
export const useBaselineTestConfig = (courseId: string) => useQuery({...});
export const useBaselineResults = (courseId: string) => useQuery({...}); // teacher view
export const useCourseBaselineStats = (courseId: string) => useQuery({...}); // aggregate
```

### Zod Schemas

```typescript
// onboardingSchemas.ts
export const likertResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(1).max(5), // 1=Strongly Disagree, 5=Strongly Agree
});

export const varkResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(0).max(3), // index of the 4 VARK options
});

export const baselineResponseSchema = z.object({
  question_id: z.string().uuid(),
  selected_option: z.number().int().min(0).max(3), // index of 4 answer options
});

export const saveResponsesSchema = z.object({
  student_id: z.string().uuid(),
  assessment_type: z.enum(['personality', 'learning_style', 'baseline']),
  assessment_version: z.number().int().min(1),
  course_id: z.string().uuid().optional(), // required for baseline
  responses: z.array(z.union([likertResponseSchema, varkResponseSchema, baselineResponseSchema])).min(1),
});

export const processOnboardingSchema = z.object({
  student_id: z.string().uuid(),
  assessment_version: z.number().int().min(1),
  skipped_sections: z.array(z.enum(['personality', 'learning_style', 'baseline'])),
  baseline_course_ids: z.array(z.string().uuid()),
});

export const baselineQuestionSchema = z.object({
  question_text: z.string().min(10).max(1000),
  options: z.array(z.string().min(1).max(500)).length(4),
  correct_option: z.number().int().min(0).max(3),
  clo_id: z.string().uuid(),
  difficulty_level: z.enum(['easy', 'medium', 'hard']),
});

export const baselineTestConfigSchema = z.object({
  course_id: z.string().uuid(),
  time_limit_minutes: z.number().int().min(5).max(60).default(15),
  is_active: z.boolean(),
});
```

## Data Models

### New Database Tables

```sql
-- ============================================================
-- onboarding_questions — Question bank for all assessments
-- ============================================================
CREATE TABLE onboarding_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  assessment_type VARCHAR(20) NOT NULL CHECK (assessment_type IN (
    'personality', 'learning_style', 'baseline'
  )),
  question_text TEXT NOT NULL,
  -- Personality fields
  dimension VARCHAR(30) CHECK (dimension IN (
    'openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'
  )),
  weight SMALLINT CHECK (weight IN (-1, 1)),  -- scoring direction for personality
  -- Learning style fields
  options JSONB,  -- array of { option_text, modality } for VARK; array of { option_text } for baseline
  -- Baseline fields
  correct_option SMALLINT CHECK (correct_option >= 0 AND correct_option <= 3),
  clo_id UUID REFERENCES learning_outcomes(id),
  course_id UUID REFERENCES courses(id),
  difficulty_level VARCHAR(10) CHECK (difficulty_level IN ('easy', 'medium', 'hard')),
  -- Common fields
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_questions_type ON onboarding_questions (institution_id, assessment_type, is_active);
CREATE INDEX idx_questions_course ON onboarding_questions (course_id) WHERE assessment_type = 'baseline';

-- ============================================================
-- onboarding_responses — Individual student answers
-- ============================================================
CREATE TABLE onboarding_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  question_id UUID NOT NULL REFERENCES onboarding_questions(id),
  assessment_version INTEGER NOT NULL DEFAULT 1,
  selected_option SMALLINT NOT NULL,
  score_contribution NUMERIC(5,2),  -- computed score value for this response
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, question_id, assessment_version)
);

CREATE INDEX idx_responses_student ON onboarding_responses (student_id, assessment_version);

-- ============================================================
-- onboarding_progress — Step tracking for resume capability
-- ============================================================
CREATE TABLE onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  current_step VARCHAR(30) NOT NULL DEFAULT 'welcome' CHECK (current_step IN (
    'welcome', 'personality', 'learning_style', 'baseline_select', 'baseline_test', 'summary'
  )),
  personality_completed BOOLEAN NOT NULL DEFAULT false,
  learning_style_completed BOOLEAN NOT NULL DEFAULT false,
  baseline_completed BOOLEAN NOT NULL DEFAULT false,
  baseline_course_ids UUID[] DEFAULT '{}',
  skipped_sections TEXT[] DEFAULT '{}',
  assessment_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id)
);

-- ============================================================
-- student_profiles — Computed assessment results
-- ============================================================
CREATE TABLE student_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  institution_id UUID NOT NULL REFERENCES institutions(id),
  personality_traits JSONB,  -- { openness, conscientiousness, extraversion, agreeableness, neuroticism }
  learning_style JSONB,      -- { visual, auditory, read_write, kinesthetic, dominant_style }
  assessment_version INTEGER NOT NULL DEFAULT 1,
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, assessment_version)
);

CREATE INDEX idx_profiles_student ON student_profiles (student_id, assessment_version DESC);
CREATE INDEX idx_profiles_institution ON student_profiles (institution_id);

-- ============================================================
-- baseline_attainment — Per-CLO baseline scores
-- ============================================================
CREATE TABLE baseline_attainment (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id),
  course_id UUID NOT NULL REFERENCES courses(id),
  clo_id UUID NOT NULL REFERENCES learning_outcomes(id),
  score NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  question_count INTEGER NOT NULL,
  correct_count INTEGER NOT NULL,
  assessment_version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, course_id, clo_id)
);

CREATE INDEX idx_baseline_student ON baseline_attainment (student_id, course_id);
CREATE INDEX idx_baseline_course ON baseline_attainment (course_id, clo_id);

-- ============================================================
-- baseline_test_config — Per-course baseline test settings
-- ============================================================
CREATE TABLE baseline_test_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id) UNIQUE,
  time_limit_minutes INTEGER NOT NULL DEFAULT 15 CHECK (time_limit_minutes >= 5 AND time_limit_minutes <= 60),
  is_active BOOLEAN NOT NULL DEFAULT false,
  min_questions_per_clo INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### RLS Policies

```sql
-- ============================================================
-- onboarding_questions — RLS
-- ============================================================
ALTER TABLE onboarding_questions ENABLE ROW LEVEL SECURITY;

-- Students can read active questions for their institution
CREATE POLICY "questions_student_read" ON onboarding_questions
  FOR SELECT USING (
    auth_user_role() = 'student'
    AND institution_id = auth_institution_id()
    AND is_active = true
  );

-- Teachers can manage baseline questions for their courses
CREATE POLICY "questions_teacher_manage" ON onboarding_questions
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND assessment_type = 'baseline'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

-- Admins can manage all questions in their institution
CREATE POLICY "questions_admin_all" ON onboarding_questions
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- ============================================================
-- onboarding_responses — RLS (student-private)
-- ============================================================
ALTER TABLE onboarding_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "responses_student_own" ON onboarding_responses
  FOR ALL USING (student_id = auth.uid());

-- ============================================================
-- onboarding_progress — RLS (student-private)
-- ============================================================
ALTER TABLE onboarding_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_student_own" ON onboarding_progress
  FOR ALL USING (student_id = auth.uid());

-- ============================================================
-- student_profiles — RLS (student-private, aggregate for staff)
-- ============================================================
ALTER TABLE student_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_student_own" ON student_profiles
  FOR ALL USING (student_id = auth.uid());

-- Admins can read profiles in their institution (for aggregate analytics only — enforced at app level)
CREATE POLICY "profiles_admin_read" ON student_profiles
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND institution_id = auth_institution_id()
  );

-- ============================================================
-- baseline_attainment — RLS
-- ============================================================
ALTER TABLE baseline_attainment ENABLE ROW LEVEL SECURITY;

-- Students can read their own baseline scores
CREATE POLICY "baseline_student_own" ON baseline_attainment
  FOR SELECT USING (student_id = auth.uid());

-- Teachers can read baseline scores for their courses
CREATE POLICY "baseline_teacher_read" ON baseline_attainment
  FOR SELECT USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

-- Admins can read all baseline scores in their institution
CREATE POLICY "baseline_admin_read" ON baseline_attainment
  FOR SELECT USING (
    auth_user_role() = 'admin'
    AND course_id IN (SELECT id FROM courses WHERE institution_id = auth_institution_id())
  );

-- ============================================================
-- baseline_test_config — RLS
-- ============================================================
ALTER TABLE baseline_test_config ENABLE ROW LEVEL SECURITY;

-- Students can read config for enrolled courses
CREATE POLICY "config_student_read" ON baseline_test_config
  FOR SELECT USING (
    auth_user_role() = 'student'
    AND course_id IN (SELECT course_id FROM student_courses WHERE student_id = auth.uid())
  );

-- Teachers can manage config for their courses
CREATE POLICY "config_teacher_manage" ON baseline_test_config
  FOR ALL USING (
    auth_user_role() = 'teacher'
    AND course_id IN (SELECT id FROM courses WHERE teacher_id = auth.uid())
  );

-- Admins can manage all config in their institution
CREATE POLICY "config_admin_all" ON baseline_test_config
  FOR ALL USING (
    auth_user_role() = 'admin'
    AND course_id IN (SELECT id FROM courses WHERE institution_id = auth_institution_id())
  );
```

### Score Calculation Logic

```typescript
// scoreCalculator.ts

/**
 * Big Five Trait Score Calculation
 * 
 * Each dimension has 5 questions. Each question has a weight of +1 or -1.
 * Likert scale: 1 (Strongly Disagree) to 5 (Strongly Agree).
 * For weight=+1: score_contribution = selected_option (1-5)
 * For weight=-1: score_contribution = 6 - selected_option (reverse-scored)
 * 
 * Trait_Score = (sum of score_contributions for dimension / (5 * 5)) * 100
 * where 5 questions * max 5 per question = 25 max per dimension
 */
export function calculateBigFiveScores(
  responses: Array<{ dimension: string; selected_option: number; weight: number }>
): BigFiveTraits {
  const dimensions = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
  const scores: Record<string, number> = {};

  for (const dim of dimensions) {
    const dimResponses = responses.filter(r => r.dimension === dim);
    const sum = dimResponses.reduce((acc, r) => {
      const contribution = r.weight === 1 ? r.selected_option : 6 - r.selected_option;
      return acc + contribution;
    }, 0);
    const maxPossible = dimResponses.length * 5;
    scores[dim] = maxPossible > 0 ? Math.round((sum / maxPossible) * 100) : 0;
  }

  return scores as unknown as BigFiveTraits;
}

/**
 * VARK Score Calculation
 * 
 * Each of 16 questions has 4 options, each mapped to a VARK modality.
 * Student selects one option per question.
 * VARK_Score = (count of selections for modality / 16) * 100
 * 
 * Dominant style = modality with highest score.
 * Multimodal = two or more modalities within 10 points of each other at the top.
 */
export function calculateVARKScores(
  responses: Array<{ selected_modality: string }>,
  totalQuestions: number
): VARKProfile {
  const modalities = ['visual', 'auditory', 'read_write', 'kinesthetic'];
  const counts: Record<string, number> = { visual: 0, auditory: 0, read_write: 0, kinesthetic: 0 };

  for (const r of responses) {
    if (r.selected_modality in counts) {
      counts[r.selected_modality]++;
    }
  }

  const scores: Record<string, number> = {};
  for (const mod of modalities) {
    scores[mod] = Math.round((counts[mod] / totalQuestions) * 100);
  }

  // Determine dominant style
  const maxScore = Math.max(...Object.values(scores));
  const topModalities = modalities.filter(m => maxScore - scores[m] <= 10);
  const dominant_style = topModalities.length >= 2 ? 'multimodal' : modalities.reduce((a, b) => scores[a] > scores[b] ? a : b);

  return { ...scores, dominant_style } as unknown as VARKProfile;
}

/**
 * Baseline Score Calculation
 * 
 * Per CLO: score = (correct_count / total_questions_for_clo) * 100
 */
export function calculateBaselineScores(
  responses: Array<{ clo_id: string; selected_option: number; correct_option: number }>
): Array<{ clo_id: string; score: number; question_count: number; correct_count: number }> {
  const cloMap = new Map<string, { total: number; correct: number }>();

  for (const r of responses) {
    const entry = cloMap.get(r.clo_id) ?? { total: 0, correct: 0 };
    entry.total++;
    if (r.selected_option === r.correct_option) entry.correct++;
    cloMap.set(r.clo_id, entry);
  }

  return Array.from(cloMap.entries()).map(([clo_id, { total, correct }]) => ({
    clo_id,
    score: Math.round((correct / total) * 100),
    question_count: total,
    correct_count: correct,
  }));
}
```

### Onboarding Constants

```typescript
// onboardingConstants.ts

export const ONBOARDING_STEPS = [
  'welcome',
  'personality',
  'learning_style',
  'baseline_select',
  'baseline_test',
  'summary',
] as const;

export type OnboardingStepId = typeof ONBOARDING_STEPS[number];

export const ONBOARDING_XP = {
  personality: 25,
  learning_style: 25,
  baseline_per_course: 20,
  completion_bonus: 50,
} as const;

export const REASSESSMENT_COOLDOWN_DAYS = 90;

export const PERSONALITY_QUESTIONS_PER_DIMENSION = 5;
export const TOTAL_PERSONALITY_QUESTIONS = 25;
export const TOTAL_VARK_QUESTIONS = 16;
export const VARK_OPTIONS_PER_QUESTION = 4;

export const VARK_DESCRIPTIONS: Record<string, { icon: string; label: string; description: string }> = {
  visual: {
    icon: '👁️',
    label: 'Visual Learner',
    description: 'You learn best through diagrams, charts, and spatial understanding.',
  },
  auditory: {
    icon: '👂',
    label: 'Auditory Learner',
    description: 'You learn best through listening, discussion, and verbal explanation.',
  },
  read_write: {
    icon: '📖',
    label: 'Read/Write Learner',
    description: 'You learn best through reading text and writing notes.',
  },
  kinesthetic: {
    icon: '🤲',
    label: 'Kinesthetic Learner',
    description: 'You learn best through hands-on practice and real-world application.',
  },
  multimodal: {
    icon: '🎯',
    label: 'Multimodal Learner',
    description: 'You learn effectively through multiple modalities — a versatile learner.',
  },
};

export const BIG_FIVE_LABELS: Record<string, string> = {
  openness: 'Openness',
  conscientiousness: 'Conscientiousness',
  extraversion: 'Extraversion',
  agreeableness: 'Agreeableness',
  neuroticism: 'Neuroticism',
};
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Big Five trait scores are bounded [0, 100]

*For any* valid set of 25 personality responses (5 per dimension, Likert 1–5, weight ±1), each computed Trait_Score must be an integer in the range [0, 100].

**Validates: Requirements 11.4**

### Property 2: VARK scores are bounded [0, 100]

*For any* valid set of 16 learning style responses (each selecting one of 4 VARK modalities), each computed VARK_Score must be an integer in the range [0, 100].

**Validates: Requirements 11.5**

### Property 3: VARK scores sum to 100

*For any* valid set of 16 learning style responses where every question is answered, the sum of all 4 VARK_Scores must equal 100 (since each question contributes to exactly one modality: `(count/16)*100` summed across 4 modalities = `(16/16)*100 = 100`).

**Validates: Requirements 11.3**

### Property 4: Big Five score calculation is deterministic

*For any* identical set of personality responses, calling `calculateBigFiveScores` multiple times must produce identical Trait_Scores (idempotence).

**Validates: Requirements 11.1**

### Property 5: VARK dominant style reflects highest score

*For any* VARK profile where one modality scores strictly more than 10 points above all others, the `dominant_style` must be that modality. *For any* VARK profile where two or more modalities are within 10 points of the maximum, the `dominant_style` must be `'multimodal'`.

**Validates: Requirements 5.4**

### Property 6: Baseline score is percentage of correct answers

*For any* set of baseline responses for a CLO, the Baseline_Score must equal `Math.round((correct_count / question_count) * 100)` where `correct_count` is the number of responses where `selected_option === correct_option`.

**Validates: Requirements 8.3**

### Property 7: Score round-trip consistency

*For any* valid set of assessment responses, computing scores from raw responses, serializing to the Student_Profile JSONB format, then deserializing and comparing must produce equivalent scores.

**Validates: Requirements 10.4**

### Property 8: Reverse-scored personality items invert correctly

*For any* personality question with `weight = -1` and a Likert response of value `v` (1–5), the score contribution must equal `6 - v`. *For any* question with `weight = 1`, the score contribution must equal `v`.

**Validates: Requirements 11.1**

### Property 9: Likert response validation rejects out-of-range values

*For any* integer outside the range [1, 5], the `likertResponseSchema` must reject it. *For any* integer in [1, 5], the schema must accept it.

**Validates: Requirements 3.2**

### Property 10: VARK option validation rejects out-of-range values

*For any* integer outside the range [0, 3], the `varkResponseSchema` must reject it. *For any* integer in [0, 3], the schema must accept it.

**Validates: Requirements 5.2**

### Property 11: Baseline response validation rejects out-of-range values

*For any* integer outside the range [0, 3], the `baselineResponseSchema` must reject it. *For any* integer in [0, 3], the schema must accept it.

**Validates: Requirements 8.2**

### Property 12: Unanswered baseline questions score as zero

*For any* baseline test where some questions are unanswered (due to time expiry), the unanswered questions must contribute 0 to the correct_count, reducing the CLO score proportionally.

**Validates: Requirements 8.6**

### Property 13: Onboarding XP is awarded exactly once

*For any* student who completes onboarding, the total onboarding XP in `xp_transactions` must equal the sum of completed section XP plus the completion bonus, and no duplicate `source = 'onboarding_*'` transactions exist for the same student.

**Validates: Requirements 12.5**

### Property 14: Re-assessment does not award onboarding XP

*For any* student with `assessment_version > 1`, zero `xp_transactions` with `source` starting with `'onboarding_'` should exist for that assessment_version.

**Validates: Requirements 12.5, 18.4**

### Property 15: Re-assessment cooldown is enforced

*For any* student whose most recent `student_profiles.completed_at` is less than 90 days ago, the re-assessment endpoint must reject the request.

**Validates: Requirements 18.3**

### Property 16: Unique constraint prevents duplicate profiles

*For any* (student_id, assessment_version) pair, at most one `student_profiles` record must exist.

**Validates: Requirements 20.4**

### Property 17: Unique constraint prevents duplicate responses

*For any* (student_id, question_id, assessment_version) triple, at most one `onboarding_responses` record must exist.

**Validates: Requirements 20.3**

### Property 18: Baseline test config validation enforces minimum questions per CLO

*For any* baseline test activation request, if any CLO in the course has fewer than 2 active baseline questions, the activation must be rejected.

**Validates: Requirements 9.4**

### Property 19: Time limit validation is bounded

*For any* baseline test config, the `time_limit_minutes` must be in the range [5, 60].

**Validates: Requirements 9.2**

### Property 20: Skipped sections produce null scores

*For any* student who skips the personality assessment, the `student_profiles.personality_traits` must be null. *For any* student who skips the learning style detector, the `student_profiles.learning_style` must be null.

**Validates: Requirements 3.5, 5.5**
