-- Audit remediation (Phase 2 seed): populate badge_definitions for the active
-- institutions from the canonical 35 definitions in src/lib/badgeDefinitions.ts.
-- Idempotent via UNIQUE(institution_id, badge_key). Seeds every institution that
-- has at least one course (so demo-empty institutions are skipped).
DO $$
DECLARE
  inst RECORD;
  defs jsonb := '[
    {"k":"streak_7","n":"7-Day Warrior","d":"7-day login streak","e":"\uD83D\uDD25","c":"streak"},
    {"k":"streak_14","n":"Fortnight Fighter","d":"14-day login streak","e":"\uD83D\uDD25","c":"streak"},
    {"k":"streak_30","n":"30-Day Legend","d":"30-day login streak","e":"\uD83D\uDD25","c":"streak"},
    {"k":"streak_60","n":"Dedication King","d":"60-day login streak","e":"\uD83D\uDC51","c":"streak"},
    {"k":"streak_100","n":"Century Legend","d":"100-day login streak","e":"\uD83C\uDFC6","c":"streak"},
    {"k":"first_submission","n":"First Steps","d":"Submit your first assignment","e":"\uD83D\uDCDD","c":"academic"},
    {"k":"perfect_score","n":"Flawless","d":"Score 100% on a rubric","e":"\uD83D\uDCAF","c":"academic"},
    {"k":"all_clos_met","n":"Outcome Achiever","d":"Meet all CLOs in a course","e":"\uD83C\uDFAF","c":"academic"},
    {"k":"journal_10","n":"Reflective Mind","d":"Write 10 journal entries","e":"\uD83D\uDCD6","c":"engagement"},
    {"k":"perfect_week","n":"Perfect Week","d":"Complete all habits for 7 days","e":"\u2B50","c":"engagement"},
    {"k":"perfect_attendance_week","n":"Perfect Attendance Week","d":"Present for all sessions in a 7-day period","e":"\uD83D\uDCCB","c":"engagement"},
    {"k":"quiz_master","n":"Quiz Master","d":"Complete 10 quizzes","e":"\uD83E\uDDE0","c":"engagement"},
    {"k":"discussion_helper","n":"Discussion Helper","d":"Have 5 answers marked correct in discussions","e":"\uD83D\uDCAC","c":"engagement"},
    {"k":"survey_completer","n":"Survey Completer","d":"Complete 3 surveys","e":"\uD83D\uDCCA","c":"engagement"},
    {"k":"self_aware_scholar","n":"Self-Aware Scholar","d":"Complete personality, learning style, and baseline assessments","e":"\uD83D\uDD2C","c":"engagement"},
    {"k":"thorough_explorer","n":"Thorough Explorer","d":"Complete onboarding without skipping any section","e":"\uD83E\uDDED","c":"engagement"},
    {"k":"habit_master","n":"Habit Master","d":"Completed at least one habit on 30+ days this semester","e":"\uD83C\uDFC6","c":"habit"},
    {"k":"wellness_warrior","n":"Wellness Warrior","d":"Logged wellness habits for 14 consecutive days","e":"\uD83E\uDDD8","c":"habit"},
    {"k":"full_spectrum","n":"Full Spectrum","d":"Completed all academic and wellness habits on 7 days","e":"\uD83C\uDF08","c":"habit"},
    {"k":"bloom_explorer","n":"Blooms Explorer","d":"Reached Blooms level 4 (Analyzing) on any CLO","e":"\uD83C\uDF31","c":"blooms"},
    {"k":"bloom_challenger","n":"Blooms Challenger","d":"Reached Blooms level 5 (Evaluating) on any CLO","e":"\uD83C\uDF3F","c":"blooms"},
    {"k":"bloom_pioneer","n":"Blooms Pioneer","d":"Reached Blooms level 6 (Creating) on any CLO","e":"\uD83C\uDF33","c":"blooms"},
    {"k":"team_spirit","n":"Team Spirit","d":"Team earned 500 XP together","e":"\uD83E\uDD1D","c":"team"},
    {"k":"unstoppable","n":"Unstoppable","d":"Team won 3 challenges","e":"\uD83D\uDCAA","c":"team"},
    {"k":"dream_team","n":"Dream Team","d":"All members completed a Perfect Day on the same day","e":"\u2B50","c":"team"},
    {"k":"study_squad","n":"Study Squad","d":"Team maintained a 7-day streak","e":"\uD83D\uDCDA","c":"team"},
    {"k":"self_reliant_scholar","n":"Self-Reliant Scholar","d":"Maintained high independence from AI assistance across all CLOs","e":"\uD83D\uDEE1\uFE0F","c":"academic"},
    {"k":"study_starter","n":"Study Starter","d":"Complete your first study session","e":"\uD83D\uDCDA","c":"study"},
    {"k":"deep_focus","n":"Deep Focus","d":"Complete a 60-minute study session","e":"\uD83E\uDDD8","c":"study"},
    {"k":"weekly_warrior","n":"Weekly Warrior","d":"Meet all 3 weekly goals in a single week","e":"\uD83C\uDFC6","c":"study"},
    {"k":"evidence_pro","n":"Evidence Pro","d":"Attach evidence to 10 study sessions","e":"\uD83D\uDCCE","c":"study"},
    {"k":"speed_demon","n":"Speed Demon","d":"???","e":"\u26A1","c":"mystery"},
    {"k":"night_owl","n":"Night Owl","d":"???","e":"\uD83E\uDD89","c":"mystery"},
    {"k":"perfectionist","n":"Perfectionist","d":"???","e":"\uD83D\uDC8E","c":"mystery"}
  ]'::jsonb;
  item jsonb;
BEGIN
  FOR inst IN
    SELECT DISTINCT i.id
    FROM public.institutions i
    JOIN public.programs pr ON pr.institution_id = i.id
    JOIN public.courses c ON c.program_id = pr.id
  LOOP
    FOR item IN SELECT * FROM jsonb_array_elements(defs)
    LOOP
      INSERT INTO public.badge_definitions (institution_id, badge_key, name, description, emoji, category, is_archived)
      VALUES (inst.id, item->>'k', item->>'n', item->>'d', item->>'e', item->>'c', false)
      ON CONFLICT (institution_id, badge_key) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;;
