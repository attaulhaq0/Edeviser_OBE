2024-04-13 - [Parallelize Multiple Queries in Dashboard Hooks]
Learning: TanStack query function sequential execution (using consecutive `await` statements) for retrieving multiple unrelated items severely degrades rendering time due to waterfall execution patterns. This was apparent in hooks like `useAdminDashboard.ts`.
Action: Always evaluate query hooks containing multiple sequential `await supabase.from()` operations that don't depend on each other, and refactor them to use `Promise.all` to fetch all prerequisites in parallel, substantially reducing execution time.
