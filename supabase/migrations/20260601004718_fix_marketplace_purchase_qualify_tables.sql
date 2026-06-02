CREATE OR REPLACE FUNCTION public.process_marketplace_purchase(p_student_id uuid, p_item_id uuid, p_institution_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
DECLARE
  v_balance INTEGER;
  v_item RECORD;
  v_student_level INTEGER;
  v_effective_price INTEGER;
  v_discount INTEGER;
  v_purchase_id UUID;
  v_existing_purchase_count INTEGER;
  v_current_freezes INTEGER;
BEGIN
  -- Lock student purchases to prevent concurrent double-spend
  PERFORM 1 FROM public.xp_purchases WHERE student_id = p_student_id FOR UPDATE;

  -- Compute XP balance: earned - spent (excluding refunded)
  SELECT COALESCE(
    (SELECT SUM(xp_amount) FROM public.xp_transactions WHERE student_id = p_student_id), 0
  ) - COALESCE(
    (SELECT SUM(xp_cost) FROM public.xp_purchases WHERE student_id = p_student_id AND status != 'refunded'), 0
  ) INTO v_balance;

  -- Fetch item (must be active and in the same institution)
  SELECT * INTO v_item FROM public.marketplace_items
    WHERE id = p_item_id AND institution_id = p_institution_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'ITEM_INACTIVE');
  END IF;

  -- Check level requirement
  SELECT COALESCE(level, 1) INTO v_student_level
    FROM public.student_gamification WHERE student_id = p_student_id;
  IF v_student_level < v_item.level_requirement THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'LEVEL_REQUIREMENT');
  END IF;

  -- Check stock availability
  IF v_item.stock_type = 'limited' AND v_item.stock_quantity <= 0 THEN
    RETURN jsonb_build_object('success', false, 'error_code', 'OUT_OF_STOCK');
  END IF;

  -- Check one_per_student ownership
  IF v_item.stock_type = 'one_per_student' THEN
    SELECT COUNT(*) INTO v_existing_purchase_count
      FROM public.xp_purchases
      WHERE student_id = p_student_id
        AND item_id = p_item_id
        AND status != 'refunded';
    IF v_existing_purchase_count > 0 THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'ALREADY_OWNED');
    END IF;
  END IF;

  -- Streak shield max 3 check
  IF v_item.sub_category::text = 'streak_shield' THEN
    SELECT COALESCE(streak_freezes_available, 0) INTO v_current_freezes
      FROM public.student_gamification WHERE student_id = p_student_id;
    IF v_current_freezes >= 3 THEN
      RETURN jsonb_build_object('success', false, 'error_code', 'MAX_INVENTORY');
    END IF;
  END IF;

  -- Resolve sale price (highest active discount wins)
  SELECT COALESCE(MAX(se.discount_percentage), 0) INTO v_discount
    FROM public.sale_event_items sei
    JOIN public.sale_events se ON se.id = sei.sale_event_id
    WHERE sei.item_id = p_item_id
      AND se.institution_id = p_institution_id
      AND se.start_date <= NOW()
      AND se.end_date > NOW();

  v_effective_price := GREATEST(1, v_item.xp_price - FLOOR(v_item.xp_price * v_discount / 100));

  -- Validate balance >= effective price
  IF v_balance < v_effective_price THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'INSUFFICIENT_BALANCE',
      'detail', jsonb_build_object('balance', v_balance, 'price', v_effective_price)
    );
  END IF;

  -- Insert xp_purchases record
  INSERT INTO public.xp_purchases (student_id, institution_id, item_id, xp_cost, status, purchased_at)
    VALUES (p_student_id, p_institution_id, p_item_id, v_effective_price, 'active', NOW())
    RETURNING id INTO v_purchase_id;

  -- Decrement stock if limited
  IF v_item.stock_type = 'limited' THEN
    UPDATE public.marketplace_items SET stock_quantity = stock_quantity - 1
      WHERE id = p_item_id AND stock_quantity > 0;
  END IF;

  -- Return success with purchase details
  RETURN jsonb_build_object(
    'success', true,
    'purchase_id', v_purchase_id,
    'xp_cost', v_effective_price,
    'new_balance', v_balance - v_effective_price,
    'item_category', v_item.category,
    'item_sub_category', v_item.sub_category
  );
END;
$function$;;
