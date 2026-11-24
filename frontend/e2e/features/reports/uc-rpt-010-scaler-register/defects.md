# Defects — UC-RPT-010 Generate Scaler Register Report

> New to these files? See [`defects-guide.md`](../../../defects-guide.md) at the e2e root for the register
> definitions, tag meanings, and status flow. **BA/QA own triage and disposition.**

This UC is the **archetype** for the Reports tab. Divergences #1 and #2 were reproduced here once and
cross-referenced from the other five affected report UCs; **both are now closed** (#1 fixed in the app, #2
accepted), so those cross-references are historical. Nothing in this UC is deliberately red any more.

---

## Divergences

### #1 — Report date windows were not checked: you could ask for "from December, to January" — **FIXED 2026-08-11**
- **What was wrong.** On the report screens you could enter a From Date *later* than the To Date and the
  request was sent anyway — a report over an impossible range, which in practice returns an empty or
  misleading result the user cannot tell apart from "no data". The old system refused, showed an error next to
  the field, and sent nothing.
- **Affected six of the eight report screens:** Scaler Register, Scale Site Register, Mark Site Designation,
  Designated Marks Exception, Scaling Administration, Scaling Exception. The two District Performance screens
  already enforced it, which is what made this a divergence rather than an accepted simplification.
- **THE FIX.** The rule is now enforced on all eight screens through one shared helper,
  `frontend/src/utils/reportDateRange.ts` (`validateReportDateRange`). Each screen re-validates as the window
  is edited and `handleSend` returns **before** dispatching when the window is invalid. The message renders
  **once**, on the To field (`invalidText`, so it is associated with an input via `aria-describedby`): the
  helper mirrors its cross-field `rangeError` onto `toError` and the screens render only that.
  - The two District Performance screens were **migrated onto the same helper**, which removed two
    hand-rolled copies of the logic from each of them (a `validateDates` callback plus a duplicated
    `rangeError` useMemo). So the net change is *one* implementation replacing two copies and six gaps.
  - The Mark Site Designation report has **two** windows (effective and expiry); both are validated, and each
    names its own fields so the message says which window is wrong.
- **Wording — a deliberate re-grounding, decided with BA input.** The message is the new app's own
  **"To Date must be on or after From Date."**, not the legacy *"From Date must be less than or equal the To
  Date."* The District Performance screens had already shipped that wording for this exact rule, so using the
  legacy text would have left six screens disagreeing with two about one rule. Same treatment the email
  messages already get. The scenario's expected text was updated to match.
- **Status: CLOSED.** **Tests:** `date-validation.feature` `@S05 @p1` (error + no request) and `@S05 @p2`
  (correcting the window clears the error and allows the report) — both **green**; plus
  `utils/reportDateRange.unit.test.ts` (20 cases pinning the tiering and the boundaries).

### #2 — A mistyped date is silently ignored — **CLOSED as "not a defect" 2026-08-11 (accepted, with BA input)**
- **What was reported.** Typing something that isn't a date into From Date empties the field and the report
  runs with **no date filter**, where the old system showed a field error and refused to run.
- **Why it is being accepted rather than fixed.** The mistyped text never reaches the screen: Carbon's
  DatePicker (behind `components/core/DateInput`) discards input it cannot parse, so the value arrives as an
  empty string. A screen-level fix is therefore impossible — the only way to report "must be a valid date"
  is to change that shared component, which **39 files across every domain** depend on. That is
  disproportionate to a control which already prevents a bad date from reaching the report, and which clears
  the field visibly as it does so, so the outcome is not truly silent. The legacy *intent* — never run a
  report on an unparseable date — is satisfied, just by prevention instead of by an error message.
- **Residual risk, stated plainly:** a user who mistypes and does not notice the field clear gets a report
  over a wider window than they intended. Judged acceptable against the blast radius of the alternative.
- **Status: CLOSED — accepted.** **Test:** the red repro was replaced by a **green** scenario,
  `date-validation.feature` `@S03 @S04 @p2`, which pins the protective behaviour (the entry is discarded and
  the payload carries no `fromDate`) — so a future `DateInput` change that started letting unparseable text
  through would fail here. Defence-in-depth for a value arriving from elsewhere (a URL parameter) is in the
  shared helper and unit-tested.

---

## Coverage gaps

### #1 — Role-gated Reports menu (S08) is not automatable

- **What's missing.** Legacy S08 asserted the Reports menu is visible *because* the user holds the District
  Scaling Manager role — i.e. it needs a user **without** that role to be meaningful.
- **Why.** The new app recognizes a single authority (`SCS_SYS_ADMIN`) and mock auth grants exactly that to
  every session, so there is no "user without the permission" to log in as. Gating is at the route level
  (`ProtectedRoute`), not the menu level. Same blocker as UC-RPT-009 S07 and the other report UCs.
- **Status: OPEN** (test author, once finer-grained roles land — the mock auth is single-role).

---

## Environment blockers

### #3 — moved to the team's private infrastructure notes

### #5 — moved to the team's private infrastructure notes

### #4 — moved to the team's private security findings log
