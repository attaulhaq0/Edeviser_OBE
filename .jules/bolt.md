YYYY-MM-DD - Batching Supabase Queries for Admin Dashboard
Learning: In dashboard scenarios with multiple independent KPIs, sequential Supabase queries cause significant network latency waterfall.
Action: Use `Promise.all` to batch independent queries concurrently. This pattern was successfully applied to `useAdminKPIs`, `useOnboardingAnalytics`, and `useDepartmentAnalytics` reducing network roundtrips from O(N) to O(1) concurrent request.
