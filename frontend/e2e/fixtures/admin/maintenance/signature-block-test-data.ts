import { randomUUID } from 'node:crypto';

/**
 * Known-good test data for Maintain Signatories / Signature Blocks (UC-MNT-001), pinned from the seeded
 * local Docker Oracle DB + the running app's LOV on 2026-07-22. Nothing here is fabricated.
 *
 * Provenance:
 *  - Reg/Dist: `GET /api/region-district-rollup-lov` — district `DCC` (orgUnitCode) = orgUnitNo 1826
 *      (Cariboo-Chilcotin Natural Resource District). The screen's <Select> takes the orgUnitCode as its
 *      value; the API persists/returns the numeric orgUnitNo.
 *  - `signature_blocks` holds 12 real rows. The PK (`scaleSignatoryBlockId`) is server-generated, and
 *      there is no unique-name constraint — a globally-unique last name just keeps the read-back search
 *      unambiguous across parallel workers.
 */

export const SIGNATORY_REG_DIST = { orgUnitCode: 'DCC', orgUnitNo: 1826 } as const;

export type SignatureBlockBody = {
  firstName: string;
  middleName: string;
  lastName: string;
  signatureTitle: string; // "Position" on screen
  orgUnitCode: string; // the <Select> value the UI takes
  orgUnitNo: number; // what the API persists (read-back comparand)
}

/** A fully valid create/update body with a globally-unique last name. All text fields stay <= 40 chars. */
export function buildSignatureBlockBody(label = 'create'): SignatureBlockBody {
  const unique = randomUUID().slice(0, 8);
  return {
    firstName: `E2E${label}`.slice(0, 40),
    middleName: '',
    lastName: `MNT001-${unique}`.slice(0, 40),
    signatureTitle: 'Test Signatory',
    orgUnitCode: SIGNATORY_REG_DIST.orgUnitCode,
    orgUnitNo: SIGNATORY_REG_DIST.orgUnitNo,
  };
}
