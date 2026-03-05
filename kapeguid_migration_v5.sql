-- ============================================================
-- KapeGuid v5 Migration
-- Run this in Supabase → SQL Editor
-- ============================================================

-- 1. Add split name columns (safe to re-run)
ALTER TABLE customers ADD COLUMN IF NOT EXISTS first_name  TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_name   TEXT;

-- 2. That's it! Existing customers keep their full name in the
--    "name" column. New customers will populate all four columns.

-- ============================================================
-- MONTHLY FREE COFFEE AUTO-RESET
-- This function resets free_coffee = true for ALL active customers
-- at the start of every month.
-- ============================================================

-- Step A: Create the reset function
CREATE OR REPLACE FUNCTION reset_free_coffee_monthly()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE customers
  SET free_coffee = true
  WHERE is_active = true;
END;
$$;

-- Step B: You will schedule this function using pg_cron
-- (see the guide in CRON_SETUP_GUIDE.md)

