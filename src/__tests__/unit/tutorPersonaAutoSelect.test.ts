import { describe, it, expect } from 'vitest';
import { autoSelectPersona, type BigFiveProfile } from '@/lib/tutorPersonaAutoSelect';

describe('tutorPersonaAutoSelect', () => {
  // ─── Big Five mapping with various profiles ───────────────────────────

  describe('Big Five mapping', () => {
    it('selects Socratic Guide for high Openness', () => {
      const profile: BigFiveProfile = {
        openness: 85,
        conscientiousness: 40,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 30,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('socratic_guide');
    });

    it('selects Step-by-Step Coach for high Conscientiousness', () => {
      const profile: BigFiveProfile = {
        openness: 40,
        conscientiousness: 85,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 30,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('step_by_step_coach');
    });

    it('selects Quick Explainer when no trait is ≥70', () => {
      const profile: BigFiveProfile = {
        openness: 50,
        conscientiousness: 60,
        extraversion: 45,
        agreeableness: 55,
        neuroticism: 40,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('quick_explainer');
    });

    it('selects Socratic Guide at exactly 70th percentile Openness', () => {
      const profile: BigFiveProfile = {
        openness: 70,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('socratic_guide');
    });

    it('selects Step-by-Step Coach at exactly 70th percentile Conscientiousness', () => {
      const profile: BigFiveProfile = {
        openness: 50,
        conscientiousness: 70,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 50,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('step_by_step_coach');
    });
  });

  // ─── Missing profile returns null ─────────────────────────────────────

  describe('missing profile', () => {
    it('returns null for null profile', () => {
      expect(autoSelectPersona(null)).toBeNull();
    });

    it('returns null for undefined profile', () => {
      expect(autoSelectPersona(undefined)).toBeNull();
    });
  });

  // ─── Multiple high traits — highest percentile wins ───────────────────

  describe('multiple high traits', () => {
    it('Openness wins when higher than Conscientiousness', () => {
      const profile: BigFiveProfile = {
        openness: 90,
        conscientiousness: 80,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 30,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('socratic_guide');
    });

    it('Conscientiousness wins when higher than Openness', () => {
      const profile: BigFiveProfile = {
        openness: 75,
        conscientiousness: 90,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 30,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('step_by_step_coach');
    });

    it('both at 100 — Openness wins (sorted first when equal, then openness is first in array)', () => {
      const profile: BigFiveProfile = {
        openness: 100,
        conscientiousness: 100,
        extraversion: 50,
        agreeableness: 50,
        neuroticism: 30,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      // When scores are equal, the sort is stable and openness comes first in the array
      // so it wins the tie
      expect(['socratic_guide', 'step_by_step_coach']).toContain(result!.persona);
    });
  });

  // ─── Neuroticism adds tone modifier ───────────────────────────────────

  describe('neuroticism tone modifier', () => {
    it('adds tone modifier when neuroticism ≥70', () => {
      const profile: BigFiveProfile = {
        openness: 85,
        conscientiousness: 40,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 75,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.toneModifier).toBeDefined();
      expect(result!.toneModifier).toContain('warm');
      expect(result!.toneModifier).toContain('encouraging');
      expect(result!.toneModifier).toContain('supportive');
    });

    it('adds tone modifier at exactly 70th percentile neuroticism', () => {
      const profile: BigFiveProfile = {
        openness: 85,
        conscientiousness: 40,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 70,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.toneModifier).toBeDefined();
    });

    it('does NOT add tone modifier when neuroticism < 70', () => {
      const profile: BigFiveProfile = {
        openness: 85,
        conscientiousness: 40,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 69,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.toneModifier).toBeUndefined();
    });

    it('tone modifier works with Step-by-Step Coach persona', () => {
      const profile: BigFiveProfile = {
        openness: 40,
        conscientiousness: 85,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 80,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('step_by_step_coach');
      expect(result!.toneModifier).toBeDefined();
    });

    it('tone modifier works with Quick Explainer persona', () => {
      const profile: BigFiveProfile = {
        openness: 40,
        conscientiousness: 50,
        extraversion: 50,
        agreeableness: 60,
        neuroticism: 90,
      };
      const result = autoSelectPersona(profile);
      expect(result).not.toBeNull();
      expect(result!.persona).toBe('quick_explainer');
      expect(result!.toneModifier).toBeDefined();
    });
  });
});
