-- =============================================================================
-- DIAGNOSTIC: Find every FK referencing profiles(id) and its ON DELETE rule +
--             NOT NULL status. Run this in Supabase SQL Editor.
--
-- Look for rows where:
--   delete_rule = 'NO ACTION'  → blocks deletion (must nullify before delete)
--   is_nullable = 'NO'        → if delete_rule is SET NULL this will fail at runtime
-- =============================================================================

SELECT
  kcu.table_name                          AS child_table,
  kcu.column_name                         AS child_column,
  rc.delete_rule                          AS on_delete,
  c.is_nullable                           AS nullable,
  CASE
    WHEN rc.delete_rule = 'NO ACTION'     AND c.is_nullable = 'YES' THEN '⚠ RESTRICT (must nullify before delete)'
    WHEN rc.delete_rule = 'SET NULL'      AND c.is_nullable = 'NO'  THEN '🔴 BROKEN — SET NULL + NOT NULL contradiction'
    WHEN rc.delete_rule = 'NO ACTION'     AND c.is_nullable = 'NO'  THEN '🔴 BROKEN — RESTRICT + NOT NULL, must delete rows'
    ELSE '✅ OK'
  END                                     AS status
FROM  information_schema.table_constraints      tc
JOIN  information_schema.key_column_usage       kcu
      ON  tc.constraint_name  = kcu.constraint_name
      AND tc.constraint_schema = kcu.constraint_schema
JOIN  information_schema.referential_constraints rc
      ON  tc.constraint_name  = rc.constraint_name
      AND tc.constraint_schema = rc.constraint_schema
JOIN  information_schema.constraint_column_usage ccu
      ON  ccu.constraint_name  = rc.unique_constraint_name
      AND ccu.constraint_schema = rc.unique_constraint_schema
JOIN  information_schema.columns                c
      ON  c.table_schema = kcu.table_schema
      AND c.table_name   = kcu.table_name
      AND c.column_name  = kcu.column_name
WHERE tc.constraint_type  = 'FOREIGN KEY'
  AND ccu.table_name      = 'profiles'
  AND tc.constraint_schema = 'public'
ORDER BY status DESC, child_table;


-- =============================================================================
-- Also check: are there any active triggers on profiles that fire BEFORE DELETE?
-- (trg_prevent_last_admin_delete should only block deletion of the LAST admin)
-- =============================================================================

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'profiles'
  AND event_object_schema = 'public'
ORDER BY action_timing, event_manipulation;


-- =============================================================================
-- Check whether payments.user_id is still NOT NULL (needs migration_delete_fk_fix)
-- =============================================================================

SELECT
  column_name,
  is_nullable,
  CASE WHEN is_nullable = 'NO' THEN '🔴 Still NOT NULL — run migrations_delete_fk_fix.sql'
       ELSE '✅ Nullable — OK' END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name   IN ('payments','messages')
  AND column_name  IN ('user_id','sender_id','recipient_id');
