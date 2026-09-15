// habitBehaviorModel.test.ts — Phase 17: Full BJ Fogg model verification
import { describe, it, expect } from "vitest";
import {
  DEFAULT_BEHAVIOR_CATALOG,
} from "@/lib/habitBehaviorModel";

describe("BJ Fogg Behavior Model — DEFAULT_BEHAVIOR_CATALOG", () => {
  it("contains exactly 6 behaviors", () => {
    expect(DEFAULT_BEHAVIOR_CATALOG).toHaveLength(6);
  });

  it("every behavior has all B=MAP components", () => {
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      // Behavior (B)
      expect(def.behavior.behaviorId).toBeTruthy();
      expect(def.behavior.name).toBeTruthy();
      expect(def.behavior.targetAction).toBeTruthy();
      expect(def.behavior.triggerContext).toBeTruthy();
      expect(def.behavior.frequency).toBeTruthy();
      expect(def.behavior.learnerDimension).toBeTruthy();
      expect(def.behavior.active).toBe(true);
      expect(def.behavior.version).toBe("2.0");
      expect(def.behavior.evidencePolicy.eventType).toBeTruthy();

      // Motivation (M)
      expect(def.motivation.coreDrivers.length).toBeGreaterThan(0);
      expect(def.motivation.measurement).toBeTruthy();

      // Ability (A)
      expect(def.ability.factors.length).toBeGreaterThan(0);
      expect(def.ability.availableInterventions.length).toBeGreaterThan(0);
      expect(def.ability.activeIntervention).toBeTruthy();

      // Prompt (P)
      expect(def.prompt.type).toBeTruthy();
      expect(def.prompt.trigger).toBeTruthy();
      expect(def.prompt.channel).toBeTruthy();
    }
  });

  it("covers all 4 original daily behaviors + 2 extended", () => {
    const ids = DEFAULT_BEHAVIOR_CATALOG.map((d) => d.behavior.behaviorId);
    expect(ids).toContain("daily_login");
    expect(ids).toContain("complete_assessment");
    expect(ids).toContain("journal_reflection");
    expect(ids).toContain("read_material");
    expect(ids).toContain("study_session");
    expect(ids).toContain("goal_setting");
  });

  it("each behavior maps to exactly one learner dimension", () => {
    const dims = new Set(DEFAULT_BEHAVIOR_CATALOG.map((d) => d.behavior.learnerDimension));
    expect(dims.size).toBeGreaterThanOrEqual(4); // At least 4 distinct dimensions
  });

  it("outcomeRelevance is valid for all behaviors", () => {
    const valid = ["direct", "indirect", "supportive", "none"];
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      expect(valid).toContain(def.behavior.outcomeRelevance);
    }
  });

  it("prompt has valid type/trigger/channel", () => {
    const validTypes = ["facilitator", "spark", "signal"];
    const validTriggers = ["time_of_day", "after_login", "after_submission", "before_deadline", "after_break", "weekly_summary", "streak_at_risk"];
    const validChannels = ["notification", "email", "in_app", "calendar", "teacher_nudge"];
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      expect(validTypes).toContain(def.prompt.type);
      expect(validTriggers).toContain(def.prompt.trigger);
      expect(validChannels).toContain(def.prompt.channel);
    }
  });
});

describe("BJ Fogg: Ability Interventions", () => {
  it("all interventions have valid type", () => {
    const validInterventions = ["smaller_task", "shorter_session", "reduced_friction", "guided_first_step", "scaffold", "provide_template", "anchor_to_routine"];
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      for (const intervention of def.ability.availableInterventions) {
        expect(validInterventions).toContain(intervention);
      }
    }
  });

  it("active intervention is in available interventions", () => {
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      expect(def.ability.availableInterventions).toContain(def.ability.activeIntervention);
    }
  });
});

describe("BJ Fogg: Motivation Proxies", () => {
  it("motivation measurement uses observable proxies only", () => {
    const validMeasurements = ["engagement_frequency", "completion_consistency", "voluntary_extension", "reflection_depth", "goal_selection_ambition"];
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      expect(validMeasurements).toContain(def.motivation.measurement);
    }
  });

  it("motivation drivers are valid BJ Fogg core motivators", () => {
    const validDrivers = ["sensation", "anticipation", "belonging"];
    for (const def of DEFAULT_BEHAVIOR_CATALOG) {
      for (const driver of def.motivation.coreDrivers) {
        expect(validDrivers).toContain(driver);
      }
    }
  });
});