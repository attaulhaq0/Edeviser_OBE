-- NO-OP (reconciled). Real, correctly-ordered DDL lives in
-- 20260821000004_fix_parent_rls_recursion_use_helper.sql, which is the final
-- recursion-safe definition of the parent read policies. Version row exists in
-- production history; kept empty to align local set with recorded history.
-- See migration-history-reconciliation steering.
SELECT 1;
