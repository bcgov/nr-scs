import type { IdentifiableContent, PageableResponse } from '@/components/Form/TableResource/types';

/**
 * Slices an in-memory result set into the {@link PageableResponse} shape that
 * {@link TableResource} expects. The query screens fetch their whole result set in one call and
 * page through it locally, so this does the paging a server-side endpoint would otherwise do.
 *
 * The requested page is clamped to the last page that still holds rows, which keeps the table on a
 * valid page when a new, smaller result set arrives while the user sits on a later page.
 *
 * @param rows - The full result set, each row already carrying the `id` TableResource keys on.
 * @param page - Zero-based page index requested by the table.
 * @param pageSize - Rows per page. Anything below one is treated as one so the arithmetic never
 *   divides by zero.
 * @returns {PageableResponse<T>} The requested page plus its paging metadata.
 */
export const toPagedResponse = <T,>(
  rows: IdentifiableContent<T>[],
  page: number,
  pageSize: number,
): PageableResponse<T> => {
  const size = Math.max(1, Math.floor(pageSize) || 1);
  const totalElements = rows.length;
  const safePage = Math.max(
    0,
    Math.min(page, Math.floor(Math.max(totalElements - 1, 0) / size)),
  );
  const start = safePage * size;

  return {
    content: rows.slice(start, start + size),
    page: {
      size,
      number: safePage,
      totalElements,
      totalPages: Math.max(1, Math.ceil(totalElements / size)),
    },
  };
};
