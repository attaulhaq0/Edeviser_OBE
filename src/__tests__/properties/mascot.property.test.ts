// Feature: prototype-frontend-rebuild (P0.5 mascot/character system).
// Validates the character catalog against the real bundled assets + the
// gamification/moment resolvers. See src/design-system/mascot + PARITY.md §B.7.
import { describe, it, expect } from "vitest";
import fc from "fast-check";
import {
  CHARACTER_ASSETS,
  CHARACTER_ASSET_URLS,
  CHARACTER_IDS,
  CHARACTER_SKINS,
  characterAssetUrl,
  mascotForMoment,
  pickMascot,
  resolveCharacterFile,
  type MascotState,
} from "@/design-system/mascot/characters";
import { MASCOT_MOMENT_IDS } from "@/lib/mascotGuidance";

describe("mascot catalog ↔ asset integrity", () => {
  it("every catalog pose file exists as a bundled asset (no drift)", () => {
    for (const character of CHARACTER_IDS) {
      for (const file of Object.values(CHARACTER_ASSETS[character])) {
        expect(
          CHARACTER_ASSET_URLS[`${character}/${file}`],
          `${character}/${file} missing from bundled assets`
        ).toBeTruthy();
      }
    }
  });

  it("every catalog emotion resolves to a non-empty URL", () => {
    for (const character of CHARACTER_IDS) {
      for (const emotion of Object.keys(CHARACTER_ASSETS[character])) {
        expect(
          characterAssetUrl(character, emotion),
          `${character}/${emotion}`
        ).toBeTruthy();
      }
    }
  });
});

describe("resolveCharacterFile fallback (never empty)", () => {
  it("returns a filename for any character + arbitrary emotion string", () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...CHARACTER_IDS),
        fc.string(),
        (character, emotion) => {
          const file = resolveCharacterFile(character, emotion);
          return typeof file === "string" && file.endsWith(".png");
        }
      ),
      { numRuns: 300 }
    );
  });
});

describe("resolvers map to real, bundled assets", () => {
  it("mascotForMoment covers every guidance moment with a bundled pose", () => {
    for (const moment of MASCOT_MOMENT_IDS) {
      const pick = mascotForMoment(moment);
      expect(
        characterAssetUrl(pick.character, pick.emotion),
        `moment ${moment} → ${pick.character}/${pick.emotion}`
      ).toBeTruthy();
    }
  });

  it("pickMascot returns a bundled pose for representative states", () => {
    const states: MascotState[] = [
      { leveledUp: true },
      { context: "celebration" },
      { earnedXp: true },
      { context: "reward" },
      { context: "tutor" },
      { context: "needsAttention" },
      { hasWeakClo: true },
      { context: "habit" },
      { context: "reflection" },
      { context: "focus" },
      { context: "empty" },
      { streakDays: 12 },
      {},
    ];
    for (const state of states) {
      const pick = pickMascot(state);
      expect(
        characterAssetUrl(pick.character, pick.emotion),
        JSON.stringify(state)
      ).toBeTruthy();
    }
  });

  it("level-up outranks a generic streak signal (priority order)", () => {
    expect(pickMascot({ leveledUp: true, streakDays: 30 })).toEqual({
      character: "foxi",
      emotion: "level-up",
    });
  });
});

describe("marketplace companion skins", () => {
  it("every skin references a bundled pose, a name, and non-negative XP price", () => {
    for (const skin of CHARACTER_SKINS) {
      expect(
        characterAssetUrl(skin.character, skin.emotion),
        skin.id
      ).toBeTruthy();
      expect(skin.name.length).toBeGreaterThan(0);
      expect(skin.priceXp).toBeGreaterThanOrEqual(0);
    }
  });
});
