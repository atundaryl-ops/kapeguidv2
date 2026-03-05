# ☕ How to Set Up Monthly Free Coffee Auto-Reset

This guide teaches you how to make Supabase automatically reset
free_coffee = true for all active customers on the 1st of every month.

---

## What is pg_cron?

pg_cron is a built-in scheduler inside Supabase's database.
Think of it like a "timer" that runs a database command on a schedule
you define — like every day, every week, or every month.

---

## Step 1 — Enable pg_cron in Supabase

1. Go to your Supabase project dashboard
2. Click **Database** in the left sidebar
3. Click **Extensions**
4. Search for **pg_cron**
5. Click the toggle to **Enable** it
6. Wait a few seconds — it will say "Enabled"

---

## Step 2 — Run the Migration SQL (if you haven't already)

Go to **SQL Editor** and run the contents of `kapeguid_migration_v5.sql`.
This creates the `reset_free_coffee_monthly()` function.

---

## Step 3 — Schedule the Monthly Job

Still in the **SQL Editor**, run this command:

```sql
SELECT cron.schedule(
  'reset-free-coffee-monthly',     -- job name (you can call it anything)
  '0 0 1 * *',                     -- cron expression: midnight on the 1st of every month
  'SELECT reset_free_coffee_monthly();'
);
```

That's it! 🎉

---

## How to Read the Cron Expression

The format is:  minute  hour  day  month  weekday

'0 0 1 * *'  means:
  - minute 0    (at :00)
  - hour 0      (midnight)
  - day 1       (1st of the month)
  - month *     (every month)
  - weekday *   (any day of the week)

So it runs at exactly midnight on the 1st of every month.

Note: Supabase runs on UTC time. Philippine time (PHT) is UTC+8,
so midnight UTC = 8:00 AM PHT. If you want it to reset at
midnight PHT (which is 4:00 PM UTC the day before), use:

'0 16 28-31 * *'  -- runs on days 28-31 at 4PM UTC, only resets on 1st
-- Actually the simplest for PHT midnight is:
'0 16 * * *'  -- runs every day at 4PM UTC = midnight PHT
-- But to only run on 1st of month at midnight PHT:
'0 16 1 * *'  -- runs on the 1st at 4PM UTC (= midnight PHT next day)

For simplicity, just use '0 0 1 * *' — resetting a few hours
early or late at the start of the month doesn't matter much.

---

## Step 4 — Verify the Job Was Created

Run this to see all scheduled jobs:

```sql
SELECT * FROM cron.job;
```

You should see a row with the name 'reset-free-coffee-monthly'.

---

## How to Test It Right Now (Optional)

If you want to verify the function works without waiting a month:

```sql
-- Manually run the reset function right now:
SELECT reset_free_coffee_monthly();

-- Then check that free_coffee = true for active customers:
SELECT name, free_coffee, is_active FROM customers WHERE is_active = true;
```

---

## How to Delete the Job (If You Ever Need To)

```sql
SELECT cron.unschedule('reset-free-coffee-monthly');
```

---

## Summary

| Step | Where | What you do |
|------|-------|-------------|
| 1 | Database → Extensions | Enable pg_cron |
| 2 | SQL Editor | Run migration SQL |
| 3 | SQL Editor | Run cron.schedule() command |
| 4 | SQL Editor | Run SELECT * FROM cron.job to verify |

That's all — the database handles the rest automatically every month!
