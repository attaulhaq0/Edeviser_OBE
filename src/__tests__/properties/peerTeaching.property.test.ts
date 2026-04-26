// =============================================================================
// Property Tests: Peer Teaching — Task 9.12
// Feature: team-challenges, Properties P26, P27, P28
// =============================================================================

import { describe, it, expect } from 'vitest';
import fc from 'fast-check';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CloAttainment {
  cloId: string;
  studentId: string;
  attainmentPercent: number;
}

interface TeachingMoment {
  momentId: string;
  studentId: string;
  cloId: string;
  status: 'active' | 'archived';
}

interface Rating {
  momentId: string;
  viewerId: string;
  clarity: number;
  helpfulness: number;
}

// ─── Pure logic under test ───────────────────────────────────────────────────

/** Minimum CLO attainment percentage required to create a teaching moment */
const TEACHING_ELIGIBILITY_THRESHOLD = 85;

/** Maximum active teaching moments per student per CLO */
const MAX_ACTIVE_PER_CLO = 3;

/**
 * Check if a student is eligible to create a teaching moment for a given CLO.
 * Requires CLO attainment >= 85%.
 */
function isEligibleToTeach(
  attainments: CloAttainment[],
  studentId: string,
  cloId: string,
): boolean {
  const attainment = attainments.find(
    (a) => a.studentId === studentId && a.cloId === cloId,
  );
  if (!attainment) return false;
  return attainment.attainmentPercent >= TEACHING_ELIGIBILITY_THRESHOLD;
}

/**
 * Check if a student can create another teaching moment for a given CLO.
 * Limited to MAX_ACTIVE_PER_CLO active moments per student per CLO.
 */
function canCreateTeachingMoment(
  existingMoments: TeachingMoment[],
  studentId: string,
  cloId: string,
): { allowed: boolean; currentCount: number; error?: string } {
  const activeMoments = existingMoments.filter(
    (m) => m.studentId === studentId && m.cloId === cloId && m.status === 'active',
  );

  if (activeMoments.length >= MAX_ACTIVE_PER_CLO) {
    return {
      allowed: false,
      currentCount: activeMoments.length,
      error: `Maximum ${MAX_ACTIVE_PER_CLO} active teaching moments per CLO reached`,
    };
  }

  return { allowed: true, currentCount: activeMoments.length };
}

/**
 * Submit a rating for a teaching moment.
 * One rating per viewer per moment (unique constraint).
 */
function submitRating(
  existingRatings: Rating[],
  momentId: string,
  viewerId: string,
  clarity: number,
  helpfulness: number,
): { accepted: boolean; error?: string } {
  const alreadyRated = existingRatings.some(
    (r) => r.momentId === momentId && r.viewerId === viewerId,
  );

  if (alreadyRated) {
    return { accepted: false, error: 'Already rated this teaching moment' };
  }

  if (clarity < 1 || clarity > 5 || helpfulness < 1 || helpfulness > 5) {
    return { accepted: false, error: 'Ratings must be between 1 and 5' };
  }

  existingRatings.push({ momentId, viewerId, clarity, helpfulness });
  return { accepted: true };
}

// ─── Property Tests ──────────────────────────────────────────────────────────

describe('Property P26: Teaching moment eligibility requires CLO attainment >= 85%', () => {
  // Feature: team-challenges, Property 26: Teaching eligibility threshold

  it('students with attainment >= 85% are eligible', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 85, max: 100 }),
        (studentId, cloId, attainment) => {
          const attainments: CloAttainment[] = [
            { cloId, studentId, attainmentPercent: attainment },
          ];

          expect(isEligibleToTeach(attainments, studentId, cloId)).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('students with attainment < 85% are not eligible', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 84 }),
        (studentId, cloId, attainment) => {
          const attainments: CloAttainment[] = [
            { cloId, studentId, attainmentPercent: attainment },
          ];

          expect(isEligibleToTeach(attainments, studentId, cloId)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('students with no attainment record are not eligible', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (studentId, cloId) => {
          const attainments: CloAttainment[] = []; // no records
          expect(isEligibleToTeach(attainments, studentId, cloId)).toBe(false);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('eligibility is per-CLO (high attainment in one CLO does not grant eligibility in another)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 85, max: 100 }),
        fc.integer({ min: 0, max: 84 }),
        (studentId, clo1, clo2, highAttainment, lowAttainment) => {
          fc.pre(clo1 !== clo2);

          const attainments: CloAttainment[] = [
            { cloId: clo1, studentId, attainmentPercent: highAttainment },
            { cloId: clo2, studentId, attainmentPercent: lowAttainment },
          ];

          expect(isEligibleToTeach(attainments, studentId, clo1)).toBe(true);
          expect(isEligibleToTeach(attainments, studentId, clo2)).toBe(false);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('exactly 85% is eligible (boundary test)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        (studentId, cloId) => {
          const attainments: CloAttainment[] = [
            { cloId, studentId, attainmentPercent: 85 },
          ];

          expect(isEligibleToTeach(attainments, studentId, cloId)).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property P27: Per-CLO limit of 3 active teaching moments per student', () => {
  // Feature: team-challenges, Property 27: Per-CLO teaching moment limit

  it('allows creation when active count is below limit', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 2 }),
        (studentId, cloId, existingCount) => {
          const moments: TeachingMoment[] = Array.from({ length: existingCount }, (_, i) => ({
            momentId: `moment-${i}`,
            studentId,
            cloId,
            status: 'active' as const,
          }));

          const result = canCreateTeachingMoment(moments, studentId, cloId);
          expect(result.allowed).toBe(true);
          expect(result.currentCount).toBe(existingCount);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('rejects creation when active count reaches limit', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 3, max: 10 }),
        (studentId, cloId, existingCount) => {
          const moments: TeachingMoment[] = Array.from({ length: existingCount }, (_, i) => ({
            momentId: `moment-${i}`,
            studentId,
            cloId,
            status: 'active' as const,
          }));

          const result = canCreateTeachingMoment(moments, studentId, cloId);
          expect(result.allowed).toBe(false);
          expect(result.error).toBeDefined();
        },
      ),
      { numRuns: 200 },
    );
  });

  it('archived moments do not count toward the limit', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 0, max: 10 }),
        (studentId, cloId, archivedCount) => {
          const moments: TeachingMoment[] = Array.from({ length: archivedCount }, (_, i) => ({
            momentId: `archived-${i}`,
            studentId,
            cloId,
            status: 'archived' as const,
          }));

          const result = canCreateTeachingMoment(moments, studentId, cloId);
          expect(result.allowed).toBe(true);
          expect(result.currentCount).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('limit is per-CLO (moments in other CLOs do not count)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (studentId, clo1, clo2) => {
          fc.pre(clo1 !== clo2);

          // 3 active moments in clo1
          const moments: TeachingMoment[] = Array.from({ length: 3 }, (_, i) => ({
            momentId: `moment-${i}`,
            studentId,
            cloId: clo1,
            status: 'active' as const,
          }));

          // clo1 is at limit
          const result1 = canCreateTeachingMoment(moments, studentId, clo1);
          expect(result1.allowed).toBe(false);

          // clo2 is not at limit
          const result2 = canCreateTeachingMoment(moments, studentId, clo2);
          expect(result2.allowed).toBe(true);
          expect(result2.currentCount).toBe(0);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('limit is per-student (moments from other students do not count)', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        (student1, student2, cloId) => {
          fc.pre(student1 !== student2);

          // 3 active moments from student1
          const moments: TeachingMoment[] = Array.from({ length: 3 }, (_, i) => ({
            momentId: `moment-${i}`,
            studentId: student1,
            cloId,
            status: 'active' as const,
          }));

          // student1 is at limit
          const result1 = canCreateTeachingMoment(moments, student1, cloId);
          expect(result1.allowed).toBe(false);

          // student2 is not at limit
          const result2 = canCreateTeachingMoment(moments, student2, cloId);
          expect(result2.allowed).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe('Property P28: Rating uniqueness — one rating per viewer per moment', () => {
  // Feature: team-challenges, Property 28: Rating uniqueness

  it('first rating is accepted', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (momentId, viewerId, clarity, helpfulness) => {
          const ratings: Rating[] = [];
          const result = submitRating(ratings, momentId, viewerId, clarity, helpfulness);
          expect(result.accepted).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('second rating from same viewer for same moment is rejected', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (momentId, viewerId, clarity, helpfulness) => {
          const ratings: Rating[] = [];

          const first = submitRating(ratings, momentId, viewerId, clarity, helpfulness);
          const second = submitRating(ratings, momentId, viewerId, clarity, helpfulness);

          expect(first.accepted).toBe(true);
          expect(second.accepted).toBe(false);
          expect(second.error).toContain('Already rated');
        },
      ),
      { numRuns: 200 },
    );
  });

  it('same viewer can rate different moments', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (moment1, moment2, viewerId, clarity, helpfulness) => {
          fc.pre(moment1 !== moment2);
          const ratings: Rating[] = [];

          const first = submitRating(ratings, moment1, viewerId, clarity, helpfulness);
          const second = submitRating(ratings, moment2, viewerId, clarity, helpfulness);

          expect(first.accepted).toBe(true);
          expect(second.accepted).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('different viewers can rate the same moment', () => {
    fc.assert(
      fc.property(
        fc.uuid(),
        fc.uuid(),
        fc.uuid(),
        fc.integer({ min: 1, max: 5 }),
        fc.integer({ min: 1, max: 5 }),
        (momentId, viewer1, viewer2, clarity, helpfulness) => {
          fc.pre(viewer1 !== viewer2);
          const ratings: Rating[] = [];

          const first = submitRating(ratings, momentId, viewer1, clarity, helpfulness);
          const second = submitRating(ratings, momentId, viewer2, clarity, helpfulness);

          expect(first.accepted).toBe(true);
          expect(second.accepted).toBe(true);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('total accepted ratings never exceed viewer count × moment count', () => {
    fc.assert(
      fc.property(
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (momentIds, viewerIds) => {
          const uniqueMoments = [...new Set(momentIds)];
          const uniqueViewers = [...new Set(viewerIds)];
          const ratings: Rating[] = [];
          let acceptedCount = 0;

          // Submit ratings for all combinations, twice
          for (let pass = 0; pass < 2; pass++) {
            for (const mid of uniqueMoments) {
              for (const vid of uniqueViewers) {
                const result = submitRating(ratings, mid, vid, 4, 4);
                if (result.accepted) acceptedCount++;
              }
            }
          }

          expect(acceptedCount).toBe(uniqueMoments.length * uniqueViewers.length);
        },
      ),
      { numRuns: 200 },
    );
  });
});
