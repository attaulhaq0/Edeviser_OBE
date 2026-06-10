-- NO-OP (reconciled). This version row exists in production history but its
-- DDL was mis-dated: it ran before challenge_participants / tutor tables and
-- would break a from-scratch replay. The real, correctly-ordered DDL now lives
-- in 20260821000000_add_parent_course_access_rls.sql (and the recursion-safe
-- final form in 20260821000004). This file is intentionally empty to keep the
-- local migration set aligned with the recorded history without re-running
-- replay-unsafe statements. See migration-history-reconciliation steering.
SELECT 1;
