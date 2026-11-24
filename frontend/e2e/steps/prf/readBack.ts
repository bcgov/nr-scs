import { type APIRequestContext, expect } from '@playwright/test';

/**
 * API read-back for scaler performance remarks. There is no GET-by-id endpoint — remarks are read via the
 * list (GET /api/scalers/{licence}/performance-remarks), so we poll the list and pick the row by id. Polled
 * (not a bare GET) because create/update/delete are triggered through the UI (a Save/Confirm click) and the
 * read can otherwise race the commit.
 */

/** The persisted remark shape (subset asserted) returned by the list endpoint. */
export interface RemarkDetail {
  scalerPerformanceRemarkId: number;
  loggedTimestamp: string | null;
  performanceRemarkDesc: string | null;
  scalerPerformanceActnCode: string | null;
  scalerPerformanceOutcmCode: string | null;
  checkScaleId: number | null;
}

async function fetchList(
  request: APIRequestContext,
  scalerLicenceNo: string,
): Promise<RemarkDetail[]> {
  const res = await request.get(
    `/api/scalers/${encodeURIComponent(scalerLicenceNo)}/performance-remarks`,
  );
  if (res.status() !== 200) return [];
  return (await res.json()) as RemarkDetail[];
}

/** Poll the list until a remark with `id` is present, then return it. */
export async function readRemarkById(
  request: APIRequestContext,
  scalerLicenceNo: string,
  id: string,
): Promise<RemarkDetail> {
  let found: RemarkDetail | undefined;
  await expect
    .poll(
      async () => {
        const list = await fetchList(request, scalerLicenceNo);
        found = list.find((r) => String(r.scalerPerformanceRemarkId) === id);
        return found ? 'present' : 'absent';
      },
      { message: `performance remark ${id} did not read back from scaler ${scalerLicenceNo}` },
    )
    .toBe('present');
  return found as RemarkDetail;
}

/** Poll until NO remark with `id` is present (delete read-back). */
export async function expectRemarkAbsentById(
  request: APIRequestContext,
  scalerLicenceNo: string,
  id: string,
): Promise<void> {
  await expect
    .poll(
      async () => {
        const list = await fetchList(request, scalerLicenceNo);
        return list.some((r) => String(r.scalerPerformanceRemarkId) === id) ? 'present' : 'absent';
      },
      { message: `performance remark ${id} was still present after delete on scaler ${scalerLicenceNo}` },
    )
    .toBe('absent');
}
