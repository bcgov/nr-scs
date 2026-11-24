/**
 * Anchors for the cross-cutting audit-affordance suite (Epic SEC story SEC-5 / UC-SYS-005).
 *
 * **The axis here is a COMPONENT, not a role and not a screen.** `WhoDidIt` is mounted on eleven host
 * screens; the rows below are the record views that host it, plus the one record whose audit values are
 * pinned as the format contract. Every UC ledger that met this component deferred it to "a single
 * dedicated audit-affordance pass" — this is that pass, so the anchors are chosen to make the two
 * cross-cutting properties visible: the IdP gate, and the fact that the five values are the host's.
 *
 * Provenance: every value below verified 2026-09-04 against the seeded Docker DB image
 * (`THE/default@localhost:1525/DBDOCK_01`) through the running backend. Real extracted data, so ids and
 * timestamps move on a re-extract — treat a re-extract as a re-ground event and re-run the probes in
 * the comments.
 */

/**
 * The identity pair the whole suite turns on.
 *
 * Both hold `SCS_SYS_ADMIN`, so permissions, navigation and every route decision are IDENTICAL; the only
 * difference is the IdP the session arrives through. That isolation is the point: when the popup appears
 * for one and not the other, nothing but `user.idpProvider` can explain it. A permission-shaped contrast
 * (administrator vs. a narrower role) could not make that claim, because the narrower role would also
 * differ in what it may read.
 */
export const AUDIT_ROLE = 'SCS_SYS_ADMIN';

/** A real external role + its forest client, for the realistic non-IDIR case. */
export const EXTERNAL_ROLE = 'SCS_OWNER';
export const externalClientNumber = '00001009';

/**
 * The record whose audit values are the FORMAT contract.
 *
 * Scaler `001B` (FINONA) — the industry-scaler suite's own anchor, reused so a re-extract invalidates
 * one licence rather than two. Verified `GET /api/scalers/001B` →
 * `entryTimestamp 1992-09-02T18:36:37Z`, `entryUserid CHELLWIG`, `revisionCount 0`.
 *
 * Two properties make it the right pick:
 *
 *  - **`entryTimestamp` is immutable.** An update moves `updateTimestamp` and `revisionCount`; the entry
 *    stamp is written once. So the pinned expectation below cannot be invalidated by another suite's
 *    write probe against this licence (the industry-scaler suite has several, all expected to be
 *    refused — but a pin that survives them being wrong is a better pin).
 *  - **`revisionCount` is 0**, which is the one value that distinguishes the app's actual behaviour from
 *    the story's acceptance criterion. See `expectedRevisionCount` below.
 */
export const formatContractScalerLicenceNo = '001B';

/**
 * `1992-09-02T18:36:37Z` as the popup must render it.
 *
 * The arithmetic, spelled out because it is the assertion: 1992-09-02 is inside Pacific Daylight Time
 * (DST began 1992-04-05), so Vancouver is UTC-7 and `18:36:37Z` is `11:36:37` local, formatted
 * `YYYY-MM-DD hh:mm:ss`.
 *
 * **This is what makes the scenario non-vacuous.** Epic SEC story SEC-5's UC-SYS-005-S05 carries a
 * `[LEGACY-BEHAVIOR-FLAG]` saying timestamps are truncated to the first 19 characters — which for this
 * value would render `1992-09-02T18:36:37`, keeping the UTC clock and the `T`. The shipped behaviour
 * converts instead. The two candidate behaviours therefore differ in the HOUR DIGITS (11 vs 18), not
 * merely in punctuation, so the assertion cannot pass under both. Recorded as a divergence in
 * `defects.md` D2.
 */
export const expectedEntryTimestamp = '1992-09-02 11:36:37';
export const expectedEntryUserid = 'CHELLWIG';

/**
 * `0`, rendered as the string `"0"`.
 *
 * UC-SYS-005-S02's `[LEGACY-BEHAVIOR-FLAG]` is about the opposite case — a NULL revision count, which
 * legacy displayed as `0` and which the flag asks dev to consider showing distinctly. The shipped
 * component does show it distinctly (blank), which is the flag resolved in the direction it invited but
 * away from the AC as written; `defects.md` D1 records it.
 *
 * This anchor guards the other half, and it is the half a naive fix would break: a real zero must still
 * render `0`. The component's `audit?.revisionCount != null` test is what keeps `0` and `null` apart,
 * and a regression to a truthiness check (`revisionCount ? … : ''`) would blank this one out while every
 * "absent field is blank" assertion stayed green.
 */
export const expectedRevisionCount = '0';

/** A host record view: where the affordance is mounted, and how to open that screen. */
export type AuditHost = {
  /** The name used in the Gherkin — the record the user is looking at. */
  readonly record: string;
  /** Route, with the anchor id already bound. */
  readonly path: string;
  /**
   * The `GET` whose response feeds this host's `audit={…}`.
   *
   * It serves two purposes, which is why it is a callable path rather than prose. A red sweep row names
   * it, so the first diagnosis happens at the wire instead of in the component — a host whose record
   * fetch fails renders without the affordance, and that is a broken endpoint, not a broken popup. And
   * the "values are the record's own" comparison reads it back, PER HOST: a single shared path would
   * silently compare the scaler's popup against the site's audit the first time someone reused that
   * step on another host, and the mismatch would read as a component defect.
   */
  readonly auditApiPath: string;
};

/**
 * The host record views swept for the affordance.
 *
 * Five of the eleven mount sites. The other six are reached only through a modal or a nested tab —
 * Performance Remarks' action row, the three reference-data maintenance modals, the risk-assessment
 * form, and the site's Contacts view — and each needs its host's own opening ritual, which is that
 * suite's business rather than this one's. `coverage.md` lists them with the reason.
 *
 * Every `auditApiPath` below was probed 2026-09-04 and returns all five audit fields populated. The
 * Check Scale view is deliberately ABSENT: `GET /api/check-scales/145988` and `/145849` both answer
 * **500 for every role including an administrator** in this environment, so the host screen cannot
 * render at all and any sweep row for it would be red for a reason that is not the affordance. Tracked
 * as `coverage.md` CG-1.
 */
export const AUDIT_HOSTS: readonly AuditHost[] = [
  {
    record: 'Scaler',
    path: `/scalers/view/${formatContractScalerLicenceNo}`,
    auditApiPath: '/api/scalers/001B',
  },
  {
    record: 'Scale Site',
    path: '/scale-sites/view/019V',
    auditApiPath: '/api/scale-sites/019V/summary',
  },
  {
    record: 'Mark Site Designation',
    path: '/mark-site-designations/view?haulingMarkAuthorizationId=1101',
    auditApiPath: '/api/mark-site-designations/1101',
  },
  {
    record: 'Scaler Authorization',
    path: '/scaler-authorizations/view/147851',
    auditApiPath: '/api/scaler-authorizations/147851',
  },
  {
    record: 'Scale Site Authorization',
    path: '/scale-site-authorizations/view/239313',
    auditApiPath: '/api/scale-site-authorizations/239313',
  },
] as const;

/** Look a host up by the name the Gherkin uses, so a typo in a feature file fails loudly. */
export const auditHostFor = (record: string): AuditHost => {
  const host = AUDIT_HOSTS.find((h) => h.record === record);
  if (!host) {
    throw new Error(
      `[sec] no audit host record named "${record}" — known hosts: ` +
        `${AUDIT_HOSTS.map((h) => h.record).join(', ')}`,
    );
  }
  return host;
};
