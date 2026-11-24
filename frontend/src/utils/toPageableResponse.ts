import type { IdentifiableContent, PageableResponse } from '@/components/Form/TableResource/types';

/**
 * Wraps a flat array of rows into the {@link PageableResponse} shape that
 * {@link TableResource} expects. The maintenance list pages hold their whole
 * result set in memory (the search endpoints return a plain `T[]`), so there is
 * no real server-side paging — this produces a single logical page covering all
 * rows. Replaces the identical inline `{ content, page: { … } }` literal that was
 * hand-written in every maintenance page.
 *
 * Each row must already carry an `id` (string | number) — `TableResource` keys
 * rows on it.
 */
export const toPageableResponse = <T,>(
  rows: IdentifiableContent<T>[],
): PageableResponse<T> => ({
  content: rows,
  page: {
    // Carbon's skeleton/pagination read `size`; keep it >= 1 so the loading
    // skeleton renders at least one placeholder row.
    size: Math.max(1, rows.length),
    number: 0,
    totalElements: rows.length,
    totalPages: 1,
  },
});
