-- Task 11 (migration-history-reconciliation, Req 9.2): resolve ERROR security_definer_view.
-- Rebuild public.leaderboard_weekly to enforce the QUERYING user's RLS (security_invoker)
-- instead of the view owner's. Output shape (student_id, weekly_xp, rank) and the
-- leaderboard anonymity opt-out invariant are preserved: the view exposes no names,
-- and opt-out masking is applied by the consuming code / get_leaderboard* RPCs.
-- ALTER VIEW SET is non-destructive: it keeps the exact view body, columns, owner, and grants.
ALTER VIEW public.leaderboard_weekly SET (security_invoker = true);;
