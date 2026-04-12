---
pdf_options:
  format: A4
  margin: 25mm 20mm
---

<style>
h2, h3, h4 { page-break-after: avoid; }
table { page-break-inside: avoid; }
tr { page-break-inside: avoid; }
p { page-break-inside: avoid; }
h2 + *, h3 + *, h4 + * { page-break-before: avoid; }
</style>

# Edeviser — Unit Economics, Pricing Logic & Internal Critique
## INTERNAL ONLY — Do Not Share Externally

**Version:** 1.0 | **Date:** April 2026 | **Classification:** Founders Only

---

## 1. HOW WE PRICED: The Logic Behind the Numbers

### 1.1 The Pricing Framework (What We Published)

| Tier | Students | Annual License | Implementation Fee | Effective Per-Student/Year |
|------|----------|---------------|-------------------|---------------------------|
| Starter | Up to 500 | $30K–50K | $10K (one-time) | $60–100 |
| Growth | 500–2,000 | $50K–100K | $20K (one-time) | $50–100 |
| Enterprise | 2,000+ | $100K–250K | $40K (one-time) | $50–125 |

### 1.2 How We Arrived at These Numbers

The pricing was NOT derived from cost-plus. It was derived from **value-based pricing** anchored to three reference points:

**Reference Point 1: What institutions currently spend on OBE compliance**
- A coordinator spends approximately 200 hours/semester on manual OBE reporting (spreadsheets, evidence compilation, report formatting)
- At $30–50/hour (Qatar faculty rates), that's $6,000–10,000/semester per coordinator
- A university with 5 programs has 5 coordinators = $30,000–50,000/year just on manual OBE admin
- Edeviser eliminates approximately 80% of this work = $24,000–40,000/year in saved labor
- Our Starter price ($30K–50K) roughly equals the labor cost we replace

**Reference Point 2: Competitor pricing in the EdTech B2B space**
- Traditional LMS (Canvas, Blackboard): $20–60/student/year for basic LMS
- OBE-specific tools (Taskstream/Watermark, AEFIS): $15–40/student/year for compliance only
- Engagement platforms (Kahoot Enterprise, Nearpod): $10–25/student/year for engagement only
- Edeviser combines both = $50–125/student/year is competitive for a dual-engine platform

**Reference Point 3: Qatar market willingness to pay**
- Qatar universities have significant IT budgets (QNV 2030 education investment)
- Annual software procurement budgets for mid-size Qatar universities: $200K–500K
- Our $30K–100K ask is 6–20% of their software budget — reasonable for a core platform
- Implementation fee covers our onboarding cost and signals commitment

### 1.3 The Per-Student Math (Honest Breakdown)

| Students | License/Year | Per-Student/Year | Per-Student/Month |
|----------|-------------|-----------------|-------------------|
| 200 (pilot) | $30K (discounted) | $150 | $12.50 |
| 500 | $40K (mid-range) | $80 | $6.67 |
| 1,000 | $65K | $65 | $5.42 |
| 2,000 | $90K | $45 | $3.75 |
| 5,000 | $150K | $30 | $2.50 |
| 10,000 | $200K | $20 | $1.67 |
| 15,000 (QU-scale) | $250K | $16.67 | $1.39 |

The per-student cost drops significantly at scale. This is intentional — it makes the CFO's expansion math easy and creates a natural incentive to go campus-wide.

---

## 2. COST TO SERVE: What Each Student Actually Costs Us

### 2.1 Variable Costs Per Student Per Month (at scale)

These are the costs that increase with each additional student:

| Cost Component | Per Student/Month | Calculation Basis |
|---------------|-------------------|-------------------|
| AI/LLM APIs (all 5 features) | $0.10–0.20 | ~$958/mo per 10K students (from investment doc) |
| AI Embeddings (RAG) | $0.002–0.005 | ~$20/mo per 10K students |
| Supabase compute (marginal) | $0.005–0.01 | Compute scales in steps, amortized |
| Supabase storage (marginal) | $0.001–0.003 | ~$0.021/GB, ~50MB/student/year |
| Supabase bandwidth | $0.002–0.005 | ~$0.09/GB, ~200MB/student/month |
| Email (Resend) | $0.001–0.002 | ~2 emails/student/week, $0.001/email |
| **Total variable cost/student/month** | **$0.12–0.25** | |
| **Total variable cost/student/year** | **$1.44–3.00** | |

### 2.2 Fixed Costs Per Month (Regardless of Student Count)

| Cost Component | Monthly (USD) | Notes |
|---------------|--------------|-------|
| Supabase base plan | $25–599 | Pro ($25) → Team ($599) at 10+ institutions |
| Supabase compute add-on | $50–300 | Scales with concurrent users, not total users |
| Vercel Pro | $20–100 | CDN, mostly fixed |
| Sentry monitoring | $29–79 | Fixed |
| Dev tooling (Claude, GitHub, etc.) | $344 | Fixed regardless of users |
| Resend base plan | $20–90 | Mostly fixed |
| **Total fixed costs/month** | **$488–1,212** | Depends on scale tier |

### 2.3 Fully Loaded Cost Per Student (Fixed + Variable)

| Scale | Students | Fixed/mo | Variable/mo | Total Cost/mo | Cost/Student/Year | License/Student/Year | Gross Margin |
|-------|----------|----------|-------------|--------------|-------------------|---------------------|-------------|
| Pilot | 500 | $525 | $75 | $600 | $14.40 | $80 (at $40K) | **82%** |
| Early Growth | 2,000 | $810 | $300 | $1,110 | $6.66 | $45 (at $90K) | **85%** |
| Growth | 10,000 | $1,850 | $1,500 | $3,350 | $4.02 | $20 (at $200K) | **80%** |
| Scale | 30,000 | $3,300 | $4,500 | $7,800 | $3.12 | $16.67 (at $500K) | **81%** |

**The key insight: gross margins are 80–85% at every scale tier.** This is typical for SaaS. The variable cost per student ($1.44–3.00/year) is tiny compared to what we charge ($16–80/student/year).

---

## 3. UNIT ECONOMICS DEEP DIVE

### 3.1 Per-Institution P&L (Starter Tier — 500 Students)

| Line Item | Annual | Monthly |
|-----------|--------|---------|
| **Revenue** | | |
| License fee | $40,000 | $3,333 |
| Implementation fee (amortized over 12 months) | $10,000 | $833 |
| **Total Revenue** | **$50,000** | **$4,167** |
| | | |
| **Cost of Goods Sold (COGS)** | | |
| AI/LLM APIs (500 students) | $1,200 | $100 |
| AI Embeddings | $60 | $5 |
| Supabase marginal compute | $600 | $50 |
| Supabase storage/bandwidth | $120 | $10 |
| Email (Resend marginal) | $60 | $5 |
| **Total COGS** | **$2,040** | **$170** |
| | | |
| **Gross Profit** | **$47,960** | **$3,997** |
| **Gross Margin** | **95.9%** | |
| | | |
| **Operating Expenses (allocated per institution)** | | |
| Infrastructure fixed costs (allocated: 1/N institutions) | $6,300 | $525 |
| Dev tooling (allocated: 1/N institutions) | $4,128 | $344 |
| Onboarding labor (founder time, 40 hours at $0 salary) | $0 | $0 |
| Support (estimated 5 hours/month at $0 salary) | $0 | $0 |
| **Total OpEx** | **$10,428** | **$869** |
| | | |
| **Operating Profit (per institution)** | **$37,532** | **$3,128** |
| **Operating Margin** | **75.1%** | |

Note: Founder labor is at $0 because founders are not drawing salary in year 1. Once salaries are added, margins compress significantly (see Section 5).

### 3.2 Per-Institution P&L (Growth Tier — 2,000 Students)

| Line Item | Annual | Monthly |
|-----------|--------|---------|
| License fee | $90,000 | $7,500 |
| Implementation fee (amortized) | $20,000 | $1,667 |
| **Total Revenue** | **$110,000** | **$9,167** |
| Total COGS | $4,800 | $400 |
| **Gross Profit** | **$105,200** | **$8,767** |
| **Gross Margin** | **95.6%** | |
| OpEx (allocated, 1 of 3 institutions) | $5,476 | $456 |
| **Operating Profit** | **$99,724** | **$8,310** |
| **Operating Margin** | **90.7%** | |

### 3.3 Per-Institution P&L (Enterprise Tier — 10,000 Students, e.g., Qatar University)

| Line Item | Annual | Monthly |
|-----------|--------|---------|
| License fee | $200,000 | $16,667 |
| Implementation fee (amortized) | $40,000 | $3,333 |
| **Total Revenue** | **$240,000** | **$20,000** |
| Total COGS | $18,000 | $1,500 |
| **Gross Profit** | **$222,000** | **$18,500** |
| **Gross Margin** | **92.5%** | |
| OpEx (allocated, 1 of 10 institutions) | $2,210 | $184 |
| **Operating Profit** | **$219,790** | **$18,316** |
| **Operating Margin** | **91.6%** | |

---

## 4. COMPANY-LEVEL P&L PROJECTIONS

### 4.1 Year 1 (Q4 2026 — 1 Pilot Institution, Discounted)

| Line Item | Annual |
|-----------|--------|
| Revenue: 1 institution at $30K (discounted pilot) + $10K implementation | $40,000 |
| COGS (500 students, AI + infra variable) | ($2,040) |
| **Gross Profit** | **$37,960** |
| Infrastructure fixed costs | ($6,300) |
| Dev tooling | ($4,128) |
| Founder salaries | $0 (not drawing) |
| Qatar office/legal (reimbursed by Bridge) | $0 (net) |
| **Net Profit (Year 1, partial year)** | **$27,532** |

This is misleading because it excludes founder compensation. See Section 5.

### 4.2 Year 2 (2027 — 3–5 Institutions)

**Conservative scenario: 3 institutions**

| Line Item | Annual |
|-----------|--------|
| Revenue: 1 Starter ($40K) + 1 Growth ($75K) + 1 Growth ($75K) + implementation fees ($50K) | $240,000 |
| COGS (4,500 students total) | ($9,000) |
| **Gross Profit** | **$231,000** |
| Infrastructure (Growth tier) | ($22,000) |
| Dev tooling | ($4,128) |
| Founder salaries (2 founders at $24K/year each — minimal Qatar living) | ($48,000) |
| Sales/marketing (conferences, travel) | ($10,000) |
| Legal/accounting (QFC compliance) | ($8,000) |
| **Net Profit (Year 2)** | **$138,872** |
| **Net Margin** | **57.9%** |

**Optimistic scenario: 5 institutions**

| Line Item | Annual |
|-----------|--------|
| Revenue: 2 Starter + 2 Growth + 1 Enterprise + implementation | $500,000 |
| COGS (12,000 students) | ($24,000) |
| **Gross Profit** | **$476,000** |
| Infrastructure (Growth tier) | ($24,000) |
| Dev tooling | ($4,128) |
| Founder salaries (2 at $36K/year — still modest) | ($72,000) |
| First hire (junior engineer, $30K/year Qatar) | ($30,000) |
| Sales/marketing | ($20,000) |
| Legal/accounting | ($10,000) |
| **Net Profit (Year 2, optimistic)** | **$315,872** |
| **Net Margin** | **63.2%** |

### 4.3 Year 3 (2028 — 10+ Institutions, GCC Expansion)

| Line Item | Annual |
|-----------|--------|
| Revenue: 10 institutions (blended $120K avg) | $1,200,000 |
| COGS (25,000 students) | ($60,000) |
| **Gross Profit** | **$1,140,000** |
| Infrastructure (Scale tier) | ($40,000) |
| Dev tooling | ($4,128) |
| Team (2 founders + 3 engineers + 1 sales + 1 support) | ($350,000) |
| Office/legal | ($30,000) |
| Sales/marketing | ($50,000) |
| **Net Profit (Year 3)** | **$665,872** |
| **Net Margin** | **55.5%** |

---

## 5. CONSTRUCTIVE CRITICISM — What's Wrong With These Numbers

### 5.1 The Founder Salary Problem

The Year 1 P&L looks great because founders aren't drawing salary. This is unsustainable. If we add even modest founder compensation ($2,000/month each = $48K/year total), the Year 1 picture changes:

| Scenario | Revenue | Costs (incl. salaries) | Net |
|----------|---------|----------------------|-----|
| Year 1 with $0 salary | $40,000 | $12,468 | +$27,532 |
| Year 1 with $48K salary | $40,000 | $60,468 | **-$20,468** |

With founder salaries, Year 1 is cash-flow negative. The business only becomes self-sustaining at 2+ institutions. This is fine for a startup, but we need to be honest about it internally.

### 5.2 The AI Cost Uncertainty

Our AI cost estimates ($0.10–0.20/student/month) assume current GPT-4o pricing via OpenRouter. Three risks:

1. **Usage could be higher than estimated.** We assumed moderate AI usage (at-risk predictions weekly, feedback drafts per assignment, adaptive quizzes monthly). If students use the AI Tutor heavily (50 messages/day), costs could 3–5x.
2. **Pricing could change.** OpenRouter/OpenAI can change pricing at any time. A 2x price increase doubles our COGS.
3. **We haven't tested at scale.** Our token estimates are based on pilot-scale projections, not actual production data. Real usage patterns could differ significantly.

**Mitigation:** Use DeepSeek for routine queries (80–90% cheaper), implement aggressive caching, enforce rate limits (50 messages/day per student), and monitor cost per student weekly.

### 5.3 The Pricing Is Not Validated

The $30K–250K range is based on value-based reasoning and competitor benchmarking, not actual sales conversations. Real risks:

1. **Qatar universities may negotiate aggressively.** Government procurement often demands 30–50% discounts from list price.
2. **The pilot-to-paid conversion is unproven.** We assume a free pilot converts to a paid contract. If the pilot institution says "great product, but we need 6 more months free," our revenue timeline slips.
3. **Implementation fees may face resistance.** Universities may expect setup to be included in the license. If we waive the $10–40K implementation fee, Year 1 revenue drops to $30K.
4. **Per-student pricing may not work for small institutions.** A 300-student branch campus (Carnegie Mellon Qatar) paying $30K = $100/student. That's expensive compared to Canvas at $30/student. We need a compelling value story for small institutions.

### 5.4 The Single-Customer Concentration Risk

With 1 institution in Year 1, we have 100% customer concentration. If that institution churns (new admin, budget cuts, accreditation body changes requirements), revenue goes to zero. This is the biggest business risk in Year 1.

**Mitigation:** Sign the second institution before the first contract renews. Target 3 institutions by end of Year 1 to reduce concentration below 50%.

### 5.5 The Support Cost Is Hidden

We're assuming founders handle all support. At 1 institution with 500 students, this is manageable (maybe 5–10 hours/week). At 5 institutions with 5,000 students, support becomes a full-time job. We need to budget for a support hire by institution #4.

Estimated support cost trajectory:

| Institutions | Students | Support Hours/Week | Cost |
|-------------|----------|-------------------|------|
| 1 | 500 | 5–10 | $0 (founders) |
| 3 | 3,000 | 15–25 | $0 (founders, but strained) |
| 5 | 5,000 | 30–40 | $30K/year (dedicated hire needed) |
| 10 | 15,000 | 60+ | $60K/year (2 support staff) |

### 5.6 The Implementation Cost Is Underestimated

We're charging $10–40K for implementation but assuming it takes 40 hours of founder time. In reality:

- Initial setup: 10 hours
- Teacher training: 8 hours (2-hour workshop × 4 sessions)
- Ongoing check-ins during pilot: 10 hours
- Pilot results presentation: 5 hours
- Data migration/CSV import support: 5 hours
- Troubleshooting/bug fixes during pilot: 10–20 hours
- **Total: 48–58 hours per institution**

At $0 founder salary this is "free." At a loaded cost of $50/hour (what we'd pay a contractor), implementation costs $2,400–2,900. The $10K implementation fee covers this with healthy margin, but only if we don't scope-creep into custom development.

### 5.7 The Feature Surface Area vs. Revenue Problem

We have 17+ feature modules, 25+ Edge Functions, 30+ database tables. This is an enormous amount of code to maintain for a 2-person team. Every bug fix, security patch, and feature request competes for the same limited engineering hours.

The honest question: **Are we building a $250K/year product or a $50K/year product with $250K worth of features?** If institutions only use 30% of our features (OBE core + basic gamification), we've over-invested in the other 70%.

**Recommendation:** Track feature usage from day 1. If the AI Tutor, team challenges, and XP marketplace see <10% adoption, consider deprecating them and focusing engineering time on what institutions actually use.

### 5.8 The Qatar Market Size Ceiling

Qatar has 12 universities and approximately 30 technical colleges. If we capture 50% of the university market (6 institutions) at an average $100K/year, that's $600K ARR. That's a good business, but it's not a venture-scale outcome.

To reach $5M+ ARR, we need to expand beyond Qatar:
- Saudi Arabia (50+ universities, much larger market)
- UAE (30+ universities)
- Bahrain, Kuwait, Oman
- Pakistan (200+ universities, lower price point)

Each new country adds: localization costs, regulatory compliance, new accreditation body templates, and sales presence. This is not free.

### 5.9 The Discount Pressure on Pilot Institutions

Our GTM playbook says "free pilot, then convert to paid." But the pilot institution has leverage: they know we need them as a reference customer. They'll negotiate hard. Realistic scenario:

- List price: $40K/year (Starter)
- Pilot discount: 50% for Year 1 = $20K
- Implementation fee: waived ("we're your pilot partner")
- Year 1 actual revenue: $20K (not $50K)

At $20K revenue with $12K in costs (including modest founder salaries), Year 1 net is approximately $8K. That's survivable with the Bridge reimbursement runway, but it's not the $40K we modeled.

---

## 6. BREAKEVEN ANALYSIS

### 6.1 Monthly Breakeven (With Founder Salaries)

| Cost Component | Monthly |
|---------------|---------|
| Infrastructure (pilot tier) | $525 |
| Dev tooling | $344 |
| Founder salaries (2 × $2,000) | $4,000 |
| **Total monthly burn** | **$4,869** |

**Breakeven requires:** $4,869/month = $58,428/year in revenue = approximately 1.5 Starter institutions at list price, or 3 institutions at 50% pilot discount.

### 6.2 When Do We Actually Break Even?

| Scenario | Institutions Needed | Timeline |
|----------|-------------------|----------|
| List price, no discounts | 1.5 (round to 2) | Q1 2027 |
| 50% pilot discount on first, list on second | 2–3 | Q2 2027 |
| Heavy discounting on all early deals | 4–5 | Q3–Q4 2027 |

**Realistic breakeven: Q2 2027** (approximately 12 months from Qatar entry), assuming we close 2 paying institutions by then.

---

## 7. KEY METRICS TO TRACK FROM DAY 1

| Metric | Why It Matters | Target |
|--------|---------------|--------|
| Cost per student per month | Validates our unit economics | <$0.25 |
| AI cost per student per month | Biggest variable cost risk | <$0.15 |
| Feature adoption rate (per module) | Identifies over-investment | >30% for core, >10% for AI |
| Support hours per institution per month | Predicts when we need a hire | <10 hours |
| Pilot-to-paid conversion rate | Validates GTM model | >50% |
| Time from first contact to pilot start | Sales cycle efficiency | <6 weeks |
| Time from pilot end to signed contract | Conversion efficiency | <4 weeks |
| Net revenue retention | Expansion within institutions | >110% |
| Customer acquisition cost (CAC) | Founder time + travel + demos | <$5,000 per institution |
| Lifetime value (LTV) | License × expected tenure | >$150,000 (3+ years) |
| LTV:CAC ratio | Business health | >30:1 (very healthy for SaaS) |

---

## 8. PRICING RECOMMENDATIONS (INTERNAL)

### 8.1 What to Change Before Going Public

1. **Add a "Pilot" tier explicitly.** Don't make institutions negotiate a discount. Offer: "$15K for a 1-semester pilot (1 department, up to 500 students). Converts to Starter at $40K/year if continued." This sets expectations and avoids the "free pilot forever" trap.

2. **Bundle implementation into the license for Starter tier.** Small institutions won't pay $10K setup on top of $30K license. Make it: "$40K/year all-in for up to 500 students, includes onboarding." Absorb the implementation cost into the license margin (which is 95% — we can afford it).

3. **Create a per-student add-on for AI features.** Not all institutions want AI. Offer: "Core OBE + Gamification: $30/student/year. With AI Co-Pilot: $45/student/year." This lets price-sensitive institutions start cheaper and upgrade later.

4. **Set a minimum contract value.** Don't sell to a 100-student institution for $5K/year. Minimum deal size: $25K/year. Below that, the support cost exceeds the revenue.

### 8.2 Revised Pricing (Recommended)

| Tier | Students | Annual License | AI Add-On | Total with AI | Per-Student (with AI) |
|------|----------|---------------|-----------|--------------|----------------------|
| Pilot | Up to 500 | $15K (1 semester) | Included | $15K | $30 |
| Starter | Up to 500 | $35K | +$5K | $40K | $80 |
| Growth | 500–2,000 | $60K | +$15K | $75K | $37.50–75 |
| Enterprise | 2,000–5,000 | $100K | +$30K | $130K | $26–65 |
| Enterprise+ | 5,000+ | Custom | Custom | $150K–250K | $15–50 |

---

## 9. SUMMARY — The Honest Picture

**What's strong:**
- 80–95% gross margins at every scale tier — this is excellent SaaS economics
- Variable cost per student ($1.44–3.00/year) is negligible compared to revenue per student ($16–80/year)
- The product is built — no additional R&D needed to start selling
- Qatar market has real demand (OBE mandates, accreditation pressure)
- LTV:CAC ratio is potentially 30:1+ (very healthy)

**What's concerning:**
- Year 1 is cash-flow negative with founder salaries
- Pricing is unvalidated — first real negotiation will test our assumptions
- AI costs could surprise us at scale (especially AI Tutor)
- Single-customer concentration in Year 1 is a real risk
- Feature surface area is enormous for a 2-person team
- Qatar market ceiling is approximately $600K ARR — need GCC expansion for venture-scale
- Support costs are hidden and will force a hire by institution #4
- Pilot-to-paid conversion rate is the single most important unknown

**The bottom line:** The unit economics work. The question isn't "can we make money per institution?" (yes, easily). The question is "can we close institutions fast enough to cover our burn before the runway ends?" That's a sales execution problem, not an economics problem.

---

*Edeviser — April 2026 — INTERNAL ONLY*
