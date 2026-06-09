-- NO-OP (reconciled). This DDL referenced challenge_participants before that
-- table is CREATEd (20260720000003), so it is replay-unsafe at this position.
-- Real, correctly-ordered DDL lives in
-- 20260821000002_challenge_participants_student_self_join.sql. Version row
-- exists in production history; kept empty to align local set with recorded
-- history. See migration-history-reconciliation steering.
SELECT 1;
