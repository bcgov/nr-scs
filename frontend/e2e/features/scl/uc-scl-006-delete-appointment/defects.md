# Defect log — UC-SCL-006 Delete Scaler Appointment

> How this log works (registers, statuses, glossary): [defects-guide.md](../../../defects-guide.md)

Environment: branch `test/scl-appointments`, frontend `http://localhost:3000` + backend `:8080` (mock auth
`SCS_SYS_ADMIN`, `security.jwt.enabled=false`), seeded Docker DB `THE/…@localhost:1525/DBDOCK_01`. No seed
patch needed. Ground-truthed live 2026-08-05. Re-verify pinned anchors on any DB re-extract.

---

## Divergence

_None identified for the authored slices — the app matched the re-grounded expectations for S01/S02/S03._

---

## Coverage gap

### Coverage gap #1 — permission / role branches (legacy S04, S06, S07) blocked by mock auth
- **What's not tested (plain):** S04 (Delete/Edit controls hidden without `scalerAppointmentDelete`/`Update`),
  S06 (unauthorized direct POST/DELETE), S07 (role-driven menu access). Mock auth grants only
  `SCS_SYS_ADMIN`, so every user is fully authorized and these branches are unreachable from the browser.
- **Status:** OPEN — `blocked` by mock auth. Revisit if the harness gains multi-role auth.

### Coverage gap #2 — DB child-constraint on delete (legacy S05) has no deterministic UI trigger
- **What's not tested (plain):** S05 (the delete is refused because the appointment has associated child
  records → error banner). The new app surfaces this via `deleteMutation.onError` (banner), but producing an
  appointment with a blocking child record on demand is not reliably reachable through the UI (a plain
  create-form appointment has no such child; empirically a create-form appointment deletes cleanly, 204).
- **Status:** OPEN — `not-applicable` (internal error path, no deterministic trigger). Same class as other
  UCs' unchecked-DB-error slices.

---

## Verified — not a defect

### V1 — a scaler with zero appointments is still deletable
- Deleting a scaler's only (intrinsic) appointment leaves it with 0 appointments, and the scaler still
  DELETEs cleanly (204, confirmed live 2026-08-05). So the S01 happy path can delete the single seeded
  appointment and rely on the ordinary seedScaler cleanup — no special teardown needed. Recorded because the
  earlier finding (a scaler with ADDED appointments 400s on delete, UC-SCL-004 V2) might suggest otherwise;
  that only applies while extra appointment rows remain, not to a scaler emptied of appointments.
