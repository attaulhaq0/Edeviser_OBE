# Requirements Document

## Introduction

This spec covers a coordinated, single-branch upgrade of all outdated npm dependencies in the Edeviser platform prior to production deployment. The codebase currently passes all 3624 tests, lint, and TypeScript checks on main. The upgrade must preserve that green state while bringing every dependency (except React 18 and its type packages) to its latest compatible version, resolving all known security vulnerabilities, and reconfiguring Dependabot to reduce post-deployment PR noise.

## Glossary

- **Upgrade_Branch**: The single Git branch (`chore/pre-deploy-deps-upgrade`) where all dependency changes are committed together to avoid merge conflict chaos.
- **CI_Pipeline**: The GitHub Actions workflow that runs lint → typecheck → test → build → lighthouse → e2e → bundle size checks on every push and PR.
- **Dependabot**: GitHub's automated dependency update bot, configured via `.github/dependabot.yml`.
- **Safe_Update**: A minor or patch version bump within a stable (≥1.0) package where no breaking API changes are expected.
- **Moderate_Risk_Update**: A minor version bump in a pre-1.0 package (where minor = breaking per semver) or a minor bump with known API surface changes.
- **Major_Update**: A semver-major version bump that includes documented breaking changes requiring migration work.
- **Lockfile**: The `package-lock.json` file that pins exact dependency versions for reproducible installs.
- **Security_Alert**: A GitHub Dependabot security advisory or `npm audit` finding for a known vulnerability in a dependency.
- **Test_Suite**: The full Vitest test suite comprising 338 test files with 3624 tests (property-based and unit).
- **Bundle_Budget**: The CI-enforced maximum total gzipped JavaScript size of 1200 KB.

## Requirements

### Requirement 1: Single Coordinated Upgrade Branch

**User Story:** As the sole developer, I want all dependency upgrades committed on a single branch in one PR, so that I avoid merge conflict chaos and can review the full upgrade as one atomic change.

#### Acceptance Criteria

1. THE Upgrade_Branch SHALL be created from the latest `main` commit with the name `chore/pre-deploy-deps-upgrade`.
2. WHEN all dependency upgrades are complete, THE Upgrade_Branch SHALL contain a single `package.json` and `package-lock.json` reflecting every upgraded dependency.
3. THE Upgrade_Branch SHALL NOT contain changes to React 18, react-dom 18, @types/react 18, or @types/react-dom 18 packages.
4. WHEN the Upgrade_Branch is ready for review, THE CI_Pipeline SHALL pass all jobs (lint, typecheck, test, build, lighthouse, e2e, bundle size) without failures.

### Requirement 2: Safe Minor and Patch Updates

**User Story:** As the sole developer, I want all safe minor and patch dependencies upgraded to their latest versions, so that I ship with the latest bug fixes and improvements.

#### Acceptance Criteria

1. WHEN the safe updates are applied, THE Lockfile SHALL reflect the following upgraded versions:
   - @axe-core/react ≥ 4.11.3
   - @sentry/react ≥ 10.51.0
   - @supabase/supabase-js ≥ 2.105.1
   - @tanstack/react-query ≥ 5.100.7
   - @tanstack/react-query-devtools ≥ 5.100.7
   - @vercel/node ≥ 5.7.15
   - axe-core ≥ 4.11.4
   - globals ≥ 17.6.0
   - jsdom ≥ 29.1.1
   - react-hook-form ≥ 7.74.0
   - typescript-eslint ≥ 8.59.1
2. WHEN the safe updates are installed, THE Test_Suite SHALL pass all 3624 tests without regressions.
3. WHEN the safe updates are installed, THE CI_Pipeline lint and typecheck jobs SHALL pass with zero errors and zero warnings.

### Requirement 3: Moderate Risk Updates

**User Story:** As the sole developer, I want the moderate-risk dependencies upgraded with appropriate migration steps, so that I benefit from their improvements without introducing regressions.

#### Acceptance Criteria

1. WHEN @fast-check/vitest is upgraded from 0.3.0 to 0.4.1, THE Test_Suite SHALL pass all property-based tests without modification to test logic, or with documented migration changes where the API has changed.
2. WHEN react-i18next is upgraded from 16.5.4 to 16.6.6, THE CI_Pipeline typecheck job SHALL pass and all i18n-related components SHALL render without errors.
3. WHEN shadcn CLI is upgraded to the latest compatible version, THE CI_Pipeline build job SHALL produce a successful production build.
4. IF a moderate-risk upgrade introduces a breaking API change, THEN THE Upgrade_Branch SHALL include the necessary code migration alongside the version bump.

### Requirement 4: Major Version Upgrades — Vitest 4 Ecosystem

**User Story:** As the sole developer, I want to upgrade Vitest and @vitest/coverage-v8 from v3 to v4, so that I run tests on the latest stable test framework before production deployment.

#### Acceptance Criteria

1. WHEN vitest is upgraded from 3.2.4 to 4.x, THE `vite.config.ts` test configuration SHALL be updated to comply with any Vitest 4 configuration changes.
2. WHEN @vitest/coverage-v8 is upgraded from 3.2.4 to 4.x, THE coverage configuration SHALL continue to use the v8 provider with the same thresholds (statements: 25, branches: 50, functions: 50, lines: 25).
3. WHEN the Vitest 4 upgrade is complete, THE Test_Suite SHALL pass all 3624 tests with the `--run` flag.
4. IF Vitest 4 changes the test runner API (globals, pool, environment), THEN THE `vite.config.ts` and `src/__tests__/setup.ts` SHALL be updated to match the new API.
5. WHEN the Vitest 4 upgrade is complete, THE `npm run test:coverage` command SHALL produce a coverage report without errors.

### Requirement 5: Major Version Upgrade — TypeScript 6

**User Story:** As the sole developer, I want to upgrade TypeScript from 5.9 to 6.0, so that I benefit from the latest type-checking improvements and ship on a current compiler version.

#### Acceptance Criteria

1. WHEN TypeScript is upgraded from 5.9.3 to 6.x, THE `tsconfig.json` SHALL be updated to accommodate any new required or default compiler options.
2. WHEN TypeScript 6 is installed, THE `npx tsc --noEmit` command SHALL complete with zero type errors across the entire `src/` directory.
3. IF TypeScript 6 introduces stricter type checking that surfaces new errors, THEN THE Upgrade_Branch SHALL include code fixes for all surfaced type errors.
4. WHEN TypeScript 6 is installed, THE ESLint configuration with typescript-eslint SHALL remain compatible and produce zero warnings.

### Requirement 6: Major Version Upgrade — lucide-react 1.x

**User Story:** As the sole developer, I want to upgrade lucide-react from 0.575.0 to 1.x, so that I use the stable icon API and benefit from improved tree-shaking.

#### Acceptance Criteria

1. WHEN lucide-react is upgraded from 0.575.0 to 1.x, THE production build SHALL complete without import errors for any icon used in the codebase.
2. IF lucide-react 1.x renames or removes icons used in the codebase, THEN THE Upgrade_Branch SHALL include updated import statements mapping old icon names to their 1.x equivalents.
3. WHEN lucide-react 1.x is installed, THE Bundle_Budget check SHALL pass (total gzipped JS ≤ 1200 KB).
4. WHEN lucide-react 1.x is installed, THE CI_Pipeline build job SHALL produce a successful production build with no dead-code warnings related to icon imports.

### Requirement 7: Security Vulnerability Remediation

**User Story:** As the sole developer, I want all known security vulnerabilities resolved before production deployment, so that I ship a secure application to institutional customers.

#### Acceptance Criteria

1. WHEN all upgrades are complete, THE `npm audit` command SHALL report zero high or critical vulnerabilities.
2. THE Upgrade_Branch SHALL address the medium-severity uuid vulnerability (missing buffer bounds check in v3/v5/v6) either by upgrading the uuid transitive dependency or by documenting that the vulnerability does not affect the application's usage pattern.
3. WHEN all upgrades are complete, THE `npm audit` command SHALL report a reduction from the current 7 GitHub security alerts.
4. IF a security vulnerability cannot be resolved by upgrading, THEN THE Upgrade_Branch SHALL document the vulnerability, its risk assessment, and the mitigation strategy.

### Requirement 8: Dependabot Post-Upgrade Configuration

**User Story:** As the sole developer, I want Dependabot reconfigured to only create security-only PRs after the upgrade, so that I avoid noisy minor/patch update PRs during production operation.

#### Acceptance Criteria

1. WHEN the upgrade is complete, THE `.github/dependabot.yml` SHALL be updated to restrict npm dependency updates to security-only PRs.
2. THE updated Dependabot configuration SHALL continue to monitor GitHub Actions for version updates on a weekly schedule.
3. THE updated Dependabot configuration SHALL retain the existing ignore rules for major version bumps on core tooling (React, TypeScript, ESLint, Vitest, Vite, Tailwind, react-router-dom, @tanstack/react-query).
4. THE updated Dependabot configuration SHALL use a `open-pull-requests-limit` of 5 or fewer for npm dependencies.

### Requirement 9: CI Pipeline Green State Verification

**User Story:** As the sole developer, I want the full CI pipeline to pass on the upgrade branch before merging, so that I have confidence the upgraded codebase is production-ready.

#### Acceptance Criteria

1. WHEN the Upgrade_Branch is pushed, THE CI_Pipeline lint job SHALL pass with zero errors and zero warnings.
2. WHEN the Upgrade_Branch is pushed, THE CI_Pipeline typecheck job SHALL pass with zero type errors.
3. WHEN the Upgrade_Branch is pushed, THE CI_Pipeline test job SHALL pass all 3624 tests (or more, if new tests are added for migration code).
4. WHEN the Upgrade_Branch is pushed, THE CI_Pipeline build job SHALL produce a successful production build.
5. WHEN the Upgrade_Branch is pushed, THE CI_Pipeline bundle size job SHALL confirm total gzipped JS is within the 1200 KB budget.
6. WHEN the Upgrade_Branch is pushed, THE CI_Pipeline security audit job SHALL report no high or critical vulnerabilities.

### Requirement 10: Lockfile Integrity and Reproducibility

**User Story:** As the sole developer, I want the lockfile to be clean and reproducible after the upgrade, so that CI and production builds install identical dependency trees.

#### Acceptance Criteria

1. WHEN the upgrade is complete, THE `package-lock.json` SHALL be regenerated using `npm install` (not manually edited).
2. THE CI_Pipeline lockfile-check job SHALL pass, confirming `npm ci` succeeds without lockfile drift.
3. THE `package-lock.json` SHALL NOT contain any `resolved` URLs pointing to private or non-registry sources.
4. WHEN `npm ci` is run on a clean checkout of the Upgrade_Branch, THE install SHALL complete without warnings about peer dependency conflicts related to the upgraded packages.
