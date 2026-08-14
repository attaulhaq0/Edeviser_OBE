import type { AgenticConfig, EnvironmentReader } from "./config.ts";
import type { AIProvider } from "./provider.ts";
import { createDeepSeekProvider } from "./providers/deepseek.ts";

export interface AIProviderRuntimeDependencies {
  env: EnvironmentReader;
  fetch?: typeof fetch;
  sleep?: (milliseconds: number) => Promise<void>;
}

/**
 * The sole production generation-provider composition root. Feature modules
 * depend on AIProvider and never select or import a vendor implementation.
 */
export const createAIProvider = (
  config: AgenticConfig,
  dependencies: AIProviderRuntimeDependencies
): AIProvider => {
  switch (config.provider) {
    case "deepseek":
      return createDeepSeekProvider(config, dependencies);
  }
};
