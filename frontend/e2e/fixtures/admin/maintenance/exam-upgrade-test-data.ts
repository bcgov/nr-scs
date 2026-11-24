import { randomUUID } from 'node:crypto';

import { daysAgo, daysAhead } from '../../common/dates';

/**
 * Known-good test data for Maintain Exams / Upgrades (UC-MNT-002), pinned from the seeded local Docker
 * Oracle DB + the running app's LOV on 2026-07-22. Nothing here is fabricated.
 *
 * Provenance:
 *  - Type LOV (`SCALER_TRAINING_CLASS_CODE`): EXM=Exam, UPG=Upgrade. Create uses `UPG`.
 *  - Licence Accredit? is a Yes/No (`Y`/`N`) select.
 *  - The record key is COMPOSITE — (scalerTrainingClassCode, scalerTrainingTypeId); the typeId is
 *      server-generated on create, so it is read back from the view (`#view-exam-upgrade-id`).
 *  - Dependents live in `scaler_training` (FK `SRTR_SCTY_FK`, delete_rule = NO ACTION — NO cascade).
 *      Type (EXM, 2) has 33 child rows (delete-blocked); (UPG, 1) has 21. A DELETE of a dependent type
 *      is rejected by the backend and the row survives, so opening (EXM, 2) is read-only / parallel-safe.
 *
 * DATES ARE TODAY-RELATIVE (daysAgo/daysAhead). Only Expiry >= Effective is enforced client-side; a
 * far-future expiry keeps every window valid.
 */

/** A real, dependent-having exam/upgrade — used by the delete-blocked scenario (read-only). */
export const DEPENDENT_EXAM_UPGRADE = { classCode: 'EXM', typeId: '2' } as const;

export interface ExamUpgradeBody {
  classCode: string; // Type (EXM | UPG)
  licenceAccreditInd: 'Y' | 'N';
  description: string;
  effectiveDate: string;
  expiryDate: string;
}

/** A fully valid create/update body with a globally-unique description. */
export function buildExamUpgradeBody(label = 'create'): ExamUpgradeBody {
  const unique = randomUUID().slice(0, 8);
  return {
    classCode: 'UPG',
    licenceAccreditInd: 'Y',
    description: `E2E MNT002 ${label} ${unique}`,
    effectiveDate: daysAgo(1),
    expiryDate: daysAhead(3650),
  };
}
