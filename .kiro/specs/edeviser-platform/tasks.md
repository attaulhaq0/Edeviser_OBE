# Implementation Plan: Edeviser Platform (MVP / Phase 1)

## Overview

Incremental implementation of the Edeviser platform MVP covering authentication, RBAC, role-aware routing, session management, admin user provisioning, bulk user import, and ILO management. Tasks are ordered foundation-first: shared utilities and schemas, then auth/session, then routing, then admin features (users, bulk import, ILOs), then integration wiring. All code is TypeScript with React 18, Vite, Supabase, TanStack Query, and Shadcn/ui.

## Tasks

- [ ] 1. Set up foundation: Supabase client, Zod schemas, and Audit Logger
  - [-] 1.1 Create Supabase client singleton (`/src/lib/supabase.ts`)
    - Initialize `createClient` with env vars `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
    - Export typed `supabase` client instance
    - _Requirements: 1.1, 2.1_

  - [~] 1.2 Create Zod validation schemas (`/src/lib/schemas/`)
    - Create `auth.ts` with `loginSchema` (email + password min 8 chars)
    - Create `user.ts` with `createUserSchema` and `updateUserSchema`
    - Create `ilo.ts` with `createILOSchema` and `reorderSchema`
    - Create `bulkImport.ts` with `csvRowSchema`
    - _Requirements: 1.4, 5.1, 6.1, 7.1_

  - [~] 1.3 Write property test for password minimum length enforcement
    - **Property 3: Password minimum length enforcement**
    - Test that any string < 8 chars is rejected by `loginSchema` and any string ≥ 8 chars passes the length check
    - **Validates: Requirements 1.4**

  - [~] 1.4 Create Audit Logger service (`/src/lib/auditLogger.ts`)
    - Implement `logAuditEvent(entry: AuditLogEntry): Promise<void>` that inserts into `audit_logs` table
    - Define `AuditLogEntry` interface with `actor_id`, `action`, `target_type`, `target_id`, `diff`, `ip_address`
    - _Requirements: 5.3, 7.5_

  - [~] 1.5 Create TanStack Query key factory (`/src/lib/queryKeys.ts`)
    - Define hierarchical query keys for `users`, `ilos`, and `auditLogs` as specified in design
    - _Requirements: 5.5, 7.1_

- [ ] 2. Implement AuthProvider and authentication flow
  - [~] 2.1 Create AuthProvider context and `useAuth()` hook (`/src/providers/AuthProvider.tsx`)
    - Implement `AuthContextValue` interface: `user`, `profile`, `role`, `institutionId`, `isLoading`, `signIn`, `signOut`
    - Call `supabase.auth.signInWithPassword()` in `signIn`
    - Fetch user profile from `profiles` table after successful auth
    - Listen to `onAuthStateChange` for session refresh events
    - Track failed login attempts per session (client-side counter)
    - _Requirements: 1.1, 1.2, 1.3, 1.5, 4.1, 4.2_

  - [~] 2.2 Implement login attempt tracking and account lockout
    - After 5 consecutive failed attempts, lock account for 15 minutes
    - Log lockout event to Audit Logger
    - Display generic "Invalid email or password" message on any credential failure
    - Display lockout message with remaining time when account is locked
    - _Requirements: 1.2, 1.3_

  - [~] 2.3 Implement session persistence and auto-refresh
    - Persist sessions across browser refreshes via Supabase automatic token refresh
    - Auto-refresh JWT before expiration without user intervention
    - Expire session after 8 hours idle, redirect to `/login`
    - Enforce 24-hour max session duration
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [~] 2.4 Implement auth error handling and retry logic
    - On Supabase Auth unreachable: display "Unable to connect. Retrying..." and retry once after 2 seconds
    - On continued failure: display "Service temporarily unavailable"
    - On session expiry: redirect to `/login` with return URL preserved
    - _Requirements: 1.5_

  - [~] 2.5 Create Login page (`/src/pages/LoginPage.tsx`)
    - Form with email and password fields using React Hook Form + Zod `loginSchema`
    - Display validation errors, generic auth errors, lockout messages
    - Redirect to `/{role}` dashboard on successful login
    - If already authenticated, redirect to `/{role}` dashboard
    - _Requirements: 1.1, 1.3, 1.4, 3.1_

  - [~] 2.6 Write property tests for authentication (Properties 1-2)
    - **Property 1: Valid credentials produce a valid session**
    - Test that for any registered user with valid credentials, `signIn` returns a session with matching `role` and `institution_id`
    - **Validates: Requirements 1.1**
    - **Property 2: Generic error message on invalid credentials**
    - Test that for any invalid credential combination, the error message is identical regardless of which field was wrong
    - **Validates: Requirements 1.3**

- [ ] 3. Implement AppRouter with role-based route guards
  - [~] 3.1 Create RouteGuard component (`/src/router/RouteGuard.tsx`)
    - Accept `allowedRoles` prop
    - Redirect unauthenticated users to `/login`
    - Redirect users with wrong role to `/{user.role}` with "Access Denied" toast
    - _Requirements: 3.2, 3.3_

  - [~] 3.2 Create AppRouter with route configuration (`/src/router/AppRouter.tsx`)
    - Define route structure: `/login` (public), `/admin/*`, `/coordinator/*`, `/teacher/*`, `/student/*` (protected)
    - Wrap protected routes with `RouteGuard` and appropriate `allowedRoles`
    - Implement post-login redirect to `/{role}` within 500ms of auth resolution
    - _Requirements: 3.1, 3.2, 3.3_

  - [~] 3.3 Write property tests for routing (Properties 6-8)
    - **Property 6: Role-to-dashboard redirect mapping**
    - Test that for any role R, post-login redirect path is `/{R}`
    - **Validates: Requirements 3.1**
    - **Property 7: Cross-role navigation denied**
    - Test that for any user with role X navigating to `/{Y}` where Y ≠ X, redirect goes to `/{X}`
    - **Validates: Requirements 3.2**
    - **Property 8: Unauthenticated access redirects to login**
    - Test that for any protected route and unauthenticated session, navigation redirects to `/login`
    - **Validates: Requirements 3.3**

- [~] 4. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement Admin User Management module
  - [~] 5.1 Create user management TanStack Query hooks (`/src/hooks/useUsers.ts`)
    - `useUsers(options: UseUsersOptions)` — list users with role filter, search, pagination
    - `useCreateUser()` — insert into `profiles` with admin's `institution_id`, log to audit
    - `useUpdateUser()` — update profile fields, log role changes to audit with before/after values
    - `useSoftDeleteUser()` — set `is_active = false`, log to audit
    - All queries scoped to admin's institution via RLS
    - _Requirements: 5.1, 5.2, 5.3, 5.5_

  - [~] 5.2 Create User List page (`/src/pages/admin/users/UserListPage.tsx`)
    - Display all users within admin's institution in a table
    - Role filter dropdown and name/email search input
    - Pagination controls
    - Disable edit/delete actions on the admin's own row (self-protection)
    - _Requirements: 5.4, 5.5_

  - [~] 5.3 Create User Create/Edit forms (`/src/pages/admin/users/UserForm.tsx`)
    - Form using React Hook Form + Zod `createUserSchema` / `updateUserSchema`
    - Fields: email, full_name, role dropdown, optional program_id
    - Display validation errors and API errors via toast
    - _Requirements: 5.1_

  - [~] 5.4 Implement soft-delete confirmation dialog
    - Confirmation dialog before soft-delete
    - Explain that historical data is preserved
    - Prevent admin from soft-deleting their own account
    - _Requirements: 5.2, 5.4_

  - [~] 5.5 Write property tests for user management (Properties 9-12)
    - **Property 9: User creation round-trip**
    - Test that for any valid `CreateUserPayload`, the created profile matches the payload and admin's `institution_id`
    - **Validates: Requirements 5.1**
    - **Property 10: Soft-delete preserves historical data**
    - Test that soft-deleting a user does not change evidence/grade record counts
    - **Validates: Requirements 5.2**
    - **Property 11: Admin self-modification prevention**
    - Test that any admin attempting to update their own role or soft-delete themselves is rejected
    - **Validates: Requirements 5.4**
    - **Property 12: User list institution scoping with filters**
    - Test that for any filter/search combination, all returned users belong to admin's institution and match filters
    - **Validates: Requirements 5.5**

  - [~] 5.6 Write unit tests for user management
    - Test duplicate email error handling
    - Test self-modification prevention UI behavior
    - Test role filter and search query combinations
    - _Requirements: 5.1, 5.4, 5.5_

- [ ] 6. Implement Bulk User Import module
  - [~] 6.1 Create Bulk Import UI (`/src/pages/admin/users/BulkImport.tsx`)
    - File upload input accepting `.csv` files only
    - Client-side validation: file type check, file size < 5MB
    - Display upload progress and results (`BulkImportResult`)
    - Show per-row error list with row numbers, field names, and error descriptions
    - _Requirements: 6.1, 6.2_

  - [~] 6.2 Create Bulk Import Edge Function (`/supabase/functions/bulk-import-users/`)
    - Parse CSV from FormData
    - Validate each row against `csvRowSchema`: email format, full_name non-empty, valid role, program_id exists
    - Reject upload if > 1000 rows with descriptive message
    - Create valid users atomically (transaction) — if any row fails, roll back all
    - Send invitation emails to created users
    - Return `BulkImportResult` with `total_rows`, `created`, `failed`, `errors`
    - _Requirements: 6.1, 6.2, 6.3, 6.4_

  - [~] 6.3 Write property tests for bulk import (Properties 13-14)
    - **Property 13: CSV row validation produces correct errors**
    - Test that for any CSV row with invalid data, validation rejects it with correct row number and field reference
    - **Validates: Requirements 6.1, 6.2**
    - **Property 14: Valid CSV rows create users atomically**
    - Test that for any valid CSV within limits, all users are created; if any fails, none persist
    - **Validates: Requirements 6.3**

  - [~] 6.4 Write unit tests for bulk import edge cases
    - Test CSV with exactly 1000 rows (accepted) vs 1001 rows (rejected)
    - Test file > 5MB rejection
    - Test non-CSV file rejection
    - Test duplicate email within CSV
    - _Requirements: 6.1, 6.2, 6.4_

- [~] 7. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 8. Implement ILO Management module
  - [~] 8.1 Create ILO TanStack Query hooks (`/src/hooks/useILOs.ts`)
    - `useILOs(institutionId)` — list ILOs ordered by `sort_order`
    - `useCreateILO()` — insert with `type = 'ILO'`, admin's `institution_id`, log to audit
    - `useUpdateILO()` — update title/description, log to audit with before/after
    - `useDeleteILO()` — check `outcome_mappings` for dependencies, block if mapped PLOs exist, log to audit
    - `useReorderILOs()` — batch update `sort_order` values
    - `useILODependencies(id)` — fetch mapped PLOs for deletion check
    - _Requirements: 7.1, 7.2, 7.3, 7.5_

  - [~] 8.2 Create ILO List page (`/src/pages/admin/outcomes/ILOListPage.tsx`)
    - Display ILOs in a sortable list with drag-and-drop reorder
    - Show warning banner when ILO count reaches institution's `max_ilos` soft limit
    - Each ILO row shows title, description preview, edit/delete actions
    - _Requirements: 7.1, 7.3, 7.4_

  - [~] 8.3 Create ILO Create/Edit form (`/src/pages/admin/outcomes/ILOForm.tsx`)
    - Form using React Hook Form + Zod `createILOSchema`
    - Fields: title (max 255 chars), description (optional)
    - Display validation errors
    - _Requirements: 7.1_

  - [~] 8.4 Implement ILO deletion with dependency check
    - Before delete, query `outcome_mappings` for PLOs mapped to the ILO
    - If dependencies exist, show dialog listing dependent PLOs and block deletion
    - If no dependencies, confirm and delete with audit log
    - _Requirements: 7.2, 7.5_

  - [~] 8.5 Write property tests for ILO management (Properties 15-17)
    - **Property 15: ILO creation round-trip**
    - Test that for any valid ILO payload, the created record has `type = 'ILO'`, matching title/description, and admin's `institution_id`
    - **Validates: Requirements 7.1**
    - **Property 16: ILO deletion blocked by dependent PLOs**
    - Test that ILOs with mapped PLOs cannot be deleted and return dependent PLO list; ILOs with no mappings can be deleted
    - **Validates: Requirements 7.2**
    - **Property 17: ILO reorder consistency**
    - Test that for any permutation of sort orders, after reorder all `sort_order` values are unique and in the specified order
    - **Validates: Requirements 7.3**

  - [~] 8.6 Write unit tests for ILO management edge cases
    - Test title at exactly 255 characters (accepted) vs 256 (rejected)
    - Test ILO count at soft limit shows warning
    - Test concurrent reorder conflict handling
    - _Requirements: 7.1, 7.3, 7.4_

- [ ] 9. Implement RBAC enforcement and audit logging integration
  - [~] 9.1 Verify RLS policies are applied on all tables
    - Ensure `profiles`, `learning_outcomes`, `outcome_mappings`, `audit_logs` have correct RLS policies
    - Admin: read/write within institution; Coordinator: PLOs + ILOs; Teacher: CLOs; Student: no ILO access
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [~] 9.2 Write property tests for RBAC (Properties 4-5)
    - **Property 4: Role-based data scoping for learning outcomes**
    - Test that each role receives only the appropriate subset of learning outcomes
    - **Validates: Requirements 2.2, 2.3, 2.4, 2.5**
    - **Property 5: Admin institution data isolation**
    - Test that for any admin query, all returned records match the admin's `institution_id`
    - **Validates: Requirements 2.5**

  - [~] 9.3 Write property test for audit logging (Property 18)
    - **Property 18: Admin mutations produce audit logs**
    - Test that for any admin mutation on `profiles` or `learning_outcomes`, an `audit_logs` record is created with correct `action`, `target_type`, `target_id`, and accurate before/after diff
    - **Validates: Requirements 5.3, 7.5**

- [ ] 10. Wire all components together and finalize App shell
  - [~] 10.1 Create App shell (`/src/App.tsx`)
    - Wrap app in `AuthProvider`, `QueryClientProvider`, `BrowserRouter`
    - Render `AppRouter` as main content
    - Set up global toast provider (Shadcn/ui Toaster)
    - _Requirements: 1.1, 3.1, 4.1_

  - [~] 10.2 Wire admin dashboard layout and navigation
    - Create admin layout with sidebar navigation: Users, Bulk Import, ILOs
    - Connect all admin pages to router: `/admin/users`, `/admin/users/import`, `/admin/outcomes`
    - _Requirements: 5.1, 6.1, 7.1_

  - [~] 10.3 Create placeholder dashboard pages for non-admin roles
    - Create minimal `/coordinator`, `/teacher`, `/student` dashboard pages
    - Each shows role name and basic welcome message
    - _Requirements: 3.1_

- [~] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document (18 properties total)
- Unit tests validate specific examples and edge cases
- All property tests use fast-check with Vitest, minimum 100 iterations per property
