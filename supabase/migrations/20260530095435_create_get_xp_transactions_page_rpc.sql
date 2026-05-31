-- get_xp_transactions_page
-- Source-level paginated, unified XP transaction history combining earnings
-- (xp_transactions) and non-refunded spending (xp_purchases). Returns one page
-- ordered by occurred_at DESC plus an exact total_count for the active filter.
--
-- Security model: STABLE / SECURITY INVOKER (the default). The function runs
-- under the caller's RLS, so a student can only ever read their own rows
-- (xp_transactions_student_read / xp_purchases_student_select). Passing another
-- student's id returns no rows. marketplace_items is restricted by RLS to active
-- items in the caller's institution; inactive items fall back to neutral labels.
--
-- Requirements: 33.1 (source-level pagination), 33.2 (load additional pages),
-- 33.3 (no silent truncation beyond a hardcoded limit).

CREATE OR REPLACE FUNCTION public.get_xp_transactions_page(
  p_student_id uuid,
  p_filter text,
  p_limit int,
  p_offset int
)
RETURNS TABLE (
  id text,
  kind text,
  amount int,
  label text,
  category text,
  occurred_at timestamptz,
  total_count bigint
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  WITH unioned AS (
    SELECT
      'earn-' || t.id::text                       AS id,
      'earning'                                    AS kind,
      t.xp_amount                                  AS amount,
      t.source                                     AS label,
      t.source                                     AS category,
      t.created_at                                 AS occurred_at
    FROM xp_transactions t
    WHERE t.student_id = p_student_id
      AND p_filter IN ('all', 'earnings')
    UNION ALL
    SELECT
      'spend-' || p.id::text                       AS id,
      'spending'                                    AS kind,
      p.xp_cost                                     AS amount,
      COALESCE(mi.name, 'Marketplace Purchase')     AS label,
      COALESCE(mi.category::text, 'purchase')       AS category,
      p.purchased_at                                AS occurred_at
    FROM xp_purchases p
    LEFT JOIN marketplace_items mi ON mi.id = p.item_id
    WHERE p.student_id = p_student_id
      AND p.status <> 'refunded'
      AND p_filter IN ('all', 'spending')
  ), counted AS (
    SELECT count(*) AS n FROM unioned
  )
  SELECT
    u.id,
    u.kind,
    u.amount,
    u.label,
    u.category,
    u.occurred_at,
    c.n AS total_count
  FROM unioned u
  CROSS JOIN counted c
  ORDER BY u.occurred_at DESC, u.id DESC
  LIMIT p_limit OFFSET p_offset;
$$;

GRANT EXECUTE ON FUNCTION public.get_xp_transactions_page(uuid, text, int, int) TO authenticated;

COMMENT ON FUNCTION public.get_xp_transactions_page(uuid, text, int, int) IS
  'Paginated unified XP transaction history (earnings + non-refunded spending) ordered by occurred_at DESC with exact total_count. STABLE/SECURITY INVOKER so RLS restricts rows to the caller. Filter: all|earnings|spending. Requirements 33.1-33.3.';;
