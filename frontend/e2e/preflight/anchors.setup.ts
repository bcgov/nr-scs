import { test, expect, type APIRequestContext } from '@playwright/test';

import { daysAgo } from '../fixtures/common/dates';
import {
  INSPECTION_TYPES,
  INSPECTOR_GUID,
  SITE_TYPES,
  inspectionHappyPathSite,
  inspectionSecondarySite,
  inspectionSeedHeader,
} from '../fixtures/ins/ins-test-data';
import { legacyCheckScaleId } from '../fixtures/chk/chk-test-data';
import { creatableTimberMark } from '../fixtures/msd/msd-test-data';
import { nextGeneratedScaleSiteIdOrNull } from '../steps/sst/scaleSiteDbCleanup';
import {
  formatStuckScalers,
  formatSweptScalers,
  sweepScalerResidue,
} from '../steps/scl/scalerResidueSweep';
import {
  appointmentClientNumber,
  examClientNumber,
  duplicateRuleClientNumber,
} from '../fixtures/scl/scaler-test-data';
import { anchorScalerLicenceNo, updateSeedClientNumber } from '../fixtures/scl/scaler-edit-test-data';
import {
  appointmentSeedClientNumber,
  appointmentUpdateSeedClientNumber,
  appointmentDeleteSeedClientNumber,
} from '../fixtures/scl/scaler-appointment-test-data';
import { examSeedClientNumber, examUpdateSeedClientNumber, examDeleteSeedClientNumber, anchorExamRowCount, anchorUpgTypeDescription, anchorEditableRowDate } from '../fixtures/scl/scaler-exam-test-data';
import { multiResultSiteName, singleResultScaleSite } from '../fixtures/qry/qry-scale-site-test-data';
import { complianceInspectionId } from '../fixtures/rpt/report-test-data';
import { riskHappyPathSite, inRangeAnswers, RSK_TEMPLATE } from '../fixtures/rsk/rsk-test-data';
import {
  clientFilter,
  districtFilter,
  levelFilter,
  multiCriteriaLicenceAndLevel,
  multiResultLicence,
  noMatchAssessmentId,
  pagedLevel,
  singleResultAssessment,
  sortByLevelThenId,
  wildcardAssessmentId,
} from '../fixtures/rsk/scaler-risk-assessment-test-data';
import {
  SCALER_RSK_TEMPLATE,
  scalerHappyPath,
  scalerInRangeAnswers,
} from '../fixtures/rsk/scaler-risk-complete-test-data';
// Scale-site risk search fixtures share export names with the scaler ones above, so namespace-import them.
import * as scaleSiteRsk from '../fixtures/rsk/scale-site-risk-assessment-test-data';
// PRF anchors. `prfAnchorScalerLicenceNo` is prf-prefixed at source (the SCL edit fixture also exports an
// `anchorScalerLicenceNo`); the other three are prf-unique names, aliased here only for local clarity.
import {
  prfAnchorScalerLicenceNo,
  emptyStateScalerLicenceNo as prfEmptyStateScalerLicenceNo,
  validCheckScaleId as prfValidCheckScaleId,
  nonExistentCheckScaleId as prfNonExistentCheckScaleId,
} from '../fixtures/prf/performance-remark-test-data';
// SEC-11 cross-cutting anchors. Namespace-imported: several names (`ownScaleSiteId`, `ownContactId`)
// are deliberately shared with the per-role security fixtures, so a flat import would collide.
import * as xcut from '../fixtures/security/cross-cutting-test-data';
import { nonexistentRecordId } from '../fixtures/security/write-verb-test-data';

/**
 * Suite PREFLIGHT — runs once (as a Playwright `setup` project that the `chromium` project depends on)
 * before any scenario. It asserts the **anchors the fixtures pin still resolve** in the loaded DB, so a
 * stale DB (or a backend that booted before its DB, serving a warm-but-stale LOV cache) fails HERE with
 * one clear message — instead of dozens of confusing mid-suite failures. The primary thing to guard is
 * **applied-seed presence**: the per-container seed patches (`scs-real-test-data-patches/`, applied via
 * `scripts/apply-patches.sh`) are NOT baked into the DB image, so a fresh container that skipped them
 * passes every real-data check yet fails all seed-dependent creates mid-suite — exactly what a preflight
 * must catch. EXHAUSTIVE extract drift is deliberately NOT chased here (a re-extract is a full re-ground
 * event of its own) — but the SPECIFIC pinned anchors each suite hard-codes (CHK's detail check scale,
 * QRY's TEMBEC-family count + site-520 cell data, RSK's scaler-risk counts + assessment-723 cell data,
 * INS's sites) ARE asserted, so a reseed that shifts one fails HERE with a re-ground pointer rather than as
 * an opaque mid-suite assertion mismatch. Nearly all checks go through the app's own API (the one write is
 * immediately deleted); the sole exception is the SST create-seed guard, which shells out to sqlplus
 * because THE.INTEGER_NUMBER has no read API — read-only, using the same SQLPLUS/ORACLE_DSN convention as
 * the suite's DB teardowns (sqlplus is already a documented suite prerequisite: apply-patches.sh needs it).
 */

/** The empty-list site (forest_client-backed, never mutated); a literal in the INS empty-list feature.
 *  Re-grounded 2026-07-21 (was 561): this extract loaded inspections onto all the old forest_client
 *  sites, so the empty-list site moved to 16H — forest_client-backed with ZERO scale_inspection_report
 *  rows (GET /api/scale-sites/16H/inspections -> []). Re-verify/re-pin on any re-extract. */
const INS_EMPTY_LIST_SITE = '16H';

/** The Reg / Dist org-unit code every RPT scenario filters on; a literal ("DCC") in the rpt feature files
 *  and in `fixtures/admin/maintenance/signature-block-test-data.ts`. It must be present in the
 *  region/district LOV or the `I select the report Reg / Dist "DCC"` step times out waiting for its
 *  `<option>` — including in every `@generation` scenario, which filters to it so the render stays under
 *  the timeout. Keep in sync with the literal in the features. */
const RPT_REG_DIST = 'DCC';

/** The site whose inspection list carries the compliance-report anchor below. */
const RPT_COMPLIANCE_SITE = '520';

async function jsonOrThrow(req: APIRequestContext, url: string, hint: string): Promise<unknown> {
  const res = await req.get(url);
  expect(res.ok(), `[preflight] ${hint} — GET ${url} returned HTTP ${res.status()}. ${REGROUND}`).toBeTruthy();
  return res.json();
}

const REGROUND =
  'Re-ground: reload the real extract + seed patches (README step 1), evict the LOV cache ' +
  '(POST /api/api/internal/cache/evict) or restart the backend, then re-verify the pinned fixture values.';

test('preflight: INS create-init resolves (backend up, cache warm, site 520 + question set)', async ({ request }) => {
  const site = inspectionHappyPathSite.scaleSiteIdNmbr;
  const init = (await jsonOrThrow(
    request,
    `/api/scale-sites/${site}/inspections/create` +
      `?inspectionTypeCode=${INSPECTION_TYPES.minor.code}&siteTypeCodes=${SITE_TYPES.weight.code}`,
    `INS create-init for site ${site} (MIN/W)`,
  )) as { questionResponses?: unknown[] };
  expect(
    (init.questionResponses ?? []).length,
    `[preflight] INS create-init for site ${site} returned no questions — stale LOV cache or missing ` +
      `question mappings. ${REGROUND}`,
  ).toBeGreaterThan(0);
});

test('preflight: INS full write chain resolves (inspector GUID + forest_client join)', async ({ request }) => {
  const site = inspectionHappyPathSite.scaleSiteIdNmbr;
  const init = (await jsonOrThrow(
    request,
    `/api/scale-sites/${site}/inspections/create` +
      `?inspectionTypeCode=${inspectionSeedHeader.inspectionTypeCode}` +
      `&siteTypeCodes=${inspectionSeedHeader.siteTypeCodes.join('&siteTypeCodes=')}`,
    `INS create-init (seed) for site ${site}`,
  )) as { questionResponses?: { inspectionQuestionId: number }[] };
  const questionResponses = (init.questionResponses ?? []).map((q) => ({
    inspectionQuestionId: q.inspectionQuestionId,
    inspectionAnswerCode: 'Y',
    followUpRequiredInd: 'N',
  }));

  const createRes = await request.post(`/api/scale-sites/${site}/inspections`, {
    data: {
      inspectionTypeCode: inspectionSeedHeader.inspectionTypeCode,
      siteTypeCodes: inspectionSeedHeader.siteTypeCodes,
      inspectionDate: daysAgo(1),
      inspector: INSPECTOR_GUID,
      siteOperatorPresentInd: inspectionSeedHeader.siteOperatorPresentInd,
      comments: 'e2e preflight anchor check',
      questionResponses,
    },
  });
  expect(
    createRes.ok(),
    `[preflight] INS create on site ${site} with inspector ${INSPECTOR_GUID} failed: HTTP ${createRes.status()} — ` +
      `${await createRes.text()}. This is the read-back INNER JOIN chain (site owner in forest_client + GUID in ` +
      `scs_user_info_vw). ${REGROUND}`,
  ).toBeTruthy();

  // Clean up the anchor row immediately — preflight must leave the DB as found.
  const id = ((await createRes.json()) as { inspectionId: number }).inspectionId;
  const del = await request.delete(`/api/scale-sites/inspection/${id}`);
  expect(
    del.ok() || del.status() === 404,
    `[preflight] failed to delete preflight inspection ${id}: HTTP ${del.status()} — investigate before re-running.`,
  ).toBeTruthy();
});

test('preflight: INS read-only sites resolve (secondary + empty-list)', async ({ request }) => {
  for (const site of [inspectionSecondarySite.scaleSiteIdNmbr, INS_EMPTY_LIST_SITE]) {
    const res = await request.get(`/api/scale-sites/${site}/inspections`);
    expect(
      res.ok(),
      `[preflight] INS site ${site} inspections list returned HTTP ${res.status()}. ${REGROUND}`,
    ).toBeTruthy();
  }
});

test('preflight: MSD create seed applied (mark ES20R4 resolves the holder view)', async ({ request }) => {
  // Seed-presence guard. The MSD create two-gate mark is bridged by a per-container seed
  // (scs-real-test-data-patches/msd/msd-create-mark.sql, applied via scripts/apply-patches.sh) that is
  // NOT baked into the DB image. When applied, the mark-holder lookup returns 200; when the seed is
  // missing it returns 404, so every MSD create (UC-MSD-001/002) would otherwise fail mid-suite not here.
  const res = await request.get(`/api/mark-site-designations?timberMark=${creatableTimberMark}`);
  expect(
    res.ok(),
    `[preflight] MSD create seed missing — GET /api/mark-site-designations?timberMark=${creatableTimberMark} ` +
      `returned HTTP ${res.status()} (expected 200; the mark-holder view has no row for ${creatableTimberMark}). ` +
      `Apply the seed patches: ./scripts/apply-patches.sh (runs scs-real-test-data-patches/msd/msd-create-mark.sql; ` +
      `they are NOT baked into the DB image), then evict the LOV cache (POST /api/api/internal/cache/evict) or restart the backend.`,
  ).toBeTruthy();
});

test('preflight: SST create seed applied (INTEGER_NUMBER seeded so the scale-site id generator resolves)', () => {
  // Seed-presence guard — the SST analogue of the MSD guard above. The scale-site PK is generated by a
  // BEFORE-INSERT trigger (SCS_SCST_BR_IU_TRG) that reads the THE.INTEGER_NUMBER helper table, which the
  // one-hop real extract leaves EMPTY (nothing FKs to it), so MIN(free id) is NULL and every scale-site
  // create fails with a sanitized ORA-01400 -> HTTP 500. That is bridged by a per-container seed
  // (scs-real-test-data-patches/sst/integer-number-seed.sql, applied via scripts/apply-patches.sh) that is
  // NOT baked into the DB image. Without it, all six UC-SST-004 create scenarios (and any test that creates
  // a scale site — UC-SST-005 update seeds its own site, etc.) would otherwise fail mid-suite as an opaque
  // 500, not here. There is NO read API for INTEGER_NUMBER, so — like the SST teardown cleanup, and per the
  // review — this probe shells out to sqlplus (SQLPLUS/ORACLE_DSN env, default local Docker DSN; point
  // SQLPLUS at scripts/docker-sqlplus.sh on a host with no Oracle client). Read-only: it runs the trigger's
  // own generator expression and asserts it yields a non-null id, leaving the DB exactly as found.
  let nextId: string | null;
  try {
    nextId = nextGeneratedScaleSiteIdOrNull();
  } catch (err) {
    // sqlplus itself could not run — an environment/setup problem (missing Oracle client, bad DSN,
    // DB down), NOT a missing seed. It also breaks SST teardown, so surface it as its own failure.
    throw new Error(
      `${(err as Error).message}\n[preflight] Could not verify the SST create seed because the sqlplus probe ` +
        `did not run. Ensure the local Docker DB is up and sqlplus is reachable — on a host with no Oracle ` +
        `client on PATH, set SQLPLUS=scripts/docker-sqlplus.sh (see e2e/README.md). This same client is ` +
        `required by the SST DB teardown.`,
    );
  }
  expect(
    nextId,
    `[preflight] SST create seed missing — THE.INTEGER_NUMBER is empty, so the scale-site PK trigger ` +
      `(SCS_SCST_BR_IU_TRG) generates a NULL id and every scale-site create returns HTTP 500 (sanitized ` +
      `ORA-01400). Apply the seed patches: ./scripts/apply-patches.sh (runs ` +
      `scs-real-test-data-patches/sst/integer-number-seed.sql, which seeds integers 1..9999; they are NOT ` +
      `baked into the DB image), then evict the LOV cache (POST /api/api/internal/cache/evict) or restart ` +
      `the backend.`,
  ).not.toBeNull();
});

test('preflight: CHK pinned detail check scale still exists', async ({ request }) => {
  const rows = (await jsonOrThrow(
    request,
    `/api/check-scales/search?checkScaleId=${legacyCheckScaleId}`,
    `CHK legacy check scale ${legacyCheckScaleId}`,
  )) as unknown[];
  expect(
    rows.length,
    `[preflight] CHK pinned check scale ${legacyCheckScaleId} not found (expected 1 row). ${REGROUND}`,
  ).toBe(1);
});

test('preflight: SCL anchors resolve (edit anchor + training rows exist; seed clients own no scaler)', async ({ request }) => {
  // The read-only edit/address anchor must exist.
  const anchor = await request.get(`/api/scalers/${anchorScalerLicenceNo}`);
  expect(
    anchor.ok(),
    `[preflight] SCL edit anchor scaler ${anchorScalerLicenceNo} not found — GET returned HTTP ${anchor.status()}. ${REGROUND}`,
  ).toBeTruthy();

  // The Exams / Upgrades read-only slices (filter/validation/reset/cancel) hard-assert anchor 5828's training
  // rows: the unfiltered count, the type-1 "Interior Grading 1" row, and its completion date. Pin them here so a
  // re-extract that shifts the anchor's rows fails LOUD with a re-ground pointer, not as an opaque filter/reset
  // mismatch mid-suite.
  const anchorExams = (await jsonOrThrow(
    request,
    `/api/scalers/${anchorScalerLicenceNo}/exams`,
    `SCL exam anchor ${anchorScalerLicenceNo} training rows`,
  )) as Array<{ scalerTrainingTypeId?: string; completionDate?: string }>;
  expect(
    anchorExams.length,
    `[preflight] SCL exam anchor ${anchorScalerLicenceNo} has ${anchorExams.length} training rows; expected ` +
      `${anchorExamRowCount} (the filter/reset slices assert this count). ${REGROUND}`,
  ).toBe(anchorExamRowCount);
  const editableRow = anchorExams.find((row) => row.scalerTrainingTypeId === '1');
  expect(
    editableRow?.completionDate,
    `[preflight] SCL exam anchor ${anchorScalerLicenceNo} is missing its type-1 "${anchorUpgTypeDescription}" row ` +
      `with completion date ${anchorEditableRowDate} (the validation/reset slices assert both). ${REGROUND}`,
  ).toBe(anchorEditableRowDate);

  // (No appointment-count guard: the UC-SCL-005/006 appointment Edit/Delete slices now SEED their own
  // scaler+appointment rather than relying on this anchor owning one, so nothing here depends on the
  // anchor's appointment state — the PR #46 V1 guard is superseded by that root-cause fix.)

  // The create/seed happy paths require these clients to own NO scaler (UNIQUE key SCLR_UK). Unlike extract
  // drift, "still owns no scaler" is SUITE-INFLICTED state a leaked create can silently invalidate.
  //
  // We now SWEEP that state rather than only asserting it. Per-test cleanup (steps/fixtures/scl.ts) already
  // handles an ordinary failure, but it cannot run at all when a run is interrupted or a worker dies, and it
  // never sees a create whose response was lost in flight. Before this sweep, any one of those burned the
  // client's SCLR_UK slot and then failed EVERY subsequent run until a human deleted the row by hand (that is
  // the scaler-178Y-on-00001481 case). The sweep deletes only mock-auth-written rows and REPORTS what it took,
  // so a leak stays diagnosable instead of becoming a permanent block. See steps/scl/scalerResidueSweep.ts.
  const sclSeedClients = [appointmentClientNumber, examClientNumber, duplicateRuleClientNumber, updateSeedClientNumber, appointmentSeedClientNumber, appointmentUpdateSeedClientNumber, appointmentDeleteSeedClientNumber, examSeedClientNumber, examUpdateSeedClientNumber, examDeleteSeedClientNumber];

  const { swept, stuck } = await sweepScalerResidue(request, sclSeedClients);
  if (swept.length > 0) {
    console.warn(
      `[preflight] SCL swept ${swept.length} leaked scaler(s) off the pinned seed clients — a previous run did ` +
        `not clean up after itself. The run continues; investigate the teardown path that missed them:\n` +
        `${formatSweptScalers(swept)}`,
    );
  }
  expect(
    stuck,
    `[preflight] SCL seed-client residue could NOT be cleared:\n${formatStuckScalers(stuck)}\n` +
      `Remove it by hand (DELETE /api/scalers/{no}) or re-pin the client in fixtures/scl/. ${REGROUND}`,
  ).toEqual([]);

  // Contract re-verified after the sweep: every pinned client must now be scaler-free. This still fails loud
  // if something occupies a slot that the sweep was not entitled to remove.
  for (const client of sclSeedClients) {
    const rows = (await jsonOrThrow(
      request,
      `/api/scalers/search?clientNumber=${client}`,
      `SCL seed client ${client} scaler-free check`,
    )) as unknown[];
    expect(
      rows.length,
      `[preflight] SCL seed client ${client} still owns a scaler after the residue sweep (${rows.length} found; ` +
        `expected 0). Delete the stray scaler (DELETE /api/scalers/{no}) or re-pin the client in ` +
        `fixtures/scl/. ${REGROUND}`,
    ).toBe(0);
  }
});

// UC-PRF-001/002/003 pin four preconditions that scenarios assert but nothing guarded until now. Guarded
// here so a reseed fails with a re-ground pointer, not an opaque mid-suite mismatch:
//   • create anchor 5828 is reachable (its remarks list resolves) — gates every PRF scenario;
//   • empty-state scaler 7443 (READ-ONLY) has zero remarks — asserted directly by the empty-list scenario;
//   • check scale 145988 EXISTS — the valid-FK create arm links it (create.feature);
//   • check scale 1146996 is ABSENT — the server-side "could not be found for 1146996." rejection, twice.
// nonExistentCheckScaleId = MAX(check_scale_id)+999999, so a re-extract that GROWS the table can make it
// resolve and silently invalidate those two rejection scenarios — the highest-value guard here.
//
// NOT gate-guarded: anchor 5828's "0 remarks" COUNT. Unlike 7443 (read-only), 5828 is written by every
// create/update/delete scenario, so its 0-remarks state is SUITE-INFLICTED — and it gates NO scenario (PRF
// assertions are id-scoped; see the fixture header). By the same reasoning the 044E back-out scaler is not
// gated above, asserting it HERE would let one leaked remark from an interrupted run hard-block EVERY
// domain's tests. That invariant is instead enforced at teardown, where the createdRemarks cleanup fails
// LOUD on residue (blast radius: one run, not the next whole suite).
test('preflight: PRF anchors resolve (5828 reachable, 7443 empty, check scale 145988 present / 1146996 absent)', async ({ request }) => {
  // Create anchor 5828: reachable (existence/drift guard). Count intentionally NOT asserted — see above.
  await jsonOrThrow(
    request,
    `/api/scalers/${prfAnchorScalerLicenceNo}/performance-remarks`,
    `PRF create anchor scaler ${prfAnchorScalerLicenceNo} remarks list`,
  );

  // Empty-state scaler 7443 (read-only) must have zero remarks — a reseed that loads any onto it breaks the
  // empty-list scenario. Read-only, so this can only drift via re-extract (never suite-inflicted).
  const emptyRemarks = (await jsonOrThrow(
    request,
    `/api/scalers/${prfEmptyStateScalerLicenceNo}/performance-remarks`,
    `PRF empty-state scaler ${prfEmptyStateScalerLicenceNo} remarks list`,
  )) as unknown[];
  expect(
    emptyRemarks.length,
    `[preflight] PRF empty-state scaler ${prfEmptyStateScalerLicenceNo} now has ${emptyRemarks.length} ` +
      `performance remarks (expected 0) — breaks the empty-list scenario; re-pin emptyStateScalerLicenceNo in ` +
      `fixtures/prf/performance-remark-test-data.ts. ${REGROUND}`,
  ).toBe(0);

  // Valid-FK create arm: check scale 145988 must still exist (the create write path enforces the FK via
  // checkScaleService.existsById; create.feature links it).
  const present = (await jsonOrThrow(
    request,
    `/api/check-scales/search?checkScaleId=${prfValidCheckScaleId}`,
    `PRF valid check scale ${prfValidCheckScaleId}`,
  )) as unknown[];
  expect(
    present.length,
    `[preflight] PRF valid check scale ${prfValidCheckScaleId} not found (expected 1 row) — breaks the ` +
      `link-a-check-scale create arm; re-pin validCheckScaleId in fixtures/prf/performance-remark-test-data.ts. ${REGROUND}`,
  ).toBe(1);

  // Server-rejection arm: check scale 1146996 must be ABSENT. If the extract grew past MAX(check_scale_id)+
  // 999999 this now resolves, silently invalidating the two "A check scale could not be found for 1146996."
  // scenarios (a real row would be accepted, not rejected).
  const absent = (await jsonOrThrow(
    request,
    `/api/check-scales/search?checkScaleId=${prfNonExistentCheckScaleId}`,
    `PRF absent check scale ${prfNonExistentCheckScaleId}`,
  )) as unknown[];
  expect(
    absent.length,
    `[preflight] PRF "non-existent" check scale ${prfNonExistentCheckScaleId} now resolves (${absent.length} ` +
      `rows; expected 0) — the extract grew past MAX(check_scale_id)+999999, so the two "could not be found ` +
      `for ${prfNonExistentCheckScaleId}." rejection scenarios are invalid; re-derive nonExistentCheckScaleId ` +
      `in fixtures/prf/performance-remark-test-data.ts. ${REGROUND}`,
  ).toBe(0);
});

// QRY-004 search asserts EXACT counts + cell data against read-only real-extract rows (search.feature:16
// %TEMBEC%->3, :28 520->1, :30 the 520 row's name/region/district/site-type/owner). These two guards pin
// that data so a reseed shifting the TEMBEC family or the 520 row fails LOUD here — with a re-ground
// pointer — instead of as an opaque S01/S02 mismatch mid-suite. Sort params are omitted: they only order
// the rows, and both guards assert on membership / a specific row, not on position.
test('preflight: QRY scale-site name anchor resolves (TEMBEC family count + site 520 present)', async ({ request }) => {
  const rows = (await jsonOrThrow(
    request,
    `/api/scale-sites/search?siteName=${encodeURIComponent(multiResultSiteName.value)}`,
    `QRY name search "${multiResultSiteName.value}"`,
  )) as { scaleSiteIdNmbr?: string | null }[];
  expect(
    rows.length,
    `[preflight] QRY name search "${multiResultSiteName.value}" returned ${rows.length} rows (expected ` +
      `${multiResultSiteName.expectedCount}) — the TEMBEC family drifted (breaks search.feature:16). ${REGROUND}`,
  ).toBe(multiResultSiteName.expectedCount);
  expect(
    rows.some((r) => r.scaleSiteIdNmbr === multiResultSiteName.aScaleSiteId),
    `[preflight] QRY name search "${multiResultSiteName.value}" no longer includes anchor site ` +
      `${multiResultSiteName.aScaleSiteId} (breaks search.feature:17). ${REGROUND}`,
  ).toBeTruthy();
});

test('preflight: QRY scale-site 520 row anchor resolves (exact count + pinned cell data)', async ({ request }) => {
  const rows = (await jsonOrThrow(
    request,
    `/api/scale-sites/search?scaleSiteIdNmbr=${encodeURIComponent(singleResultScaleSite.value)}`,
    `QRY scale-site # search "${singleResultScaleSite.value}"`,
  )) as {
    siteName?: string | null;
    region?: string | null;
    district?: string | null;
    methodTypeCodeName?: string | null;
    ownerClientNumber?: string | null;
    ownerClientLocnCode?: string | null;
  }[];
  expect(
    rows.length,
    `[preflight] QRY scale-site # search "${singleResultScaleSite.value}" returned ${rows.length} rows ` +
      `(expected ${singleResultScaleSite.expectedCount}; breaks search.feature:28). ${REGROUND}`,
  ).toBe(singleResultScaleSite.expectedCount);
  const row = rows[0] ?? {};
  // The results table shows a composed "Site Owner (Client / Loc)" cell (ownerClientDisplay) = client/loc.
  const actual = {
    siteName: row.siteName,
    region: row.region,
    district: row.district,
    siteType: row.methodTypeCodeName,
    ownerDisplay: `${row.ownerClientNumber ?? ''}/${row.ownerClientLocnCode ?? ''}`,
  };
  expect(
    actual,
    `[preflight] QRY scale-site ${singleResultScaleSite.value} cell data drifted from the pinned fixture ` +
      `(breaks search.feature:30). ${REGROUND}`,
  ).toEqual({
    siteName: singleResultScaleSite.siteName,
    region: singleResultScaleSite.region,
    district: singleResultScaleSite.district,
    siteType: singleResultScaleSite.siteType,
    ownerDisplay: singleResultScaleSite.ownerDisplay,
  });
});

// RSK create-init pins: the active SCSI template id + every (question -> answer) the in-range set uses.
// The rating a create computes is a PRODUCT of section answer-weight sums that must land inside template
// 6's risk ranges (18-141) or the created row is invisible to every read path — so if a re-extract shifts
// the active template or renumbers questions/answers, this READ-ONLY check fails HERE with a re-ground
// pointer instead of as an opaque "create rolled back / 404" mid-suite. Read-only by necessity: RSK has no
// delete endpoint, so preflight cannot create-then-clean an anchor row (the DB-level cleanup used by the
// scenarios needs an Oracle client, which preflight avoids).
test('preflight: RSK create-init resolves (site 520 + active SCSI template + pinned question/answer ids)', async ({ request }) => {
  const site = riskHappyPathSite.scaleSiteIdNmbr;
  const init = (await jsonOrThrow(
    request,
    `/api/scale-sites/${site}/risk-assessments/create-init`,
    `RSK create-init for site ${site}`,
  )) as {
    templateId?: number;
    sections?: { questions?: { questionId: number; answers?: { answerId: number }[] }[] }[];
  };
  expect(
    init.templateId,
    `[preflight] RSK active template for site ${site} is ${init.templateId} (expected ${RSK_TEMPLATE.templateId}) ` +
      `— the active SCSI template drifted; re-pin fixtures/rsk/rsk-test-data.ts. ${REGROUND}`,
  ).toBe(RSK_TEMPLATE.templateId);

  const answersByQuestion = new Map<number, Set<number>>();
  for (const section of init.sections ?? []) {
    for (const q of section.questions ?? []) {
      answersByQuestion.set(q.questionId, new Set((q.answers ?? []).map((a) => a.answerId)));
    }
  }
  for (const { questionId, answerId } of inRangeAnswers) {
    expect(
      answersByQuestion.get(questionId)?.has(answerId),
      `[preflight] RSK pinned question ${questionId} / answer ${answerId} no longer in create-init for site ` +
        `${site} — the template's question/answer ids drifted; re-derive the in-range set in ` +
        `fixtures/rsk/rsk-test-data.ts. ${REGROUND}`,
    ).toBeTruthy();
  }
});
// UC-RSK-006 (scaler subject) create/edit/view pins: the active SCLE template id + every (question ->
// answer) the in-range set uses. The rating a create computes is a PRODUCT of section answer-weight sums
// that must land inside template 5's risk ranges (9-123) or the created row is invisible to every read
// path — so if a re-extract shifts the active scaler template or renumbers questions/answers, this
// READ-ONLY check fails HERE with a re-ground pointer instead of as an opaque "create rolled back / 404"
// mid-suite. These pins gate the WHOLE scaler UC, so guarding them at the suite-wide setup gate is correct.
//
// NOT guarded here: the back-out scaler (044E) starting EMPTY. That is the precondition of a single
// scenario (UC-RSK-006-S04), so it is asserted inside that scenario ("scaler 044E starts with an empty Risk
// Rating tab", steps/rsk/scalerNavigation.steps.ts) — a drifted fixture then fails ONE scenario, not the
// whole suite. Asserting it at THIS gate would let one non-empty result (a dev poking 044E by hand, a
// future test picking it up) hard-block EVERY test in EVERY domain, since setup is a dependency of the
// chromium project — the exact blast radius the 019D reasoning above argues against.
test('preflight: RSK scaler create-init resolves (019D + active SCLE template + pinned q/a ids)', async ({ request }) => {
  const lic = scalerHappyPath.scalerLicenceNo;
  const init = (await jsonOrThrow(
    request,
    `/api/scalers/${lic}/risk-assessments/create-init`,
    `RSK scaler create-init for scaler ${lic}`,
  )) as {
    templateId?: number;
    sections?: { questions?: { questionId: number; answers?: { answerId: number }[] }[] }[];
  };
  expect(
    init.templateId,
    `[preflight] RSK active scaler template for ${lic} is ${init.templateId} (expected ` +
      `${SCALER_RSK_TEMPLATE.templateId}) — the active SCLE template drifted; re-pin ` +
      `fixtures/rsk/scaler-risk-complete-test-data.ts. ${REGROUND}`,
  ).toBe(SCALER_RSK_TEMPLATE.templateId);

  const answersByQuestion = new Map<number, Set<number>>();
  for (const section of init.sections ?? []) {
    for (const q of section.questions ?? []) {
      answersByQuestion.set(q.questionId, new Set((q.answers ?? []).map((a) => a.answerId)));
    }
  }
  for (const { questionId, answerId } of scalerInRangeAnswers) {
    expect(
      answersByQuestion.get(questionId)?.has(answerId),
      `[preflight] RSK scaler pinned question ${questionId} / answer ${answerId} no longer in create-init ` +
        `for scaler ${lic} — the template's ids drifted; re-derive the in-range set in ` +
        `fixtures/rsk/scaler-risk-complete-test-data.ts. ${REGROUND}`,
    ).toBeTruthy();
  }
});

// UC-QRY-007 (scaler subject) search asserts EXACT counts + cell data against read-only real-extract rows
// (search.feature %licence 9710%->5, level Medium->1, assessment 723->1 with pinned cells; zero-results
// 99999999->[]). These two guards pin that data so a reseed shifting the scaler risk assessments fails LOUD
// here — with a re-ground pointer — instead of as an opaque mid-suite mismatch. They also make
// fixtures/rsk/scaler-risk-assessment-test-data.ts a live, consumed source of truth rather than dead prose.
test('preflight: RSK scaler risk-assessment search anchors resolve (licence 9710, level M, 99999999 empty)', async ({ request }) => {
  const byLicence = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?scalerLicenceNo=${encodeURIComponent(multiResultLicence.value)}`,
    `RSK licence search "${multiResultLicence.value}"`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byLicence.length,
    `[preflight] RSK licence search "${multiResultLicence.value}" returned ${byLicence.length} rows (expected ` +
      `${multiResultLicence.expectedCount}) — the scaler risk assessments drifted (breaks search.feature Outline). ${REGROUND}`,
  ).toBe(multiResultLicence.expectedCount);
  expect(
    byLicence.some((r) => String(r.riskQuestionnaireId) === multiResultLicence.anAssessmentId),
    `[preflight] RSK licence search "${multiResultLicence.value}" no longer includes anchor assessment ` +
      `${multiResultLicence.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  const byLevel = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?riskTypeCode=${encodeURIComponent(levelFilter.code)}`,
    `RSK level search "${levelFilter.code}" (${levelFilter.label})`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byLevel.length,
    `[preflight] RSK level="${levelFilter.code}" (${levelFilter.label}) returned ${byLevel.length} rows ` +
      `(expected ${levelFilter.expectedCount}; breaks search.feature Outline). ${REGROUND}`,
  ).toBe(levelFilter.expectedCount);

  const noMatch = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(noMatchAssessmentId)}`,
    `RSK no-match assessment id "${noMatchAssessmentId}"`,
  )) as unknown[];
  expect(
    noMatch.length,
    `[preflight] RSK no-match id "${noMatchAssessmentId}" returned ${noMatch.length} rows (expected 0; ` +
      `breaks zero-results.feature). ${REGROUND}`,
  ).toBe(0);
});

// Anchors for the multi-criteria, wildcard, and client-side-paging scenarios added for the PR review.
// Each pins an exact real-extract count so a reseed that shifts them fails LOUD here with a re-ground
// pointer rather than as an opaque mid-suite mismatch (same contract as the counts above).
test('preflight: RSK multi-criteria / wildcard / paging anchors resolve', async ({ request }) => {
  // Multi-criteria: Licence 9710 AND Level M must intersect to exactly the anchor assessment 723.
  const intersection = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?scalerLicenceNo=${encodeURIComponent(multiCriteriaLicenceAndLevel.licenceValue)}` +
      `&riskTypeCode=${encodeURIComponent(multiCriteriaLicenceAndLevel.levelCode)}`,
    `RSK multi-criteria licence ${multiCriteriaLicenceAndLevel.licenceValue} + level ${multiCriteriaLicenceAndLevel.levelCode}`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    intersection.length,
    `[preflight] RSK multi-criteria licence ${multiCriteriaLicenceAndLevel.licenceValue} + level ` +
      `${multiCriteriaLicenceAndLevel.levelCode} returned ${intersection.length} rows (expected ` +
      `${multiCriteriaLicenceAndLevel.expectedCount}; breaks search.feature multi-criteria). ${REGROUND}`,
  ).toBe(multiCriteriaLicenceAndLevel.expectedCount);
  expect(
    intersection.some((r) => String(r.riskQuestionnaireId) === multiCriteriaLicenceAndLevel.anAssessmentId),
    `[preflight] RSK multi-criteria result no longer includes anchor assessment ` +
      `${multiCriteriaLicenceAndLevel.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  // Wildcard vs exact: "72%" must resolve to the anchor 723, while the bare "72" must match nothing.
  const wild = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(wildcardAssessmentId.wildcardValue)}`,
    `RSK wildcard assessment id "${wildcardAssessmentId.wildcardValue}"`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    wild.length,
    `[preflight] RSK wildcard "${wildcardAssessmentId.wildcardValue}" returned ${wild.length} rows (expected ` +
      `${wildcardAssessmentId.expectedCount}; breaks search.feature wildcard). ${REGROUND}`,
  ).toBe(wildcardAssessmentId.expectedCount);
  expect(
    wild.some((r) => String(r.riskQuestionnaireId) === wildcardAssessmentId.anAssessmentId),
    `[preflight] RSK wildcard "${wildcardAssessmentId.wildcardValue}" no longer includes anchor assessment ` +
      `${wildcardAssessmentId.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();
  const exact = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(wildcardAssessmentId.exactNoMatchValue)}`,
    `RSK bare/exact assessment id "${wildcardAssessmentId.exactNoMatchValue}"`,
  )) as unknown[];
  expect(
    exact.length,
    `[preflight] RSK bare id "${wildcardAssessmentId.exactNoMatchValue}" returned ${exact.length} rows ` +
      `(expected 0 — search is exact unless a % is supplied; breaks search.feature wildcard-vs-exact). ${REGROUND}`,
  ).toBe(0);

  // Paging dataset: Level H must return a >1-page set (14 rows) so the client-side 10/page slice is exercised.
  const paged = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?riskTypeCode=${encodeURIComponent(pagedLevel.code)}`,
    `RSK paging level "${pagedLevel.code}" (${pagedLevel.label})`,
  )) as unknown[];
  expect(
    paged.length,
    `[preflight] RSK paging level="${pagedLevel.code}" (${pagedLevel.label}) returned ${paged.length} rows ` +
      `(expected ${pagedLevel.expectedCount}; breaks search.feature pagination). ${REGROUND}`,
  ).toBe(pagedLevel.expectedCount);

  // Sort order: Primary=Level, Secondary=Assessment ID over the licence-9710 set must return the exact
  // ordered id list the sort scenario asserts (order matters — this is the whole point of the anchor).
  const sorted = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?scalerLicenceNo=${encodeURIComponent(sortByLevelThenId.licenceValue)}` +
      `&primarySort=${sortByLevelThenId.primaryCode}&secondarySort=${sortByLevelThenId.secondaryCode}`,
    `RSK sort licence ${sortByLevelThenId.licenceValue} primary=${sortByLevelThenId.primaryCode} secondary=${sortByLevelThenId.secondaryCode}`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    sorted.map((r) => String(r.riskQuestionnaireId)),
    `[preflight] RSK sort (licence ${sortByLevelThenId.licenceValue}, primary Level, secondary Assessment ID) ` +
      `order drifted from the pinned fixture (breaks search.feature sort). ${REGROUND}`,
  ).toEqual([...sortByLevelThenId.expectedOrder]);
});

// Anchors for the scaler filter-WIDGET scenarios (filter-widgets.feature): Reg/Dist via DistrictSelect
// (orgUnitNo=1902 → 9 incl. 723) and Scaler Client # via ClientLocSearch (clientNumber=00047212 → 5 incl.
// 723). Each pins an exact real-extract count + anchor membership so a reseed that shifts them fails LOUD
// here with a re-ground pointer rather than as an opaque mid-suite mismatch.
test('preflight: RSK scaler filter-widget anchors resolve (orgUnitNo 1902, clientNumber 00047212)', async ({ request }) => {
  const byDistrict = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?orgUnitNo=${encodeURIComponent(districtFilter.orgUnitNo)}`,
    `RSK scaler Reg/Dist widget orgUnitNo ${districtFilter.orgUnitNo} (${districtFilter.label})`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byDistrict.length,
    `[preflight] RSK scaler orgUnitNo=${districtFilter.orgUnitNo} (${districtFilter.label}) returned ` +
      `${byDistrict.length} rows (expected ${districtFilter.expectedCount}; breaks filter-widgets.feature ` +
      `DistrictSelect). ${REGROUND}`,
  ).toBe(districtFilter.expectedCount);
  expect(
    byDistrict.some((r) => String(r.riskQuestionnaireId) === districtFilter.anAssessmentId),
    `[preflight] RSK scaler orgUnitNo=${districtFilter.orgUnitNo} no longer includes anchor assessment ` +
      `${districtFilter.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  const byClient = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?clientNumber=${encodeURIComponent(clientFilter.clientNumber)}`,
    `RSK scaler Client# widget clientNumber ${clientFilter.clientNumber}`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byClient.length,
    `[preflight] RSK scaler clientNumber=${clientFilter.clientNumber} returned ${byClient.length} rows ` +
      `(expected ${clientFilter.expectedCount} — note the value must be zero-padded; breaks ` +
      `filter-widgets.feature ClientLocSearch). ${REGROUND}`,
  ).toBe(clientFilter.expectedCount);
  expect(
    byClient.some((r) => String(r.riskQuestionnaireId) === clientFilter.anAssessmentId),
    `[preflight] RSK scaler clientNumber=${clientFilter.clientNumber} no longer includes anchor assessment ` +
      `${clientFilter.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();
});

test('preflight: RSK scaler assessment 723 row anchor resolves (exact count + pinned cell data)', async ({ request }) => {
  const rows = (await jsonOrThrow(
    request,
    `/api/scaler-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(singleResultAssessment.value)}`,
    `RSK assessment id search "${singleResultAssessment.value}"`,
  )) as {
    riskRating?: number | null;
    maxRiskRating?: number | null;
    numResp?: number | null;
    questCount?: number | null;
    codeDescription?: string | null;
    rangeLowValue?: number | null;
    rangeHighValue?: number | null;
    versionNo?: number | null;
    scalerLicenceNo?: string | null;
    scalerClientLoc?: string | null;
    orgUnitName?: string | null;
    clientName?: string | null;
  }[];
  expect(
    rows.length,
    `[preflight] RSK assessment id search "${singleResultAssessment.value}" returned ${rows.length} rows ` +
      `(expected ${singleResultAssessment.expectedCount}; breaks search.feature). ${REGROUND}`,
  ).toBe(singleResultAssessment.expectedCount);
  const row = rows[0] ?? {};
  // Compose the same display strings pages/Queries/ScalerRiskAssessments builds from the raw row.
  const actual = {
    ratingMaxRating: `${row.riskRating} / ${row.maxRiskRating}`,
    responsesQuestions: `${row.numResp} / ${row.questCount}`,
    level: row.codeDescription,
    range: `${row.rangeLowValue}-${row.rangeHighValue}`,
    version: String(row.versionNo),
    scalerLicenceNo: row.scalerLicenceNo,
    scalerClientLoc: row.scalerClientLoc,
    orgUnitName: row.orgUnitName,
    clientName: row.clientName,
  };
  expect(
    actual,
    `[preflight] RSK assessment ${singleResultAssessment.value} cell data drifted from the pinned fixture ` +
      `(breaks search.feature). ${REGROUND}`,
  ).toEqual({
    ratingMaxRating: singleResultAssessment.ratingMaxRating,
    responsesQuestions: singleResultAssessment.responsesQuestions,
    level: singleResultAssessment.level,
    range: singleResultAssessment.range,
    version: singleResultAssessment.version,
    scalerLicenceNo: singleResultAssessment.scalerLicenceNo,
    scalerClientLoc: singleResultAssessment.scalerClientLoc,
    orgUnitName: singleResultAssessment.orgUnitName,
    clientName: singleResultAssessment.clientName,
  });
});

/**
 * RPT anchors. The Reports tab pins only two real-data values, but BOTH are load-bearing and neither was
 * guarded until now — the rest of the reports suite is data-independent (it asserts the outbound payload,
 * not report content), which is exactly why these two were easy to overlook:
 *
 *  • the Reg / Dist code every scenario filters on — if it left the LOV, `setRegDistById` would sit for its
 *    full 30s waiting for an `<option>` that never arrives, on ~30 scenarios at once including every
 *    `@generation` render;
 *  • the compliance report's route inspection id — the screen does not fetch the inspection, so a stale id
 *    still renders the form and the failure would surface only as a wrong payload or an empty report.
 */
test('preflight: RPT anchors resolve (Reg / Dist in the LOV + compliance inspection on its site)', async ({
  request,
}) => {
  const lov = (await jsonOrThrow(
    request,
    '/api/region-district-rollup-lov',
    `RPT Reg / Dist ${RPT_REG_DIST}`,
  )) as { orgUnitCode?: string }[];
  expect(
    lov.map((row) => row.orgUnitCode),
    `[preflight] RPT Reg / Dist "${RPT_REG_DIST}" is not in the region/district LOV — every reports ` +
      `scenario that filters by district would time out waiting for its <option>. ${REGROUND}`,
  ).toContain(RPT_REG_DIST);

  const inspections = (await jsonOrThrow(
    request,
    `/api/scale-sites/${RPT_COMPLIANCE_SITE}/inspections`,
    `RPT compliance inspection ${complianceInspectionId}`,
  )) as { inspectionId?: number | string }[];
  expect(
    inspections.map((row) => String(row.inspectionId)),
    `[preflight] RPT compliance-report inspection ${complianceInspectionId} is no longer on site ` +
      `${RPT_COMPLIANCE_SITE}. The Scale Site Compliance screen does NOT fetch the inspection, so a stale ` +
      `id renders the form anyway and only shows up as a wrong payload. ${REGROUND}`,
  ).toContain(complianceInspectionId);
});

// UC-QRY-007 (SCALE SITE subject) search asserts EXACT counts + cell data against read-only real-extract
// rows (search.feature: Level High->9, Site Name WELDWOOD%->2, Assessment 1822->1 with pinned cells,
// wildcard 18%->6 vs bare 18->[], multi-criteria 18% ∩ WELDWOOD%->1, sort order; zero-results 99999999->[]).
// These guards pin that data so a reseed shifting the scale-site risk assessments fails LOUD here — with a
// re-ground pointer — instead of as an opaque mid-suite mismatch, and make
// fixtures/rsk/scale-site-risk-assessment-test-data.ts a live, consumed source of truth. This extract is
// thin (all 9 High/incomplete/distinct-site), so there is intentionally NO Level-single-match, paging, or
// Complete=Yes anchor — those are logged as data gaps in the suite's defects.md, not asserted here.
test('preflight: RSK scale-site risk-assessment search anchors resolve (level H, site name, wildcard, 99999999 empty)', async ({ request }) => {
  const byLevel = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskTypeCode=${encodeURIComponent(scaleSiteRsk.levelFilter.code)}`,
    `RSK(scale-site) level search "${scaleSiteRsk.levelFilter.code}" (${scaleSiteRsk.levelFilter.label})`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byLevel.length,
    `[preflight] RSK(scale-site) level="${scaleSiteRsk.levelFilter.code}" (${scaleSiteRsk.levelFilter.label}) returned ` +
      `${byLevel.length} rows (expected ${scaleSiteRsk.levelFilter.expectedCount}; breaks search.feature Outline). ` +
      // A run interrupted between an RSK create and its DB-level teardown (no delete endpoint) leaks a High
      // row on the create site — the likeliest cause when the count runs HIGH, so name it before the reseed one.
      (byLevel.length > scaleSiteRsk.levelFilter.expectedCount
        ? `Most likely a leaked create row from an interrupted run: check ` +
          `GET /api/scale-site-risk-assessments/search?scaleSiteIdNmbr=${riskHappyPathSite.scaleSiteIdNmbr} and delete strays ` +
          `(no RSK delete endpoint — remove via DB) before re-grounding. Otherwise: ${REGROUND}`
        : REGROUND),
  ).toBe(scaleSiteRsk.levelFilter.expectedCount);
  expect(
    byLevel.some((r) => String(r.riskQuestionnaireId) === scaleSiteRsk.levelFilter.anAssessmentId),
    `[preflight] RSK(scale-site) level search no longer includes anchor assessment ${scaleSiteRsk.levelFilter.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  const bySiteName = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?siteName=${encodeURIComponent(scaleSiteRsk.siteNameFilter.value)}`,
    `RSK(scale-site) site-name search "${scaleSiteRsk.siteNameFilter.value}"`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    bySiteName.length,
    `[preflight] RSK(scale-site) site-name "${scaleSiteRsk.siteNameFilter.value}" returned ${bySiteName.length} rows ` +
      `(expected ${scaleSiteRsk.siteNameFilter.expectedCount}; breaks search.feature Outline). ${REGROUND}`,
  ).toBe(scaleSiteRsk.siteNameFilter.expectedCount);

  const noMatch = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(scaleSiteRsk.noMatchAssessmentId)}`,
    `RSK(scale-site) no-match assessment id "${scaleSiteRsk.noMatchAssessmentId}"`,
  )) as unknown[];
  expect(
    noMatch.length,
    `[preflight] RSK(scale-site) no-match id "${scaleSiteRsk.noMatchAssessmentId}" returned ${noMatch.length} rows ` +
      `(expected 0; breaks zero-results.feature). ${REGROUND}`,
  ).toBe(0);
});

test('preflight: RSK scale-site multi-criteria / wildcard / sort anchors resolve', async ({ request }) => {
  // Multi-criteria: Assessment ID 18% AND Site Name WELDWOOD% must intersect to exactly assessment 1822.
  const intersection = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(scaleSiteRsk.multiCriteriaIdAndSiteName.assessmentIdValue)}` +
      `&siteName=${encodeURIComponent(scaleSiteRsk.multiCriteriaIdAndSiteName.siteNameValue)}`,
    `RSK(scale-site) multi-criteria id ${scaleSiteRsk.multiCriteriaIdAndSiteName.assessmentIdValue} + siteName ${scaleSiteRsk.multiCriteriaIdAndSiteName.siteNameValue}`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    intersection.length,
    `[preflight] RSK(scale-site) multi-criteria id ${scaleSiteRsk.multiCriteriaIdAndSiteName.assessmentIdValue} + siteName ` +
      `${scaleSiteRsk.multiCriteriaIdAndSiteName.siteNameValue} returned ${intersection.length} rows (expected ` +
      `${scaleSiteRsk.multiCriteriaIdAndSiteName.expectedCount}; breaks search.feature multi-criteria). ${REGROUND}`,
  ).toBe(scaleSiteRsk.multiCriteriaIdAndSiteName.expectedCount);
  expect(
    intersection.some((r) => String(r.riskQuestionnaireId) === scaleSiteRsk.multiCriteriaIdAndSiteName.anAssessmentId),
    `[preflight] RSK(scale-site) multi-criteria result no longer includes anchor assessment ${scaleSiteRsk.multiCriteriaIdAndSiteName.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  // Wildcard vs exact: "18%" must resolve to 6 rows (incl. anchor 1822), while the bare "18" matches nothing.
  const wild = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(scaleSiteRsk.wildcardAssessmentId.wildcardValue)}`,
    `RSK(scale-site) wildcard assessment id "${scaleSiteRsk.wildcardAssessmentId.wildcardValue}"`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    wild.length,
    `[preflight] RSK(scale-site) wildcard "${scaleSiteRsk.wildcardAssessmentId.wildcardValue}" returned ${wild.length} rows ` +
      `(expected ${scaleSiteRsk.wildcardAssessmentId.expectedCount}; breaks search.feature wildcard). ${REGROUND}`,
  ).toBe(scaleSiteRsk.wildcardAssessmentId.expectedCount);
  expect(
    wild.some((r) => String(r.riskQuestionnaireId) === scaleSiteRsk.wildcardAssessmentId.anAssessmentId),
    `[preflight] RSK(scale-site) wildcard "${scaleSiteRsk.wildcardAssessmentId.wildcardValue}" no longer includes anchor assessment ` +
      `${scaleSiteRsk.wildcardAssessmentId.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();
  const exact = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(scaleSiteRsk.wildcardAssessmentId.exactNoMatchValue)}`,
    `RSK(scale-site) bare/exact assessment id "${scaleSiteRsk.wildcardAssessmentId.exactNoMatchValue}"`,
  )) as unknown[];
  expect(
    exact.length,
    `[preflight] RSK(scale-site) bare id "${scaleSiteRsk.wildcardAssessmentId.exactNoMatchValue}" returned ${exact.length} rows ` +
      `(expected 0 — search is exact unless a % is supplied; breaks search.feature wildcard-vs-exact). ${REGROUND}`,
  ).toBe(0);

  // Sort order: Primary=Site Name, Secondary=Assessment ID over the 18% set must return the exact ordered
  // id list the sort scenario asserts (order matters — this is the whole point of the anchor).
  const sorted = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(scaleSiteRsk.sortBySiteNameThenId.assessmentIdValue)}` +
      `&primarySort=${scaleSiteRsk.sortBySiteNameThenId.primaryCode}&secondarySort=${scaleSiteRsk.sortBySiteNameThenId.secondaryCode}`,
    `RSK(scale-site) sort id ${scaleSiteRsk.sortBySiteNameThenId.assessmentIdValue} primary=${scaleSiteRsk.sortBySiteNameThenId.primaryCode} secondary=${scaleSiteRsk.sortBySiteNameThenId.secondaryCode}`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    sorted.map((r) => String(r.riskQuestionnaireId)),
    `[preflight] RSK(scale-site) sort (18% set, primary Site Name, secondary Assessment ID) order drifted from ` +
      `the pinned fixture (breaks search.feature sort). ${REGROUND}`,
  ).toEqual([...scaleSiteRsk.sortBySiteNameThenId.expectedOrder]);
});

test('preflight: RSK scale-site assessment 1822 row anchor resolves (exact count + pinned cell data)', async ({ request }) => {
  const rows = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?riskQuestionnaireId=${encodeURIComponent(scaleSiteRsk.singleResultAssessment.value)}`,
    `RSK(scale-site) assessment id search "${scaleSiteRsk.singleResultAssessment.value}"`,
  )) as {
    riskRating?: number | null;
    maxRiskRating?: number | null;
    numResp?: number | null;
    questCount?: number | null;
    codeDescription?: string | null;
    rangeLowValue?: number | null;
    rangeHighValue?: number | null;
    versionNo?: number | null;
    scaleSiteIdNmbr?: string | null;
    siteName?: string | null;
    district?: string | null;
    ownerClientNumber?: string | null;
    ownerClientLocnCode?: string | null;
  }[];
  const anchor = scaleSiteRsk.singleResultAssessment;
  expect(
    rows.length,
    `[preflight] RSK(scale-site) assessment id search "${anchor.value}" returned ${rows.length} rows ` +
      `(expected ${anchor.expectedCount}; breaks search.feature). ${REGROUND}`,
  ).toBe(anchor.expectedCount);
  const row = rows[0] ?? {};
  // Compose the same display strings pages/Queries/ScaleSiteRiskAssessments builds from the raw row.
  const actual = {
    ratingMaxRating: `${row.riskRating} / ${row.maxRiskRating}`,
    responsesQuestions: `${row.numResp} / ${row.questCount}`,
    level: row.codeDescription,
    range: `${row.rangeLowValue}-${row.rangeHighValue}`,
    version: String(row.versionNo),
    scaleSiteIdNmbr: row.scaleSiteIdNmbr,
    district: row.district,
    ownerClientDisplay: `${row.ownerClientNumber} / ${row.ownerClientLocnCode}`,
  };
  expect(
    actual,
    `[preflight] RSK(scale-site) assessment ${anchor.value} cell data drifted from the pinned fixture ` +
      `(breaks search.feature). ${REGROUND}`,
  ).toEqual({
    ratingMaxRating: anchor.ratingMaxRating,
    responsesQuestions: anchor.responsesQuestions,
    level: anchor.level,
    range: anchor.range,
    version: anchor.version,
    scaleSiteIdNmbr: anchor.scaleSiteIdNmbr,
    district: anchor.district,
    ownerClientDisplay: anchor.ownerClientDisplay,
  });
  // siteName carries trailing punctuation/whitespace in the extract, so the fixture pins the stable prefix
  // used by the UI cell assertion — check containment rather than exact equality.
  expect(
    row.siteName ?? '',
    `[preflight] RSK(scale-site) assessment ${anchor.value} site name "${row.siteName}" no longer contains the pinned ` +
      `prefix "${anchor.siteName}" (breaks search.feature cell data). ${REGROUND}`,
  ).toContain(anchor.siteName);
});

// Anchors for the scale-site filter-WIDGET scenarios (filter-widgets.feature): Reg/Dist via DistrictSelect
// (orgUnitNo=1619 → 3 incl. 1861), Site Owner Client # via ClientLocSearch (ownerClientNumber=00055821 → 1
// incl. 1822), and Site Type via ActiveMultiSelect (methodTypes=P → 1 incl. 1861). The district anchor is a
// distinct-district subset (NOT the whole-extract Level=High), so it is not exposed to the parallel
// create-seed on site 520 and its exact count is pinned here.
test('preflight: RSK scale-site filter-widget anchors resolve (orgUnitNo 1619, ownerClientNumber 00055821, methodTypes P)', async ({ request }) => {
  // LOV LABEL↔CODE guards. The count anchors below pin CODE→count via the API, but the DistrictSelect
  // (#orgUnitNo) and ActiveMultiSelect (#method-types) widgets are driven by LABEL — selectDistrict /
  // selectSiteType match the option by its visible description. So a re-extract that renamed the district or
  // re-described method-type P would leave every count anchor green yet kill the widget scenarios on an
  // opaque `selectOption` / option-not-found timeout — the exact mid-suite failure preflight exists to
  // pre-empt. Assert the SAME row still carries both the pinned label and the pinned code (both widgets emit
  // the trimmed description as the option text, so compare on the trimmed value the option will render).
  const districtLov = (await jsonOrThrow(
    request,
    '/api/region-district-lov',
    `region/district LOV for DistrictSelect label "${scaleSiteRsk.districtFilter.label}"`,
  )) as { code?: string | number | null; description?: string | null }[];
  expect(
    districtLov.some(
      (row) =>
        String(row.description ?? '').trim() === scaleSiteRsk.districtFilter.label &&
        String(row.code ?? '').trim() === scaleSiteRsk.districtFilter.orgUnitNo,
    ),
    `[preflight] region/district LOV no longer offers an option labelled "${scaleSiteRsk.districtFilter.label}" ` +
      `for code ${scaleSiteRsk.districtFilter.orgUnitNo} — DistrictSelect (#orgUnitNo) matches by LABEL, so ` +
      `selectDistrict would time out on selectOption even though the orgUnitNo count anchor still resolves; ` +
      `re-pin districtFilter.label in fixtures/rsk/scale-site-risk-assessment-test-data.ts. ${REGROUND}`,
  ).toBeTruthy();

  const methodTypeLov = (await jsonOrThrow(
    request,
    '/api/scale-method-type-lov',
    `scale-method-type LOV for ActiveMultiSelect label "${scaleSiteRsk.siteTypeFilter.label}"`,
  )) as { code?: string | null; description?: string | null }[];
  expect(
    methodTypeLov.some(
      (row) =>
        String(row.description ?? '').trim() === scaleSiteRsk.siteTypeFilter.label &&
        String(row.code ?? '').trim() === scaleSiteRsk.siteTypeFilter.code,
    ),
    `[preflight] scale-method-type LOV no longer describes code ${scaleSiteRsk.siteTypeFilter.code} as ` +
      `"${scaleSiteRsk.siteTypeFilter.label}" — the Site Type ActiveMultiSelect (#method-types) matches by LABEL, ` +
      `so selectSiteType would time out on the option even though the methodTypes count anchor still resolves; ` +
      `re-pin siteTypeFilter.label in fixtures/rsk/scale-site-risk-assessment-test-data.ts. ${REGROUND}`,
  ).toBeTruthy();

  const byDistrict = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?orgUnitNo=${encodeURIComponent(scaleSiteRsk.districtFilter.orgUnitNo)}`,
    `RSK(scale-site) Reg/Dist widget orgUnitNo ${scaleSiteRsk.districtFilter.orgUnitNo} (${scaleSiteRsk.districtFilter.label})`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byDistrict.length,
    `[preflight] RSK(scale-site) orgUnitNo=${scaleSiteRsk.districtFilter.orgUnitNo} ` +
      `(${scaleSiteRsk.districtFilter.label}) returned ${byDistrict.length} rows (expected ` +
      `${scaleSiteRsk.districtFilter.expectedCount}; breaks filter-widgets.feature DistrictSelect). ${REGROUND}`,
  ).toBe(scaleSiteRsk.districtFilter.expectedCount);
  expect(
    byDistrict.some((r) => String(r.riskQuestionnaireId) === scaleSiteRsk.districtFilter.anAssessmentId),
    `[preflight] RSK(scale-site) orgUnitNo=${scaleSiteRsk.districtFilter.orgUnitNo} no longer includes anchor ` +
      `assessment ${scaleSiteRsk.districtFilter.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  const byOwner = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?ownerClientNumber=${encodeURIComponent(scaleSiteRsk.ownerClientFilter.ownerClientNumber)}`,
    `RSK(scale-site) Site Owner widget ownerClientNumber ${scaleSiteRsk.ownerClientFilter.ownerClientNumber}`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    byOwner.length,
    `[preflight] RSK(scale-site) ownerClientNumber=${scaleSiteRsk.ownerClientFilter.ownerClientNumber} returned ` +
      `${byOwner.length} rows (expected ${scaleSiteRsk.ownerClientFilter.expectedCount} — note the value must be ` +
      `zero-padded; breaks filter-widgets.feature ClientLocSearch). ${REGROUND}`,
  ).toBe(scaleSiteRsk.ownerClientFilter.expectedCount);
  expect(
    byOwner.some((r) => String(r.riskQuestionnaireId) === scaleSiteRsk.ownerClientFilter.anAssessmentId),
    `[preflight] RSK(scale-site) ownerClientNumber=${scaleSiteRsk.ownerClientFilter.ownerClientNumber} no longer ` +
      `includes anchor assessment ${scaleSiteRsk.ownerClientFilter.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();

  const bySiteType = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/search?methodTypes=${encodeURIComponent(scaleSiteRsk.siteTypeFilter.code)}`,
    `RSK(scale-site) Site Type widget methodTypes ${scaleSiteRsk.siteTypeFilter.code} (${scaleSiteRsk.siteTypeFilter.label})`,
  )) as { riskQuestionnaireId?: number | null }[];
  expect(
    bySiteType.length,
    `[preflight] RSK(scale-site) methodTypes=${scaleSiteRsk.siteTypeFilter.code} ` +
      `(${scaleSiteRsk.siteTypeFilter.label}) returned ${bySiteType.length} rows (expected ` +
      `${scaleSiteRsk.siteTypeFilter.expectedCount}; breaks filter-widgets.feature ActiveMultiSelect). ${REGROUND}`,
  ).toBe(scaleSiteRsk.siteTypeFilter.expectedCount);
  expect(
    bySiteType.some((r) => String(r.riskQuestionnaireId) === scaleSiteRsk.siteTypeFilter.anAssessmentId),
    `[preflight] RSK(scale-site) methodTypes=${scaleSiteRsk.siteTypeFilter.code} no longer includes anchor ` +
      `assessment ${scaleSiteRsk.siteTypeFilter.anAssessmentId}. ${REGROUND}`,
  ).toBeTruthy();
});

/**
 * SEC-11 cross-cutting anchors.
 *
 * These suites assert a *relationship* between an id and a forest client — "this authorization belongs
 * to my client, that one does not" — so a re-extract breaks them in a way no status code explains: the
 * scenario simply gets 200 where it expected 403, and reads as a security regression. Asserting the
 * relationships here means a shifted anchor fails with a re-ground pointer instead.
 *
 * It is also what makes `fixtures/security/cross-cutting-test-data.ts` load-bearing rather than a
 * comment: the feature files carry the same ids as literals, and this is the check that keeps the two
 * honest.
 */
test('preflight: SEC-11 cross-cutting scope anchors resolve (in/out of client, both directions)', async ({ request }) => {
  // --- Industry Scaler side: two scaler authorizations, one inside the client and one outside.
  const ownAuth = (await jsonOrThrow(
    request,
    `/api/scaler-authorizations/${xcut.indOwnScalerAuthorizationId}`,
    `SEC-11 in-scope scaler authorization ${xcut.indOwnScalerAuthorizationId}`,
  )) as { scalerLicenceNo?: string };
  const ownAuthScaler = (await jsonOrThrow(
    request,
    `/api/scalers/${ownAuth.scalerLicenceNo}`,
    `SEC-11 scaler ${ownAuth.scalerLicenceNo} behind authorization ${xcut.indOwnScalerAuthorizationId}`,
  )) as { clientNumber?: string };
  expect(
    ownAuthScaler.clientNumber,
    `[preflight] SEC-11 authorization ${xcut.indOwnScalerAuthorizationId} now belongs to client ` +
      `${ownAuthScaler.clientNumber}, not ${xcut.indClientNumber} — the "my own client's authorization ` +
      `is served" scenario would then pass or fail for the wrong reason. ${REGROUND}`,
  ).toBe(xcut.indClientNumber);

  const otherAuth = (await jsonOrThrow(
    request,
    `/api/scaler-authorizations/${xcut.indOtherScalerAuthorizationId}`,
    `SEC-11 out-of-scope scaler authorization ${xcut.indOtherScalerAuthorizationId}`,
  )) as { scalerLicenceNo?: string };
  const otherAuthScaler = (await jsonOrThrow(
    request,
    `/api/scalers/${otherAuth.scalerLicenceNo}`,
    `SEC-11 scaler ${otherAuth.scalerLicenceNo} behind authorization ${xcut.indOtherScalerAuthorizationId}`,
  )) as { clientNumber?: string };
  expect(
    otherAuthScaler.clientNumber,
    `[preflight] SEC-11 authorization ${xcut.indOtherScalerAuthorizationId} is now inside client ` +
      `${xcut.indClientNumber} — it is the DENY anchor, so its refusal scenario would become vacuous. ${REGROUND}`,
  ).not.toBe(xcut.indClientNumber);

  // --- Scale Site Owner side: site ownership is what every owner-side anchor hangs off.
  const ownedSite = (await jsonOrThrow(
    request,
    `/api/scale-sites/${xcut.ownScaleSiteId}/owner`,
    `SEC-11 owned site ${xcut.ownScaleSiteId}`,
  )) as { clientNumber?: string };
  expect(
    ownedSite.clientNumber,
    `[preflight] SEC-11 site ${xcut.ownScaleSiteId} is now owned by ${ownedSite.clientNumber}, not ` +
      `${xcut.ownClientNumber}. ${REGROUND}`,
  ).toBe(xcut.ownClientNumber);

  const foreignSite = (await jsonOrThrow(
    request,
    `/api/scale-sites/${xcut.otherScaleSiteId}/owner`,
    `SEC-11 non-owned site ${xcut.otherScaleSiteId}`,
  )) as { clientNumber?: string };
  expect(
    foreignSite.clientNumber,
    `[preflight] SEC-11 site ${xcut.otherScaleSiteId} is now owned by ${xcut.ownClientNumber} — it is ` +
      `the DENY anchor for every owner-side row. ${REGROUND}`,
  ).not.toBe(xcut.ownClientNumber);

  // The two site authorizations and the two inspections must sit on those two sites respectively.
  for (const [id, expectedSite, direction] of [
    [xcut.ownScaleSiteAuthorizationId, xcut.ownScaleSiteId, 'in-scope'],
    [xcut.otherScaleSiteAuthorizationId, xcut.otherScaleSiteId, 'out-of-scope'],
  ] as const) {
    const auth = (await jsonOrThrow(
      request,
      `/api/scale-site-authorizations/${id}`,
      `SEC-11 ${direction} scale-site authorization ${id}`,
    )) as { scaleSiteIdNmbr?: string };
    expect(
      auth.scaleSiteIdNmbr,
      `[preflight] SEC-11 scale-site authorization ${id} moved to site ${auth.scaleSiteIdNmbr} ` +
        `(expected ${expectedSite}, the ${direction} anchor). ${REGROUND}`,
    ).toBe(expectedSite);
  }

  for (const [id, expectedSite, direction] of [
    [xcut.ownInspectionId, xcut.ownScaleSiteId, 'in-scope'],
    [xcut.otherInspectionId, xcut.otherScaleSiteId, 'out-of-scope'],
  ] as const) {
    const inspection = (await jsonOrThrow(
      request,
      `/api/scale-sites/inspection/${id}`,
      `SEC-11 ${direction} inspection ${id}`,
    )) as { scaleSiteIdNmbr?: string };
    expect(
      inspection.scaleSiteIdNmbr,
      `[preflight] SEC-11 inspection ${id} moved to site ${inspection.scaleSiteIdNmbr} ` +
        `(expected ${expectedSite}, the ${direction} anchor). ${REGROUND}`,
    ).toBe(expectedSite);
  }

  // The contact behind the paired-parent case in coverage.md CG-2.
  await jsonOrThrow(
    request,
    `/api/scale-sites/${xcut.ownScaleSiteId}/contacts/${xcut.ownContactId}`,
    `SEC-11 contact ${xcut.ownContactId} on owned site ${xcut.ownScaleSiteId}`,
  );

  // The designation with no client axis at all (spec gap SG-1) — existence is the whole assertion.
  await jsonOrThrow(
    request,
    `/api/mark-site-designations/${xcut.anyMarkSiteDesignationId}`,
    `SEC-11 mark site designation ${xcut.anyMarkSiteDesignationId}`,
  );

  // The latent seam: assessment 1822 must still hang off site 614, or the pair stops demonstrating that
  // one site's data is refused by one route and served by another.
  const assessment = (await jsonOrThrow(
    request,
    `/api/scale-site-risk-assessments/${xcut.unscopedRiskAssessmentId}`,
    `SEC-11 unscoped risk assessment ${xcut.unscopedRiskAssessmentId}`,
  )) as { scaleSiteIdNmbr?: string };
  expect(
    assessment.scaleSiteIdNmbr,
    `[preflight] SEC-11 risk assessment ${xcut.unscopedRiskAssessmentId} now belongs to site ` +
      `${assessment.scaleSiteIdNmbr}, not ${xcut.unscopedRiskSiteId} — the "same site, two routes" pair ` +
      `in record-id-boundary.feature stops proving anything. ${REGROUND}`,
  ).toBe(xcut.unscopedRiskSiteId);

  const unscopedRiskSiteOwner = (await jsonOrThrow(
    request,
    `/api/scale-sites/${xcut.unscopedRiskSiteId}/owner`,
    `SEC-11 unscoped-risk site ${xcut.unscopedRiskSiteId}`,
  )) as { clientNumber?: string };
  expect(
    [xcut.indClientNumber, xcut.ownClientNumber],
    `[preflight] SEC-11 site ${xcut.unscopedRiskSiteId} is now owned by an anchor client ` +
      `(${unscopedRiskSiteOwner.clientNumber}); it must belong to a THIRD client for the latent-seam ` +
      `pair to be a cross-client read. ${REGROUND}`,
  ).not.toContain(unscopedRiskSiteOwner.clientNumber);
});

/**
 * The nonexistent ids the SEC-11 suites probe.
 *
 * If a reseed ever issues one of them, every no-existence-oracle row silently changes meaning — and,
 * more seriously, the write-verb probes stop being inert, because they would then address a REAL
 * record. That is the one failure in this suite family that could modify data.
 */
test('preflight: SEC-11 nonexistent-id anchors are still absent (write probes stay inert)', async ({ request }) => {
  const absent: [string, string][] = [
    [`/api/scalers/${xcut.nonexistentScalerLicenceNo}`, 'scaler licence'],
    [`/api/scaler-authorizations/${xcut.nonexistentAuthorizationId}`, 'scaler authorization'],
    [`/api/scale-sites/inspection/${xcut.nonexistentInspectionId}`, 'inspection'],
  ];

  for (const [url, what] of absent) {
    const res = await request.get(url);
    expect(
      res.status(),
      `[preflight] SEC-11 ${what} id in ${url} now EXISTS (HTTP ${res.status()}, expected 404). The ` +
        `no-existence-oracle rows lose their meaning, and the write-verb probes in ` +
        `write-verb-sweep.feature would address a real record instead of a missing one. Re-pin the ` +
        `nonexistent ids in fixtures/security/. ${REGROUND}`,
    ).toBe(404);
  }

  // The check-scale id is checked through SEARCH, not the read-by-id: `GET /api/check-scales/{id}`
  // answers 500 for every caller and every id in this build (cross-cutting-record-scope `defects.md`
  // V2), so it cannot distinguish present from absent. Search does, and it is the same guard the CHK
  // preflight above already uses. One query covers both write-verb probes: detail and summary check
  // scales share the CHECK_SCALE id space.
  const checkScaleRows = (await jsonOrThrow(
    request,
    `/api/check-scales/search?checkScaleId=${nonexistentRecordId}`,
    `SEC-11 nonexistent check-scale id ${nonexistentRecordId}`,
  )) as unknown[];
  expect(
    checkScaleRows.length,
    `[preflight] SEC-11 check-scale id ${nonexistentRecordId} now EXISTS (search returned ` +
      `${checkScaleRows.length} row(s), expected 0). The PUT/DELETE probes in write-verb-sweep.feature ` +
      `target this id precisely BECAUSE nothing holds it — if it resolves, those probes stop being ` +
      `inert and can mutate a real record. Re-pin nonexistentRecordId in ` +
      `fixtures/security/write-verb-test-data.ts before running the suite again. ${REGROUND}`,
  ).toBe(0);
});
