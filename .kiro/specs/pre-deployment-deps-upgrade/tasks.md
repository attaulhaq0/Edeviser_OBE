# Implementation Plan: Pre-Deployment Dependency Upgrade

## Overview

Tiered dependency upgrade on a single branch (`chore/pre-deploy-deps-upgrade`). Each tier is verified with lint + typecheck + test before proceeding. Major upgrades (Vitest 4, TypeScript 6, lucide-react 1.x) are isolated so regressions can be attributed to a specific package. Final step reconfigures Dependabot to security-only mode.

## Tasks

- [x] 1. Create upgrade branch and apply Tier 1 safe patches

  - [x] 1.1 Create branch `chore/pre-deploy-deps-upgrade` from latest `main`

    - Run `git checkout -b chore/pre-deploy-deps-upgrade`
    - _Requirements: 1.1_

  - [x] 1.2 Upgrade all Tier 1 safe minor/patch dependencies

    - Run `npm install` with explicit versions for each safe package:
      - `@axe-core/react@^4.11.3` `@sentry/react@^10.51.0` `@supabase/supabase-js@^2.105.1`
      - `@tanstack/react-query@^5.100.7` `@tanstack/react-query-devtools@^5.100.7`
      - `@vercel/node@^5.7.15` `axe-core@^4.11.4` `globals@^17.6.0`
      - `jsdom@^29.1.1` `react-hook-form@^7.74.0` `typescript-eslint@^8.59.1`
    - Verify `package.json` and `package-lock.json` reflect the new versions
    - Confirm React 18, react-dom 18, @types/react 18, @types/react-dom 18 are NOT changed
    - _Requirements: 2.1, 1.3_

  - [x] 1.3 Tier 1 verification gate
    - Run `npm run lint` — zero errors, zero warnings
    - Run `npx tsc --noEmit` — zero type errors
    - Run `npm test` — all tests pass
    - Fix any regressions before proceeding
    - _Requirements: 2.2, 2.3, 9.1, 9.2, 9.3_

- [x] 2. Apply Tier 2 moderate-risk updates

  - [x] 2.1 Upgrade @fast-check/vitest from 0.3.0 to 0.4.x

    - Run `npm install @fast-check/vitest@^0.4.1`
    - If the `test.prop` API signature changed, update all property test files in `src/__tests__/properties/` to match the new API
    - Run the property test suite to verify: `npm test -- --run src/__tests__/properties/`
    - _Requirements: 3.1, 3.4_

  - [x] 2.2 Upgrade react-i18next and shadcn CLI

    - Run `npm install react-i18next@^16.6.6`
    - Run `npm install -D shadcn@latest`
    - Verify i18n-related components render without errors via typecheck
    - _Requirements: 3.2, 3.3_

  - [x] 2.3 Tier 2 verification gate
    - Run `npm run lint` — zero errors, zero warnings
    - Run `npx tsc --noEmit` — zero type errors
    - Run `npm test` — all tests pass (including property tests)
    - Fix any API migration issues before proceeding
    - _Requirements: 3.1, 3.2, 3.3, 9.1, 9.2, 9.3_

- [x] 3. Checkpoint — Tier 1 & 2 stable

  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Tier 3a — Vitest 4 migration

  - [x] 4.1 Upgrade vitest and @vitest/coverage-v8 to 4.x

    - Run `npm install -D vitest@^4.0.0 @vitest/coverage-v8@^4.0.0`
    - Update `@vitejs/plugin-react` if needed for Vitest 4 compatibility
    - _Requirements: 4.1_

  - [x] 4.2 Update vite.config.ts for Vitest 4 compatibility

    - Review `vite.config.ts` test block against Vitest 4 migration guide
    - Remove any deprecated options (`poolOptions`, `coverage.all`, `coverage.extensions`, `coverage.ignoreEmptyLines`) if present
    - Verify `pool: 'forks'` is still supported at top level
    - Verify `coverage.include` is explicitly defined (already is)
    - Update `src/__tests__/setup.ts` if Vitest 4 changes globals/environment API
    - Audit test files for deprecated patterns: test options as third argument to `test()`, `vi.fn().getMockName()` returning different values
    - _Requirements: 4.1, 4.4_

  - [x] 4.3 Adjust coverage thresholds if needed

    - Run `npm run test:coverage` to check if V8 AST-based remapping shifts coverage numbers
    - If thresholds fail, adjust in `vite.config.ts` to match new baseline (within ±5% of current: statements 25%, branches 50%, functions 50%, lines 25%)
    - Document any threshold changes
    - _Requirements: 4.2, 4.5_

  - [x] 4.4 Tier 3a verification gate
    - Run `npm run lint` — zero errors, zero warnings
    - Run `npx tsc --noEmit` — zero type errors
    - Run `npm test` — all tests pass with `--run` flag
    - Run `npm run test:coverage` — coverage report generates without errors
    - _Requirements: 4.3, 4.5, 9.1, 9.2, 9.3_

- [x] 5. Tier 3b — TypeScript 6 migration

  - [x] 5.1 Upgrade TypeScript to 6.x

    - Run `npm install -D typescript@^6.0.0`
    - _Requirements: 5.1_

  - [x] 5.2 Update tsconfig.json for TypeScript 6 defaults

    - Add `"types": ["node"]` to `compilerOptions` (TS 6 defaults `types` to `[]`)
    - Review other new defaults: `strict` (already true), `module` (already ESNext), `target` (already ES2020 — explicit overrides default)
    - Handle `baseUrl` deprecation if TS 6 warns — current config uses `baseUrl: "."` with `paths`, may need adjustment
    - _Requirements: 5.1_

  - [x] 5.3 Fix any new type errors from TypeScript 6

    - Run `npx tsc --noEmit` and fix all surfaced type errors
    - Verify ESLint with typescript-eslint remains compatible
    - _Requirements: 5.2, 5.3, 5.4_

  - [x] 5.4 Tier 3b verification gate
    - Run `npm run lint` — zero errors, zero warnings
    - Run `npx tsc --noEmit` — zero type errors
    - Run `npm test` — all tests pass
    - _Requirements: 5.2, 5.3, 5.4, 9.1, 9.2, 9.3_

- [x] 6. Checkpoint — Major test runner and compiler upgrades stable

  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Tier 3c — lucide-react 1.x migration

  - [-] 7.1 Upgrade lucide-react to 1.x

    - Run `npm install lucide-react@^1.0.0`
    - _Requirements: 6.1_

  - [~] 7.2 Fix icon import breakages

    - Run `npx tsc --noEmit` to catch import errors from renamed/removed icons
    - Search codebase for all `lucide-react` imports and verify each icon exists in 1.x
    - Map old icon names to 1.x equivalents using the lucide changelog
    - Fix all broken imports across `src/components/`, `src/pages/`, and any other files
    - _Requirements: 6.1, 6.2_

  - [~] 7.3 Tier 3c verification gate — full build
    - Run `npm run lint` — zero errors, zero warnings
    - Run `npx tsc --noEmit` — zero type errors
    - Run `npm test` — all tests pass
    - Run `npm run build` — successful production build, no dead-code warnings for icon imports
    - Verify bundle size stays within 1200 KB budget (run `npm run analyze` or check gzipped output)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 8. Security audit and vulnerability remediation

  - [~] 8.1 Run npm audit and resolve vulnerabilities
    - Run `npm audit` to check for remaining high/critical vulnerabilities
    - Verify the uuid medium-severity vulnerability (missing buffer bounds check in v3/v5/v6) is resolved by the upgrades, or document risk assessment and mitigation
    - If any high/critical vulnerabilities remain, upgrade the affected transitive dependencies or document mitigation
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [ ] 9. Tier 4 — Dependabot security-only configuration

  - [~] 9.1 Update .github/dependabot.yml to security-only mode
    - Remove the `groups.production-dependencies` grouping for minor/patch updates
    - Add configuration to restrict npm dependency updates to security-only PRs (use Dependabot's security-updates-only approach or set `open-pull-requests-limit: 0` for version updates and rely on security updates)
    - Reduce `open-pull-requests-limit` to 5 or fewer for npm
    - Keep GitHub Actions monitoring on weekly schedule unchanged
    - Retain all existing `ignore` rules for major version bumps on core tooling
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

- [ ] 10. Final verification and lockfile integrity

  - [~] 10.1 Verify lockfile integrity

    - Run `npm ci` on a clean install to confirm no lockfile drift
    - Verify `package-lock.json` has no `resolved` URLs pointing to private/non-registry sources
    - Confirm no peer dependency conflict warnings for upgraded packages
    - _Requirements: 10.1, 10.2, 10.3, 10.4_

  - [~] 10.2 Full CI pipeline verification
    - Run `npm run lint` — zero errors, zero warnings
    - Run `npx tsc --noEmit` — zero type errors
    - Run `npm test` — all tests pass
    - Run `npm run build` — successful production build
    - Run `npm audit --audit-level=high` — no high/critical vulnerabilities
    - Confirm bundle size within 1200 KB budget
    - _Requirements: 1.4, 9.1, 9.2, 9.3, 9.4, 9.5, 9.6_

- [ ] 11. Final checkpoint — Upgrade branch ready for PR
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- No tasks are marked optional — this is a dependency upgrade where every step must be verified
- No property-based test tasks — this spec introduces no new business logic; the existing PBT suite is the regression oracle
- Each tier is committed separately so individual upgrades can be reverted if they introduce unfixable regressions
- React 18 and its type packages are explicitly excluded from all upgrades (Requirement 1.3)
- Coverage thresholds may shift after Vitest 4's AST-based V8 remapping — adjust within ±5% of current values
- The `baseUrl` deprecation in TypeScript 6 may require moving path alias config; verify during task 5.2
