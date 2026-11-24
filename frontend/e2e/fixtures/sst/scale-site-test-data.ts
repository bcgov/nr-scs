import { daysAgo } from '../common/dates';

/**
 * UC-SST-004 (Create Scale Site) — DB-grounded known values, pinned from the local real-data extract.
 *
 * The create write path (POST /api/scale-sites -> ScaleSiteService.createScaleSite) enforces, in order:
 *   required fields, org unit present, >=1 scaling method with exactly one PRIMARY and distinct codes,
 *   timber-brand format, coordinate ranges + BC boundary, and finally OWNER-CLIENT EXISTENCE
 *   (clientRepository.checkClientExists) + the SCALE_SITE FK to CLIENT_LOCATION / ORG_UNIT.
 * The React form (components/Form/ScaleSiteForm) runs the required/duplicate/timber/coordinate checks
 * CLIENT-SIDE, so those never leave the browser; owner-existence + BC-boundary are server-only.
 *
 * DATA GAP (test-env, not an app bug): the scale-site PK is assigned by a BEFORE-INSERT trigger
 * (THE.SCS_SCST_BR_IU_TRG) that reads THE.INTEGER_NUMBER, which the one-hop extract left EMPTY, so every
 * create 500s until seeded. Unblocked by scs-real-test-data-patches/sst/integer-number-seed.sql
 * (apply-patches.sh). Re-verify on any DB re-extract.
 */

/**
 * A valid owner client that BOTH passes checkClientExists AND is present in CLIENT_LOCATION (the
 * SCALE_SITE owner FK parent). Pinned from real scale site 14N's owner; verified live 2026-08-12:
 * POST /api/scale-sites {ownerClientNumber:'00105328', ownerClientLocnCode:'00', orgUnitNo:27, ...} -> 201.
 *   Re-pick query:
 *     SELECT ss.owner_cli_number, ss.owner_cli_locn_cd, ss.org_unit_no FROM the.scale_site ss
 *      WHERE EXISTS (SELECT 1 FROM the.client_location cl
 *                     WHERE cl.client_number=ss.owner_cli_number AND cl.client_locn_code=ss.owner_cli_locn_cd)
 *        AND EXISTS (SELECT 1 FROM the.org_unit ou WHERE ou.org_unit_no=ss.org_unit_no) AND ROWNUM<=1;
 */
export const validOwner = { clientNumber: '00105328', loc: '00' } as const;

/**
 * A Reg / Dist value the DistrictSelect actually offers (its <Select id="reg-dist"> option value is the
 * org-unit number as a string). 27 = "RSC - Sunshine Coast Natural Resource District"; present in
 * ORG_UNIT and in GET /api/region-district-lov. It is the org unit of the pinned owner's real site.
 */
export const regDistOrgUnitNo = '27';

/**
 * Scale-method-type codes the LOV offers (GET /api/scale-method-type-lov -> C/P/S/W). The form's Site
 * Type <Select>s use the code as the option value. Primary W (Weight Scale), Secondary P (Piece Scale) —
 * distinct, so the happy path passes the "distinct codes" rule; reused as the DUPLICATE pair (W + W) for S03.
 */
export const primaryMethodCode = 'W';
export const secondaryMethodCode = 'P';

/**
 * A valid, minimal set of create-form values for the happy path. Site name has NO uniqueness constraint
 * (Data Field Reference: Uniqueness = No), so a fixed marker is safe under parallel runs — each created
 * site is cleaned up by its own generated id, not by name.
 */
export const validScaleSite = {
  siteName: 'E2E SST-004 CREATE',
  siteLocation: 'E2E SST-004 automated create — safe to delete.',
} as const;

/**
 * An owner client provably ABSENT (checkClientExists = false) so the server-side owner check fires.
 * Confirmed live 2026-08-12: POST /api/scale-sites with this owner -> HTTP 422
 *   {"message":"Owner client 99999999 / 00 does not exist."}. Syntactically valid (<=8 / <=2 chars) so it
 * passes the client-side required checks and reaches the server.
 */
export const absentOwner = { clientNumber: '99999999', loc: '00' } as const;

// (The server-side owner-not-found message is asserted directly in validation.feature S06 as a literal,
// matching every other validation message in that file's Examples tables — no shared helper is used.)

// --- UC-SST-005 (Update) ---------------------------------------------------------------------------------

/** Scale-site priority codes (SCALE_SITE_PRIORITY_CODE): primary / secondary / tertiary. */
export const PRIORITY = { PRIMARY: 'P', SECONDARY: 'S', TERTIARY: 'T' } as const;

/**
 * A valid create body for API-seeding a scale site to edit (UC-SST-005 S01/S05/S06 each seed + clean up
 * their OWN site — a dedicated mutable key, parallel-safe). Mirrors the happy-path create values; the
 * seed goes through `ScaleSiteService.createScaleSite`, so it needs the `sst/integer-number-seed` patch.
 */
export const buildCreateBody = (overrides: Record<string, unknown> = {}) => ({
  siteName: validScaleSite.siteName,
  ownerClientNumber: validOwner.clientNumber,
  ownerClientLocnCode: validOwner.loc,
  orgUnitNo: Number(regDistOrgUnitNo),
  siteLocation: validScaleSite.siteLocation,
  timberBrand: null,
  latitude: null,
  longitude: null,
  scalingMethods: [
    { scaleMethodTypeCode: primaryMethodCode, scaleSitePriorityCode: PRIORITY.PRIMARY },
    { scaleMethodTypeCode: secondaryMethodCode, scaleSitePriorityCode: PRIORITY.SECONDARY },
  ],
  ...overrides,
});

/** The edits S01 applies (change the name and swap the secondary site type W/P → C). */
export const updatedSiteName = 'E2E SST-005 UPDATED';
export const updatedSecondaryMethodCode = 'C'; // Cruise Based — distinct from primary W

// --- UC-SST-006 (Contacts) -------------------------------------------------------------------------------

/**
 * A real CLIENT_CONTACT that the contact-create write path accepts. `clientContactExists` delegates to
 * `scs_client_contact_pkg.search_recs`, which HARD-FILTERS `bus_contact_code = 'SI'` (site-information
 * contacts) — so an arbitrary client_contact id (e.g. 1603) is rejected 404 "A Client Contact could not
 * be found for {id}." even though it exists. 2504 = "Tristian Reynaldo" (client 00154153), bus_contact_code
 * 'SI'. Verified live 2026-08-12: POST /scale-sites/{id}/contacts {clientContactId:2504,...} → HTTP 201.
 *   Re-pick: SELECT client_contact_id, contact_name FROM the.client_contact WHERE bus_contact_code='SI';
 */
export const siClientContactId = '2504';
export const siClientContactName = 'Tristian Reynaldo';

/** Contact-form values for the happy path (role/access/effective). A contact is keyed by (site, clientContactId). */
export const contactRole = 'E2E Contact Role';
export const updatedContactRole = 'E2E Updated Role';

// --- UC-SST-007 (Software — read-only) -------------------------------------------------------------------

/**
 * A REAL scale site whose read-only Software tab HAS >=1 row, and one with NONE — both used read-only, so
 * no seed/cleanup and parallel-safe. Verified live 2026-08-12:
 *   GET /scale-sites/520/software -> 1 row (lastUsedDate 2016-04-15); GET /scale-sites/14N/software -> [].
 *   Re-pick: for id in <real sites>: GET /api/scale-sites/{id}/software and check the row count.
 */
export const softwareAnchorSiteId = '520';
export const softwareAnchorLastUsedDate = '2016-04-15';
export const noSoftwareAnchorSiteId = '14N';

// --- UC-SST-008 (Authorized Scalers — read-only + client-side status filter) -----------------------------

/**
 * A REAL scale site whose Authorized Scalers tab HAS rows, used read-only. Verified live 2026-08-12:
 *   GET /scale-sites/520/authorized-scalers -> 8 rows, all status "Expired".
 * The whole extract's authorized scalers are "Expired", so `scalerStatusAbsent` (Active) filters to EMPTY
 * — which is exactly what proves the client-side status filter works (present-status keeps rows,
 * absent-status empties the list). Re-pick: probe GET /authorized-scalers across real sites for statuses.
 */
export const authorizedScalerSiteId = '520';
export const scalerStatusPresent = 'Expired';
export const scalerStatusAbsent = 'Active';

/** Build a create-contact request body for API-seeding a contact onto a site. Effective date is
 *  today-relative (contacts have no date-window rule, but keep it consistent with the UI tests). */
export const buildContactBody = (overrides: Record<string, unknown> = {}) => ({
  clientContactId: Number(siClientContactId),
  contactRoleDescription: contactRole,
  primaryContactInd: 'N',
  siteInformationAccessInd: 'Y',
  effectiveDate: daysAgo(1),
  expiryDate: null,
  ...overrides,
});
