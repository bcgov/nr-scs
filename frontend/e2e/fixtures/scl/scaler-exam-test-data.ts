import { daysAgo } from '../common/dates';

/**
 * SCL Record/Update-Training (Exams / Upgrades) — DB-grounded values for UC-SCL-007 / UC-SCL-008. Two data
 * shapes: a READ-ONLY anchor scaler 5828 (filter/validation/reset slices, nothing persists) and fresh
 * unconsumed clients the happy paths seed their own scaler on.
 *
 * Discovered 2026-08-11 (real extract; RE-VERIFY on re-extract — real data is non-deterministic).
 */

/**
 * Fresh client the record-training happy paths seed a parent scaler on. 00001064 = ASPEN PLANERS LTD., an
 * ACTIVE forest client with NO scaler (so seedScaler won't hit SCLR_UK). Distinct from the 002/003/004/005/006
 * client set. Discovery SQL (2026-08-11; RE-VERIFY on re-extract):
 *   select fc.client_number, fc.client_name from forest_client fc
 *    where fc.client_status_code='ACT'
 *      and not exists (select 1 from scaler s where s.client_number=fc.client_number);  -- -> 00001064
 */
export const examSeedClientNumber = '00001064';

/**
 * Training TYPE the happy paths ADD — 'Acting Scaler Exam' (training-type LOV id 5, class EXM). Selected by
 * its LOV description, which then renders in the list's Type column. Discovery (2026-08-11; RE-VERIFY on
 * re-extract): the LOV includes {code:'5', description:'Acting Scaler Exam', class EXM}.
 */
export const examTypeLabelToAdd = 'Acting Scaler Exam';

/**
 * The two training rows anchor 5828 carries (for the filter assertions). Discovery (2026-08-11; RE-VERIFY on
 * re-extract) — GET /api/scalers/5828/exams returns:
 *   [{scalerTrainingTypeId:'2', scalerTrainingClassCode:'EXM'},   -- 'Licensing Exam'      / class 'Exam'
 *    {scalerTrainingTypeId:'1', scalerTrainingClassCode:'UPG'}]   -- 'Interior Grading 1'  / class 'Upgrade'
 *
 * The list Type column renders the description only for types in the active LOV: type 1 (UPG) → "Interior
 * Grading 1"; type 2 (EXM) is RETIRED, absent from the LOV → falls back to raw code "2". So filter.feature
 * asserts on the class Description ("Exam"/"Upgrade") instead. These consts are reference only, not asserted.
 */
export const anchorExmTypeDescription = 'Licensing Exam';
export const anchorUpgTypeDescription = 'Interior Grading 1';

/** The number of training rows anchor 5828 has across both classes — the unfiltered ("All") row count. */
export const anchorExamRowCount = 2;

/**
 * A training TYPE anchor 5828 ALREADY has ('Interior Grading 1', type 1) — used by the duplicate slice. A
 * 2nd POST of the same (licence, type) trips the DB unique key → HTTP 400 "…same unique key." (live 2026-08-11).
 */
export const duplicateExamTypeLabel = 'Interior Grading 1';

// The class-filter labels ("All"/"Exam"/"Upgrade") and the required/duplicate-key error messages are stated
// as literals directly in filter.feature / validation.feature (a scenario should read as its own spec), so no
// constants are pinned here for them — this file holds only what the Gherkin can't sensibly carry inline
// (client numbers, type ids, dates, and the anchor's discovered row facts above).

/** A valid completion date for the happy path — 30 days ago (non-future; today-relative, never a literal). */
export const examCompletionDate = daysAgo(30);

// --- UC-SCL-008 Update Training ------------------------------------------------------------------
/**
 * Fresh client the UPDATE happy paths seed their scaler + training row on. 00001065 = ATCO LUMBER LTD., an
 * ACTIVE forest client with NO scaler (so seedScaler won't hit SCLR_UK). DISTINCT from the 007 client 00001064
 * so 007 + 008 can run together. Discovery SQL identical to examSeedClientNumber's (2026-08-11; RE-VERIFY):
 *   select fc.client_number, fc.client_name from forest_client fc
 *    where fc.client_status_code='ACT'
 *      and not exists (select 1 from scaler s where s.client_number=fc.client_number);  -- -> 00001065
 */
export const examUpdateSeedClientNumber = '00001065';

/**
 * Training TYPE the UPDATE happy paths seed then edit — id 5 = 'Acting Scaler Exam' (class EXM), the same
 * type examTypeLabelToAdd names. seedExam POSTs the code; type 5 IS in the active LOV. 2026-08-11.
 */
export const examUpdateTypeId = '5';

/** Completion date the seeded training row starts with (60 days ago); the S01 update CHANGES it to a
 *  distinct, still non-future value (30 days ago), so the read-back proves a real change. Today-relative. */
export const examUpdateInitialDate = daysAgo(60);
export const examUpdateNewDate = daysAgo(30);

/**
 * Anchor 5828's editable row for the Reset (S03) + Back (S04) slices: type 1 'Interior Grading 1' (class
 * UPG, in the active LOV → identifiable by description) with persisted completion 1989-06-08. Neither slice
 * persists. Confirmed live 2026-08-11 via GET /api/scalers/5828/exams; RE-VERIFY on any DB re-extract.
 */
export const anchorEditableRowDescription = 'Interior Grading 1';
export const anchorEditableRowDate = '1989-06-08';

/** The transient value the Reset (S03) slice types into the completion-date field BEFORE clicking Reset —
 *  10 days ago (non-future, distinct from the persisted 1989-06-08 so the revert is observable). */
export const anchorResetProbeDate = daysAgo(10);

// --- UC-SCL-009 Delete Training ------------------------------------------------------------------
/**
 * Fresh client the DELETE happy path seeds its scaler + one training row (type 5) on. 00001066 = GARIEPY,
 * an ACTIVE forest client with NO scaler (seedScaler-safe). DISTINCT from 007's 00001064 and 008's 00001065.
 * Discovery SQL identical to examSeedClientNumber's (2026-08-12; RE-VERIFY on re-extract):
 *   select fc.client_number, fc.client_name from forest_client fc
 *    where fc.client_status_code='ACT'
 *      and not exists (select 1 from scaler s where s.client_number=fc.client_number);  -- -> 00001066
 * The seeded row reuses type examUpdateTypeId (5 'Acting Scaler Exam', in the active LOV) + examCompletionDate.
 */
export const examDeleteSeedClientNumber = '00001066';
