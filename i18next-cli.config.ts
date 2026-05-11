/**
 * i18next-cli configuration for automated key extraction and translation memory.
 * Design: ADR-11, ADR-17
 * Requirements: 2.26
 *
 * Usage:
 *   npx i18next-cli extract
 *   npx i18next-cli translate
 */

export default {
  // Input patterns: scan all TypeScript/TSX files for t() calls
  input: ["src/**/*.{ts,tsx}"],

  // Output directory structure: src/locales/{lng}/{ns}.json
  output: "src/locales/{{lng}}/{{ns}}.json",

  // Namespaces: organize translations by feature
  ns: ["common", "tour", "errors", "validation"],
  defaultNs: "common",

  // Languages: English (source) + Arabic (target)
  lng: "en",
  otherLngs: ["ar"],

  // Translation memory: preserve past translations across refactors (ADR-17)
  translationMemory: "src/locales/_translation-memory.json",

  // Extraction options
  extension: [".ts", ".tsx"],
  keySeparator: ".",
  nsSeparator: ":",

  // Context: preserve context strings for translators
  context: true,
  contextFallback: true,

  // Pluralization: support i18next plural forms
  plural: true,

  // Interpolation: support {{variable}} syntax
  interpolation: {
    prefix: "{{",
    suffix: "}}",
  },
};
