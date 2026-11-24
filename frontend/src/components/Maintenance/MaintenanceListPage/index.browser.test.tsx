import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

import '../../../config/tests/setup-env';
import type { PageableResponse, TableHeaderType } from '@/components/Form/TableResource/types';

import MaintenanceListPage from './index';

vi.mock('@/components/core/PageTitle', () => ({ default: ({ title }: { title: string }) => <div>{title}</div> }));

type Row = { id: string; code: string };

const rows: Row[] = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, code: `CODE${String(i).padStart(2, '0')}` }));
const content: PageableResponse<Row> = {
  content: rows,
  page: { size: rows.length, number: 0, totalElements: rows.length, totalPages: 1 },
};
const headers: TableHeaderType<Row>[] = [{ key: 'code', header: 'Code', selected: true }];

const renderPage = (resetPageKey: string) =>
  render(
    <MaintenanceListPage
      title="Test"
      breadCrumbs={[]}
      headers={headers}
      content={content}
      loading={false}
      sortKey={null}
      sortDirection="NONE"
      onSortChange={() => {}}
      addLabel="Add"
      onAdd={() => {}}
      resetPageKey={resetPageKey}
    />,
    { wrapper: MemoryRouter },
  );

describe('MaintenanceListPage pagination', () => {
  it('shows the default page size and pages through the rest', async () => {
    renderPage('A');
    expect(await screen.findByText('CODE00')).toBeInTheDocument();
    expect(screen.getByText('CODE09')).toBeInTheDocument();
    expect(screen.queryByText('CODE10')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('CODE10')).toBeInTheDocument();
    expect(screen.getByText('CODE11')).toBeInTheDocument();
  });

  it('resets to the first page when the filter key changes (even at the same row count)', async () => {
    const { rerender } = renderPage('A');
    fireEvent.click(screen.getByRole('button', { name: /next page/i }));
    expect(await screen.findByText('CODE10')).toBeInTheDocument();

    // Same content/count, different active filter → should snap back to page 1.
    // rerender reuses the original MemoryRouter wrapper, so don't wrap again.
    rerender(
      <MaintenanceListPage
        title="Test"
        breadCrumbs={[]}
        headers={headers}
        content={content}
        loading={false}
        sortKey={null}
        sortDirection="NONE"
        onSortChange={() => {}}
        addLabel="Add"
        onAdd={() => {}}
        resetPageKey="B"
      />,
    );

    expect(await screen.findByText('CODE00')).toBeInTheDocument();
    expect(screen.queryByText('CODE10')).not.toBeInTheDocument();
  });
});
