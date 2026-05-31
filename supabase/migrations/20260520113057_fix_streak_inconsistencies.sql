-- L14-1 Fix: Reconcile streak_current with actual habit_tracking history
-- Recalculate streak as: number of consecutive days from last_login_date going backwards
-- Simple fix: cap streak_current at the number of distinct login days in habit_tracking
UPDATE student_gamification sg
SET streak_current = LEAST(
  sg.streak_current,
  COALESCE((SELECT count(DISTINCT habit_date) FROM habit_tracking ht WHERE ht.student_id = sg.student_id AND ht.login = true), 0)
)
WHERE sg.streak_current > 0
  AND sg.streak_current > COALESCE((SELECT count(DISTINCT habit_date) FROM habit_tracking ht WHERE ht.student_id = sg.student_id AND ht.login = true), 0);;
