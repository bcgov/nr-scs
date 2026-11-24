import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import ScaleSiteRegisterReport from './index';

const report = () => apiMock.reports.submitScaleSiteRegisterReport;

beforeEach(() => {
  resetApiMock();
  sessionStorage.clear();
  apiMock.lov.getRegionDistrictRollupLov.mockResolvedValue([{ code: '43', description: 'DCK', orgUnitCode: 'DCK', rollupRegionNo: 1 }] as never);
  apiMock.lov.getStaticLov.mockResolvedValue([
    { tableKey: 'SCALE_METHOD_TYPE_CODE', code: 'WT', description: 'Weight' },
    { tableKey: 'SCALE_METHOD_TYPE_CODE', code: '', description: 'Blank' },
    { tableKey: 'OTHER', code: 'Z', description: 'Other' },
  ] as never);
  report().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'register.pdf' });
  apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-9' }]);
});

const renderPage = async () => {
  const utils = renderWithProviders(<ScaleSiteRegisterReport />);
  const district = controlById<HTMLSelectElement>(utils.container, 'reg-dist');
  await waitFor(() => expect(district.options.length).toBeGreaterThan(1));
  fireEvent.change(district, { target: { value: district.options[1].value } });
  return utils;
};
const run = () => userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

describe('Scale Site Register report — more', () => {
  it('offers only the coded scale types of the method table', async () => {
    const { container } = await renderPage();
    const select = controlById<HTMLSelectElement>(container, 'scale-type');

    await waitFor(() => expect(select.options.length).toBe(2));
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['All', 'Weight']);
  });

  it('refuses a site number that is not a scale site', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-90' }]);
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'site-number'), { target: { value: 'ss-9' } });
    await run();

    expect((await screen.findAllByText('A Scale Site could not be found for SS-9.')).length).toBeGreaterThan(0);
    expect(report()).not.toHaveBeenCalled();
  });

  it('runs the report for a site that exists, with the chosen type and status', async () => {
    const { container } = await renderPage();
    await waitFor(() => expect(controlById<HTMLSelectElement>(container, 'scale-type').options.length).toBe(2));

    fireEvent.change(controlById(container, 'site-number'), { target: { value: 'SS-9' } });
    fireEvent.change(controlById(container, 'scale-type'), { target: { value: 'WT' } });
    const status = controlById<HTMLSelectElement>(container, 'authorization-status');
    fireEvent.change(status, { target: { value: Array.from(status.options).at(-1)!.value } });
    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect((await screen.findAllByText('Report Generated')).length).toBeGreaterThan(0);
  });

  it('says the request was submitted when it goes by email without a preview', async () => {
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'email-recipient'), { target: { value: 'someone@example.com' } });
    fireEvent.click(controlById(container, 'preview-no'));
    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect((await screen.findAllByText('Report request submitted')).length).toBeGreaterThan(0);
  });

  it('refuses a date window that ends before it starts, and accepts a valid one', async () => {
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'from-date'), { target: { value: '2026-02-01' } });
    fireEvent.change(controlById(container, 'to-date'), { target: { value: '2026-01-01' } });
    await run();
    await waitFor(() => expect(container.querySelectorAll('[data-invalid="true"], .cds--form-requirement').length).toBeGreaterThan(0));
    expect(report()).not.toHaveBeenCalled();

    fireEvent.change(controlById(container, 'to-date'), { target: { value: '2026-03-01' } });
    await run();
    await waitFor(() => expect(report()).toHaveBeenCalled());
  });

  it('reports a report that fails', async () => {
    report().mockRejectedValue(new Error('Report engine down.'));
    await renderPage();

    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect(screen.queryByText('Report Generated')).not.toBeInTheDocument();
  });
});
