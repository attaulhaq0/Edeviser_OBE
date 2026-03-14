// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';
import {
  classifyDifficulty,
  composeGoalText,
  createGoalTemplate,
  type SmartGoalFields,
} from '@/lib/goalTemplates';

describe('classifyDifficulty', () => {
  it('returns "easy" for cohort rate >= 80', () => {
    expect(classifyDifficulty(90)).toBe('easy');
  });

  it('returns "easy" for cohort rate exactly 80 (boundary)', () => {
    expect(classifyDifficulty(80)).toBe('easy');
  });

  it('returns "moderate" for cohort rate >= 50 and < 80', () => {
    expect(classifyDifficulty(65)).toBe('moderate');
  });

  it('returns "moderate" for cohort rate exactly 50 (boundary)', () => {
    expect(classifyDifficulty(50)).toBe('moderate');
  });

  it('returns "ambitious" for cohort rate < 50', () => {
    expect(classifyDifficulty(30)).toBe('ambitious');
  });

  it('returns "ambitious" for cohort rate 0', () => {
    expect(classifyDifficulty(0)).toBe('ambitious');
  });

  it('returns "easy" for cohort rate 100', () => {
    expect(classifyDifficulty(100)).toBe('easy');
  });
});

describe('composeGoalText', () => {
  const fields: SmartGoalFields = {
    specific: 'Complete 3 practice problems',
    measurable: 'quiz scores above 80%',
    achievable: 'I have 2 hours of study time daily',
    relevant: 'Calculus I — Derivatives',
    timebound: '2025-02-15',
  };

  it('composes correct text from all fields', () => {
    const result = composeGoalText(fields);
    expect(result).toBe(
      'Complete 3 practice problems by 2025-02-15, measuring progress through quiz scores above 80%. This is achievable because I have 2 hours of study time daily and relevant to Calculus I — Derivatives.',
    );
  });

  it('includes all 5 SMART fields in the output', () => {
    const result = composeGoalText(fields);
    expect(result).toContain(fields.specific);
    expect(result).toContain(fields.measurable);
    expect(result).toContain(fields.achievable);
    expect(result).toContain(fields.relevant);
    expect(result).toContain(fields.timebound);
  });

  it('returns non-empty string for valid input', () => {
    const result = composeGoalText(fields);
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('createGoalTemplate', () => {
  it('creates template with courseName only (no cloTitle)', () => {
    const result = createGoalTemplate({
      courseName: 'Physics 101',
      deadline: '2025-03-01',
      suggestedAction: 'Review chapter 5',
      measurableTarget: 'Score 75% on quiz',
    });
    expect(result.relevant).toBe('Physics 101');
  });

  it('creates template with courseName and cloTitle', () => {
    const result = createGoalTemplate({
      courseName: 'Physics 101',
      cloTitle: 'Newton Laws',
      deadline: '2025-03-01',
      suggestedAction: 'Review chapter 5',
      measurableTarget: 'Score 75% on quiz',
    });
    expect(result.relevant).toBe('Physics 101 — Newton Laws');
  });

  it('sets achievable to default text', () => {
    const result = createGoalTemplate({
      courseName: 'Math',
      deadline: '2025-04-01',
      suggestedAction: 'Study',
      measurableTarget: 'Pass exam',
    });
    expect(result.achievable).toBe(
      'Based on your current progress and available study time',
    );
  });

  it('sets specific to suggestedAction', () => {
    const result = createGoalTemplate({
      courseName: 'Math',
      deadline: '2025-04-01',
      suggestedAction: 'Complete 10 exercises',
      measurableTarget: 'Pass exam',
    });
    expect(result.specific).toBe('Complete 10 exercises');
  });

  it('sets measurable to measurableTarget', () => {
    const result = createGoalTemplate({
      courseName: 'Math',
      deadline: '2025-04-01',
      suggestedAction: 'Study',
      measurableTarget: 'Score above 90%',
    });
    expect(result.measurable).toBe('Score above 90%');
  });

  it('sets timebound to deadline', () => {
    const result = createGoalTemplate({
      courseName: 'Math',
      deadline: '2025-06-15',
      suggestedAction: 'Study',
      measurableTarget: 'Pass exam',
    });
    expect(result.timebound).toBe('2025-06-15');
  });

  it('formats relevant as "courseName — cloTitle" when cloTitle provided', () => {
    const result = createGoalTemplate({
      courseName: 'Biology',
      cloTitle: 'Cell Division',
      deadline: '2025-05-01',
      suggestedAction: 'Read textbook',
      measurableTarget: 'Identify all phases',
    });
    expect(result.relevant).toBe('Biology — Cell Division');
  });

  it('formats relevant as just courseName when no cloTitle', () => {
    const result = createGoalTemplate({
      courseName: 'Biology',
      deadline: '2025-05-01',
      suggestedAction: 'Read textbook',
      measurableTarget: 'Identify all phases',
    });
    expect(result.relevant).toBe('Biology');
  });
});
