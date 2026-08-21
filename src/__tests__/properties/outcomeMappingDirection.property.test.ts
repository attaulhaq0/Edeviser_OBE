// Feature: OBE canonical mapping direction (agentic-intelligence R2.2),
// Property 1: with source=parent/target=child rows, children attach under
// parents; reversed-direction rows never attach children.
// Task: edeviser-agentic-intelligence 1.6 (lib-level slice; DB cascade tests
// remain covered by migration replay + RLS suites).
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  assembleOutcomeChain,
  type AssembleOutcomeChainInput,
  type RawChainOutcome,
} from "@/lib/outcomeChain";

const uuid = fc.uuid();

const outcome = (id: string, type: RawChainOutcome["type"]): RawChainOutcome => ({
  id,
  title: `outcome-${id.slice(0, 8)}`,
  type,
  blooms_level: null,
  course_id: null,
});

const baseInput = (
  ilo: RawChainOutcome,
  plos: RawChainOutcome[],
  clos: RawChainOutcome[],
  ploMappings: AssembleOutcomeChainInput["ploMappings"],
  cloMappings: AssembleOutcomeChainInput["cloMappings"]
): AssembleOutcomeChainInput => ({
  start: ilo,
  gaMappings: [],
  graduateAttributes: [],
  ploMappings,
  plos,
  cloMappings,
  clos,
  rubrics: [],
  assignments: [],
  attainment: [],
  students: [],
});

describe("assembleOutcomeChain — canonical mapping direction", () => {
  it("attaches PLOs under the ILO only when source=ILO and target=PLO", () => {
    fc.assert(
      fc.property(
        uuid,
        fc.array(uuid, { minLength: 1, maxLength: 5 }),
        fc.array(uuid, { minLength: 0, maxLength: 3 }),
        (iloId, ploIds, decoyIds) => {
          const ilo = outcome(iloId, "ILO");
          const plos = ploIds.map((id) => outcome(id, "PLO"));
          const decoys = decoyIds.map((id) => outcome(id, "PLO"));
          // Canonical direction: parent (ILO) → child (PLO).
          const input = baseInput(ilo, [...plos, ...decoys], [], 
            ploIds.map((target) => ({
              source_outcome_id: iloId,
              target_outcome_id: target,
              weight: 1,
            })), []);
          const chain = assembleOutcomeChain(input);
          expect(chain).not.toBeNull();
          expect(chain!.plos.map((p) => p.id).sort()).toEqual([...ploIds].sort());
        }
      ),
      { numRuns: 100 }
    );
  });

  it("NEVER attaches PLOs when the mapping direction is reversed", () => {
    fc.assert(
      fc.property(
        uuid,
        fc.array(uuid, { minLength: 1, maxLength: 5 }),
        (iloId, ploIds) => {
          const ilo = outcome(iloId, "ILO");
          const plos = ploIds.map((id) => outcome(id, "PLO"));
          // Reversed (forbidden) direction: child declared as source.
          const input = baseInput(ilo, plos, [],
            ploIds.map((child) => ({
              source_outcome_id: child,
              target_outcome_id: iloId,
              weight: 1,
            })), []);
          const chain = assembleOutcomeChain(input);
          expect(chain).not.toBeNull();
          expect(chain!.plos).toEqual([]);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("attaches CLOs under their mapped PLO only in canonical direction", () => {
    fc.assert(
      fc.property(
        uuid,
        uuid,
        fc.array(uuid, { minLength: 1, maxLength: 4 }),
        (iloId, ploId, cloIds) => {
          const ilo = outcome(iloId, "ILO");
          const plo = outcome(ploId, "PLO");
          const clos = cloIds.map((id) => outcome(id, "CLO"));
          const input = baseInput(ilo, [plo], clos,
            [{ source_outcome_id: iloId, target_outcome_id: ploId, weight: 1 }],
            cloIds.map((target) => ({
              source_outcome_id: ploId,
              target_outcome_id: target,
              weight: 1,
            })));
          const chain = assembleOutcomeChain(input);
          expect(chain).not.toBeNull();
          expect(chain!.plos.length).toBe(1);
          expect(chain!.plos[0]?.clos.map((c) => c.id).sort())
            .toEqual([...cloIds].sort());
        }
      ),
      { numRuns: 100 }
    );
  });
});