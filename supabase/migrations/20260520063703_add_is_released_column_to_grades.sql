-- L2-4 Fix: Add is_released column to grades table
-- DEFAULT true means all existing grades are treated as already released
-- This enables the notification trigger (L2-2) which checks is_released
ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS is_released boolean NOT NULL DEFAULT true;;
