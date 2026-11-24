-- ============================================================================
-- Teardown for integer-number-seed.sql.
-- THE.INTEGER_NUMBER was EMPTY in the extract (COUNT(*)=0), so every 1..9999 row is
-- ours; deleting that range restores the original empty state. INTEGER_NUMBER has no
-- audit/sentinel column (it is a pure integer helper table), so the teardown is keyed
-- on the seeded range rather than a userid sentinel — safe precisely because the table
-- started empty.
--
-- NOTE: removing these rows re-breaks scale-site create (the id generator goes back to
-- NULL). Only tear down when you are done with scale-site create tests, or leave the
-- patch applied (it is inert for everything else).
--
--   sqlplus -S -L THE/default@localhost:1525/DBDOCK_01 @integer-number-seed.teardown.sql
-- ============================================================================
SET DEFINE OFF;

DELETE FROM integer_number WHERE integer_value BETWEEN 1 AND 9999;
COMMIT;

-- Confirm the seed rows are gone (expect 0).
SELECT COUNT(*) AS integer_number_rows FROM integer_number;
