# Defects — the welcome page (SEC-1 / UC-SYS-004)

Legends: [`../../../defects-guide.md`](../../../defects-guide.md),
[`../../../coverage-guide.md`](../../../coverage-guide.md).

Authored 2026-09-04 from source, every value probed against the running local stack, then executed:
**15 scenarios, all green** — 12 written, one of them an outline over four payloads. One divergence,
pinned as today's behaviour. The two entries under *Verified* are the ones worth a BA's eye.

---

## Divergences

### D1 — an internal user is never shown their org unit — `OPEN (BA/QA)`

**In plain words.** UC-SYS-004 describes the welcome page as showing "the current system message **and
user org-unit**". For an internal (ministry) user the Organization row on that page is **always empty**.
External users see theirs; internal users see nothing.

**Where it stops.** The backend resolves an internal user's org unit from an `orgUnitNo` **request
parameter**:

```java
// WelcomeService.buildWelcomeSummary
String organization = SecurityContextUtils.isClientRestricted()
    ? resolveClientOrganization(SecurityContextUtils.currentUserClientNumber())
    : resolveUserOrganization(orgUnitNo);          // ← null for every real call
```

The frontend calls the endpoint with no such argument — `API.welcome.getWelcomeSummary(token)`, and
`WelcomeService.getWelcomeSummary(token, orgUnitNo?)` only appends the parameter when one is passed. So
`resolveUserOrganization(null)` returns null and the cell renders empty.

**The capability is built; it is simply never invoked.** Probed 2026-09-04, both ways:

| Request | `userOrganization` |
|---|---|
| `GET /api/welcome` (as the frontend calls it) | *(absent)* |
| `GET /api/welcome?orgUnitNo=1` | `"RVA - OBSOLETE - Vancouver Forest Region (RCO)"` |

**Why it is a divergence rather than a bug.** There is nothing for the frontend to pass. The user's
identity does not carry an org unit yet, so the row is empty because there is nothing to resolve, not
because the page forgot to render one.

**What the suite does.** Pins the empty cell (`welcome-summary.feature` @S01 @p1) as **today's**
behaviour, so the scenario reddens the day the frontend has an org unit to pass and starts passing it.
That is the point of pinning it rather than logging a gap: a gap would be silent when the situation
changes.

**Action.** BA/QA to decide which is true — the page is incomplete pending the org-unit branch (in
which case this row belongs to that story's acceptance criteria), or UC-SYS-004's goal overstates what
the new page shows internal users. `Status: OPEN` — BA/QA.

---

## Bugs / Regressions

None.

---

## Coverage gaps

Tracked in `coverage.md` (CG-1 … CG-5). The one worth reading here is **CG-2**: the four attack shapes
are asserted against DOMPurify's **default** profile, so they would not notice a future
`ADD_TAGS` / `ALLOWED_ATTR` widening that admitted a fifth. That belongs in a configuration-level unit
test in `nr-scs`, not in a browser scenario — a browser test can only ever sample the payload space.

---

## Spec gaps

None.

---

## Verified — not a defect

### V1 — the bare client number is the correct Organization for a client that does not resolve — permanent

`SCS_INDUSTRY_SCALER` with client `00048273` renders Organization as `00048273`, not
`{companyName} - 00048273`. This looks like the acceptance criterion failing. It is not.

`WelcomeService.resolveClientOrganization` looks the company name up through
`scs_client_vw_pkg.search_recs` and falls back to the bare number when nothing comes back. This client
genuinely is not in that view:

```sql
select count(*) from scs_client_vw;                              -- 1550
select company_name from scs_client_vw where client_number='00048273';  -- no rows
select company_name from scs_client_vw where client_number='00001009';  -- AINSWORTH LUMBER CO. LTD.
```

**SCS display views are lossy by design** — a client's presence in `THE.CLIENT` does not put it in the
supported view. So the fallback fired for the reason it exists, and the AC's happy path is proven on the
owner anchor (`00001009`) in the very next scenario.

Recorded because this is the trap: probing only the industry-scaler anchor would read as "the company
name is never resolved" and produce a false divergence against a correct implementation. Asserting both
clients is what tells the fallback apart from a broken lookup. (Same family as the lossy-view caution
that applies to every `*_VW` in this schema.)

### V2 — moved to the team's private security findings log

### V3 — `'Current news is unavailable.'` is a distinct state, not an empty cell — permanent

The page distinguishes three things in one row: news present (rendered), news absent (nothing), and the
read having failed (`'Current news is unavailable.'`). Worth recording because the first instinct on
reading `welcomeQuery.isError ? … : null` is that the message is redundant with an empty cell. It is
not: an empty cell tells a user there is no news, which is a different and wrong claim when the truth is
that the system could not find out.
