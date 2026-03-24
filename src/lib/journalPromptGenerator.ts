import type { BloomsLevel } from '@/lib/schemas/clo';
import type { AttainmentLevel } from '@/types/app';

// ─── Kolb's Experiential Learning Cycle Stages ─────────────────────────────

export type KolbStage =
  | 'Concrete Experience'
  | 'Reflective Observation'
  | 'Abstract Conceptualization'
  | 'Active Experimentation';

export const KOLB_STAGES: readonly KolbStage[] = [
  'Concrete Experience',
  'Reflective Observation',
  'Abstract Conceptualization',
  'Active Experimentation',
] as const;

// ─── Input / Output Types ───────────────────────────────────────────────────

export interface JournalPromptContext {
  cloTitle: string;
  bloomsLevel: BloomsLevel;
  attainmentLevel: AttainmentLevel;
  rubricFeedbackSummary?: string;
}

export interface KolbQuestion {
  stage: KolbStage;
  question: string;
}

export interface GeneratedJournalPrompt {
  promptText: string;
  questions: KolbQuestion[];
}

// ─── Bloom's Level Display Labels ───────────────────────────────────────────

const BLOOMS_LABELS: Record<BloomsLevel, string> = {
  remembering: 'Remembering',
  understanding: 'Understanding',
  applying: 'Applying',
  analyzing: 'Analyzing',
  evaluating: 'Evaluating',
  creating: 'Creating',
};

// ─── Attainment Display Labels ──────────────────────────────────────────────

const ATTAINMENT_LABELS: Record<AttainmentLevel, string> = {
  Excellent: 'Excellent (≥85%)',
  Satisfactory: 'Satisfactory (70–84%)',
  Developing: 'Developing (50–69%)',
  Not_Yet: 'Not Yet (<50%)',
};

// ─── Question Templates per Kolb Stage × Bloom's Level ──────────────────────

type QuestionTemplateMap = Record<KolbStage, Record<BloomsLevel, string>>;

const QUESTION_TEMPLATES: QuestionTemplateMap = {
  'Concrete Experience': {
    remembering: 'What specific facts or concepts from "{clo}" do you recall from this assessment?',
    understanding: 'How would you describe your experience working on "{clo}" in your own words?',
    applying: 'What was it like applying the concepts from "{clo}" to a concrete problem?',
    analyzing: 'What patterns or connections did you notice while working on "{clo}"?',
    evaluating: 'What was your experience evaluating or judging ideas related to "{clo}"?',
    creating: 'What was the experience of creating something new for "{clo}" like for you?',
  },
  'Reflective Observation': {
    remembering: 'Which parts of "{clo}" did you find easiest to recall, and where did you struggle?',
    understanding: 'Looking back, which aspects of "{clo}" do you feel you understood well, and which were unclear?',
    applying: 'Reflecting on your work, where did you apply concepts from "{clo}" effectively, and where did you struggle?',
    analyzing: 'What assumptions did you make while analyzing "{clo}", and were they correct?',
    evaluating: 'How confident were you in the judgments you made about "{clo}", and why?',
    creating: 'What creative choices did you make for "{clo}", and what would you reconsider?',
  },
  'Abstract Conceptualization': {
    remembering: 'What study strategies could help you better retain the key concepts of "{clo}"?',
    understanding: 'What deeper principle or theory connects to your understanding of "{clo}"?',
    applying: 'What general approach or framework could improve how you apply "{clo}" concepts next time?',
    analyzing: 'What analytical framework or model could strengthen your work on "{clo}"?',
    evaluating: 'What criteria or standards should guide your evaluation of "{clo}" topics in the future?',
    creating: 'What design principles or creative methods could elevate your work on "{clo}"?',
  },
  'Active Experimentation': {
    remembering: 'What specific steps will you take to reinforce your knowledge of "{clo}" before the next assessment?',
    understanding: 'How will you deepen your understanding of "{clo}" — what will you try differently?',
    applying: 'What real-world scenario could you practice applying "{clo}" concepts to?',
    analyzing: 'How will you test your analytical skills on "{clo}" in a new context?',
    evaluating: 'What will you do differently when evaluating "{clo}" topics in your next assignment?',
    creating: 'What new project or approach will you experiment with to push your "{clo}" skills further?',
  },
};

// ─── Intro Templates per Attainment Level ───────────────────────────────────

const INTRO_TEMPLATES: Record<AttainmentLevel, string> = {
  Excellent:
    'Great work on "{clo}" ({blooms})! You achieved {attainment}. Take a moment to reflect on what made you successful and how you can maintain this level.',
  Satisfactory:
    'Good progress on "{clo}" ({blooms})! You achieved {attainment}. Reflect on what went well and identify areas where you can push further.',
  Developing:
    'You\'re making progress on "{clo}" ({blooms}) with {attainment}. Use this reflection to identify what\'s working and what needs more attention.',
  Not_Yet:
    'You\'re still building your skills in "{clo}" ({blooms}) — currently at {attainment}. This reflection can help you identify specific areas to focus on for improvement.',
};

// ─── Template Interpolation ─────────────────────────────────────────────────

function interpolate(
  template: string,
  cloTitle: string,
  bloomsLevel: BloomsLevel,
  attainmentLevel: AttainmentLevel,
): string {
  return template
    .replace(/\{clo\}/g, cloTitle)
    .replace(/\{blooms\}/g, BLOOMS_LABELS[bloomsLevel])
    .replace(/\{attainment\}/g, ATTAINMENT_LABELS[attainmentLevel]);
}

// ─── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generates contextual journal reflection prompts aligned to Kolb's
 * Experiential Learning Cycle based on the student's CLO context.
 *
 * Pure function — no side effects, no API calls.
 */
export function generateJournalPrompt(
  context: JournalPromptContext,
): GeneratedJournalPrompt {
  const { cloTitle, bloomsLevel, attainmentLevel, rubricFeedbackSummary } = context;

  // Build intro text
  const introTemplate = INTRO_TEMPLATES[attainmentLevel];
  let promptText = interpolate(introTemplate, cloTitle, bloomsLevel, attainmentLevel);

  if (rubricFeedbackSummary) {
    promptText += ` Your teacher noted: "${rubricFeedbackSummary}"`;
  }

  // Select which Kolb stages to include (3–4 questions).
  // Always include all 4 for Developing/Not_Yet to encourage deeper reflection.
  // For Excellent/Satisfactory, skip Concrete Experience (they already demonstrated it)
  // and focus on higher-order reflection stages, keeping 3 questions.
  const stages: KolbStage[] =
    attainmentLevel === 'Developing' || attainmentLevel === 'Not_Yet'
      ? [...KOLB_STAGES]
      : [
          'Reflective Observation',
          'Abstract Conceptualization',
          'Active Experimentation',
        ];

  const questions: KolbQuestion[] = stages.map((stage) => ({
    stage,
    question: interpolate(
      QUESTION_TEMPLATES[stage][bloomsLevel],
      cloTitle,
      bloomsLevel,
      attainmentLevel,
    ),
  }));

  return { promptText, questions };
}
