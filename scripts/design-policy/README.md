# Source-aware design-policy kernel

This is a **pure analysis/comparison kernel**, not a repository scanner, CI gate or approval system. The separate `scripts/design-lint/check.mjs` remains a source-text inventory tool. Neither passing their unit tests nor an empty finding list establishes whole-application design compliance.

## Public API

- `analyzeSources([{ file, source }])` accepts repository-relative POSIX paths and supplied JS/TS/JSX/TSX text. It parses through an in-memory TypeScript host, rejects syntax errors, and returns owned JSON findings plus explicit limitations. It does not execute application modules, read the filesystem or resolve arbitrary dependencies.
- `compareFindings(baseline, current)` performs multiset accounting. File, named owner, rule and original token form the identity; line/column formatting changes do not create new debt, duplicate occurrences are counted, and introduced/retained/removed groups remain separate.
- The declaration file documents the data contracts. No compiler node, checker, symbol or type object is serialized.

## Covered candidates

Actual JSX styling sinks and recognized imported styling helpers are inspected for numbered palettes, literal color classes/paint, physical spacing and fixed-pixel text classes. Aliases/shadowing, supported literal branches/spreads, complete template fragments and CVA styling values have regressions. Ordinary text and comments are not styling sinks. Geometry and semantic variable references are not automatically paint violations.

Tailwind arbitrary-value whitespace is decoded only for paint inspection; original tokens/fingerprints remain unchanged. Inline CSS does not use that decoding. URL/variable identifiers, escapes and explicit variable fallbacks have distinct treatment.

## Limits that callers must preserve

- Candidates are not computed paint, contrast measurements or proof of executed branches.
- Opaque variables, arbitrary wrappers, spreads and runtime dataflow are not fully expanded. No findings does **not** mean these expressions are certified clean.
- This is not a complete CSS validator or a semantic judge of academic meaning.
- Generated sources, brand assets, domain presentations, fixtures and migration exceptions are not silently approved or excluded by the kernel. A future caller must apply a reviewed scope policy explicitly.
- The comparator never creates/updates a baseline or blesses existing debt. A future CI adapter must establish trustworthy before/after snapshots, account for coverage and preserve visible legacy debt; it must not convert this kernel into a misleading all-green repository report.

## Read-only repository adapter

`repository.mjs` is a separate adapter around the pure kernel. It reads authored `src` TypeScript, explicitly excludes generated primitives/tests/declarations, rejects source links and empty/malformed scans, and never executes the inspected code or writes a baseline. Runtime reachability is not inferred.

```sh
node scripts/design-policy/repository.mjs --report --root .
node scripts/design-policy/repository.mjs --check-no-growth --root . --base-root /path/to/trusted-baseline-checkout
```

Report mode emits `verdict: not-evaluated`. Comparison requires distinct physical checkouts, retains existing debt, and returns exit1 for growth or exit2 for invalid input/I/O/syntax. A no-growth result is not a clean-design verdict. The caller remains responsible for a trustworthy baseline and reviewed scope policy. **This adapter is not wired into CI yet.** Run `designPolicyRepository.test.ts` alongside the kernel tests for adapter validation.

## Verification

Run the focused tests with:

```sh
npm test -- src/__tests__/unit/designPolicy.test.ts --maxWorkers=1
```

Tests use runtime-assembled class fixtures so the test source does not accidentally add rare utility candidates to production Tailwind scanning. The remediation ledger records executed results, discovered gaps and current integration status.
