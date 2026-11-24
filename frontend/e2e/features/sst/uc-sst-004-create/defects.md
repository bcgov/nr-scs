# Defects — UC-SST-004 Create Scale Site

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md).

## Divergences

- **The "coordinates cannot be negative" rule is gone**
  - **What's wrong:** The legacy screen rejected any negative latitude/longitude ("Coordinates cannot be negative", ERR-009). The new form accepts negative degrees (it validates a signed range instead).
  - **Expected vs actual:** Legacy → a negative coordinate is an error. New app → a negative degree within ±90 (lat) / ±180 (long) is accepted, with only the *magnitude* range enforced.
  - **How we caught it:** Reading the write path both ends — client `validateCoordinate` uses `isBetween(deg, -maxDegrees, maxDegrees)` (`components/Form/ScaleSiteForm/index.tsx`) and server `requireCoordinateRange` uses `degrees < -maxAbsoluteDegrees || degrees > maxAbsoluteDegrees` (`ScaleSiteService.java`). Neither has a "not negative" branch; the legacy ERR-009 message key has no new-app equivalent.
  - **Why (technical):** Looks like a deliberate redesign — DMS coordinates are now signed (negative = W/S hemisphere) rather than unsigned-with-a-separate-sign, so a blanket non-negative rule would be wrong by design.
  - **Action:** BA/QA to raise a Jira ticket to confirm the negative-coordinate rule was intentionally dropped (vs. an oversight). No automated test filed (asserting the *legacy* behaviour would assert a likely-correct new behaviour as broken).
  - **Update 2026-09-16 (branch `bugfix/scale-site-lat-long-limit`):** the signed form is now actually *enterable*, which it briefly was not. The first cut of the DMS field caps copied legacy's `maxlength` as a **character** count, so a 3-character longitude-degrees cap silently truncated `-123` to `-12` — a different, in-range point that then failed the BC check, surfacing as "not within the boundaries of BC" rather than anything about length. The caps now count **digits**, with a leading `-` allowed on top (`DmsInput` `degreesDigits` + `allowSign`), so both `123` and `-123` can be typed. This does **not** pre-empt the ruling requested above: it keeps the signed model working as designed rather than deciding for or against it. If the BA confirms coordinates should be unsigned again, the change to make is dropping `allowSign`, not restoring a character cap.
  - **Register / classification:** Divergence · suspected-intentional-change
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-SST-004-S04 — UC-SST-004-S04
  - **Environment / build:** local seeded DB (`THE/default@localhost:1525/DBDOCK_01`), branch `test/scale-site-mgmt`, backend `2.21.0-SNAPSHOT`.
  - **Data fixture:** n/a (behavioural/code observation).
  - **Status:** OPEN · **Found:** 2026-08-12
  - **Test:** none (log-only divergence — see Action).

## Bug / Regression

- **Two people creating a scale site at the same instant can get a 500**
  - **What's wrong:** The scale-site number (PK) is assigned by a legacy database trigger that picks "the smallest unused number". Two creates that overlap compute the *same* number; one wins and the other fails with a duplicate-key error surfaced as HTTP 500 ("Save failed.").
  - **Expected vs actual:** Expected → each concurrent create gets its own number and succeeds. Actual → under concurrency the losing insert hits `ORA-00001` (unique PK) and the endpoint returns 500; nothing is persisted for that request (it rolls back), so a retry succeeds.
  - **How we caught it:** The `--repeat-each` stress run (multiple S01 creates in parallel) intermittently failed with the create not navigating; root-caused to the `SCS_SCST_BR_IU_TRG` min-free-id trigger racing. Reproducible by firing two `POST /api/scale-sites` with valid bodies simultaneously.
  - **Why (technical):** `SCS_SCST_BR_IU_TRG` does `SELECT MIN(free id) ... MINUS SELECT id FROM scale_site` under READ COMMITTED, so overlapping transactions don't see each other's uncommitted row and pick the same id. This is inherited legacy trigger behaviour on the immutable Oracle DB — not introduced by the rebuild — but the backend surfaces it as an unhandled 500 rather than a retriable/handled response.
  - **Action:** BA/QA to raise a Jira ticket to decide whether the backend should handle the collision (retry / friendlier error). Low real-world likelihood (creates are infrequent, human-paced).
  - **Register / classification:** Bug / Regression · observed (legacy-trigger concurrency limitation, not a rebuild regression)
  - **Severity/Priority:** sev3 / p2
  - **UC / Gherkin slice:** UC-SST-004-S01
  - **Environment / build:** local seeded DB, branch `test/scale-site-mgmt`, backend `2.21.0-SNAPSHOT`.
  - **Data fixture:** `fixtures/sst/scale-site-test-data.ts` (owner 00105328/00, org unit 27, methods W/P).
  - **Status:** OPEN · **Found:** 2026-08-12
  - **Test:** no automated red — the collision is non-deterministic (load-dependent), so a reliable failing repro isn't feasible as a standard test. The happy-path create (`create.feature @S01`) bounded-retries the transient collision (page object `createValid`) and the feature is `@mode:serial`, so the suite doesn't manufacture the race; this note + the manual repro carry the finding.

## Coverage gaps

- **S08 — no-permission path not automated**
  - **What's wrong (test coverage, not the app):** Legacy S08 asserts a user without `scaleSiteCreate` is refused. Mock auth grants only `SCS_SYS_ADMIN` (which passes `@IsScsEditor`), so the deny branch is unreachable in the test env.
  - **Action:** revisit when the finer-grained role model lands (deferred RBAC rework); then drive a viewer-role session against `/scale-sites/create`.
  - **Register / classification:** Coverage gap · blocked-by-mock-auth
  - **Status:** OPEN · **Found:** 2026-08-12

- **BC-boundary coordinate rejection (ERR-011) not automated**
  - **What's wrong (test coverage):** The server DOES enforce "coordinates not within the boundaries of BC" (`BritishColumbiaCoordinateValidator`, and the client maps that server message to the coordinate fields). No scenario exercises it — it needs a coordinate that passes the client range/completeness checks but lies outside BC, which requires pinning the validator's polygon bounds.
  - **Action:** add a server-reject coordinate scenario once an in-range-but-outside-BC point is discovered from `BritishColumbiaCoordinateValidator`.
  - **Register / classification:** Coverage gap · deferred
  - **Status:** OPEN · **Found:** 2026-08-12
  - **Update 2026-09-16 (branch `bugfix/scale-site-lat-long-limit`):** the blocker named above — "requires pinning the validator's polygon bounds" — is resolved, so this gap is now writable.
    - **The polygon is pinned.** The four corners are legacy `Constants.BC_BOUNDARY_*` verbatim: NW 60°53'N/142°26'W (`Constants.java:111-121`, further down the file than the other three and easy to miss when grepping), NE 61°28'N/108°10'W, SE 46°28'N/110°32'W, SW 46°18'N/136°32'W. Winding order, the ×10,000 scaling with truncation toward zero, and the corner-point shortcut all match legacy.
    - **A usable rejection point:** latitude `43°39'0"`, longitude `-79°23'0"` (Toronto) — clears the client's ±90/±180 range and completeness checks, well outside the polygon. Note the polygon is a rough quadrilateral, not the provincial outline, so it *admits* points in Alberta (e.g. Calgary); do not pick a rejection point by real-world geography.
    - **What it now asserts:** the refusal is **inline**, not a round trip. `validateScaleSiteForm` runs a client-side mirror (`frontend/src/utils/britishColumbiaBounds.ts`) and pins the message on both coordinate fields before any request is sent, using the server's exact wording, "The coordinates specified are not within the boundaries of BC." To exercise the *server* branch instead, the request has to bypass the form (API-level), since the client now refuses first.
    - **Already covered at unit level:** `britishColumbiaBounds.unit.test.ts` (inside/outside, signed vs unsigned longitude, all four corners, corner-drift guard) and the `validateScaleSiteForm BC boundary check` block in `logic.unit.test.ts`. The TS mirror was diffed against the real Java validator over 210,783 sampled coordinates with zero mismatches. So what remains is browser-level proof that the message reaches the user, not proof of the rule itself.
  - **Status:** OPEN (writable — blocker cleared) · **Updated:** 2026-09-16

- **CG#3 — field max-length rejection not separately asserted**
  - **What's wrong (test coverage):** Name (40) / description (200) / owner (8/2) max-lengths are enforced by the inputs' `maxLength` (entry is capped, so over-length can't be typed) and by the server `requireString` guards. No scenario asserts the boundary explicitly — low value given the input cap.
  - **Register / classification:** Coverage gap · deferred (low value)
  - **Status:** OPEN · **Found:** 2026-08-12

- **CG#4 — coordinate seconds-range not separately asserted**
  - **What's wrong (test coverage):** ERR-008 (seconds 0–59) runs through the identical `requireCoordinateRange`/`isBetween` branch already asserted for minutes-out-of-range (S04); a dedicated seconds example would add no new branch.
  - **Register / classification:** Coverage gap · deferred (shared branch already covered)
  - **Status:** OPEN · **Found:** 2026-08-12
