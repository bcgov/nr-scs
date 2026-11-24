-- ============================================================================
-- Seed: make ONE timber mark ('ES20R4') creatable as a Mark Site Designation.
-- Consumed by: UC-MSD-001 S01 (District Wide=Y) + S02 (District Wide=N + scale site) create happy paths,
--   and UC-MSD-002 update (which API-seeds its own records via the create endpoint). NOT needed by the
--   no-seed MSD slices (validation / mark-not-found).
--
-- RE-GROUNDED 2026-07-21 for the new extract. The old approach (mark AF904 via the private-mark arm of
--   the holder view, bridged by one FOREST_CLIENT row) is DEAD here: this extract pulled ZERO rows into
--   private_mark_certificate / for_client_link / forest_file_client / harvesting_hauling_xref, so the
--   mark-holder view SCS_MARK_SITE_TIMBER_VW is empty across all 4 arms and AF904's chain is gone.
--
-- VALIDATED LIVE 2026-07-21: with the two inserts below applied,
--   POST /api/mark-site-designations {"timberMark":"ES20R4",...,"orgUnitNo":1831,"districtWideInd":"Y"}
--   -> HTTP 201, and District Wide=N + scaleSites:["520"] -> HTTP 201.
--
-- Why real data falls short (the two-gate problem): an MSD create must satisfy BOTH
--   (A) INSERT FK HMKA_HAA_FK — timber_mark must exist in HAULING_AUTHORITY, AND
--   (B) existence check — timber_mark must resolve a row in SCS_MARK_SITE_TIMBER_VW (mark-holder view).
--   The holder view's 4 arms all need a mark->file->client link (forest_file_client or for_client_link),
--   and BOTH those link tables are empty in this extract, so no mark resolves it.
--
-- The MINIMAL bridge (arm 4 = blanket_road_mark): ES20R4 is a real blanket_road_mark whose timber_mark
--   is ALREADY in HAULING_AUTHORITY (Gate A, no HA insert needed) and whose forest_file_id A18674 is
--   already in PROV_FOREST_USE. Arm 4 of the holder view is:
--     brm(timber_mark, forest_file_id) -> prov_forest_use(forest_file_id)
--       -> forest_file_client(forest_file_id, type 'A', client_number) -> forest_client(client_number)
--   Everything is present EXCEPT the forest_file_client link row. So we insert exactly ONE
--   forest_file_client row (file A18674, type 'A'), reusing an EXISTING client 00000001/00 that is
--   already in BOTH forest_client (2026 rows) and client_location (1550 rows) — no client is fabricated.
--   A BEFORE-INSERT trigger (FTA_SYNC_FFC_FCL) auto-creates the matching FOR_CLIENT_LINK row, so arm 4
--   resolves and ES20R4 becomes creatable. (Gate B satisfied by the ONE insert; Gate A already true.)
--
--   Plus ORG_UNIT 1904 (region 'RKB') so District-1831 scale sites resolve the create form's scale-site
--   search view (S02) — unchanged from before; plain table, no triggers/FKs, fully reversible.
--
-- Idempotent: MERGE on the natural marker (forest_file_id + entry_userid='E2E_SEED'). Unlike the old
--   AF904 seed this one HAS a working teardown (msd-create-mark.teardown.sql) — forest_file_client /
--   for_client_link / org_unit are plain FK-guarded tables, so the sentinel rows delete cleanly.
--   Re-verify on any DB re-extract (real data is non-deterministic): confirm ES20R4 is still a
--   blanket_road_mark in HAULING_AUTHORITY with file A18674 in PROV_FOREST_USE, and the holder view is
--   still empty without this seed; else re-pick a mark from:
--     SELECT brm.timber_mark, brm.forest_file_id FROM blanket_road_mark brm
--       JOIN hauling_authority ha ON ha.timber_mark=brm.timber_mark
--      WHERE EXISTS (SELECT 1 FROM prov_forest_use p WHERE p.forest_file_id=brm.forest_file_id);
--
--   sqlplus -S -L THE/default@localhost:1525/DBDOCK_01 @msd-create-mark.sql
-- ============================================================================
SET DEFINE OFF;

-- (1) The missing mark->file->client link row -> ES20R4 resolves the mark-holder view (Gate B). Reuses
--     existing client 00000001/00 (present in forest_client AND client_location) + existing file A18674
--     (in prov_forest_use). The FTA_SYNC_FFC_FCL trigger auto-inserts the matching FOR_CLIENT_LINK row.
MERGE INTO forest_file_client t
USING (SELECT 'A18674' AS ffid, 'E2E_SEED' AS seed_user FROM dual) s
ON (t.forest_file_id = s.ffid AND t.entry_userid = s.seed_user)
WHEN NOT MATCHED THEN
  INSERT (forest_file_client_skey, forest_file_id, client_number, client_locn_code,
          forest_file_client_type_code, revision_count,
          entry_userid, entry_timestamp, update_userid, update_timestamp)
  VALUES (990000002, 'A18674', '00000001', '00',
          'A', 1,
          'E2E_SEED', SYSDATE, 'E2E_SEED', SYSDATE);

-- (2) The missing REGION org unit 1904 (RKB) so District-1831 scale sites resolve the search view (S02).
MERGE INTO org_unit t
USING (SELECT 1904 AS ou FROM dual) s
ON (t.org_unit_no = s.ou)
WHEN NOT MATCHED THEN
  INSERT (org_unit_no, org_unit_code, org_unit_name, location_code, area_code, telephone_no,
          org_level_code, office_name_code, rollup_region_no, rollup_region_code,
          rollup_dist_no, rollup_dist_code, effective_date, expiry_date)
  VALUES (1904, 'RKB', 'Kootenay-Boundary Natural Resource Region (E2E_SEED)', '000', '000', '0000000',
          'R', 'RG', 1904, 'RKB', 1904, 'RKB', DATE '2000-01-01', DATE '9999-12-31');

COMMIT;

-- Confirm both mark gates are satisfied for ES20R4 (expect 1 / 1) and >=1 scale site is now searchable.
SELECT
  (SELECT COUNT(*) FROM scs_mark_site_timber_vw WHERE timber_mark='ES20R4') AS holder_view_gate_b,
  (SELECT COUNT(*) FROM hauling_authority       WHERE timber_mark='ES20R4') AS hauling_auth_gate_a,
  (SELECT COUNT(*) FROM scs_scale_site_search_vw WHERE scale_site_id_nmbr='520') AS site_520_searchable
FROM dual;
