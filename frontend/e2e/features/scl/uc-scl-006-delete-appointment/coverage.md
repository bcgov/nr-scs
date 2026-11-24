# Coverage — UC-SCL-006 Delete Scaler Appointment

> New to these files? See [`coverage-guide.md`](../../../coverage-guide.md) at the e2e root for the column + status-flag legend.

Sources reconciled: `gherkin/UC-SCL-006-S01..S07.feature` + `UC-SCL-006-slices.md` + `UC-SCL-006-technical.md`,
against the app's delete-appointment path (`AppointmentsTab` row Delete → confirm modal → `deleteMutation`
→ `ScalerAppointmentController.deleteScalerAppointment`, DELETE /api/scalers/{no}/appointments/{id}).

**Re-grounding.** Delete is a per-row **"Delete"** button on the Appointments tab that raises a Carbon
**confirmation modal** (legacy CNF-001 "Are you sure you want to delete this record?"); "Confirm Delete"
issues the DELETE, "Cancel" dismisses it. On success the row disappears from the list; a scaler with no
remaining appointments shows "No appointments found for this scaler." (legacy S03).

**Scope note:** both slices (delete + cancel) SEED their own scaler+appointment and operate on it
(delete.feature `@mode:serial`, one shared seed client reused seed → clean → re-seed) — S01 confirms the
delete (a 0-appointment scaler is still deletable, so seedScaler cleanup suffices), S02 cancels (no DELETE).
**Seeding rather than a real anchor's pre-existing appointment is deliberate:** the earlier cancel slice
pinned scaler `001A` and needed it to own an appointment, which drifted away on a reviewer's local DB
(PR #46 follow-up); self-seeding is robust on any DB. Values pinned in
`fixtures/scl/scaler-appointment-test-data.ts` (seed client API-verified free). Verified against the local
Docker DB.

| Source item | Source citation | App enforcement point | Scenario (tags) | Status | Gap/defect |
|---|---|---|---|---|---|
| Delete appointment (S01) | slices.md S01 | `deleteScalerAppointment` (DELETE) + list refresh | delete.feature `@S01 @p0` | covered | — |
| Confirmation dialog CNF-001 | technical.md CNF-001 | confirm modal "Are you sure you want to delete this record?" | delete.feature `@S01` / delete.feature `@S02` | covered | — |
| Appointment list empty (S03) | slices.md S03 | "No appointments found for this scaler." after last delete | delete.feature `@S01` (empty-list assertion) | covered | — |
| User cancels confirmation (S02) | slices.md S02 | modal "Cancel" → no DELETE | delete.feature `@S02 @p1` | covered | — |
| Delete/Edit controls hidden — no permission (S04) | slices.md S04 | `@IsScsEditor` / permission gate | — | blocked | mock auth (defects.md Coverage gap #1) |
| DB child-constraint prevents deletion (S05, ERR-001/002/003) | slices.md S05 | `deleteMutation.onError` → banner (child-record message) | — | not-applicable | no deterministic UI trigger (defects.md Coverage gap #2) |
| Unauthorized direct POST/DELETE (S06) | slices.md S06 | route / `@IsScsEditor` guard | — | blocked | mock auth (defects.md Coverage gap #1) |
| Menu full-access (role) (S07) | slices.md S07 | role-driven menu state | — | blocked | mock auth / role (defects.md Coverage gap #1) |

**Symmetry check:** the confirm dialog's two arms — Confirm (S01, deletes) and Cancel (S02, no delete) —
are both covered, and the post-delete empty-list state (S03) is asserted. The permission/role branches
(S04/S06/S07) are uniformly blocked by mock auth; the DB-constraint exception (S05) is an internal error
path with no reliable trigger.

**Role / permission coverage:** blocked by mock auth (S04/S06/S07) — see Coverage gap #1.

**Status values:** `covered` · `not-applicable` (no deterministic trigger) · `blocked` (env/auth).
