import { randomUUID } from 'node:crypto';

import { daysAgo, daysAhead } from '../../common/dates';

/**
 * Known-good test data for Maintain Conditions (UC-SSC-002), pinned from the seeded local Docker Oracle
 * DB (`localhost:1525 / DBDOCK_01 / THE`) + the running app's LOVs on 2026-07-24. Nothing is fabricated.
 *
 * Provenance:
 *  - Condition class LOV (`/api/static-lov?tableKey=SCALE_CONDITION_CLASS_CODE`): SIA=Scale Site
 *      Authorization, MSD=Mark Site Designation, SCA=Scaler Authorization.
 *  - Site Type options = scale-method-type LOV descriptions: C=Cruise Based, P=Piece Scale,
 *      S=Special Forest Product, W=Weight Scale. Create picks "Piece Scale" (code P).
 *  - Server validation (`ConditionService.validateRequestCommon` + `validateSiteMethodTypeCodes`): type,
 *      title, text, mandatory (Y/N), sort order (0..9999), effective date required; expiry >= effective;
 *      SIA REQUIRES ≥1 site type; MSD/SCA must have NONE. The client hides Site Type only for MSD (not
 *      SCA), so SCA conditions are uncreatable via the UI — see defects.md Divergence #1.
 *  - Record key is COMPOSITE (scaleConditionClassCode, scaleAuthConditionId); the id is server-generated
 *      on create, so it is read back from the view (`#view-condition-id`).
 *  - LIST is large (159 rows: SIA 105, SCA 38, MSD 16). List-open scenarios seed as **MSD** and reach the
 *      row via the class filter + page-size 50 (whole class on one page). MSD hides Site Type, so its
 *      form has no multiselect — fine for CRUD-mechanics coverage; SIA site-type is covered by create.
 *
 * DATES ARE TODAY-RELATIVE (daysAgo/daysAhead). Only Expiry >= Effective is enforced; a far-future
 * expiry keeps every window valid.
 */

/** Condition-class code -> the description shown in the read-only view's Type field. */
export const CLASS_LABEL: Record<string, string> = {
  SIA: 'Scale Site Authorization',
  MSD: 'Mark Site Designation',
  SCA: 'Scaler Authorization',
};

/** A real MSD condition WITH dependent children (hauling_mark_site_condition) — delete-blocked, read-only. */
export const DEPENDENT_CONDITION = { classCode: 'MSD', id: '188' } as const;

/** The literal "cannot delete" warning the app shows for a dependent-having condition. */
export const DELETE_BLOCKED_SNIPPET =
  'has been associated to a Site Authorization, Scaler Authorization, Mark Site Designation, or Template';

export interface ConditionBody {
  classCode: string; // Type (SIA | MSD | SCA)
  title: string;
  desc: string;
  ministryStandardInd: 'Y' | 'N';
  sortOrderNo: string;
  effectiveDate: string;
  expiryDate: string;
  /** LOV codes (['P']) — SIA requires ≥1; MSD/SCA leave empty. */
  siteMethodTypeCodes: string[];
  /** LOV descriptions (['Piece Scale']) used to pick options in the Carbon multiselect. */
  siteTypeLabels: string[];
}

/** A fully valid create/update body with a globally-unique title. `classCode` defaults to SIA. */
export function buildConditionBody(label = 'create', classCode = 'SIA'): ConditionBody {
  const unique = randomUUID().slice(0, 8);
  const isSia = classCode.toUpperCase() === 'SIA';
  return {
    classCode,
    title: `E2E SSC002 ${label} ${unique}`,
    desc: `E2E SSC002 condition text ${unique}`,
    ministryStandardInd: 'N',
    sortOrderNo: '10',
    effectiveDate: daysAgo(1),
    expiryDate: daysAhead(3650),
    siteMethodTypeCodes: isSia ? ['P'] : [],
    siteTypeLabels: isSia ? ['Piece Scale'] : [],
  };
}
