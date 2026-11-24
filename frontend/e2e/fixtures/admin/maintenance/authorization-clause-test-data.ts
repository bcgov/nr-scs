import { randomUUID } from 'node:crypto';

import { daysAgo, daysAhead } from '../../common/dates';

/**
 * Known-good test data for Maintain Authorization Clauses (UC-SSC-001), pinned from the seeded local
 * Docker Oracle DB (`localhost:1525 / DBDOCK_01 / THE`) + the running app's LOV on 2026-07-24.
 * Nothing here is fabricated.
 *
 * Provenance:
 *  - Scale Method LOV (`/api/scale-method-type-lov`): C=Cruise Based, P=Piece Scale, S=Special Forest
 *      Product, W=Weight Scale. Real clauses exist for C (id 124), S (ids 1, 123) and W (id 121); NONE
 *      exist for `P` — so create/seed uses `P` to keep the filter scenario isolated from real rows.
 *  - The record key is COMPOSITE — (scaleMethodTypeCode, scaleMethodAuthClauseId); the clause id is
 *      server-generated on create, so it is read back from the view (`#view-clause-id`).
 *  - Server validation (`AuthorizationClauseService.validateRequestCommon`): scale method + clause text
 *      + effective date required; expiry >= effective. There is NO 200-char length check in the
 *      backend service and NONE in the client `validate()` — the DB column length is enforced only at
 *      the row insert and surfaces as a raw HTTP 500 (see defects.md Divergence #1).
 *  - Clauses have NO dependent-child guard (unlike Conditions): a created clause is always deletable, so
 *      every create/edit/delete scenario self-seeds its own row and cleans it up. No shared mutable row.
 *
 * DATES ARE TODAY-RELATIVE (daysAgo/daysAhead). Only Expiry >= Effective is enforced; a far-future
 * expiry keeps every window valid.
 */

/** The scale method code create/seed uses. `P` (Piece Scale) has no real clauses -> filter-isolated. */
export const CREATE_SCALE_METHOD_CODE = 'P';
/** The scale method description shown in the read-only view for `CREATE_SCALE_METHOD_CODE`. */
export const CREATE_SCALE_METHOD_LABEL = 'Piece Scale';
/** A different real method used by the filter scenario to prove a `P` clause drops out of the list. */
export const OTHER_SCALE_METHOD_CODE = 'C';

export interface AuthClauseBody {
  scaleMethodTypeCode: string;
  scalerAuthorizationClause: string;
  effectiveDate: string;
  expiryDate: string;
}

/** A fully valid create/update body with a globally-unique clause text. */
export function buildAuthClauseBody(label = 'create'): AuthClauseBody {
  const unique = randomUUID().slice(0, 8);
  return {
    scaleMethodTypeCode: CREATE_SCALE_METHOD_CODE,
    scalerAuthorizationClause: `E2E SSC001 ${label} ${unique}`,
    effectiveDate: daysAgo(1),
    expiryDate: daysAhead(3650),
  };
}
