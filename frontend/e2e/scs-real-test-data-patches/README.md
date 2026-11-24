# scs-real-test-data-patches

Targeted, **case-by-case** seed patches for the SCS E2E suite — used only when the **real** data
loaded into the local Docker DB (via `scs-data-extract` / `toad_extract`) genuinely can't supply a
fixture a scenario needs.

This folder lives **inside `e2e/`** (peer of `features/`, `fixtures/`, `scripts/`) so it travels with
the suite. Apply/tear down with the two scripts under `../scripts/` — see below.

This is **not** the old synthetic mock seed (that lived in `scs-seed-mock-data` and is retired for
E2E use). The DB is now loaded with real extracted data; fixtures are **discovered** from it. Only
when discovery fails — no distinct-scaler pair, no mark whose window covers today, no provably-absent
id for a negative case, a missing FK parent from the one-hop extract — do we add a **minimal** row here.

## Rules for a patch here
- **Discover first.** A patch is the last resort, after confirming no real record fits.
- **Minimal & targeted.** One row (or the few rows) the scenario needs — never a bulk re-import.
- **Idempotent loader + matching teardown.** Every patch script can be re-run and fully undone.
- **Documented.** State which UC/scenario needs it and *why real data fell short*.
- **Re-verify on re-extract.** Real data is non-deterministic across extracts; revisit patches when
  the DB is refreshed.

## Layout (added as needed)
```
<domain>/<uc-id>-<what>.sql            # idempotent insert
<domain>/<uc-id>-<what>.teardown.sql   # undoes exactly the above (sentinel-keyed)
```

## Apply / tear down (scripts)

Two scripts in [`../scripts/`](../scripts) apply and reverse **all** patches. They **auto-discover**
every `<domain>/*.sql` (apply) and `<domain>/*.teardown.sql` (teardown) by the naming convention above,
so a new patch that follows it is picked up with **no script edit**:

```bash
cd nr-scs/frontend
./e2e/scripts/apply-patches.sh        # apply every patch (idempotent — safe to re-run)
./e2e/scripts/teardown-patches.sh     # remove every patch's sentinel rows (reverse order)
```

They use `sqlplus` (defaults: DSN `THE/default@localhost:1525/DBDOCK_01`). **Minimal setup:** if a host
has no Oracle client on PATH, run sqlplus inside the DB container via the bundled wrapper —
`SQLPLUS=e2e/scripts/docker-sqlplus.sh ./e2e/scripts/apply-patches.sh`. Override `ORACLE_DSN` / `SQLPLUS` as
needed. After applying to an already-running backend, **evict the LOV cache**
(`POST /api/api/internal/cache/evict`) or restart it.

> Adding a patch: drop `<domain>/<name>.sql` + `<domain>/<name>.teardown.sql` here (idempotent insert +
> exact sentinel-keyed undo), add a row to **Current patches** below, and the scripts pick it up. If the
> new patch depends on another being applied first, name it so the sorted order is correct.

## Current patches

| Patch | UC(s) | Why real data fell short |
|---|---|---|
| `sst/integer-number-seed.sql` (+ `.teardown.sql`) | Scale Site create (UC-SST-004 S01; and anything else that creates a scale site) | The scale-site PK is assigned by a BEFORE-INSERT trigger (`SCS_SCST_BR_IU_TRG`) that reads the `THE.INTEGER_NUMBER` helper table. The one-hop extract pulled **ZERO** rows into it (nothing FKs to it), so `MIN(free id)` is NULL and the NOT-NULL PK insert fails → the create endpoint returns HTTP 500 (sanitized `ORA-01400`). No real record can supply the generator, so we seed the helper table with integers **1..9999** (capped: `SCALE_SITE_ID_NMBR` is `VARCHAR2(4)`, so >9999 would overflow the column). **Verified live 2026-08-12: create → HTTP 201.** REVERSIBLE via `integer-number-seed.teardown.sql`; the table was empty pre-seed, so the range delete restores that exact state. Not sentinel-keyed (pure integer table, no audit column) — safe precisely because it started empty. |
| `msd/msd-create-mark.sql` (+ `.teardown.sql`) | MSD create (UC-MSD-001 S01/S02 happy paths; UC-MSD-002 update API-seeds its own records) | An MSD CREATE needs a mark passing **both** the mark-holder view `SCS_MARK_SITE_TIMBER_VW` (Gate B, existence) **and** `HAULING_AUTHORITY` membership (Gate A, insert FK `HMKA_HAA_FK`). The extract's holder view is EMPTY (all 4 UNION arms need a mark→file→client link, and `forest_file_client`/`for_client_link` are both empty). Re-grounded 2026-07-21: mark **`ES20R4`** is a real `blanket_road_mark` already in `HAULING_AUTHORITY` (Gate A already true) with file `A18674` already in `PROV_FOREST_USE`. The **one** missing thing is the `forest_file_client` link row — so the seed inserts exactly ONE `forest_file_client` row (file A18674, type 'A', **reusing existing client `00000001/00`** — no client fabricated); a `BEFORE INSERT` trigger (`FTA_SYNC_FFC_FCL`) auto-creates the matching `for_client_link`, arm 4 resolves, and ES20R4 becomes creatable (Gate B). Plus `ORG_UNIT` 1904 so District-1831 scale site `520` is searchable (S02). **Verified live: create → HTTP 201.** REVERSIBLE via `msd-create-mark.teardown.sql` (all touched tables are plain FK-guarded — unlike the retired AF904 seed, which was one-way). Sentinel `E2E_SEED`. |

Add entries only as real gaps are hit during test creation/testing.

### Retired patches

- **`chk/check-create-timber-mark.sql`** (removed 2026-07-22). It seeded one HMA row so a mark passed
  both check-scale create gates (`timberMarkExists` search view + `CKSC_HAA_FK` → `HAULING_AUTHORITY`).
  The "zero overlap between `HAULING_AUTHORITY` and `HAULING_MARK_AUTHORIZATION`" premise was true only of
  the *old* extract; the v2 extract has **183 real marks satisfying both gates**, so CHK now uses a real
  mark (`L44804`, Fort Nelson NRD — verified live → HTTP 201) and needs no seed. The seed + its teardown
  were deleted and the `02101` residue removed from the running container via its teardown.

## Current DB state — one patch applied to the running container (2026-07-22)

The DB was rebuilt from the v2 extract snapshot image. Only the **MSD** patch is needed and applied to the
running `real-data-seeded-scs-db` container (verified `create → HTTP 201`):

- **MSD:** `msd/msd-create-mark.sql` → one `forest_file_client` link row (`E2E_SEED`) + its trigger-created
  `for_client_link` + `ORG_UNIT` 1904, making mark `ES20R4` creatable and site `520` searchable.
- **SST:** `sst/integer-number-seed.sql` → integers 1..9999 into the empty `THE.INTEGER_NUMBER`, so the
  scale-site PK trigger can generate an id (create → HTTP 201). Reversible; the table was empty pre-seed.
- **CHK:** no patch — uses real mark `L44804` (both create gates satisfied by real extract data).

The MSD patch is **reversible** via its `.teardown.sql` (all touched tables are plain FK-guarded) and
**sentinel-marked `E2E_SEED`** — no real extract row is mutated. The committed no-seed MSD slices use the
absent mark `ZZZQ999`, never a seeded mark.

**The patch is NOT baked into the snapshot image** (the image was snapshotted clean). So each fresh
container from the image needs the patches re-applied — OR re-snapshot *with* them to bake them in.

**When you (re)create a container:** run `./e2e/scripts/apply-patches.sh`, having started the **DB before the
backend** (else its Spring context fails and every `/api` route 404s), then evict the LOV cache
(`POST /api/api/internal/cache/evict`) or restart the backend (a startup-warmed cache serves stale LOVs).
**Re-verify on any DB re-extract** — real data is non-deterministic, so re-confirm the anchor mark/site
still exist (each `.sql` carries its re-pick query).
