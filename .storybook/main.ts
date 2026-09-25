import { fileURLToPath } from "node:url";
import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  stories: ["../src/design-system/stories/**/*.stories.tsx"],
  addons: ["@storybook/addon-a11y"],
  framework: { name: "@storybook/react-vite", options: {} },
  // Keep the app's Vite/Tailwind graph: no second CSS/theme configuration.
  // Stories do not read root .env.local or inherit auth-bearing VITE_* envs.
  viteFinal: async (base) =>
    mergeConfig(base, {
      envDir: fileURLToPath(new URL("./safe-env/", import.meta.url)),
      envPrefix: "STORYBOOK_",
    }),
};
export default config;
