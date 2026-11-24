-- ============================================================================
-- Seed: populate THE.INTEGER_NUMBER so the SCALE_SITE id-generation trigger works.
-- Consumed by: UC-SST-004 (Create Scale Site) happy path, and anything else that
--   creates a scale site (UC-SST-005 update API-seeds its own site to edit, etc.).
--
-- WHY REAL DATA FALLS SHORT: the scale-site PK is assigned by a BEFORE-INSERT
--   trigger (THE.SCS_SCST_BR_IU_TRG) that picks the smallest unused 4-char id from
--   a helper table of integers:
--       SELECT MIN(X) INTO :NEW.scale_site_id_nmbr
--         FROM (SELECT TO_CHAR(integer_value) X FROM INTEGER_NUMBER
--                WHERE integer_value > 1000
--               MINUS SELECT scale_site_id_nmbr FROM SCALE_SITE);
--   The one-hop real extract pulled ZERO rows into INTEGER_NUMBER (nothing FKs to
--   it, so it was never followed). With the table empty, MIN(X) is NULL, and the
--   NOT-NULL PK insert fails -> the create endpoint returns HTTP 500 (a sanitized
--   ORA-01400). This is a DATA GAP, not an app bug: no real record can supply the
--   generator, so we seed the helper table.
--
-- VALIDATED LIVE 2026-08-12: with this patch applied,
--   POST /api/scale-sites {"ownerClientNumber":"00105328","ownerClientLocnCode":"00",
--     "orgUnitNo":27,"scalingMethods":[{"scaleMethodTypeCode":"W","scaleSitePriorityCode":"P"}],...}
--   -> HTTP 201 with a generated 4-char scaleSiteIdNmbr.
--
-- RANGE 1..9999 (capped intentionally): SCALE_SITE_ID_NMBR is VARCHAR2(4), so a
--   generated id must be <= 4 chars. Values > 9999 would yield a 5-char TO_CHAR and
--   overflow the column (ORA-12899). The trigger's own `integer_value > 1000` filter
--   means scale-site ids are drawn from 1001..9999 (899x free numeric ids — far more
--   than any test run needs); the lower 1..1000 are seeded too so other legacy
--   INTEGER_NUMBER-driven generators are also unblocked, none of which this suite relies on.
--
-- IDEMPOTENT: inserts only the missing values (re-run inserts nothing).
-- REVERSIBLE via integer-number-seed.teardown.sql. The table was EMPTY before this
--   patch (COUNT(*)=0 in the extract), so the teardown's range delete restores that
--   exact original state; no real row is touched.
--
-- RE-VERIFY ON RE-EXTRACT: confirm INTEGER_NUMBER is still empty without this patch
--   (SELECT COUNT(*) FROM integer_number;) and that SCS_SCST_BR_IU_TRG still generates
--   the PK from it; else re-pin the range/threshold to the trigger.
--
--   sqlplus -S -L THE/default@localhost:1525/DBDOCK_01 @integer-number-seed.sql
-- ============================================================================
SET DEFINE OFF;

INSERT INTO integer_number (integer_value)
SELECT LEVEL FROM dual
CONNECT BY LEVEL <= 9999
MINUS
SELECT integer_value FROM integer_number;

COMMIT;

-- Confirm the helper table is populated and the scale-site generator now yields a
-- valid 4-char id (expect a non-null 4-char numeric string, e.g. '1001').
SELECT
  (SELECT COUNT(*) FROM integer_number) AS integer_number_rows,
  (SELECT MIN(X) FROM (SELECT TO_CHAR(integer_value) X FROM integer_number
                        WHERE integer_value > 1000
                       MINUS SELECT scale_site_id_nmbr FROM scale_site)) AS next_scale_site_id
FROM dual;
