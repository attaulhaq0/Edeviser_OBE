-- =============================================================================
-- friendships — student peer connections (mutual friend request → accept)
-- =============================================================================
--
-- Adds an opt-in social graph for students, adapted from Duolingo's friends
-- model for an education context: connections are MUTUAL (a request the other
-- student must accept) and scoped to the SAME INSTITUTION (privacy/safety — no
-- cross-institution discovery). Powers the student Friends page, the dashboard
-- "Friends online" rail, and a friends-scoped leaderboard.
--
-- One row per (requester, addressee) direction. status: pending → accepted |
-- declined. Presence ("online") is derived client-side from profiles.last_seen_at
-- (no new column). Reads of a friend's name/avatar/gamification rely on the
-- existing same-institution SELECT policies on profiles / student_gamification
-- (the leaderboard already reads those), so this migration adds NO read exposure
-- beyond the friendship rows themselves.
--
-- Writes are funnelled through two SECURITY DEFINER, fail-closed RPCs
-- (send_friend_request / respond_friend_request) — modelled on send_teacher_nudge
-- — so the cross-user notification insert (forbidden to clients by
-- notifications_own RLS) and all validation happen server-side. There is
-- deliberately NO INSERT/UPDATE RLS policy: direct client writes are denied and
-- must go through the RPCs; only SELECT (own rows) and DELETE (unfriend, own
-- rows) are client-accessible. Replay-safe: table → indexes → RLS → functions,
-- and every referenced object (profiles, notifications, auth_institution_id) is
-- created by an earlier migration.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  institution_id uuid NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  responded_at timestamptz,
  CONSTRAINT friendships_status_chk
    CHECK (status IN ('pending', 'accepted', 'declined')),
  CONSTRAINT friendships_no_self CHECK (requester_id <> addressee_id),
  UNIQUE (requester_id, addressee_id)
);

COMMENT ON TABLE public.friendships IS
  'Student peer connections (mutual request→accept), institution-scoped. Writes go through send_friend_request / respond_friend_request SECURITY DEFINER RPCs; clients may SELECT and DELETE only their own rows.';

CREATE INDEX IF NOT EXISTS idx_friendships_requester
  ON public.friendships (requester_id, status);
CREATE INDEX IF NOT EXISTS idx_friendships_addressee
  ON public.friendships (addressee_id, status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- SELECT: either party sees their own relationship rows (pending or accepted).
CREATE POLICY "friendships_select_own" ON public.friendships
  FOR SELECT TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- DELETE: either party may remove the relationship (unfriend / withdraw).
CREATE POLICY "friendships_delete_own" ON public.friendships
  FOR DELETE TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- NOTE: no INSERT/UPDATE policy — those paths are the RPCs below (fail-closed).

-- ─── send_friend_request ─────────────────────────────────────────────────────
-- Creates a pending request from the caller to p_addressee_id (same institution,
-- both students). If the addressee already sent the caller a pending request,
-- that reverse request is accepted instead (mutual intent). Notifies the
-- addressee. Fail-closed: validates institution + role + self + duplicates.
CREATE OR REPLACE FUNCTION public.send_friend_request(p_addressee_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_inst uuid;
  v_addressee_inst uuid;
  v_addressee_role text;
  v_reverse_id uuid;
  v_id uuid;
  v_name text;
BEGIN
  IF v_me IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = '42501';
  END IF;
  IF p_addressee_id = v_me THEN
    RAISE EXCEPTION 'cannot friend yourself' USING ERRCODE = '22023';
  END IF;

  SELECT institution_id, full_name INTO v_inst, v_name
  FROM public.profiles WHERE id = v_me;

  SELECT institution_id, role::text INTO v_addressee_inst, v_addressee_role
  FROM public.profiles WHERE id = p_addressee_id;

  IF v_addressee_inst IS NULL THEN
    RAISE EXCEPTION 'user not found' USING ERRCODE = '42501';
  END IF;
  IF v_addressee_inst <> v_inst THEN
    RAISE EXCEPTION 'unauthorized: different institution' USING ERRCODE = '42501';
  END IF;
  IF v_addressee_role <> 'student' THEN
    RAISE EXCEPTION 'friends must be students' USING ERRCODE = '22023';
  END IF;

  -- Already connected in the forward direction? no-op-safe error.
  IF EXISTS (
    SELECT 1 FROM public.friendships
    WHERE requester_id = v_me AND addressee_id = p_addressee_id
  ) THEN
    RAISE EXCEPTION 'request already exists' USING ERRCODE = '23505';
  END IF;

  -- Reverse pending request exists → accept it (mutual intent) instead of a dup.
  SELECT id INTO v_reverse_id FROM public.friendships
  WHERE requester_id = p_addressee_id AND addressee_id = v_me
    AND status = 'pending';
  IF v_reverse_id IS NOT NULL THEN
    UPDATE public.friendships
    SET status = 'accepted', responded_at = now()
    WHERE id = v_reverse_id;
    INSERT INTO public.notifications (user_id, type, title, body, is_read)
    VALUES (p_addressee_id, 'friend_accept',
            'Friend request accepted',
            COALESCE(v_name, 'A classmate') || ' is now your friend', false);
    RETURN v_reverse_id;
  END IF;

  INSERT INTO public.friendships (requester_id, addressee_id, institution_id, status)
  VALUES (v_me, p_addressee_id, v_inst, 'pending')
  RETURNING id INTO v_id;

  INSERT INTO public.notifications (user_id, type, title, body, is_read)
  VALUES (p_addressee_id, 'friend_request',
          'New friend request',
          COALESCE(v_name, 'A classmate') || ' wants to connect', false);

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_friend_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.send_friend_request(uuid) TO authenticated;

-- ─── respond_friend_request ──────────────────────────────────────────────────
-- The addressee accepts (p_accept=true) or declines a pending request. On
-- accept, notifies the requester. Fail-closed: only the addressee of a PENDING
-- row may respond.
CREATE OR REPLACE FUNCTION public.respond_friend_request(
  p_friendship_id uuid,
  p_accept boolean
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_me uuid := (SELECT auth.uid());
  v_requester uuid;
  v_name text;
BEGIN
  SELECT requester_id INTO v_requester
  FROM public.friendships
  WHERE id = p_friendship_id
    AND addressee_id = v_me
    AND status = 'pending';

  IF v_requester IS NULL THEN
    RAISE EXCEPTION 'no pending request to respond to' USING ERRCODE = '42501';
  END IF;

  UPDATE public.friendships
  SET status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END,
      responded_at = now()
  WHERE id = p_friendship_id;

  IF p_accept THEN
    SELECT full_name INTO v_name FROM public.profiles WHERE id = v_me;
    INSERT INTO public.notifications (user_id, type, title, body, is_read)
    VALUES (v_requester, 'friend_accept',
            'Friend request accepted',
            COALESCE(v_name, 'Your classmate') || ' accepted your friend request',
            false);
  END IF;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_friend_request(uuid, boolean) TO authenticated;
