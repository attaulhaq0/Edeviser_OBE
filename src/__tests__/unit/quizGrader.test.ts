import { describe, it, expect } from 'vitest';
import { gradeQuestion, gradeQuiz } from '@/lib/quizGrader';
import type { GradableQuestion } from '@/lib/quizGrader';

describe('Quiz Grader', () => {
  describe('gradeQuestion', () => {
    it('grades mcq_single correctly when answer matches', () => {
      const q: GradableQuestion = {
        id: 'q1',
        question_type: 'mcq_single',
        correct_answer: 'Paris',
        points: 5,
      };
      const result = gradeQuestion(q, 'Paris');
      expect(result.score).toBe(5);
      expect(result.isCorrect).toBe(true);
      expect(result.autoGradable).toBe(true);
    });

    it('grades mcq_single as 0 when answer is wrong', () => {
      const q: GradableQuestion = {
        id: 'q1',
        question_type: 'mcq_single',
        correct_answer: 'Paris',
        points: 5,
      };
      const result = gradeQuestion(q, 'London');
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });

    it('grades mcq_single case-insensitively', () => {
      const q: GradableQuestion = {
        id: 'q1',
        question_type: 'mcq_single',
        correct_answer: 'Paris',
        points: 5,
      };
      expect(gradeQuestion(q, 'paris').isCorrect).toBe(true);
      expect(gradeQuestion(q, 'PARIS').isCorrect).toBe(true);
    });

    it('grades true_false correctly', () => {
      const q: GradableQuestion = {
        id: 'q2',
        question_type: 'true_false',
        correct_answer: 'True',
        points: 2,
      };
      expect(gradeQuestion(q, 'True').score).toBe(2);
      expect(gradeQuestion(q, 'False').score).toBe(0);
    });

    it('grades mcq_multi with exact match', () => {
      const q: GradableQuestion = {
        id: 'q3',
        question_type: 'mcq_multi',
        correct_answer: ['A', 'C'],
        points: 10,
      };
      expect(gradeQuestion(q, ['A', 'C']).score).toBe(10);
      expect(gradeQuestion(q, ['C', 'A']).score).toBe(10); // order doesn't matter
      expect(gradeQuestion(q, ['A']).score).toBe(0); // partial = 0
      expect(gradeQuestion(q, ['A', 'B', 'C']).score).toBe(0); // extra = 0
    });

    it('grades fill_blank correctly', () => {
      const q: GradableQuestion = {
        id: 'q4',
        question_type: 'fill_blank',
        correct_answer: 'photosynthesis',
        points: 3,
      };
      expect(gradeQuestion(q, 'photosynthesis').score).toBe(3);
      expect(gradeQuestion(q, 'Photosynthesis').score).toBe(3);
      expect(gradeQuestion(q, 'respiration').score).toBe(0);
    });

    it('flags short_answer as not auto-gradable', () => {
      const q: GradableQuestion = {
        id: 'q5',
        question_type: 'short_answer',
        correct_answer: 'any',
        points: 10,
      };
      const result = gradeQuestion(q, 'student answer');
      expect(result.autoGradable).toBe(false);
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBeNull();
    });

    it('returns 0 for undefined answer', () => {
      const q: GradableQuestion = {
        id: 'q1',
        question_type: 'mcq_single',
        correct_answer: 'A',
        points: 5,
      };
      const result = gradeQuestion(q, undefined);
      expect(result.score).toBe(0);
      expect(result.isCorrect).toBe(false);
    });
  });

  describe('gradeQuiz', () => {
    const questions: GradableQuestion[] = [
      { id: 'q1', question_type: 'mcq_single', correct_answer: 'A', points: 5 },
      { id: 'q2', question_type: 'true_false', correct_answer: 'True', points: 2 },
      { id: 'q3', question_type: 'fill_blank', correct_answer: 'hello', points: 3 },
      { id: 'q4', question_type: 'short_answer', correct_answer: '', points: 10 },
    ];

    it('calculates auto score for all auto-gradable questions', () => {
      const answers = { q1: 'A', q2: 'True', q3: 'hello', q4: 'some answer' };
      const result = gradeQuiz(questions, answers);
      expect(result.autoScore).toBe(10); // 5 + 2 + 3
      expect(result.totalAutoGradablePoints).toBe(10);
      expect(result.hasManualQuestions).toBe(true);
      expect(result.gradingStatus).toBe('pending_manual');
      expect(result.scorePercent).toBeNull(); // can't compute until manual grading
    });

    it('returns fully_graded when no short answer questions', () => {
      const autoOnly: GradableQuestion[] = [
        { id: 'q1', question_type: 'mcq_single', correct_answer: 'A', points: 5 },
        { id: 'q2', question_type: 'true_false', correct_answer: 'True', points: 5 },
      ];
      const answers = { q1: 'A', q2: 'True' };
      const result = gradeQuiz(autoOnly, answers);
      expect(result.gradingStatus).toBe('fully_graded');
      expect(result.scorePercent).toBe(100);
      expect(result.autoScore).toBe(10);
    });

    it('calculates correct score percent', () => {
      const autoOnly: GradableQuestion[] = [
        { id: 'q1', question_type: 'mcq_single', correct_answer: 'A', points: 10 },
        { id: 'q2', question_type: 'mcq_single', correct_answer: 'B', points: 10 },
      ];
      const answers = { q1: 'A', q2: 'C' }; // 1 correct, 1 wrong
      const result = gradeQuiz(autoOnly, answers);
      expect(result.scorePercent).toBe(50);
    });

    it('handles empty answers', () => {
      const result = gradeQuiz(questions, {});
      expect(result.autoScore).toBe(0);
    });

    it('returns per-question results', () => {
      const answers = { q1: 'A', q2: 'False' };
      const result = gradeQuiz(questions, answers);
      expect(result.perQuestion).toHaveLength(4);
      expect(result.perQuestion[0]!.isCorrect).toBe(true);
      expect(result.perQuestion[1]!.isCorrect).toBe(false);
    });
  });
});
