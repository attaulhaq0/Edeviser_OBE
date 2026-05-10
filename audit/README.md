# Pre-Deployment E2E Audit

This directory holds the artifacts and baselines for the Pre-Deployment E2E Audit.

See the full spec at `.kiro/specs/pre-deployment-e2e-audit/`:

- `requirements.md` — 17 EARS requirements and 15 correctness properties
- `design.md` — layered pipeline architecture with per-role coverage matrix
- `tasks.md` — implementation plan

## Directory structure

```
audit/
├── README.md                # this file
├── baselines/               # committed; enforced on every audit run
│   ├── bundle.json
│   ├── tti.json
│   ├── rls-expectations.json
│   ├── rls-exclude.json
│   ├── cron-idempotency.json
│   ├── secret-patterns.json
│   ├── vite-env.allowlist.json
│   ├── i18n-allowlist.json
│   ├── n-plus-one-threshold.json
│   ├── rtl-exceptions.json
│   ├── cross-role-timing.json
│   ├── deployed-fixtures.json
│   └── rtl-screens/         # per-role RTL layout baselines
└── output/                  # gitignored; produced at run time
```

## Baseline lifecycle

Every baseline JSON carries `createdAt` and `lockedByCommit` metadata. On the
first audit run, task 19.1 populates the currently-null baselines with measured
values and stamps both fields. Subsequent runs enforce them.

Updating a baseline requires a deliberate PR that bumps `createdAt` and sets
`lockedByCommit` to the commit SHA that justified the change.

## Running the audit

```bash
npm run audit                # full pipeline (once task 1.4 lands)
npm run audit -- --pr        # PR mode (skips E2E)
npm run audit -- --stage=rls # single stage
```

Playwright browsers must be installed once per environment:

```bash
npm run audit:install-browsers
```
