-- Fix student levels using the correct formula: floor(50 * N^1.5)
-- Level 1: 0, Level 2: 100, Level 3: 250
-- Level 4: floor(50*4^1.5) = 400
-- Level 5: floor(50*5^1.5) = 559
-- Level 6: floor(50*6^1.5) = 734
-- Level 7: floor(50*7^1.5) = 926
-- Level 8: floor(50*8^1.5) = 1131
-- Level 9: floor(50*9^1.5) = 1350
-- Level 10: floor(50*10^1.5) = 1581
-- Level 11: floor(50*11^1.5) = 1824
-- Level 12: floor(50*12^1.5) = 2078

UPDATE student_gamification
SET level = CASE
  WHEN xp_total >= floor(50 * power(50, 1.5)) THEN 50
  WHEN xp_total >= floor(50 * power(12, 1.5)) THEN 12
  WHEN xp_total >= floor(50 * power(11, 1.5)) THEN 11
  WHEN xp_total >= floor(50 * power(10, 1.5)) THEN 10
  WHEN xp_total >= floor(50 * power(9, 1.5)) THEN 9
  WHEN xp_total >= floor(50 * power(8, 1.5)) THEN 8
  WHEN xp_total >= floor(50 * power(7, 1.5)) THEN 7
  WHEN xp_total >= floor(50 * power(6, 1.5)) THEN 6
  WHEN xp_total >= floor(50 * power(5, 1.5)) THEN 5
  WHEN xp_total >= floor(50 * power(4, 1.5)) THEN 4
  WHEN xp_total >= 250 THEN 3
  WHEN xp_total >= 100 THEN 2
  ELSE 1
END;;
