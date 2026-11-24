import { test as base } from 'playwright-bdd';

import { type InspectionQuestionBody } from '../../fixtures/admin/maintenance/ccq-test-data';
import { type TemplateBody } from '../../fixtures/admin/maintenance/template-test-data';
import { type AppointmentTypeBody } from '../../fixtures/admin/maintenance/appointment-type-test-data';
import { type SignatureBlockBody } from '../../fixtures/admin/maintenance/signature-block-test-data';
import { type ExamUpgradeBody } from '../../fixtures/admin/maintenance/exam-upgrade-test-data';
import { type VlaBody } from '../../fixtures/admin/maintenance/valid-licence-attribute-test-data';
import { type AuthClauseBody } from '../../fixtures/admin/maintenance/authorization-clause-test-data';
import { type ConditionBody } from '../../fixtures/admin/maintenance/condition-test-data';
import { type ControlVerdict } from '../../fixtures/security/role-columns';

/**
 * Global (cross-domain) fixtures for the SCS BDD suite.
 *
 * `world` is a per-scenario scratch object for state passed between steps (a seeded id, values a later
 * Then reads back). Its shape `ScsWorld` is the union of every domain's scratch fields — kept in one
 * place because a single `world` object is shared across all steps of a scenario regardless of domain.
 */
export type ScsWorld = {
  checkScaleId?: string;
  /** Id of a DETAIL (HBCS) check scale created via the UI, for read-back + DB cleanup. */
  detailCheckScaleId?: string;
  /** Id of a site inspection (seeded via API, or created via the UI) for read-back + cleanup. */
  inspectionId?: string;
  /** Scale site the inspection under test hangs off — the view/tab steps re-open by it after a save. */
  scaleSiteIdNmbr?: string;
  /**
   * The inspection EDIT payload read via the API BEFORE the scenario changed anything. Two jobs in the
   * app-only edit suite: it is the "restored to what it was" comparand for Reset/Back (so no date or
   * answer literal is hardcoded), and the baseline the post-save read-back is diffed against to prove
   * that ONLY the edited fields moved. Typed via an inline import so global.ts stays acyclic.
   */
  inspectionEditBaseline?: import('./ins').InspectionEditView;
  /**
   * What the edit scenario intends to persist, accumulated as the form-entry steps run. The read-back
   * Then asserts exactly these, so the oracle is the values the test DECIDED (deterministic) rather
   * than anything re-derived from the DB.
   */
  inspectionEdited?: {
    inspectionDate?: string;
    inspector?: string;
    siteOperatorPresentInd?: 'Y' | 'N';
    comments?: string;
    /** Answer applied to EVERY rendered question row (the dynamic answer-all path). */
    answerCode?: string;
    /** Follow-up detail applied to one question row, keyed by its render index. */
    followUp?: {
      index: number;
      inspectionQuestionId?: number;
      actionText: string;
      dueDate: string;
      completedInd: 'Y' | 'N';
    };
  };
  /** Header values a scenario changed via the UI, for the API read-back assertion. */
  expected?: Record<string, unknown>;
  /** HTTP status the view screen's DELETE returned — lets a Then tell "removed" from "refused". */
  deleteStatus?: number;
  /** Id of the DISPOSABLE legacy (LGCS) check scale a read-only-legacy probe seeded. */
  legacyDetailCheckScaleId?: string;
  /** Status of the last mutation aimed at that legacy record (PUT or DELETE), for the following Then. */
  legacyGuardStatus?: number;
  /** Id of an inspection question created via the API (UC-CCQ-001), for read-back + cleanup. */
  questionId?: string;
  /** The body currently intended to be saved (mutated as form-entry steps run) — read-back comparand. */
  questionBody?: InspectionQuestionBody;
  /** Immutable snapshot of the seeded body, taken before any edits — comparand for "only X changed". */
  originalQuestionBody?: InspectionQuestionBody;
  /** Outcome of a direct question-detail GET (UC-CCQ-002 S07 not-found), asserted by the following Then. */
  questionDetailResponse?: { status: number; code?: string };
  /** Id of a Mark Site Designation created via the UI (UC-MSD-001 S01/S02) OR API-seeded for update
   * (UC-MSD-002), for read-back + DB cleanup. */
  msdId?: string;
  /** The scale site S02/S06/S10 added (per-worker, to avoid the (mark,site) unique-key collision) — read-back comparand. */
  msdScaleSiteId?: string;
  /** Id of the signatory block seeded under the letter reg/dist (UC-RPT-009), reused to issue the S02 letter
   * out-of-band; registered for cleanup via `createdSignatureBlockIds`. */
  letterSignatoryBlockId?: string;
  /** Set when the record under edit is a REAL letter record (UC-MSD-002 S04) that SHOULD render locked —
   * tells the shared open step not to apply the letterless-record unlock recovery (see Bug #1 workaround). */
  msdExpectLetterLock?: boolean;
  /** The `window.confirm` message the MSD-view Delete raised (UC-MSD-004) — asserted against CNF-001. */
  deleteConfirmMessage?: string;
  /** Code of an appointment type created via the UI or API-seeded (UC-MNT-003), for read-back + cleanup. */
  appointmentTypeCode?: string;
  /** The appointment-type body currently intended to be saved (mutated as form steps run) — read-back comparand. */
  appointmentTypeBody?: AppointmentTypeBody;
  /** Immutable snapshot of the seeded appointment-type body, before any edits — comparand for "only X changed". */
  originalAppointmentTypeBody?: AppointmentTypeBody;
  /** Id of a signature block created via the UI or API-seeded (UC-MNT-001), for read-back + cleanup. */
  signatoryId?: string;
  /** The signature-block body currently intended to be saved (mutated as form steps run) — read-back comparand. */
  signatureBlockBody?: SignatureBlockBody;
  /** Composite key of an exam/upgrade created via the UI or API-seeded (UC-MNT-002), for read-back + cleanup. */
  examUpgradeClassCode?: string;
  examUpgradeTypeId?: string;
  /** The exam/upgrade body currently intended to be saved (mutated as form steps run) — read-back comparand. */
  examUpgradeBody?: ExamUpgradeBody;
  /** Composite key of a valid-licence-attribute created via the UI (UC-MNT-004), for read-back + cleanup. */
  vlaGradingSystemCode?: string;
  vlaAppointmentType?: string;
  /** The valid-licence-attribute body currently intended to be saved — read-back comparand. */
  vlaBody?: VlaBody;
  /** Composite key of an authorization clause created via the UI or API-seeded (UC-SSC-001), for read-back + cleanup. */
  authClauseMethodCode?: string;
  authClauseId?: string;
  /** The authorization-clause body currently intended to be saved (mutated as form steps run) — read-back comparand. */
  authClauseBody?: AuthClauseBody;
  /** Composite key of a condition created via the UI or API-seeded (UC-SSC-002), for read-back + cleanup. */
  conditionClassCode?: string;
  conditionId?: string;
  /** The condition body currently intended to be saved (mutated as form steps run) — read-back comparand. */
  conditionBody?: ConditionBody;
  /** Id of a scale-auth template created via the UI or API-seeded (UC-CCQ-003), for read-back + cleanup. */
  templateId?: string;
  /** The template body currently intended to be saved (mutated as form steps run) — read-back comparand. */
  templateBody?: TemplateBody;
  /** Immutable snapshot of the seeded template, taken before any edits — the comparand the edit-mode
   * Reset/Back scenarios need, since the form-entry steps overwrite `templateBody`. */
  originalTemplateBody?: TemplateBody;
  /** The WMSG welcome-message value captured before a UC-SYS-002 scenario (restored on teardown). */
  wmsgOriginal?: string;
  /** The new welcome-message value a UC-SYS-002 scenario entered — read-back comparand. */
  wmsgNewValue?: string;
  /** UC-QRY-001 blank-search divergence: whether the blank submit dispatched a GET /clients/search.
   * Captured in the When via a bounded waitForRequest armed BEFORE the click, so the prove-the-negative
   * is deterministic rather than dependent on assertion timing. */
  blankClientSearchDispatched?: boolean;
  /** Which Work Bench section the current UC-SCA-009/010/011 scenario exercises. */
  wbSection?: 'scaler' | 'scaleSite' | 'markSite';
  /** The seeded expiring authorization id under test on the Work Bench. */
  wbAuthId?: string;
  /** The id of the record produced by an Add/renew on the Work Bench (read from the nav URL). */
  wbRenewedId?: string;
  /** Id of the authorization under test — a SCALER authorization (UC-SCA-001 UI / UC-SCA-002/003/004 seed)
   * OR a SCALE SITE authorization (UC-SCA-005 UI / UC-SCA-006/007/008 seed), for read-back + DELETE cleanup.
   * NOTE: the two share this field but use DIFFERENT cleanup registries (`createdScalerAuthIds` vs
   * `createdScaleSiteAuthIds`) and DIFFERENT DELETE endpoints — a single scenario must not mix a scaler-auth
   * Given with a scale-site-auth Given, or the record registered under the wrong registry leaks. */
  scaId?: string;
  /** The scale site the SCALER authorization under test carries (District Wide = No) — read-back comparand. */
  scaScaleSiteId?: string;
  /** The expiry snapshotted when a SCA edit form loaded (scaler UC-SCA-002 or scale-site UC-SCA-006) —
   * comparand for the Reset scenario, so the restored value is asserted without hardcoding a date. */
  scaOrigExpiry?: string;
  /** Licence no of a scaler created via the UI (UC-SCL-002), for read-back + DELETE cleanup. */
  scalerLicenceNo?: string;
  /** The client number the created scaler was filed under — read-back comparand. */
  scalerClient?: string;
  /** Id of a scale site risk assessment created via the UI (UC-RSK-007 S01) or API-seeded (S03/S05/S07),
   * for read-back + DB cleanup. */
  riskAssessmentId?: string;
  /** SEC-8: the status the last API-level access probe returned, for the following Then. */
  apiStatus?: number;
  /** SEC-8: the same probe re-issued as an administrator — the contrast that proves a deny is the
   * ROLE's doing and not a broken endpoint. */
  baselineApiStatus?: number;
  /** SEC-8: id of the seeded in-force authorization that entitles the mock client to a scale site. */
  entitlementAuthId?: string;
  /** SEC: id + kind of the disposable check scale a delete-denial probe aimed at, for the read-back. */
  probeCheckScaleId?: string;
  probeCheckScaleKind?: 'detail' | 'summary';
  /** SEC-9: rows returned by a scoped search that ASKED for another client — the only evidence that the
   * server discarded the requested client and bound the caller's own. A status code cannot show it. */
  scopedSiteIds?: string[];
  scopedScalerLicences?: string[];
  /** SEC-10 (CHK): per-tab verdicts for the in-page write controls, collected across several page loads
   * so one Then can report EVERY leak at once rather than failing on the first. A control's tab has to be
   * opened to judge it, so the loop lives in the When and this carries its findings out. */
  chkControlVerdicts?: ControlVerdict[];
  /** SEC-10 (CHK): distinct org-unit names a search returned, for the inert-scoping assertion. Compared
   * against an administrator's rather than a hardcoded count, so a re-extract cannot make it stale. */
  chkOrgUnitNames?: string[];
  chkAdminOrgUnitNames?: string[];
  /** SEC-10 (CLE/SUP/RM): per-tab verdicts for the read-only column's write-control sweep. Same shape and
   * reason as `chkControlVerdicts`, kept separate so the two suites cannot read each other's findings. */
  readOnlyControlVerdicts?: ControlVerdict[];
  /** SEC-10 (CLE/SUP/RM): distinct org-unit names, for this column's inert-scoping assertion. */
  readOnlyOrgUnitNames?: string[];
  readOnlyAdminOrgUnitNames?: string[];
  /** SEC-10 (DM/CET/DSM/RSM): registry-driven write-control sweep verdicts for the role under test. */
  roleColumnVerdicts?: ControlVerdict[];
  /** SEC-10: the same sweep run as a NARROW role — the inverse contrast the widest column needs, since
   * an administrator holds everything and so cannot show a control is gated rather than ungated. */
  roleColumnNarrowVerdicts?: ControlVerdict[];
  /** Id of a scaler performance remark seeded via API (UC-PRF-002/003) or created via UI, for read-back. */
  performanceRemarkId?: string;
  /** The scaler licence the current performance-remark scenario operates on — read-back/cleanup key. */
  performanceRemarkScalerLicenceNo?: string;
  /** Description a UC-PRF scenario entered/edited via the UI — read-back comparand. */
  performanceRemarkExpectedDesc?: string;
  /** Which Issue-Type arm a UC-PRF create scenario used — drives the read-back's code assertions. */
  performanceRemarkExpectedIssueType?: 'Action' | 'Outcome';
  /** Suggested filename of the report download a UC-RPT-* delivery/generation scenario captured. */
  reportDownloadFilename?: string;
  /** On-disk path of a REALLY-generated report download, so its bytes/format can be asserted. */
  reportDownloadPath?: string;
  /** SEC-5: the record's five audit fields as the API reports them, read in the When so the Then can
   * compare the popup against the record itself rather than against pinned values that a re-extract or
   * another suite's write would invalidate. */
  apiAudit?: Record<string, string>;
  /** SEC-5: how many audit triggers the host screen offered — 0 is the assertion for a non-IDIR user. */
  auditTriggerCount?: number;
  /** SEC-5: per-host sweep results, so one Then reports EVERY host missing the affordance rather than
   * failing on the first. Same reason as the write-control verdict arrays above. */
  auditHostVerdicts?: { record: string; auditApiPath: string; triggers: number }[];
  /** SEC-5: the audit read of the host the scenario opened, so the comparison follows the record. */
  auditHostPath?: string;
  /** SEC-1: the Current News value written to the shared WMSG row by the end-to-end scenario, so the
   * read-back asserts THIS scenario's payload and a concurrent overwrite fails loudly instead of
   * passing on someone else's value. */
  newsWritten?: string;
  /** SEC-1: what `GET /api/welcome` returned for `currentNews` — the evidence for whether the server
   * sanitizes (it does not) as distinct from what the page renders. */
  newsFromApi?: string;
};

export type GlobalFixtures = {
  world: ScsWorld;
};

export const globalTest = base.extend<GlobalFixtures>({
  world: async ({}, use) => {
    await use({});
  },
});
