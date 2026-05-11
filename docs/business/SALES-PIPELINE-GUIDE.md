# Edeviser Sales Pipeline — Stages & Usage Guide

## Pipeline Stages

| Stage                | Code | Description                                   | Typical Duration | Exit Criteria                                     |
| -------------------- | ---- | --------------------------------------------- | ---------------- | ------------------------------------------------- |
| Lead Identified      | 1    | Institution identified as potential customer  | Ongoing          | Contact person identified                         |
| Initial Outreach     | 2    | First email/call/meeting made                 | 1–2 weeks        | Response received                                 |
| Discovery Call       | 3    | Needs assessment meeting completed            | 1–2 weeks        | Pain points documented, decision-maker identified |
| Demo Scheduled       | 4    | Product demo date confirmed                   | 1–2 weeks        | Demo date set with stakeholders                   |
| Demo Completed       | 5    | Live demo delivered to stakeholders           | 1 day            | Feedback collected, interest confirmed            |
| Pilot Proposed       | 6    | Pilot terms shared (scope, duration, pricing) | 1–2 weeks        | Pilot proposal accepted                           |
| Pilot Active         | 7    | Pilot deployment running at institution       | 2–3 months       | Pilot success metrics met                         |
| Contract Negotiation | 8    | Pricing and terms being finalized             | 2–4 weeks        | Contract draft agreed                             |
| Contract Signed      | 9    | Deal closed, contract executed                | 1–2 weeks        | Signed agreement received                         |
| Lost / On Hold       | 0    | Deal did not proceed or paused                | —                | Reason documented                                 |

## How to Use the CSV

1. Open Google Sheets or Excel
2. File > Import > Upload the `edeviser-sales-pipeline.csv`
3. The sheet is pre-populated with 12 Qatar institutions
4. Fill in contact details as you identify them
5. Update the Stage column as deals progress
6. Probability % auto-suggests weighted pipeline value

## Column Definitions

- Institution Name: University or college name
- Type: Public University, Private University, Branch Campus, Technical College
- Est. Students: Approximate student enrollment (for tier sizing)
- Stage: Current pipeline stage (1–9, 0 for lost)
- Deal Value: Annual license estimate based on tier
- Tier: Starter (up to 500), Growth (500–2K), Enterprise (2K+)
- Priority: High (top 3 targets), Medium (next wave), Low (long-term)
- Probability %: Likelihood of closing (increases with stage progression)
- Weighted Value: Deal Value x Probability (for pipeline forecasting)
- Accreditation Body: Which accreditation standard they follow (relevant for template customization)

## Suggested Priority Targets for Qatar

1. Qatar University — largest public university, CNA-Q accredited, highest impact pilot
2. University of Doha for Science and Technology — strong OBE mandate, technical programs
3. Hamad Bin Khalifa University — Education City flagship, QAA accredited, innovation-focused

## Pipeline Health Metrics to Track

- Total pipeline value (sum of all weighted values)
- Number of deals per stage (identify bottlenecks)
- Average time in each stage (identify slow stages)
- Win rate (contracts signed / demos completed)
- Average deal size (for revenue forecasting)
