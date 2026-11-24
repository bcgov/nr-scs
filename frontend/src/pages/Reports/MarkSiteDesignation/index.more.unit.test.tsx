import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import MarkSiteDesignationReport from './index';

const report = () => apiMock.reports.submitMarkSiteDesignationReport;
const payload = () => report().mock.calls[0][0];

beforeEach(() => {
  resetApiMock();
  sessionStorage.clear();
  apiMock.lov.getRegionDistrictRollupLov.mockResolvedValue([{ code: '43', description: 'DCK', orgUnitCode: 'DCK', rollupRegionNo: 1 }] as never);
  apiMock.lov.getStaticLov.mockResolvedValue([
    { tableKey: 'EXEMPT_MARK_METHOD_CODE', code: 'X1', description: 'Exception one' },
    { tableKey: 'exempt_mark_method_code', code: 'X2', description: 'Exception two' },
    { tableKey: 'EXEMPT_MARK_METHOD_CODE', code: '', description: 'Blank code' },
    { tableKey: 'OTHER_TABLE', code: 'Z', description: 'Other' },
  ] as never);
  report().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'report.pdf' });
  apiMock.scaleSites.searchScaleSites.mockResolvedValue([]);
  apiMock.timberMarks.timberMarkExists.mockResolvedValue(false);
});

const renderPage = async () => {
  const utils = renderWithProviders(<MarkSiteDesignationReport />);
  const district = controlById<HTMLSelectElement>(utils.container, 'reg-dist');
  await waitFor(() => expect(district.options.length).toBeGreaterThan(1));
  fireEvent.change(district, { target: { value: district.options[1].value } });
  return utils;
};
const run = () => userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));
const addValue = (container: HTMLElement, value: string) => {
  const input = controlById(container, 'specific-values');
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
};

describe('Mark Site Designation report — exemptions', () => {
  it('offers only the coded exemption entries of the right table', async () => {
    const { container } = await renderPage();
    const select = controlById<HTMLSelectElement>(container, 'mark-exceptions');

    await waitFor(() => expect(select.options.length).toBe(3));
    expect(Array.from(select.options).map((o) => o.textContent)).toEqual(['All', 'Exception one', 'Exception two']);
  });

  it('sends the chosen exemption and mark-or-site choice', async () => {
    const { container } = await renderPage();
    const select = controlById<HTMLSelectElement>(container, 'mark-exceptions');
    await waitFor(() => expect(select.options.length).toBe(3));

    fireEvent.change(select, { target: { value: 'X2' } });
    fireEvent.change(controlById(container, 'mark-or-site'), { target: { value: Array.from(controlById<HTMLSelectElement>(container, 'mark-or-site').options).at(-1)!.value } });
    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ markExemption: 'X2', preview: true });
    expect(payload().regDist).not.toBe('ALL');
    expect((await screen.findAllByText('Report Generated')).length).toBeGreaterThan(0);
  });
});

describe('Mark Site Designation report — specific sites and marks', () => {
  it('names every value that is neither a site nor a mark, and runs nothing', async () => {
    apiMock.scaleSites.searchScaleSites.mockImplementation(async ({ scaleSiteIdNmbr }: { scaleSiteIdNmbr: string }) =>
      scaleSiteIdNmbr === 'SS-1' ? [{ scaleSiteIdNmbr: 'ss-1' }] : [{ scaleSiteIdNmbr: `${scaleSiteIdNmbr}-OTHER` }],
    );
    const { container } = await renderPage();

    addValue(container, 'SS-1');
    addValue(container, 'TM99');
    addValue(container, ' ss-1 ');
    await run();

    expect((await screen.findAllByText(/A Site nor Timbermark for TM99 exist in the system\./)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/for SS-1 exist/)).not.toBeInTheDocument();
    expect(report()).not.toHaveBeenCalled();
  });

  it('accepts a value that resolves as a timber mark and sends the values in order', async () => {
    apiMock.timberMarks.timberMarkExists.mockResolvedValue(true);
    const { container } = await renderPage();

    addValue(container, 'TM99');
    addValue(container, 'TM98');
    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ siteMark1: 'TM99', siteMark2: 'TM98' });
    expect(payload().siteMark3).toBeUndefined();
  });

  it('reports a verification that could not run, distinctly from a failed report', async () => {
    apiMock.scaleSites.searchScaleSites.mockRejectedValue(new Error('lookup down'));
    const { container } = await renderPage();

    addValue(container, 'SS-1');
    await run();

    expect((await screen.findAllByText('Unable to verify the entered sites and marks. Please try again.')).length).toBeGreaterThan(0);
    expect(report()).not.toHaveBeenCalled();
  });
});

describe('Mark Site Designation report — output', () => {
  it('says the request was submitted when it goes by email without a preview', async () => {
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'email-recipient'), { target: { value: 'someone@example.com' } });
    fireEvent.click(controlById(container, 'preview-no'));
    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ preview: false, emailRecipient: 'someone@example.com' });
    expect((await screen.findAllByText('Report request submitted')).length).toBeGreaterThan(0);
  });

  it('refuses an effective window that ends before it starts', async () => {
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'effective-from'), { target: { value: '2026-02-01' } });
    fireEvent.change(controlById(container, 'effective-to'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-from'), { target: { value: '2026-02-01' } });
    fireEvent.change(controlById(container, 'expiry-to'), { target: { value: '2026-01-01' } });
    await run();

    await waitFor(() => expect(container.querySelectorAll('[data-invalid="true"], .cds--form-requirement').length).toBeGreaterThan(0));
    expect(report()).not.toHaveBeenCalled();
  });

  it('sends the date windows when they are valid', async () => {
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'effective-from'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'effective-to'), { target: { value: '2026-02-01' } });
    fireEvent.change(controlById(container, 'expiry-from'), { target: { value: '2026-03-01' } });
    fireEvent.change(controlById(container, 'expiry-to'), { target: { value: '2026-04-01' } });
    await run();

    await waitFor(() => expect(report()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ effectiveFrom: '2026-01-01', effectiveTo: '2026-02-01', expiryFrom: '2026-03-01', expiryTo: '2026-04-01' });
  });

  it('reports a report that fails', async () => {
    report().mockRejectedValue(new Error('Report engine down.'));
    await renderPage();

    await run();

    expect((await screen.findAllByText(/Report engine down\.|report/i)).length).toBeGreaterThan(0);
    expect(screen.queryByText('Report Generated')).not.toBeInTheDocument();
  });
});

describe('Mark Site Designation report — output option rules', () => {
  it('needs an email recipient when there is no preview, and forgets the complaint once one is typed', async () => {
    const { container } = await renderPage();

    fireEvent.click(controlById(container, 'preview-no'));
    await run();

    expect((await screen.findAllByText('If Preview Report has been set to No then the Email Recipient is required.')).length).toBeGreaterThan(0);
    expect(report()).not.toHaveBeenCalled();

    fireEvent.change(controlById(container, 'email-recipient'), { target: { value: 'someone@example.com' } });
    await waitFor(() =>
      expect(screen.queryByText('If Preview Report has been set to No then the Email Recipient is required.')).not.toBeInTheDocument(),
    );
  });

  it('rejects an email address that is not one', async () => {
    const { container } = await renderPage();

    fireEvent.change(controlById(container, 'email-recipient'), { target: { value: 'not-an-email' } });
    await run();

    expect((await screen.findAllByText('Email Recipient must be a valid email address.')).length).toBeGreaterThan(0);
    expect(report()).not.toHaveBeenCalled();
  });

  it('releases the previous download when a second report is generated', async () => {
    const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    await renderPage();

    await run();
    await waitFor(() => expect(report()).toHaveBeenCalledTimes(1));
    await run();
    await waitFor(() => expect(report()).toHaveBeenCalledTimes(2));

    await waitFor(() => expect(revoke).toHaveBeenCalled());
    revoke.mockRestore();
  });
});
