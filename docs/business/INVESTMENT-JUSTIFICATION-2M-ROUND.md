---
pdf_options:
  format: A4
  margin: 25mm 20mm
---

<style>
h2, h3, h4 {
  page-break-after: avoid;
}
table {
  page-break-inside: avoid;
}
tr {
  page-break-inside: avoid;
}
p {
  page-break-inside: avoid;
}
h2 + *, h3 + *, h4 + * {
  page-break-before: avoid;
}
</style>

# Edeviser — Capital Requirement & Strategic Rationale

## PKR 2M Bridge Capital for Qatar Market Entry & Product Scalability

**Version:** 4.0 | **Date:** April 2026 | **Prepared for:** Internal Alignment & Investor Discussion

---

## 1. Context — Why PKR 2M and What Is It For?

Edeviser is a production-ready OBE + Gamification platform targeting the Qatar higher education market. The product is built — 17+ feature modules, 25+ Edge Functions, 30+ database tables with RLS, full Arabic/English i18n, and a science-backed dual-engine architecture.

The PKR 2M is bridge capital covering two parallel tracks:

1. Qatar market entry — founder relocation, legal entity, regulatory compliance (approximately PKR 1.4M)
2. Product scalability — infrastructure, AI APIs, dev tooling to keep the platform production-grade (approximately PKR 600K for the first 6 months)

The critical point: the entire Qatar setup cost (approximately PKR 1.4M) is reimbursable through the Ignite Bridge Startup Program (https://ignite.org.pk/bridgestart/) at approximately month 6-7. Once reimbursed, that PKR 1.4M returns as working capital, funding another 6 months of operations. This gives the company an effective 12-month runway from a PKR 2M raise.

---

## 2. Complete Cost Breakdown

### 2.1 Qatar Setup Costs (One-Time, Reimbursable) — PKR 1,376,000

#### Founder Relocation (2 Founders)

| Item                                                                   | Per Founder                     | For 2 Founders  |
| ---------------------------------------------------------------------- | ------------------------------- | --------------- |
| One-way air ticket                                                     | PKR 90,000                      | PKR 180,000     |
| Work visa processing                                                   | PKR 60,000                      | PKR 120,000     |
| QID (Qatar Residency Permit) — medical, biometrics, residency issuance | QAR 4,000 (approx. PKR 290,000) | PKR 580,000     |
| **Subtotal per founder**                                               | **PKR 440,000**                 | **PKR 880,000** |

Founders contribute approximately 30% personally. Company-side cost: approximately PKR 616,000.

#### Short-Term Accommodation

| Item                | Cost                                        |
| ------------------- | ------------------------------------------- |
| 1-bedroom apartment | QAR 1,800/month (approx. PKR 133,000/month) |
| Duration            | 1–2 months (until QSTP housing)             |
| **Estimated total** | **PKR 200,000 (avg 1.5 months)**            |

Note: Excludes utilities, travel, and daily living — strictly setup-related.

#### Regulatory & Company Setup (QFC Mandatory)

| Item                                          | Cost                            | Notes                                       |
| --------------------------------------------- | ------------------------------- | ------------------------------------------- |
| Authorized Auditor (required within 3 months) | PKR 280,000/year                | 50% reimbursed by QSTP after payment        |
| Corporate bank account minimum balance        | QAR 5,000 (approx. PKR 280,000) | Must be maintained; required for operations |
| **Subtotal**                                  | **PKR 560,000**                 |                                             |

#### Qatar Setup Total (Reimbursable via Bridge Program)

| Component                                                     | Amount (PKR)      |
| ------------------------------------------------------------- | ----------------- |
| Founder relocation (adjusted after 30% personal contribution) | 616,000           |
| Accommodation (avg 1.5 months)                                | 200,000           |
| Regulatory + banking                                          | 560,000           |
| **Qatar setup total**                                         | **PKR 1,376,000** |

This entire amount is expected to be reimbursed by the Bridge Startup Program at approximately month 6-7.

---

### 2.2 Product Scalability Costs (Monthly Recurring)

These are the costs to keep Edeviser running as a production platform during pilot and early growth.

#### Infrastructure (Pilot Stage — 500 users, 1 institution)

Edeviser runs 5 AI features (at-risk prediction, module suggestions, feedback drafts, adaptive quiz generation, post-quiz explanations) plus RAG embeddings. At 500 active students, estimated monthly token usage based on GPT-4o pricing ($2.50/1M input, $10.00/1M output):

- At-risk predictions: approx. 2M input + 400K output tokens/mo = $9.00
- Module suggestions: approx. 1.5M input + 300K output = $6.75
- Feedback drafts: approx. 4M input + 1M output = $20.00
- Quiz generation: approx. 2M input + 500K output = $10.00
- Post-quiz explanations: approx. 3M input + 800K output = $15.50
- RAG embeddings (text-embedding-3-small at $0.02/1M, text-embedding-3-large at $0.13/1M): 5–15M tokens/mo = $0.10–$1.95, with bulk indexing spikes up to $3–$5

| Service                                      | Monthly Cost (USD)   | Monthly Cost (PKR)            |
| -------------------------------------------- | -------------------- | ----------------------------- |
| Supabase Pro + compute                       | $50                  | PKR 14,000                    |
| Vercel Pro                                   | $20                  | PKR 5,600                     |
| AI/LLM APIs (GPT-4o via OpenRouter)          | $60–80               | PKR 16,800–22,400             |
| AI Embeddings (text-embedding-3-small/large) | $2–5                 | PKR 560–1,400                 |
| Resend Pro (transactional email, 50K/mo)     | $20                  | PKR 5,600                     |
| Sentry (error monitoring)                    | $29                  | PKR 8,120                     |
| **Subtotal infrastructure**                  | **approx. $181–206** | **approx. PKR 50,680–57,680** |

#### Dev Tooling (Fixed, regardless of user count)

| Tool                                                | Monthly (USD)    | Monthly (PKR)          | Purpose                                   |
| --------------------------------------------------- | ---------------- | ---------------------- | ----------------------------------------- |
| Claude Code (Anthropic Max)                         | $200             | PKR 56,000             | AI-assisted development                   |
| GitHub Enterprise Cloud (2 users, includes Copilot) | $42              | PKR 11,760             | Source control, CI/CD, AI code completion |
| CodeRabbit Pro                                      | $19              | PKR 5,320              | Automated PR review                       |
| Figma Professional (2 editors)                      | $30              | PKR 8,400              | UI/UX design and handoff                  |
| Postman Basic                                       | $14              | PKR 3,920              | API testing                               |
| Kiro IDE Max                                        | $39              | PKR 10,920             | Spec-driven development                   |
| **Subtotal dev tooling**                            | **approx. $344** | **approx. PKR 96,320** |

These tools are essential to the engineering workflow and directly replace the need for additional engineering hires. A single developer with this tooling stack maintains velocity equivalent to a 3-person team without them. Each tool serves a distinct role in the development pipeline — from AI-assisted coding and automated code review to design handoff, API testing, and spec-driven development — and all are required to maintain production-grade quality at the current team size.

#### Combined Monthly Burn

| Scenario                          | Infrastructure     | Dev Tooling                                 | Total/month (PKR)   |
| --------------------------------- | ------------------ | ------------------------------------------- | ------------------- |
| Lean (essential tools only)       | approx. PKR 51,000 | approx. PKR 79,000 (Claude + Kiro + GitHub) | approx. PKR 130,000 |
| Standard (recommended)            | approx. PKR 55,000 | approx. PKR 96,000 (all tools)              | approx. PKR 151,000 |
| Growth (3 institutions, 2K users) | approx. PKR 79,000 | approx. PKR 96,000                          | approx. PKR 175,000 |

---

### 2.3 Full PKR 2M Allocation

| Category                                                         | Amount (PKR)      | % of Total |
| ---------------------------------------------------------------- | ----------------- | ---------- |
| Founder relocation (2 founders, after 30% personal contribution) | 616,000           | 30.8%      |
| Short-term accommodation (1.5 months avg)                        | 200,000           | 10.0%      |
| Regulatory & company setup (QFC auditor + bank)                  | 560,000           | 28.0%      |
| Product infrastructure + dev tooling (first 6 months)            | 624,000           | 31.2%      |
| **Total**                                                        | **PKR 2,000,000** | **100%**   |

---

## 3. The 12-Month Runway Model

This is the core financial logic of the PKR 2M raise:

### Phase 1: Months 1–6 (Funded by the PKR 2M raise)

Qatar setup costs consume approximately PKR 1,376,000 in months 1–3. During these months, founders are focused on relocation and legal setup, so only infrastructure costs are needed (no dev tooling). From month 4 onward, lean dev tooling is added as pilot work begins. This phased approach stretches the remaining PKR 624,000 across 6 months.

| Month       | Event                                         | One-Time Cost          | Monthly Burn            | Cumulative Spend | Remaining     |
| ----------- | --------------------------------------------- | ---------------------- | ----------------------- | ---------------- | ------------- |
| **Month 1** | Flights, visa, apartment deposit              | PKR 749,000            | PKR 55,000 (infra only) | PKR 804,000      | PKR 1,196,000 |
| **Month 2** | QID processing, auditor payment               | PKR 280,000            | PKR 55,000 (infra only) | PKR 1,139,000    | PKR 861,000   |
| **Month 3** | Bank account setup, QSTP housing transition   | PKR 280,000 (retained) | PKR 55,000 (infra only) | PKR 1,474,000    | PKR 526,000   |
| **Month 4** | Pilot deployment begins                       | —                      | PKR 130,000 (lean)      | PKR 1,604,000    | PKR 396,000   |
| **Month 5** | Pilot running, feedback collection            | —                      | PKR 130,000 (lean)      | PKR 1,734,000    | PKR 266,000   |
| **Month 6** | Pilot iteration, Bridge reimbursement arrives | —                      | PKR 130,000 (lean)      | PKR 1,864,000    | PKR 136,000   |

### Phase 2: Months 7–12 (Funded by Bridge Program Reimbursement)

At month 6-7, the Bridge Startup Program reimburses the Qatar setup costs. Expected reimbursement: approximately PKR 1,376,000. Combined with the PKR 136,000 remaining from Phase 1, this gives PKR 1,512,000 for Phase 2 operations at standard burn.

| Month        | Event                                          | Reimbursement  | Monthly Burn           | Cumulative (Phase 2) | Remaining     |
| ------------ | ---------------------------------------------- | -------------- | ---------------------- | -------------------- | ------------- |
| **Month 7**  | Reimbursement arrives, expanded pilot          | +PKR 1,376,000 | PKR 151,000 (standard) | PKR 151,000          | PKR 1,361,000 |
| **Month 8**  | 2nd institution outreach, pricing finalization | —              | PKR 151,000            | PKR 302,000          | PKR 1,210,000 |
| **Month 9**  | First paid contract expected                   | —              | PKR 151,000            | PKR 453,000          | PKR 1,059,000 |
| **Month 10** | Revenue begins (even partial)                  | —              | PKR 151,000            | PKR 604,000          | PKR 908,000   |
| **Month 11** | Scaling pilot, 2nd institution onboarding      | —              | PKR 151,000            | PKR 755,000          | PKR 757,000   |
| **Month 12** | Commercial operations established              | —              | PKR 151,000            | PKR 906,000          | PKR 606,000   |

At month 12, approximately PKR 606,000 remains as buffer — over 4 additional months of lean runway.

### 3.1 Runway Summary

| Phase                        | Funded By                                | Duration                       | Monthly Burn                         |
| ---------------------------- | ---------------------------------------- | ------------------------------ | ------------------------------------ |
| Phase 1 (Months 1–3)         | PKR 2M raise                             | 3 months                       | PKR 55,000 (infra only, setup phase) |
| Phase 1 (Months 4–6)         | PKR 2M raise                             | 3 months                       | PKR 130,000 (lean, pilot begins)     |
| Phase 2 (Months 7–12)        | Bridge reimbursement (approx. PKR 1.38M) | 6 months                       | PKR 151,000 (standard)               |
| Buffer remaining at month 12 | —                                        | approx. 4 months additional    | —                                    |
| **Total effective runway**   |                                          | **12 months + 4 month buffer** |                                      |

### 3.2 What Happens at Each Milestone

| Month      | Milestone                                                  | Risk Level                                            |
| ---------- | ---------------------------------------------------------- | ----------------------------------------------------- |
| Month 1–3  | Qatar setup complete, legal entity operational             | Low (costs are known and fixed)                       |
| Month 4–6  | Pilot running at 1 university, feedback loop active        | Medium (depends on university procurement speed)      |
| Month 6–7  | Bridge reimbursement arrives, extends runway to 12+ months | Low (program is established, application in progress) |
| Month 9–10 | First paid contract expected                               | Medium (revenue timing is uncertain)                  |
| Month 12   | Commercial operations with PKR 606K buffer remaining       | Low (self-sustaining if even 1 contract signed)       |

---

## 4. Product Scalability

### 4.1 Current Stack (No Change Needed)

React 18 + TypeScript + Supabase + Vercel. This stack handles 50,000+ users. Supabase is open-source — migration path to AWS exists if needed at 50+ institutions. No stack change is planned.

### 4.2 What the Monthly Infrastructure Budget Covers

At pilot stage (approx. $180–210/mo infrastructure):

- Supabase Pro with 2 vCPU/4GB compute — handles 500+ concurrent users
- Vercel Pro with CDN — global frontend delivery
- AI APIs — at-risk prediction, module suggestions, feedback drafts, adaptive quizzes all live
- Sentry — production error monitoring and performance tracing
- Realtime subscriptions — live leaderboard, grade notifications, streak updates

### 4.3 Scaling Path

| Scale        | Users  | Infrastructure/mo   | What Changes                                      |
| ------------ | ------ | ------------------- | ------------------------------------------------- |
| Pilot        | 500    | approx. PKR 55,000  | Current setup, no changes                         |
| Early Growth | 2,000  | approx. PKR 79,000  | Supabase compute upgrade, AI cost increase        |
| Growth       | 10,000 | approx. PKR 150,000 | Supabase Team plan, Redis cache, CDN optimization |

### 4.4 Product Iteration Roadmap

| Phase                | Timeline     | Focus                                                                 |
| -------------------- | ------------ | --------------------------------------------------------------------- |
| Production Hardening | Apr–Jun 2026 | RLS audit, load testing, Qatar accreditation templates, Arabic review |
| Pilot v1             | Jun–Aug 2026 | 1 university, 1–2 departments, 200–500 students                       |
| Iteration            | Aug–Sep 2026 | Top 10 feedback items, performance optimization                       |
| Pilot v2             | Sep–Nov 2026 | Expand to 2–3 departments, enable AI features at scale                |
| Commercial Launch    | Nov 2026+    | Pricing finalized, contracts signed, 2nd institution                  |

### 4.5 Features Prioritized for Scalability

| Feature                        | Status   | Why It Matters for Scale                        |
| ------------------------------ | -------- | ----------------------------------------------- |
| SSO (Google/Azure AD)          | Planned  | Universities won't sign without it              |
| AI Chat Tutor (RAG)            | Designed | Key differentiator; pgvector already in stack   |
| Connection pooling (PgBouncer) | Planned  | Required at 1,000+ concurrent connections       |
| Redis leaderboard cache        | Planned  | Eliminates expensive real-time queries at scale |
| Database indexing optimization | Planned  | Prevents query degradation as data grows        |

---

## 5. Revenue Model & Path to Sustainability

### 5.1 Pricing Framework

| Tier       | Students  | Annual License | Implementation Fee |
| ---------- | --------- | -------------- | ------------------ |
| Starter    | Up to 500 | $30K–50K       | $10K               |
| Growth     | 500–2,000 | $50K–100K      | $20K               |
| Enterprise | 2,000+    | $100K–250K     | $40K               |

### 5.2 Revenue Timeline

| Period  | Institutions          | ARR (PKR)         |
| ------- | --------------------- | ----------------- |
| Q4 2026 | 1 (pilot, discounted) | approx. PKR 4.2M  |
| Q2 2027 | 3                     | approx. PKR 33.6M |
| Q4 2027 | 5                     | approx. PKR 70M   |

A single discounted pilot contract (approx. PKR 4.2M/year) exceeds the entire PKR 2M bridge capital. The first paid contract makes the company self-sustaining on infrastructure costs.

### 5.3 Market Context

The EdTech market in the GCC is projected at $7.2B by 2027 (HolonIQ). Qatar has 12 universities and 30+ technical colleges under QNV 2030 with active OBE mandates. No dominant OBE + engagement platform exists in the region.

---

## 6. The approx. 5% Equity Discussion

### 6.1 Framing

The PKR 2M against approx. 5% equity was an initial reference to open discussion, not a fixed structure. The founder's preference is to keep flexibility through a SAFE or convertible note, deferring valuation to a stage with stronger product validation and in-market traction.

Given the nature of this capital (short-term, largely reimbursable), a convertible instrument feels more aligned than committing to equity early.

### 6.2 Preferred Structure (In Order)

1. Internal support or strategic capital (aligned partner, no external pressure)
2. SAFE or convertible note (defer valuation to revenue milestone or Series A)
3. Small equity round (approx. 5%) only if options 1–2 are not viable

### 6.3 What Happens Without This Capital?

| Dimension            | With PKR 2M                                     | Without                              |
| -------------------- | ----------------------------------------------- | ------------------------------------ |
| Qatar legal presence | QFC entity + QID within 2–3 months              | Cannot operate legally               |
| Pilot timeline       | Jun 2026                                        | Dec 2026 at earliest                 |
| AI features          | Live from day 1 (at-risk, adaptive quizzes)     | Dormant (no API budget)              |
| Production quality   | Sentry monitoring, CI/CD, proper infrastructure | Best-effort, no guarantees           |
| University contracts | Can sign institutional agreements               | No legal entity = no contracts       |
| Runway               | 12 months (with Bridge reimbursement)           | Zero                                 |
| Founder focus        | 100% product + market                           | Split between survival and execution |

### 6.4 Reimbursement Factor

The entire Qatar setup cost (approx. PKR 1.4M) is reimbursable through the Bridge Startup Program after approximately 6 months. This means the effective net capital requirement is only approx. PKR 624,000 (the infrastructure/tooling portion). The remaining PKR 1.4M is a timing bridge that returns as working capital, extending the runway from 6 months to 12+ months.

---

## 7. Summary

PKR 2M covers Qatar market entry (approx. PKR 1.4M for relocation, QFC entity, regulatory compliance) plus 6 months of product infrastructure. At month 6-7, the Bridge Startup Program reimburses the Qatar costs, injecting approx. PKR 1.4M back as working capital for another 6 months. Total effective runway: 12 months with a PKR 606K buffer. A single pilot contract (approx. PKR 4.2M/year) exceeds the entire raise and makes the company self-sustaining. The preferred structure is a SAFE or convertible note to avoid premature dilution.

---

_Edeviser — April 2026_
