// aiFeatureFlags.test.ts — Phase 18: Granular AI feature flags verification
import { describe, it, expect, afterEach } from "vitest";
import {
  isCapabilityEnabled, isAnyAgenticEnabled, getEnabledCapabilities,
  capabilityLabel, type AICapability,
} from "@/lib/aiFeatureFlags";

describe("AI Feature Flags — Granular Control", () => {
  const originalEnv = import.meta.env.VITE_AI_ENVIRONMENT;

  afterEach(() => { import.meta.env.VITE_AI_ENVIRONMENT = originalEnv; });

  it("AI_DISABLED: no capabilities enabled", () => {
    import.meta.env.VITE_AI_ENVIRONMENT = "AI_DISABLED";
    expect(isCapabilityEnabled("student_tutor")).toBe(false);
    expect(isCapabilityEnabled("agentic_recommendations")).toBe(false);
    expect(isCapabilityEnabled("quiz_generation")).toBe(false);
    expect(isAnyAgenticEnabled()).toBe(false);
    expect(getEnabledCapabilities()).toHaveLength(0);
  });

  it("AI_SHADOW: only shadow_evaluation enabled", () => {
    import.meta.env.VITE_AI_ENVIRONMENT = "AI_SHADOW";
    expect(isCapabilityEnabled("shadow_evaluation")).toBe(true);
    expect(isCapabilityEnabled("student_tutor")).toBe(false);
    expect(isCapabilityEnabled("agentic_recommendations")).toBe(false);
    expect(getEnabledCapabilities()).toEqual(["shadow_evaluation"]);
  });

  it("AI_ENABLED_QA: all capabilities enabled EXCEPT shadow_evaluation", () => {
    import.meta.env.VITE_AI_ENVIRONMENT = "AI_ENABLED_QA";
    expect(isCapabilityEnabled("student_tutor")).toBe(true);
    expect(isCapabilityEnabled("teacher_copilot")).toBe(true);
    expect(isCapabilityEnabled("coordinator_insights")).toBe(true);
    expect(isCapabilityEnabled("parent_summaries")).toBe(true);
    expect(isCapabilityEnabled("agentic_recommendations")).toBe(true);
    expect(isCapabilityEnabled("quiz_generation")).toBe(true);
    expect(isCapabilityEnabled("feedback_drafting")).toBe(true);
    expect(isCapabilityEnabled("curriculum_suggestion")).toBe(true);
    expect(isCapabilityEnabled("habit_analysis")).toBe(true);
    expect(isCapabilityEnabled("risk_detection")).toBe(true);
    expect(isAnyAgenticEnabled()).toBe(true);
    expect(getEnabledCapabilities().length).toBeGreaterThanOrEqual(10);
  });

  it("AI_ENABLED_PILOT: all capabilities enabled", () => {
    import.meta.env.VITE_AI_ENVIRONMENT = "AI_ENABLED_PILOT";
    expect(isCapabilityEnabled("student_tutor")).toBe(true);
    expect(isCapabilityEnabled("agentic_recommendations")).toBe(true);
    expect(isAnyAgenticEnabled()).toBe(true);
  });
});

describe("capabilityLabel", () => {
  it("returns human-readable labels", () => {
    expect(capabilityLabel("student_tutor")).toBe("AI Tutor");
    expect(capabilityLabel("teacher_copilot")).toBe("Teacher Copilot");
    expect(capabilityLabel("agentic_recommendations")).toBe("Agentic Recommendations");
  });
  it("returns raw string for unknown capability", () => {
    expect(capabilityLabel("unknown" as AICapability)).toBe("unknown");
  });
});