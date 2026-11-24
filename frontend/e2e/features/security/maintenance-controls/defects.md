# Defects — §J maintenance write controls (SEC-11)

Legends: `../../../defects-guide.md`, `../../../coverage-guide.md`.

Authored 2026-08-31 from source, probed against the running local stack. 64 scenarios, all green.

---

## Divergences

None. Every §J cell the scaling manager column holds is offered, every cell it lacks is withheld, and
the same holds for the CE Technician on the one §J screen it can open. The eight screens each pass their
own three permission props by hand, and all eight got them right.

That is a genuinely useful "none": these gates are **opt-in**, so a missing prop is silent. The suite
was written expecting to find at least one screen that had forgotten one.

---

## Bugs / Regressions

None.

---

## Coverage gaps

Tracked in `coverage.md` (CG-1 … CG-4). Nothing blocking; CG-3 is the deliberate scope line — this suite
asks whether an action is **offered**, never whether it works.

---

## Spec gaps

None. §J's cells and the screens agree row for row.

---

## Verified — not a defect

### V1 — the delete-confirmation modal carries a second danger button — permanent

There are **two** `.form-actions` rows in the DOM of an open maintenance detail modal. The second belongs
to the delete-confirmation dialog, is mounted-but-hidden, and carries its own
`button.cds--btn--danger` (labelled "OK").

Why it matters: a Delete locator written as `.form-actions button.cds--btn--danger` matches both. For a
role that *is* offered Delete this becomes a Playwright strict-mode violation rather than a pass — which
is how it was caught — but a locator written slightly differently (`.first()`, or an attached-rather-than
-visible check) would silently report Delete as offered to a role correctly never shown it.

The fix is the `.action-btn` class, which only the real action-row controls carry:
`.form-actions button.action-btn.cds--btn--danger`. Recorded because the next author touching these
locators will not otherwise know why that class is there.

Same family as the Carbon visibility-vs-presence trap in `role-scoping-mechanics.md`, and it fails in the
same reassuring direction.

### V2 — maintenance rows open from the id cell, not the row — permanent

`table tbody tr` is not clickable. The row exposes its id as a `button.scs__link` inside the first cell,
and that is the only thing that opens the detail modal. A row-level click succeeds silently and does
nothing, leaving the modal shut — after which every "the control is not offered" assertion passes for
the wrong reason.

This cost the first probe run a full set of empty results (`modals=2 buttons=[]` — the two hidden modals
being counted while nothing had opened). `MaintenancePage.openFirstRecord` therefore clicks the link and
then asserts the modal heading before anything else is judged.

### V4 — the modal heading is NOT a sufficient anchor; the skeleton is — permanent

The suite was authored anchoring every judgement on the detail modal's heading, and passed at the
default four workers. A full-domain run then failed two administrator rows
(`/maintenance/appointment-types`, `/maintenance/valid-licence-attributes`) — and the cause was the
anchor, not the app.

`MaintenanceFormModal:197` renders the action row as `{!detailLoading ? viewActions : null}`. So while
the record's detail request is in flight the modal is **open and titled but carries no Edit or Delete
button at all**. The heading appears immediately; the controls do not.

That is wrong in two directions, and the second is the dangerous one:

- the **allow** side flakes under load — a slow detail fetch exceeds the assertion timeout and reports a
  granted permission as withheld;
- the **deny** side passes **vacuously and silently** — "the control is not offered" is trivially true
  of a modal that has not rendered its action row yet, and nothing about the result looks wrong.

`openFirstRecord` now waits for Carbon's `SkeletonText` to clear (`.cds--skeleton__text`, count 0),
which is precisely the `!detailLoading` render condition. `openList` likewise waits for a rendered row
rather than trusting `networkidle`, which fires before React paints.

`WhoDidIt` was considered as the anchor and rejected: it renders **only for IDIR users**, and
`RoleSessionPage` signs in as `BCEIDBUSINESS`, so it is absent throughout this suite. It was visible
during probing only because the throwaway probe seeded `provider: 'IDIR'` — a good illustration of why a
probe's session must match the suite's.

Verified at **six** workers (the project caps local runs at four): 64/64, repeatedly. Before the fix the
same run failed one to three scenarios each time.

### V3 — the detail modal opens without a READ permission — permanent

The scaling manager column holds `MAINTAIN_APPOINTMENT_TYPES_QUERY`, `_CREATE` and `_UPDATE` but **no**
`_READ` cell — §J has no separate read row for that area. The detail modal nevertheless opens and offers
Edit.

Confirmed correct: the modal is a client-side view over data the list already fetched, and only
`editPermission`/`deletePermission` gate its controls. Nothing gates *opening* it, and §J does not ask
for anything to. Noted so the asymmetry against the other seven areas is not re-investigated.
