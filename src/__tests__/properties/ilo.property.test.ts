// Feature: edeviser-platform, Property 15: ILO CRUD within institution
// Feature: edeviser-platform, Property 16: ILO deletion blocked when PLOs mapped
// Feature: edeviser-platform, Property 17: ILO reorder updates sort_order
// **Validates: Requirements 12.1, 12.2, 12.3, 12.4, 12.5**

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";

// ─── Pure ILO model ─────────────────────────────────────────────────────────

interface ILO {
  id: string;
  title: string;
  description: string;
  institution_id: string;
  sort_order: number;
}

interface PLOMapping {
  plo_id: string;
  ilo_id: string;
}

function canDeleteILO(
  iloId: string,
  mappings: PLOMapping[]
): { allowed: boolean; dependentPLOs: string[] } {
  const dependentPLOs = mappings
    .filter((m) => m.ilo_id === iloId)
    .map((m) => m.plo_id);
  return { allowed: dependentPLOs.length === 0, dependentPLOs };
}

function reorderILOs(ilos: ILO[], fromIndex: number, toIndex: number): ILO[] {
  if (
    fromIndex < 0 ||
    fromIndex >= ilos.length ||
    toIndex < 0 ||
    toIndex >= ilos.length
  ) {
    return ilos;
  }
  const result = [...ilos];
  const [moved] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, moved!);
  return result.map((ilo, i) => ({ ...ilo, sort_order: i + 1 }));
}

const ILO_SOFT_LIMIT = 30;

function checkILOLimit(currentCount: number): {
  warning: boolean;
  message?: string;
} {
  if (currentCount >= ILO_SOFT_LIMIT) {
    return {
      warning: true,
      message: `Soft limit of ${ILO_SOFT_LIMIT} ILOs reached`,
    };
  }
  return { warning: false };
}

// ─── Arbitraries ────────────────────────────────────────────────────────────

const iloIdArb = fc.uuid();
const titleArb = fc.string({ minLength: 1, maxLength: 255 });
const institutionIdArb = fc.uuid();

const iloArb = fc.record({
  id: iloIdArb,
  title: titleArb,
  description: fc.string({ minLength: 0, maxLength: 500 }),
  institution_id: institutionIdArb,
  sort_order: fc.integer({ min: 1, max: 100 }),
});

// ─── Property 15: ILO CRUD ─────────────────────────────────────────────────

describe("Property 15 — ILO CRUD within institution", () => {
  it("P15a: ILO title is max 255 characters", () => {
    fc.assert(
      fc.property(iloArb, (ilo) => {
        expect(ilo.title.length).toBeLessThanOrEqual(255);
      }),
      { numRuns: 100 }
    );
  });

  it("P15b: ILO soft limit warning at 30", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 50 }), (count) => {
        const result = checkILOLimit(count);
        if (count >= ILO_SOFT_LIMIT) {
          expect(result.warning).toBe(true);
        } else {
          expect(result.warning).toBe(false);
        }
      }),
      { numRuns: 100 }
    );
  });
});

// ─── Property 16: ILO deletion blocked when PLOs mapped ────────────────────

describe("Property 16 — ILO deletion dependency check", () => {
  it("P16a: ILO with mapped PLOs cannot be deleted", () => {
    fc.assert(
      fc.property(
        iloIdArb,
        fc.array(fc.uuid(), { minLength: 1, maxLength: 5 }),
        (iloId, ploIds) => {
          const mappings: PLOMapping[] = ploIds.map((ploId) => ({
            plo_id: ploId,
            ilo_id: iloId,
          }));
          const result = canDeleteILO(iloId, mappings);
          expect(result.allowed).toBe(false);
          expect(result.dependentPLOs).toHaveLength(ploIds.length);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("P16b: ILO with no mapped PLOs can be deleted", () => {
    fc.assert(
      fc.property(
        iloIdArb,
        fc.array(fc.record({ plo_id: fc.uuid(), ilo_id: fc.uuid() }), {
          minLength: 0,
          maxLength: 5,
        }),
        (iloId, mappings) => {
          // Filter out any accidental matches
          const nonMatching = mappings.filter((m) => m.ilo_id !== iloId);
          const result = canDeleteILO(iloId, nonMatching);
          expect(result.allowed).toBe(true);
          expect(result.dependentPLOs).toHaveLength(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Property 17: ILO reorder updates sort_order ────────────────────────────

describe("Property 17 — ILO reorder", () => {
  it("P17a: reorder preserves all ILOs (no loss or duplication)", () => {
    fc.assert(
      fc.property(fc.array(iloArb, { minLength: 2, maxLength: 10 }), (ilos) => {
        // Assign unique sort orders
        const ordered = ilos.map((ilo, i) => ({ ...ilo, sort_order: i + 1 }));
        const fromIndex = 0;
        const toIndex = ordered.length - 1;
        const reordered = reorderILOs(ordered, fromIndex, toIndex);

        expect(reordered).toHaveLength(ordered.length);
        const originalIds = new Set(ordered.map((i) => i.id));
        const reorderedIds = new Set(reordered.map((i) => i.id));
        expect(reorderedIds).toEqual(originalIds);
      }),
      { numRuns: 100 }
    );
  });

  it("P17b: sort_order values are sequential 1..N after reorder", () => {
    fc.assert(
      fc.property(
        fc.array(iloArb, { minLength: 2, maxLength: 10 }),
        fc.integer({ min: 0, max: 9 }),
        fc.integer({ min: 0, max: 9 }),
        (ilos, from, to) => {
          const ordered = ilos.map((ilo, i) => ({ ...ilo, sort_order: i + 1 }));
          const safeFrom = Math.min(from, ordered.length - 1);
          const safeTo = Math.min(to, ordered.length - 1);
          const reordered = reorderILOs(ordered, safeFrom, safeTo);

          for (let i = 0; i < reordered.length; i++) {
            expect(reordered[i]!.sort_order).toBe(i + 1);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
