# Edeviser Documentation

Organized documentation for the Edeviser OBE + Gamification platform.

## Folder Structure

```
docs/
├── README.md                          ← You are here
│
├── security/                          ← Security audits, compliance, secrets
│   ├── AIKIDO-SECURITY-AUDIT-2026-04-23.md
│   ├── SECURITY-AUDIT-2026-03-28.md
│   ├── SECURITY-AUDIT-REPORT.md
│   ├── secrets-management.md
│   └── data-compliance.md
│
├── architecture/                      ← System design, data flow, DB schema
│   ├── SYSTEM-ARCHITECTURE.md
│   ├── ARCHITECTURE-AUDIT.md
│   ├── DATA-FLOW-TRACE.md
│   ├── SUPABASE-AUDIT-REPORT.md
│   ├── SUPABASE-COLUMNS-DATATYPES.md
│   ├── SUPABASE-RELATIONSHIPS-FK.md
│   ├── SUPABASE-HEALTH-REPORT.md
│   ├── connection-pooling.md
│   └── EDGE-FUNCTIONS-DEPLOYMENT-PLAN.md
│
├── product/                           ← Product docs, UI/UX, tech overview
│   ├── PRODUCT-REQUIREMENTS-DOCUMENT.md
│   ├── EDEVISER-COMPLETE-PRODUCT-DOCUMENTATION.md
│   ├── EDEVISER-TECHSTACK-AI-OVERVIEW.md
│   ├── EDEVISER-UI-UX-DESIGN-REVIEW-DOCUMENT.md
│   ├── DESIGN-STYLE-GUIDE.md
│   ├── AI-TOOLING-COMPARISON.md
│   └── THE-10-PILLARS-SECRET-SAUCE.md
│
├── operations/                        ← CI/CD, testing, deployment, DR
│   ├── ci-cd.md
│   ├── DEVELOPER-GUIDE-PR-CI-DEBUG.md
│   ├── disaster-recovery.md
│   ├── responsive-testing.md
│   ├── MANUAL-STEPS.md
│   ├── GAP-ANALYSIS-REPORT.md
│   └── TEST-REPORT-APRIL-2026.md
│
├── business/                          ← Sales, investment, growth playbooks
│   ├── B2B-INSTITUTIONAL-GROWTH-PLAYBOOK.md
│   ├── B2B-GROWTH-PLAYBOOK-v3.md
│   ├── INVESTMENT-JUSTIFICATION-2M-ROUND.md
│   ├── INTERNAL-UNIT-ECONOMICS-ANALYSIS.md
│   ├── LINKEDIN-14-DAY-PLAYBOOK.md
│   ├── SALES-PIPELINE-GUIDE.md
│   └── edeviser-sales-pipeline.csv
│
├── import-templates/                  ← CSV templates for bulk import
│   ├── courses.csv
│   ├── enrollments.csv
│   ├── grades.csv
│   └── outcomes.csv
│
└── pdf/                               ← All PDF exports (mirrors md structure)
    ├── security/
    │   └── SUPABASE-AUDIT-REPORT.pdf
    ├── architecture/
    │   ├── SUPABASE-COLUMNS-DATATYPES.pdf
    │   ├── SUPABASE-RELATIONSHIPS-FK.pdf
    │   └── EDGE-FUNCTIONS-DEPLOYMENT-PLAN.pdf
    ├── product/
    │   ├── EDEVISER-COMPLETE-PRODUCT-DOCUMENTATION.pdf
    │   ├── EDEVISER-TECHSTACK-AI-OVERVIEW.pdf
    │   ├── EDEVISER-UI-UX-DESIGN-REVIEW-DOCUMENT.pdf
    │   └── AI-TOOLING-COMPARISON.pdf
    ├── operations/
    │   └── TEST-REPORT-APRIL-2026.pdf
    ├── business/
    │   ├── B2B-INSTITUTIONAL-GROWTH-PLAYBOOK.pdf
    │   ├── B2B-INSTITUTIONAL-GROWTH-PLAYBOOK-v3.pdf
    │   ├── B2B-INSTITUTIONAL-GROWTH-PLAYBOOK-v3-new.pdf
    │   ├── B2B-GROWTH-PLAYBOOK-v3.pdf
    │   ├── INVESTMENT-JUSTIFICATION-2M-ROUND.pdf
    │   ├── INTERNAL-UNIT-ECONOMICS-ANALYSIS.pdf
    │   ├── LINKEDIN-14-DAY-PLAYBOOK.pdf
    │   └── PitchDeck-EDeviser-1.pdf
    └── misc/
        └── Relocation-Google-Docs.pdf
```

**Root-level files kept intentionally:**
- `README.md` — Standard project readme (stays at root by convention)
- `AGENTS.md` — AI agent instructions (referenced by tooling, must stay at root)

## Conventions

- **Markdown files** live in their category folder directly
- **PDF exports** are mirrored under `docs/pdf/{category}/` to keep binary files separate
- **CSV data files** go in `import-templates/` or `business/` depending on purpose
- New documents should be placed in the appropriate category folder
- Security audit reports use the naming pattern: `{TOOL}-SECURITY-AUDIT-{DATE}.md`
