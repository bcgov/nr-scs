# How the defect log works (legend)

**Audience:** BA / QA and anyone reviewing the suite — you do **not** need to know the codebase.
This is the stable reference for the **per-use-case defect logs**: one `defects.md` lives in each UC
folder next to its `coverage.md` (e.g. `features/chk/uc-chk-001-create/defects.md`). To see everything
open across the whole suite at once, use the scan commands under "Where the entries live" below.

**BA/QA own triage and disposition** — deciding whether a finding is a real bug, raising the Jira ticket,
and closing it. The test author (the skill) only records evidence and does mechanical upkeep; it never
changes the app to match the old spec, and it never adjudicates.

> **Audience note:** write every entry so a **BA/QA reader who does not know the SCS codebase** can
> understand it. Lead each entry with a plain-language summary; put code paths / jargon *after* it as
> supporting detail. See “How to read an entry”.

## Glossary (read this first)

**SCS terms**

| Term | Plain meaning |
|---|---|
| **Check scale** | A re-scale of logs done to *check* an original scaler's measurements. |
| **Detail check scale (HBCS)** | A check scale built from official scaling documents pulled from HBS (see DDN/DDV). Screens: UC-CHK-001..004. |
| **Summary check scale** | A check scale typed in by hand (species / pieces / volume totals), not pulled from HBS. Screens: UC-CHK-005/006. |
| **HBS** | Harvest Billing System — the external system that stores the original scaling documents. |
| **DDN / DDV** | Document number / version — the id + version of a scaling document in HBS. A detail check scale points at a *check* DDN/DDV and an *original* DDN/DDV. |
| **Log tally / sample log tally** | The two kinds of HBS scaling document a detail check scale can reference. |
| **Scaler licence #** | The licence id of a scaler (a person). A check has a *check scaler* and an *original scaler*. |
| **Scale site** | The physical location where scaling happens. |
| **Timber mark** | A code identifying timber from a particular tenure/cut. |
| **ERR-### / STA-###** | Numbered error/state messages from the legacy requirements catalog. |
| **Re-grounding** | Translating the legacy Gherkin (its old routes / field names / message wording) onto the *new* React app. |
| **Real seeded DB (image + patches)** | The suite runs against **real data** in a pre-built Docker image (in the team's private registry; see `README.md`) with the `scs-real-test-data-patches/` SQL applied on top per container via `scripts/apply-patches.sh` (currently only the MSD create patch — CHK needs none) — not the old synthetic mock seed. Fixtures pin real anchors (e.g. CHK scalers `7443/7444`, timber mark `L44804`, site `28E`; INS sites `520/525/561`, inspector GUID `79AC…12E0`) with provenance in each `fixtures/<domain>/*-test-data.ts`. |

**What the tags on a test mean**

| Tag | Meaning |
|---|---|
| `@discovered-divergence` | A test that **deliberately stays RED** because it reproduces a divergence (see below). Filter it out of a "fresh failures only" run with `--grep-invert @discovered-divergence`. |
| `@discovered-bug` | A test that **deliberately stays RED** because it reproduces a confirmed bug/regression awaiting a fix (has a Jira ticket). Same filter idea. |
| `@skip` | A scenario that **cannot be automated today** (e.g. blocked by mock auth) — skipped, never used to hide a failure. |

## Registers (what kind of finding is this?)

Every entry sits in exactly one register. The five kinds, in plain language:

| Register | Plain meaning | Compares | Fixed by |
|---|---|---|---|
| **Divergence** | The app behaves **differently from the (legacy-derived) spec**. Might be a real bug *or* a deliberate change — BA/QA decide. Kept as a genuinely-failing `@discovered-divergence` test when it looks like a defect. | app **vs** spec | Dev (via BA/QA → Jira) *or* update the spec if intended |
| **Bug / Regression** | The app is **genuinely broken** (not just different from the old spec) — e.g. something that worked now fails. Almost always a ticket. Kept as a genuinely-failing `@discovered-bug` test if it can't be fixed right away. | app **vs** correct behavior | Dev (via BA/QA → Jira) |
| **Coverage gap** | **We haven't tested it yet** — skipped, deferred, or not automatable today. Not an app problem. | our tests **vs** what should be tested | Test author, later |
| **Spec gap** | The Gherkin test-spec is **missing scenarios its own source documents list** — a paperwork mismatch, *not* an app problem. (Example: the detailed doc lists 5 required fields but the `.feature` only wrote 3.) | Gherkin **vs** its own source docs | A BA regenerates the `.feature` |
| **Verified — not a defect** | Looked wrong at first, but we **confirmed it's correct**. Kept so nobody re-investigates it. | — | N/A |

**Status flow:** Divergence & Bug/Regression: `OPEN → TRIAGED → JIRA-<key> → CLOSED` (BA/QA cut + resolve
the ticket). Coverage gap / Spec gap: `OPEN → CLOSED` when the test is finally written / the BA
regenerates the `.feature`. Verified-not-a-defect: permanent.

## How to read an entry

Each entry leads with a **plain-language summary**, then supporting detail, one sub-bullet per part:

- **What's wrong** — one or two sentences anyone can follow.
- **Expected vs actual** — what should happen vs. what the app does.
- **How we caught it** — the repro (a URL, an API call) and any hard evidence.
- **Why (technical)** — code path / root cause, for the dev who picks it up. *(optional)*
- **Action / Status / Test** — the disposition: `ACTION: BA/QA → Jira`, current `Status`, and the test
  that reproduces it (with its tag).

## Where the entries live & how to scan them

- **Each UC's findings** are in `features/<domain>/<uc-id>/defects.md`, next to that UC's `coverage.md`.
  Inside, entries are grouped by register (Bug/Regression · Divergences · Coverage gaps · Spec gaps ·
  Verified — not a defect).
- **To scan the whole suite** (the "what's open everywhere?" view) — no index or tooling needed, since
  every open item literally contains `Status: OPEN` and every deliberately-RED test carries its tag:

  ```bash
  grep -rn "Status:.*OPEN" features/*/*/defects.md              # every open item, suite-wide
  grep -rln "@discovered-divergence\|@discovered-bug" features/*/*/defects.md   # UCs with open reds
  ```

## Maintenance (self-check — run by the skill, not a person)

- **On every activation:** sweep the per-UC `defects.md` files — confirm each entry's `Test:` pointer
  resolves, folder names match `e2e/features/`, and no `OPEN` divergence/bug has gone unreviewed. Fix
  mechanical drift; surface `OPEN` items (and any `@discovered-divergence` / `@discovered-bug` reds) to
  BA/QA.
- **After each run / when a UC is finished:** file new findings in that UC's `defects.md`, under the
  correct register, leading with the plain-language summary. The author sets `JIRA-<key>`/`CLOSED`
  **only** on BA/QA confirmation; otherwise leave `OPEN` and flag it.
