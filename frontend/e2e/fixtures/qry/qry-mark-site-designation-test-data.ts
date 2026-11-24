/**
 * UC-QRY-005 — Search Mark Site Designations (Queries > Mark Site Designations, route /mark-site-designations).
 * DB-grounded known values for the read-only timber-mark search. Read path:
 *   pages/Queries/MarkSiteDesignations/index.tsx → markSiteDesignation.service.searchMarkSiteDesignationsByTimberMark
 *   → GET /api/mark-site-designations/search?timberMark={mark}  (returns a flat array; [] when nothing matches).
 *
 * Real extracted data is non-deterministic across re-extracts — RE-VERIFY these on any DB re-extract.
 */

/**
 * A timber mark that returns one or more MSD rows from the search endpoint (S01 multi-result happy path +
 * the auto-search-from-URL path the Scale Site MSD tab links use). GE5412 is a real, stable extract mark
 * (also the mark the UC-MSD-005 scale-site MSD tab renders for site 28E) — it is NOT a mark any create
 * test writes on (those use ES20R4), so its result set is stable under parallel load.
 *
 * Ground-truthed 2026-08-04 against the live stack:
 *   curl 'http://localhost:8080/api/mark-site-designations/search?timberMark=GE5412'
 *     -> [{"haulingMarkAuthorizationId":3726,"timberMark":"GE5412","effectiveDate":"2026-07-17",
 *          "expiryDate":"2031-07-17","orgUnitName":"Coast Mountains Natural Resource District"}, … several rows]
 * We assert PRESENCE (a GE5412 row + a clickable MSD # link + the column set), not a pinned row count or
 * a specific authorization id — those drift across re-extracts; presence does not.
 */
export const searchTimberMarkWithResults = 'GE5412';

/**
 * A syntactically-valid timber mark provably absent from the search view — the endpoint returns an EMPTY
 * ARRAY (HTTP 200 []), which the page renders as the "No results" empty state (S02). This is the SEARCH
 * endpoint's empty-result behaviour, distinct from the mark-HOLDER lookup's 404 (that is the create
 * screen's GET /api/mark-site-designations?timberMark= — see fixtures/msd absentTimberMark).
 *
 * Ground-truthed 2026-08-04:
 *   curl 'http://localhost:8080/api/mark-site-designations/search?timberMark=ZZZQ999' -> []  (HTTP 200)
 */
export const noMatchTimberMark = 'ZZZQ999';

/**
 * The five result columns the new app renders (the ID column is `selected:false`, so it is not shown).
 * Order matches TABLE_HEADERS in pages/Queries/MarkSiteDesignations/index.tsx.
 */
export const searchResultColumns = [
  'MSD #',
  'Timber Mark',
  'Effective Date',
  'Expiry Date',
  'Designated District',
] as const;

/**
 * The new app's re-grounded validation messages (legacy UC-QRY-005 wording differs — see coverage.md):
 *   ERR-001 legacy "Timber Mark is required."          -> "Timber Mark is required."
 *   ERR-002 legacy "Wildcards are not allowable…"(%)   -> "Timber Mark can’t contain the % character."
 *   ERR-003 legacy "Wildcards are not allowable…"(_)   -> "Timber Mark can’t contain the _ character."
 * The apostrophe is a curly ’ (U+2019) exactly as pages/Queries/MarkSiteDesignations/index.tsx emits it.
 */
export const searchRequiredMessage = 'Timber Mark is required.';
export const percentWildcardMessage = 'Timber Mark can’t contain the % character.';
export const underscoreWildcardMessage = 'Timber Mark can’t contain the _ character.';
