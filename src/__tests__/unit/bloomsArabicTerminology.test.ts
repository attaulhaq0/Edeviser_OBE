// Feature: i18n-rtl-support, Property 14: Bloom's Arabic Terminology Uses Standardized Terms
// **Validates: Requirements 26.1, 26.4**

import { describe, it, expect } from 'vitest';
import { BLOOMS_ARABIC_STANDARD, OBE_ARABIC_TERMS } from '@/lib/bloomsArabicTerminology';
import arCommon from '@/locales/ar/common.json';

const BLOOMS_LEVELS = [
  'remembering',
  'understanding',
  'applying',
  'analyzing',
  'evaluating',
  'creating',
] as const;

describe('bloomsArabicTerminology', () => {
  it('all Bloom levels in ar/common.json match BLOOMS_ARABIC_STANDARD terms', () => {
    for (const level of BLOOMS_LEVELS) {
      const entry = BLOOMS_ARABIC_STANDARD[level];
      expect(entry).toBeDefined();
      const expected = entry!.term;
      const blooms = arCommon.blooms as Record<string, string> | undefined;
      const actual = blooms?.[level];
      expect(actual).toBe(expected);
    }
  });

  it('BLOOMS_ARABIC_STANDARD has all six Bloom levels', () => {
    for (const level of BLOOMS_LEVELS) {
      const entry = BLOOMS_ARABIC_STANDARD[level];
      expect(entry).toBeDefined();
      expect(entry!.term.length).toBeGreaterThan(0);
      expect(entry!.verbs.length).toBeGreaterThan(0);
    }
  });

  it('each Bloom level has at least 5 action verbs', () => {
    for (const level of BLOOMS_LEVELS) {
      expect(BLOOMS_ARABIC_STANDARD[level]!.verbs.length).toBeGreaterThanOrEqual(5);
    }
  });

  it('OBE_ARABIC_TERMS contains all required OBE terms', () => {
    expect(OBE_ARABIC_TERMS.ILO).toBe('مخرجات التعلم المؤسسية');
    expect(OBE_ARABIC_TERMS.PLO).toBe('مخرجات التعلم البرنامجية');
    expect(OBE_ARABIC_TERMS.CLO).toBe('مخرجات التعلم للمقرر');
    expect(OBE_ARABIC_TERMS.attainment).toBe('التحصيل');
    expect(OBE_ARABIC_TERMS.CQI).toBe('التحسين المستمر للجودة');
  });

  it('attainment levels in ar/common.json match OBE_ARABIC_TERMS', () => {
    expect(arCommon.attainment.excellent).toBe(OBE_ARABIC_TERMS.excellent);
    expect(arCommon.attainment.satisfactory).toBe(OBE_ARABIC_TERMS.satisfactory);
    expect(arCommon.attainment.developing).toBe(OBE_ARABIC_TERMS.developing);
    expect(arCommon.attainment.notYet).toBe(OBE_ARABIC_TERMS.notYet);
  });
});
