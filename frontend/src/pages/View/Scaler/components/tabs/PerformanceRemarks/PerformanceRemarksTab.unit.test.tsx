import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import PerformanceRemarksTab from './PerformanceRemarksTab';

const remarks = [
  { scalerPerformanceRemarkId: 1, remarkDate: '2026-01-05', remarkTypeCode: 'W', remarkTypeDescription: 'Warning', remarkText: 'Late tally', issueType: 'Timeliness' },
  { scalerPerformanceRemarkId: 2, remarkDate: '2026-02-05', remarkTypeCode: 'C', remarkTypeDescription: 'Commendation', remarkText: 'Great work', issueType: null },
];

beforeEach(() => {
  resetApiMock();
  apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks.mockResolvedValue(remarks as never);
});

const renderTab = () =>
  renderWithProviders(<PerformanceRemarksTab isActive scalerLicenceNo="S1234" summary={{ scalerLicenceNo: 'S1234' } as never} />);
const rowLinks = (container: HTMLElement) => Array.from(container.querySelectorAll('.scs__tab-view__table-link--button')) as HTMLElement[];
// The Issue # column links each remark; wait for those rather than a column that may not be shown.
const listed = () => waitFor(() => expect(document.querySelectorAll('.scs__tab-view__table-link--button').length).toBeGreaterThan(0));

describe('Scaler performance remarks tab', () => {
  it('lists the remarks and opens one read-only, then comes back', async () => {
    const { container } = renderTab();
    await listed();

    await userEvent.click(rowLinks(container)[0]);
    await waitFor(() => expect(rowLinks(container).length).toBe(0));
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));
    await waitFor(() => expect(rowLinks(container).length).toBeGreaterThan(0));
  });

  it('opens the add form and the edit form', async () => {
    const { container } = renderTab();
    await listed();

    await userEvent.click(screen.getAllByRole('button', { name: /^Edit$/ })[0]);
    await waitFor(() => expect(rowLinks(container).length).toBe(0));
    expect(screen.queryByRole('button', { name: /Add/i })).not.toBeInTheDocument();

    const fresh = renderTab();
    await listed();
    await userEvent.click(screen.getByRole('button', { name: /Add/i }));
    await waitFor(() => expect(rowLinks(fresh.container).length).toBe(0));
  });

  it('deletes a remark only after confirmation', async () => {
    apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark.mockResolvedValue(undefined);
    renderTab();
    await listed();

    const rowDeletes = screen.getAllByRole('button', { name: /Delete$/ }).filter((b) => !/Confirm/.test(b.textContent ?? ''));
    await userEvent.click(rowDeletes[1]);
    expect(apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /Confirm Delete$/ }));

    await waitFor(() => expect(apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark).toHaveBeenCalled());
    expect(JSON.stringify(apiMock.scalerPerformanceRemarks.deleteScalerPerformanceRemark.mock.calls[0])).toContain('2');
  });

  it('saves the licence cancelled date, blank meaning none, and reports a refusal', async () => {
    apiMock.scalers.updateLicenceCancelledDate.mockResolvedValue(undefined);
    const { container } = renderTab();
    await listed();

    fireEvent.change(container.querySelector('#scaler-licence-cancelled-date')!, { target: { value: '2026-03-01' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    await waitFor(() => expect(apiMock.scalers.updateLicenceCancelledDate).toHaveBeenCalledWith('S1234', '2026-03-01', expect.anything()));

    fireEvent.change(container.querySelector('#scaler-licence-cancelled-date')!, { target: { value: '' } });
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    await waitFor(() => expect(apiMock.scalers.updateLicenceCancelledDate).toHaveBeenLastCalledWith('S1234', null, expect.anything()));

    apiMock.scalers.updateLicenceCancelledDate.mockRejectedValue(new Error('Licence is active.'));
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
    expect((await screen.findAllByText(/Licence is active\.|Could not update the licence cancelled date\./)).length).toBeGreaterThan(0);
  });

  it('loads nothing while inactive', () => {
    renderWithProviders(<PerformanceRemarksTab isActive={false} scalerLicenceNo="S1234" summary={{} as never} />);

    expect(apiMock.scalerPerformanceRemarks.getScalerPerformanceRemarks).not.toHaveBeenCalled();
  });
});
