/**
 * Known-good test data for the REPORTS screens (the nine parameter forms under the Reports tab —
 * UC-RPT-004/005/006/010/011/012/013/014/015). Re-grounded onto the REAL data in the local Docker Oracle
 * DB and verified 2026-08-11 against the running stack. Nothing is fabricated.
 *
 * This file is DELIBERATELY SMALL. Only the two inspection ids live here, because only they are values the
 * Gherkin cannot sensibly state itself — they are route parameters with real-database provenance. Everything
 * else these features need (the Reg / Dist code, the email recipients, the date windows) is stated as a
 * LITERAL in the feature file, which is the right call for those specifically:
 *
 *  - REG/DIST `DCC` (Cariboo-Chilcotin Natural Resource District, orgUnitNo 1826) is a parameter the reader of
 *    a scenario needs to SEE, and the same district the Signature Blocks fixture pins
 *    (`fixtures/admin/maintenance/signature-block-test-data.ts`). It is guarded by
 *    `preflight/anchors.setup.ts` ("RPT anchors resolve"), which fails the whole run with one message if the
 *    code ever leaves the region/district LOV — otherwise ~30 scenarios would each sit for 30s waiting for an
 *    `<option>` that never arrives. Note every report screen's Reg / Dist control is `RegDistSelect …
 *    grouped`, whose `<option value>` is the **orgUnitCode** (string), not the numeric orgUnitNo — so `DCC` is
 *    what both the select and the payload carry.
 *  - The EMAIL recipients (`scs.reports@example.gov.bc.ca`, and `not-an-email` for the invalid-format arm) are
 *    asserted as strings in the payload tables right next to where they are typed; hiding either behind a
 *    constant would make those scenarios harder to read, not more robust. Nothing is ever delivered — the
 *    scenarios that use a recipient assert the request, not a mailbox.
 *  - The DATE WINDOWS are literal because every date rule on these screens is SPAN-based (From ≤ To, and the
 *    District Performance one-year cap measured From→To). A fixed pair therefore cannot age the way an
 *    absolute-deadline fixture would: one year apart today is one year apart next year. Literals are also the
 *    only way to state the cap boundary exactly — `2024-01-01` → `2025-01-01` is precisely one year, which a
 *    `daysAgo` pair cannot express (365 vs 366 days flips it across a leap year). This is the documented
 *    exception to the suite's today-relative date convention; see
 *    `features/rpt/uc-rpt-013-district-check-scale-performance/coverage.md`.
 *
 * An earlier revision exported `REPORT_REG_DIST`, `reportEmailRecipient`, `invalidReportEmailRecipient`,
 * `reportDateRange`, `invertedReportDateRange` and `overOneYearReportDateRange`. None was ever imported, and
 * the date trio carried a rationale (`daysAgo`, "a literal range would silently age") that does not hold for
 * span-based rules — so they were removed rather than wired in. The provenance they documented is kept above.
 */

/** Real legacy site-inspection id (site 520) for the in-context Scale Site Compliance report. */
export const complianceInspectionId = '322429';

/** A non-numeric route param for the compliance report's "invalid inspection" guard (no data needed). */
export const invalidComplianceInspectionId = 'not-a-number';
