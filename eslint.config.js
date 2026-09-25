import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import jsxA11y from "eslint-plugin-jsx-a11y";
import globals from "globals";

export default tseslint.config(
  {
    ignores: [
      "dist",
      "node_modules",
      "supabase/functions",
      "supabase/.temp",
      "src/components/ui",
      ".claude",
      "coverage",
      // Storybook static output is generated, ignored and never authored source.
      "test-results/storybook-pilot/**",
      "loginsignup",
      "runtime-governance-scratch",
      // Standalone Figma reference extraction, not application source.
      // Migrated from the unsupported ESLint 9 .eslintignore file.
      "_hawdex_analysis/**",
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    // This explorer config exports preview metadata beside its local decorator;
    // it is not part of the app's React Fast Refresh module graph.
    files: [".storybook/preview.tsx"],
    rules: { "react-refresh/only-export-components": "off" },
  },
  {
    // Remotion compositions are rendered headlessly (not part of the Vite
    // Fast-Refresh dev surface), so the "only export components" rule — which
    // exists to protect HMR — does not apply. These files intentionally export
    // timing constants (FPS/FRAMES/TOTAL) alongside their composition.
    files: ["remotion/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  }
);
