2024-04-21 - Parallelizing Dashboard Queries
Learning: Sequential `await supabase` calls in TanStack Query `queryFn` hooks (like `useAdminKPIs`) create unnecessary network waterfalls. Action: Always use `Promise.all` for multiple independent database queries within the same hook.
