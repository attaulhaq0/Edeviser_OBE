# Portable design tokens — source-derived color pilot, not a second authority

**Status:** a bounded export of **eight selected opaque semantic color names in each of two groups** (16 tokens). [`tokens.css`](../../src/design-system/tokens.css) remains the **only editable authoring authority**, loaded by the actual [`index.css`](../../src/index.css) Tailwind graph. [`portable-tokens.generated.tokens.json`](portable-tokens.generated.tokens.json) is a generated interchange snapshot, not a CSS input, Figma document, Storybook manifest, new theme engine or visual approval. Do **not** hand-edit its values.

The writer targets the stable Design Tokens Community Group [**Format Module 2025.10**](https://www.designtokens.org/TR/2025.10/format/) and [Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/) **color-token value form**: each token has an explicit `$type: "color"` and an sRGB object `$value` with three unit-interval components and a six-digit `hex` fallback. These are Final Community Group Reports, **not W3C Standards**. The generated `semantic.light` and `semantic.dark` groups organize the output; **they are not contextual modes** and this exporter does not implement the separate [Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/), JSON Pointer, token references or circular-reference detection. It is a *writer for a declared subset*, not a general DTCG reader/converter.

## Ownership and exclusions

- Explicit pilot declarations: `--background`, `--foreground`, `--card`, `--card-foreground`, `--primary`, `--primary-foreground`, `--action-primary-hover`, `--action-primary-active`, each exactly once in normal `:root` and `.dark`. The CSS source's other `:root` block contains domain values and is not a second theme. Missing, duplicate, malformed or nonliteral selected colors fail.
- Reference palette, high-contrast alternatives (currently owned by `accessibility.css`), per-role context, component-specific badge colors, locale/reading-font preferences, opacity and gradients, aliases, viewport `calc()`, shadows and data-dependent geometry are **out of this portable pilot**. Their absence does not authorize extra CSS/JSON/Figma truths. Record a reviewed representation decision before expanding; retain the CSS/portal/accessibility cascade.
- The artifact `$extensions` records a portable source path, narrow writer/support boundary and SHA-256 of the selected declaration values after physical line-ending normalization. An unrelated contextual CSS edit is not a portable token change. No generated CSS or runtime modules are evaluated.

## Commands and acceptance boundary

```sh
npm run check:portable-tokens       # read-only: fail on missing/drift/unsafe output
npm run generate:portable-tokens    # explicit, reviewed regeneration of one JSON artifact
```

CI runs only the read-only check after TypeScript and the component catalog. Tests exercise CSS extraction, opaque type/value/hex round-trips, duplicate/missing/bad/alias/alpha rejection, CRLF/LF portability, source-derived artifact drift, and unsafe output paths. Regeneration does not prove that every component consumes a token, that normal/HC surfaces are accessible, that generated sRGB is rendered, or that the redesign is deployed. Existing source contrast and real browser role/theme checks remain required by the [frontend ledger](../audits/frontend-forensic-remediation-ledger.md) and product launch authority maintained outside this frontend-only checkpoint.
