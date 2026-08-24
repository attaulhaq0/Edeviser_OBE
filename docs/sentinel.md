## 2024-05-18 - Missing Error Handlers on Supabase Inserts

**Vulnerability:** Several TanStack Query mutations (e.g., in `useDeadlineExtensions.ts`, `useClassDonations.ts`) execute Supabase queries such as `.insert()` or `.update()` without checking the `error` property of the response.
**Learning:** In Supabase, if an operation fails (like RLS violation or uniqueness constraint), the library returns an `error` object instead of throwing an exception. Without an explicit `if (error) throw error;`, the frontend silently ignores the failure and proceeds as if the operation succeeded. This could lead to data inconsistency or missed logic (like missing notifications, undetected validation failures).
**Prevention:** Always destructure `error` from any `await supabase` call and handle it, ideally throwing it so that TanStack Query can catch it, or logging it securely.
