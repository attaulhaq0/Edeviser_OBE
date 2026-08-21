import { describe, expect, it } from "vitest";

import {
  AgenticConfigurationError,
  getAgenticConfig,
} from "../../../supabase/functions/_shared/ai/config";

const reader = (values: Record<string, string> = {}) => ({
  get: (name: string) => values[name],
});

describe("agentic configuration", () => {
  it("fails closed and selects only canonical providers by default", () => {
    const config = getAgenticConfig(reader());
    expect(config.enabled).toBe(false);
    expect(config.proactiveEnabled).toBe(false);
    expect(config.autoLowRiskEnabled).toBe(false);
    expect(config.protectedWritesEnabled).toBe(false);
    expect(config.provider).toBe("deepseek");
    expect(config.embeddingProvider).toBe("supabase_gte_small");
    expect(config.deepSeek.primaryModel).toBe("deepseek-v4-flash");
    expect(config.deepSeek.complexModel).toBe("deepseek-v4-pro");
    expect(config.maximumAutonomy).toBe("A2");
  });

  it("requires an explicit flag for human-approved protected writes", () => {
    expect(
      getAgenticConfig(reader({ AI_PROTECTED_WRITES_ENABLED: "true" }))
        .protectedWritesEnabled
    ).toBe(true);
    expect(
      getAgenticConfig(reader({ AI_PROTECTED_WRITES_ENABLED: "yes" }))
        .protectedWritesEnabled
    ).toBe(false);
  });

  it("rejects retired models, non-canonical providers, and unofficial origins", () => {
    expect(() =>
      getAgenticConfig(reader({ DEEPSEEK_PRIMARY_MODEL: "deepseek-chat" }))
    ).toThrow(AgenticConfigurationError);
    expect(() => getAgenticConfig(reader({ AI_PROVIDER: "other" }))).toThrow(
      AgenticConfigurationError
    );
    expect(() =>
      getAgenticConfig(reader({ EMBEDDING_PROVIDER: "external" }))
    ).toThrow(AgenticConfigurationError);
    expect(() =>
      getAgenticConfig(reader({ DEEPSEEK_BASE_URL: "https://example.test" }))
    ).toThrow(AgenticConfigurationError);
  });

  it("treats blank model values as unset defaults", () => {
    const config = getAgenticConfig(
      reader({
        DEEPSEEK_PRIMARY_MODEL: "   ",
        DEEPSEEK_COMPLEX_MODEL: "",
      })
    );
    expect(config.deepSeek.primaryModel).toBe("deepseek-v4-flash");
    expect(config.deepSeek.complexModel).toBe("deepseek-v4-pro");
  });

  it("validates deterministic execution bounds", () => {
    expect(() => getAgenticConfig(reader({ AI_MAX_TOOL_CALLS: "0" }))).toThrow(
      /AI_MAX_TOOL_CALLS/
    );
    expect(() =>
      getAgenticConfig(reader({ AI_REQUEST_TIMEOUT_MS: "NaN" }))
    ).toThrow(/AI_REQUEST_TIMEOUT_MS/);
    expect(() =>
      getAgenticConfig(reader({ AI_FEATURE_ENABLED: "true" }))
    ).toThrow(/AI_DAILY_BUDGET_USD/);
    expect(
      getAgenticConfig(
        reader({ AI_FEATURE_ENABLED: "true", AI_DAILY_BUDGET_USD: "10" })
      ).enabled
    ).toBe(true);
  });
});
