# Coverage — UC-SST-006 Maintain Scale Site Contacts

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `contacts.feature` + `validation.feature` + `UC-SST-006-slices.md` (12 slices) +
`UC-SST-006-technical.md`, against the write path (`ScaleSiteContactForm.validateContactForm` client-side,
then `ScaleSiteContactService` + `POST/PUT/DELETE /scale-sites/{id}/contacts[/{cc}]`). Also absorbs
UC-SST-005 S07 (add contact) / S08 (edit contact).

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Add a (secondary) site contact + persist | S01 | `ContactsCreate` → `POST /contacts` | `contacts.feature @S01 @p0` (API read-back) | covered | — |
| Add a PRIMARY contact | S02 | "Add Primary Contact" → `POST` primaryContactInd Y | `@S02 @p1` (read-back Y) | covered | — |
| CIMS popup populates client contact id | S03 | `ContactSearchModal` (client-contacts search) | — | deferred | defects.md Coverage gap #1 (used manual id entry) |
| Update an existing contact | S04 | `ContactsEdit` → `PUT /contacts/{cc}` | `@S04 @p1` (read-back updated role) | covered | — |
| Delete a contact | S05 | confirm modal → `DELETE /contacts/{cc}` | `@S05 @p1` (read-back absent) | covered | — |
| View contact detail (read-only) | S06 | `ContactsView` | `@S06 @p2` | covered | — |
| Reset create form before save | S07 | `ContactsCreate.handleReset` | `@S07 @p2` | covered | — |
| Reset update form before save | S08 | `ContactsEdit.handleReset` | — | deferred | defects.md Coverage gap #2 (create-reset covered; analogous) |
| Create required: Client Contact ID / Contact Role / Access / Effective Date | S09 | `validateContactForm` (required) | `validation.feature @S09 @p1` | covered | — |
| Create format: Client Contact ID not-a-number | S10 | `validateContactForm` (numeric) | `@S10 @p1` "abc" | covered | — |
| Create format: Expiry before Effective | S10 | `validateContactForm` (date order) | `@S10 @p1` | covered | — |
| Create format: Contact Role > 40 chars | S10 | TextArea `maxCount={40}` caps entry | — | not-applicable | input caps to 40 (like SST-004 max-length) |
| Create format: invalid date format | S10 | Carbon flatpickr `dateFormat Y-m-d` prevents free-text bad formats | — | not-applicable | picker-constrained |
| Update required: Contact Role blank | S11 | `validateContactForm` (required) | `@S11 @p1` (no PUT) | covered | — |
| Server: client contact must exist (SI-type) | detailed EP | `clientContactExists` → 404 (search hard-filters `bus_contact_code='SI'`) | — | deferred | defects.md Coverage gap #3 (server reject) |
| Server: only one primary per site | detailed BR | `primaryContactExists` → 409; "Add Primary Contact" button disabled when a primary exists (STA-008) | — | deferred | defects.md Coverage gap #3 (client-gated; 409 unreachable via normal UI) |
| Server: contact already associated | detailed | `contactExists` → 409 | — | deferred | defects.md Coverage gap #3 |
| Permission-gated controls hidden (S12) | S12 | `@IsScsEditor` — single-role mock grants all | — | blocked | defects.md Coverage gap #4 |

**Role / permission coverage:** blocked by mock auth (grants only `SCS_SYS_ADMIN`). S12 (restricted actor
hides Add/Edit/Delete) not exercisable. Revisit with the RBAC rework.

**Symmetry check:** create/update mirror — create validation (S09/S10) + update validation (S11); create
happy (S01/S02) + update happy (S04); reset-create (S07) covered, reset-update (S08) deferred as analogous.
CRUD all covered (create/read-view/update/delete).

**Test-data note:** a contact links a site to a REAL `SI`-type client contact — `clientContactExists`
delegates to a search that hard-filters `bus_contact_code='SI'`, so `siClientContactId` (2504) is pinned
from that set (an arbitrary client_contact id 404s). Each scenario seeds + DB-cleans its OWN site + contact
(the site teardown also deletes `SCALE_SITE_CONTACT` rows). Pinned in `fixtures/sst/scale-site-test-data.ts`.

**Status values:** `covered` · `not-applicable` (picker/input-capped) · `deferred` (see Coverage gaps) · `blocked` (env/auth).
