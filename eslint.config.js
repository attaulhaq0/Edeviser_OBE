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
      "src/components/ui",
      ".claude",
      "coverage",
      "loginsignup",
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
