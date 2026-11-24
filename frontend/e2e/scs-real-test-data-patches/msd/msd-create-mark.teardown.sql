-- ============================================================================
-- Teardown for msd-create-mark.sql (re-grounded 2026-07-21).
-- Removes ONLY the E2E_SEED sentinel rows, leaving the real extract as found. Unlike the old AF904 seed
-- (which was one-way — FOREST_CLIENT is package/audit-guarded), this arm-4 seed touches only plain
-- FK-guarded tables, so it reverses cleanly.
--
--   sqlplus -S -L THE/default@localhost:1525/DBDOCK_01 @msd-create-mark.teardown.sql
-- ============================================================================
SET DEFINE OFF;

-- for_client_link first (auto-created by the FFC insert trigger; same E2E_SEED marker), then the
-- forest_file_client parent, then the org unit. All keyed on the sentinel so no real row is touched.
DELETE FROM for_client_link     WHERE entry_userid = 'E2E_SEED';
DELETE FROM forest_file_client  WHERE entry_userid = 'E2E_SEED';
DELETE FROM org_unit            WHERE org_unit_no = 1904 AND org_unit_code = 'RKB'
                                  AND org_unit_name LIKE '%E2E_SEED%';
COMMIT;

-- Confirm the mark is no longer creatable (holder gate back to 0) and the seed rows are gone.
SELECT
  (SELECT COUNT(*) FROM scs_mark_site_timber_vw WHERE timber_mark='ES20R4') AS holder_view_gate_b,
  (SELECT COUNT(*) FROM forest_file_client WHERE entry_userid='E2E_SEED')   AS ffc_seed_rows,
  (SELECT COUNT(*) FROM for_client_link    WHERE entry_userid='E2E_SEED')   AS fcl_seed_rows
FROM dual;
