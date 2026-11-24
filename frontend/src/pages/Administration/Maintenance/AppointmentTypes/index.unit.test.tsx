import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

// Spy on the cache purge without replacing it: the assertions below are about *whether* a write
// triggers it; `lovCache.unit.test.ts` covers what it actually clears.
const purgeLovCache = vi.hoisted(() => vi.fn());
vi.mock('@/utils/lovCache', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/lovCache')>()),
  purgeLovCache,
}));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';
import { APPOINTMENT_TYPE_LOV, GRADING_CODE_APPOINTMENT_TYPE_LOV } from '@/utils/lovCache';

import AppointmentTypes from './index';

const row = {
  code: 'CS',
  description: 'Check Scaler',
  actingInd: 'Y',
  effectiveDate: '2020-01-01',
  expiryDate: '2030-12-31',
};

beforeEach(() => {
  resetApiMock();
  apiMock.appointmentTypes.searchAppointmentTypes.mockResolvedValue([row] as never);
  apiMock.appointmentTypes.deleteAppointmentType.mockResolvedValue(undefined as never);
  purgeLovCache.mockClear();
});

const renderPage = () => renderWithProviders(<AppointmentTypes />);

// Both LOVs derived from the appointment-type table must be dropped — purging only
// `APPOINTMENT_TYPE_LOV` left the Scaler form dropdown and the Appointments tab stale.
const expectBothLovsPurged = async () => {
  await waitFor(() => expect(purgeLovCache).toHaveBeenCalledTimes(2));
  expect(purgeLovCache.mock.calls.map((call) => call[1])).toEqual(
    expect.arrayContaining([APPOINTMENT_TYPE_LOV, GRADING_CODE_APPOINTMENT_TYPE_LOV]),
  );
};

const openCreate = async () => {
  fireEvent.click(await screen.findByRole('button', { name: /^Add Appointment Type$/i }));
  await screen.findByText('Maintain Appointment Types - Create');
};

const fillCreateForm = (container: HTMLElement) => {
  fireEvent.change(container.querySelector('#appointment-code')!, { target: { value: 'NW' } });
  fireEvent.change(container.querySelector('#appointment-acting')!, { target: { value: 'no' } });
  fireEvent.change(container.querySelector('#appointment-description')!, { target: { value: 'New Type' } });
  fireEvent.change(container.querySelector('#appointment-effective-date')!, { target: { value: '2026-01-01' } });
  fireEvent.change(container.querySelector('#appointment-expiry-date')!, { target: { value: '2026-12-31' } });
};

/**
 * Regression: two LOVs are views over this master table, so every write here has to
 * drop the browser's cached copies of both `APPOINTMENT_TYPE_LOV` and
 * `GRADING_CODE_APPOINTMENT_TYPE_LOV` (the Scaler search filter, form dropdown, and view's
 * Appointments tab read them) or those dropdowns keep offering the pre-write list for the rest
 * of the session — a full reload does NOT help, sessionStorage outlives it. Mirrors the equivalent
 * cover in `ValidLicenceAttributes/index.unit.test.tsx`.
 */
describe('Appointment Types — appointment LOV freshness', () => {
  it('purges both cached appointment LOVs after a successful create', async () => {
    apiMock.appointmentTypes.createAppointmentType.mockResolvedValue({ code: 'NW' } as never);
    const { container } = renderPage();
    await openCreate();

    fillCreateForm(container);
    fireEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.appointmentTypes.createAppointmentType).toHaveBeenCalledTimes(1));
    await expectBothLovsPurged();
  });

  it('leaves the cache alone when the create is rejected', async () => {
    apiMock.appointmentTypes.createAppointmentType.mockRejectedValue(new Error('already exists'));
    const { container } = renderPage();
    await openCreate();

    fillCreateForm(container);
    fireEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.appointmentTypes.createAppointmentType).toHaveBeenCalledTimes(1));
    expect(purgeLovCache).not.toHaveBeenCalled();
  });

  it('purges both cached appointment LOVs after a successful edit', async () => {
    apiMock.appointmentTypes.updateAppointmentType.mockResolvedValue({ code: 'CS' } as never);
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'CS' }));
    fireEvent.click(await screen.findByRole('button', { name: /Edit Appointment/i }));
    await screen.findByText('Maintain Appointment Types - Edit');
    fireEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.appointmentTypes.updateAppointmentType).toHaveBeenCalledTimes(1));
    await expectBothLovsPurged();
  });

  it('purges both cached appointment LOVs after a successful delete', async () => {
    renderPage();

    fireEvent.click(await screen.findByRole('button', { name: 'CS' }));
    fireEvent.click(await screen.findByRole('button', { name: /Delete/i }));
    const confirm = await screen.findByText('Are you sure you want to delete this record?');
    fireEvent.click(within(confirm.closest('.cds--modal')!).getByRole('button', { name: /OK/i }));

    await waitFor(() => expect(apiMock.appointmentTypes.deleteAppointmentType).toHaveBeenCalledWith('CS', expect.anything()));
    await expectBothLovsPurged();
  });
});
