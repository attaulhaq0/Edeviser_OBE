CREATE OR REPLACE FUNCTION get_xp_balance(p_student_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_earned INTEGER;
  v_spent INTEGER;
BEGIN
  SELECT COALESCE(SUM(xp_amount), 0) INTO v_earned
    FROM xp_transactions WHERE student_id = p_student_id;

  SELECT COALESCE(SUM(xp_cost), 0) INTO v_spent
    FROM xp_purchases WHERE student_id = p_student_id AND status != 'refunded';

  RETURN GREATEST(0, v_earned - v_spent);
END;
$$;;
