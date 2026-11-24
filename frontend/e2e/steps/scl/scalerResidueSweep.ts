import type { APIRequestContext } from '@playwright/test';

/**
 * Residue sweep for the SCL seed clients — the LAST line of defence behind per-test cleanup.
 *
 * WHY THIS EXISTS (and why the fixture registries aren't enough).
 *   `steps/fixtures/scl.ts` already does the right thing: every UI-created scaler is registered the moment
 *   its POST response arrives (`createdScalerCapture`), in-flight registrations are drained before the
 *   delete loop, and children (appointments, training rows) are torn down before their parent. That covers
 *   an *ordinary* test failure — the fixture teardown still runs.
 *
 *   What it CANNOT cover is anything that stops teardown from running at all, or stops the create from
 *   ever being registered:
 *     - the run is interrupted (Ctrl+C) or the worker is killed/crashes — fixture teardown never executes;
 *     - the POST is committed server-side but the client never sees the response (socket timeout, the
 *       browser context closing mid-flight), so there is nothing to register;
 *     - teardown runs but its DELETE fails — the registry reports the residue loudly and then exits,
 *       leaving the row behind.
 *   Any one of those burns the client's SCLR_UK slot (one scaler per client), and because the create
 *   happy paths are pinned to specific clients, EVERY later run fails on the same client until a human
 *   deletes the row by hand. That is exactly what happened to scaler 178Y on client 00001481.
 *
 * THE CONTRACT THAT MAKES SWEEPING SAFE. The pinned seed clients are pinned *because* they own no scaler
 *   in a clean extract — that is the precondition the create/seed slices need. So any scaler sitting on
 *   one of them is, by definition, residue from a previous run rather than extract data.
 *
 * BELT AND BRACES: we still refuse to delete a row that doesn't look test-created. Only rows whose
 *   `entryUserid` starts with `MOCK_` (the backend's mock-auth identity — `security.mock.user-name`,
 *   default `MOCK_CLERICAL`) are swept. A row written by a real extract userid is reported as STUCK
 *   instead, because that means the client was mis-pinned and the fix is to re-pin the fixture, not to
 *   delete somebody's data. The sweep can therefore never quietly eat real rows.
 *
 * FAIL-LOUD IS PRESERVED. Sweeping is not the same as hiding: the caller is handed a report of everything
 *   removed so the preflight can print it, and anything that could NOT be removed still fails the run.
 *   A leak stays visible — it just stops being a hard block on every subsequent run.
 */

/** Audit-userid prefix the mock-auth backend stamps on e2e-written rows. Anything else is not ours. */
const TEST_USERID_PREFIX = 'MOCK_';

/** A real scaler licence no is a short alphanumeric (e.g. `178Y`, `5828`, `N113`). */
const LICENCE_NO_PATTERN = /^[A-Za-z0-9]{1,10}$/;

export type SweptScaler = {
  scalerLicenceNo: string;
  clientNumber: string;
  entryUserid: string;
  entryTimestamp: string;
};

export type StuckScaler = {
  scalerLicenceNo: string;
  clientNumber: string;
  reason: string;
};

export type SweepReport = {
  /** Residue successfully removed — empty on a healthy run. */
  swept: SweptScaler[];
  /** Residue that could NOT be removed (or must not be). The caller must fail the run on these. */
  stuck: StuckScaler[];
};

type ScalerDetail = { entryUserid?: string; entryTimestamp?: string };

/**
 * Delete one scaler, clearing whatever blocks it first.
 *
 * A scaler carrying ADDED appointments or training rows returns 400 (`ORA-02292`) on delete — its
 * intrinsic appointment cascades, added children do not. Rather than guess which children are intrinsic,
 * try the plain delete first and only fall back to clearing children when it is refused. 404 counts as
 * success throughout: the row is gone, which is all we wanted.
 */
async function deleteScalerClearingChildren(
  request: APIRequestContext,
  scalerLicenceNo: string,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  const encoded = encodeURIComponent(scalerLicenceNo);

  const first = await request.delete(`/api/scalers/${encoded}`);
  if (first.ok() || first.status() === 404) return { ok: true };

  // Refused — clear the children that hold FK references, then retry once.
  for (const child of ['appointments', 'exams'] as const) {
    const listed = await request.get(`/api/scalers/${encoded}/${child}`);
    if (!listed.ok()) continue;
    const rows = (await listed.json().catch(() => null)) as Array<Record<string, unknown>> | null;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      // Appointments delete by their attribute id; training rows by their composite type id.
      const key = child === 'appointments' ? row.scalerLicenceAttributeId : row.scalerTrainingTypeId;
      if (key == null) continue;
      await request.delete(`/api/scalers/${encoded}/${child}/${encodeURIComponent(String(key))}`);
    }
  }

  const retry = await request.delete(`/api/scalers/${encoded}`);
  if (retry.ok() || retry.status() === 404) return { ok: true };
  return {
    ok: false,
    reason:
      `DELETE /api/scalers/${scalerLicenceNo} -> HTTP ${first.status()}, and still HTTP ${retry.status()} ` +
      `after clearing its appointments and training rows`,
  };
}

/**
 * Remove any scaler occupying one of the pinned scaler-free seed clients.
 *
 * Read-only when there is nothing to clean (the healthy case): one search per client and no writes.
 */
export async function sweepScalerResidue(
  request: APIRequestContext,
  clients: readonly string[],
): Promise<SweepReport> {
  const swept: SweptScaler[] = [];
  const stuck: StuckScaler[] = [];

  for (const clientNumber of clients) {
    const found = await request.get(`/api/scalers/search?clientNumber=${encodeURIComponent(clientNumber)}`);
    if (!found.ok()) {
      stuck.push({
        scalerLicenceNo: '(unknown)',
        clientNumber,
        reason: `GET /api/scalers/search?clientNumber=${clientNumber} -> HTTP ${found.status()}`,
      });
      continue;
    }

    const rows = (await found.json().catch(() => null)) as Array<{ scalerLicenceNo?: string }> | null;
    if (!Array.isArray(rows) || rows.length === 0) continue; // the healthy path

    for (const row of rows) {
      const scalerLicenceNo = row.scalerLicenceNo;
      if (!scalerLicenceNo || !LICENCE_NO_PATTERN.test(scalerLicenceNo)) {
        stuck.push({
          scalerLicenceNo: String(scalerLicenceNo),
          clientNumber,
          reason: 'search returned a licence no that does not look like one — refusing to delete it',
        });
        continue;
      }

      // Read the audit fields BEFORE deleting: they are both the safety gate and the only evidence of
      // which run leaked the row, which is what makes the leak diagnosable after the sweep.
      const detailRes = await request.get(`/api/scalers/${encodeURIComponent(scalerLicenceNo)}`);
      const detail = detailRes.ok()
        ? ((await detailRes.json().catch(() => ({}))) as ScalerDetail)
        : ({} as ScalerDetail);
      const entryUserid = detail.entryUserid ?? '(unknown)';
      const entryTimestamp = detail.entryTimestamp ?? '(unknown)';

      if (!entryUserid.startsWith(TEST_USERID_PREFIX)) {
        stuck.push({
          scalerLicenceNo,
          clientNumber,
          reason:
            `entryUserid "${entryUserid}" is not a mock-auth identity, so this looks like REAL extract data, ` +
            `not test residue — refusing to delete it. Re-pin this client in fixtures/scl/ instead.`,
        });
        continue;
      }

      const result = await deleteScalerClearingChildren(request, scalerLicenceNo);
      if (result.ok) swept.push({ scalerLicenceNo, clientNumber, entryUserid, entryTimestamp });
      else stuck.push({ scalerLicenceNo, clientNumber, reason: result.reason });
    }
  }

  return { swept, stuck };
}

/** One-line-per-row summary for the preflight to print. */
export function formatSweptScalers(swept: readonly SweptScaler[]): string {
  return swept
    .map(
      (s) =>
        `  - scaler ${s.scalerLicenceNo} on client ${s.clientNumber} ` +
        `(created ${s.entryTimestamp} by ${s.entryUserid})`,
    )
    .join('\n');
}

/** One-line-per-row summary of what could not be swept. */
export function formatStuckScalers(stuck: readonly StuckScaler[]): string {
  return stuck
    .map((s) => `  - scaler ${s.scalerLicenceNo} on client ${s.clientNumber}: ${s.reason}`)
    .join('\n');
}
