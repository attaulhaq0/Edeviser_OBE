# Admin ILO Frontend/Backend Audit — verified 2026-08-21

## Present and verified

| Area | Finding |
|---|---|
| Routes | `/admin/outcomes`, `/admin/outcomes/new`, `/admin/outcomes/:id/edit` exist in `src/router/AppRouter.tsx` behind admin guards |
| Pages | `src/pages/admin/outcomes/ILOListPage.tsx`, `ILOForm.tsx` exist |
| Hooks | `useILOs` queries/mutates `learning_outcomes`; type='ILO' scoping present |
| Type guard | e2e/intelligence-chain.spec.ts asserts editing a PLO/CLO ID through the ILO route is blocked ("Forbidden"/"Not found") — matches RLS UPDATE policy (type='ILO' USING+WITH CHECK) |
| Delete guard | DB-level `trg_guard_mapped_outcome_delete` blocks deletion with dependencies regardless of frontend |
| Audit logging | audit logger exists for outcome mutations (auditLogger.ts; G.1-protected) |

## To verify/certify (open items)

1. **Reorder safety (PDF §13):** confirm the reorder operation is an atomic validated RPC or equivalent — no partial upsert accepting arbitrary IDs; failure leaves ordering intact. Add e2e if gaps found. *(task 1.8)*
2. **Delete dependency direction:** confirm the frontend dependency check resolves mapped PLOs via canonical direction (source=ILO). *(task 1.8)*
3. **UX completeness (PDF §14):** mapping count, mapped-program count, attainment trend, evidence count, deletion impact preview, audit-history link — verify each renders real data; fill gaps.
4. **Duplicate-title policy:** define/document behavior (block vs warn) in the form schema.
5. **Coordinator ownership text:** add "Institutional Learning Outcomes are managed by the institution Admin" to coordinator outcomes UI *(task 5.x)*.

## Verdict

Do NOT rebuild — audit, test, repair (per PDF §5/§13). The backend RLS already guarantees the
security properties even where the frontend needs polish.