## 2024-05-18 - [Missing Error Checks in Supabase Queries]
**Vulnerability:** Found multiple missing error checks in `src/hooks/useGradingStats.ts`. Queries were not checking the `error` object and were not throwing, silently swallowing potential data breaches or issues.
**Learning:** This is a common pattern in components or hooks that make multiple sequential queries. Developers forget to handle errors correctly for all queries.
**Prevention:** In the future, we should make sure that all queries are properly checked. We can also look to integrate an ESLint plugin specifically to catch unhandled error objects returned by `supabase`.
