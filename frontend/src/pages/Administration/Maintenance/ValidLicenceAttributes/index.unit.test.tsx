import { fireEvent, screen, waitFor } from '@testing-library/react';
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
import { GRADING_CODE_APPOINTMENT_TYPE_LOV } from '@/utils/lovCache';

import ValidLicenceAttributes from './index';

const rows = [
  {
    scaleGradingSystemCode: 'C',
    scalerAppointmentType: 'O',
    scalerAppointmentTypeDescription: 'Official - Coastal',
    effectiveDate: '2024-01-01',
    expiryDate: '2025-01-01',
  },
  { scaleGradingSystemCode: 'C', scalerAppointmentType: 'A', scalerAppointmentTypeDescription: '' },
  { scaleGradingSystemCode: 'I', scalerAppointmentType: 'X', scalerAppointmentTypeDescription: 'Plain description' },
  {},
];

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getGradingCodeAppointmentTypeLov.mockResolvedValue([
    { code: 'A', description: 'Official - Coastal', scalerAppointmentType: 'O', scaleGradingSystemCode: 'C' },
    { code: 'B', description: 'Acting', scalerAppointmentType: 'A', scaleGradingSystemCode: 'NA' },
    { code: 'C', description: 'Duplicate - Interior', scalerAppointmentType: 'O', scaleGradingSystemCode: 'C' },
    { code: 'D', description: 'No system', scalerAppointmentType: 'Z', scaleGradingSystemCode: 'I' },
    {},
  ] as never);
  // The Add-Attribute appointment-type dropdown now draws its options from the full appointment-type
  // LOV (option value === lov.code), not the grading-code xref. 'Z' is the code the create-form
  // tests select, so it must be present here.
  apiMock.lov.getAppointmentTypeLov.mockResolvedValue([
    { code: 'O', description: 'Official' },
    { code: 'A', description: 'Acting' },
    { code: 'X', description: 'Examiner' },
    { code: 'Z', description: 'No system' },
  ] as never);
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'I', description: 'Interior' }, { code: 'C', description: 'Coastal' }, { code: 'X' }, {}] as never);
  apiMock.validLicenceAttributes.searchValidLicenceAttributes.mockResolvedValue(rows as never);
  purgeLovCache.mockClear();
});

const renderPage = () => renderWithProviders(<ValidLicenceAttributes />);

describe('Valid Licence Attributes — list', () => {
  it('names each row from the lookups, preferring the backend description', async () => {
    renderPage();

    expect((await screen.findAllByRole('button', { name: 'Coastal' })).length).toBe(2);
    expect(screen.getByText('Official')).toBeInTheDocument();
    expect(screen.getByText('Acting')).toBeInTheDocument();
    expect(screen.getByText('Plain description')).toBeInTheDocument();
  });

  it('opens a row read-only by its grading system', async () => {
    apiMock.validLicenceAttributes.getValidLicenceAttribute.mockResolvedValue(rows[0] as never);
    renderPage();

    fireEvent.click((await screen.findAllByRole('button', { name: 'Coastal' }))[0]);

    await waitFor(() =>
      expect(apiMock.validLicenceAttributes.getValidLicenceAttribute).toHaveBeenCalledWith('C', 'O', expect.anything()),
    );
  });

  it('still lists rows when the lookups fail', async () => {
    apiMock.lov.getGradingCodeAppointmentTypeLov.mockRejectedValue(new Error('down'));
    renderPage();

    expect(await screen.findByText('Plain description')).toBeInTheDocument();
  });

  it('refilters the list by grading system and back to all', async () => {
    const { container } = renderPage();
    await waitFor(() => expect(apiMock.validLicenceAttributes.searchValidLicenceAttributes).toHaveBeenCalled());
    const filter = container.querySelector('select') as HTMLSelectElement;
    await waitFor(() => expect(filter.options.length).toBeGreaterThan(1));
    const calls = apiMock.validLicenceAttributes.searchValidLicenceAttributes.mock.calls.length;

    fireEvent.change(filter, { target: { value: 'C' } });
    await waitFor(() =>
      expect(apiMock.validLicenceAttributes.searchValidLicenceAttributes.mock.calls.length).toBeGreaterThan(calls),
    );
    expect(apiMock.validLicenceAttributes.searchValidLicenceAttributes.mock.calls.at(-1)?.[0]).toMatchObject({ scaleGradingSystemCode: 'C' });

    fireEvent.change(filter, { target: { value: 'ALL' } });
    await waitFor(() =>
      expect(apiMock.validLicenceAttributes.searchValidLicenceAttributes.mock.calls.length).toBeGreaterThan(calls + 1),
    );
    expect(apiMock.validLicenceAttributes.searchValidLicenceAttributes.mock.calls.at(-1)?.[0]).not.toHaveProperty('scaleGradingSystemCode');
  });
});

describe('Valid Licence Attributes — validation', () => {
  it('names the required fields on an empty create', async () => {
    renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Add Attribute$/i }));

    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(await screen.findByText('Grading System Code is required.')).toBeInTheDocument();
    expect(screen.getByText('Appointment Type is required.')).toBeInTheDocument();
    expect(screen.getByText('Effective Date is required.')).toBeInTheDocument();
    expect(apiMock.validLicenceAttributes.createValidLicenceAttribute).not.toHaveBeenCalled();
  });

  it('rejects an expiry before the effective date', async () => {
    const { container } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Add Attribute$/i }));

    fireEvent.change(container.querySelector('#vla-effective-date')!, { target: { value: '2026-02-01' } });
    fireEvent.change(container.querySelector('#vla-expiry-date')!, { target: { value: '2026-01-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    expect(await screen.findByText('Expiry Date must be on or after Effective Date.')).toBeInTheDocument();
  });
});

/**
 * Regression: "newly added licence attributes do not appear in dropdowns". The
 * grading-code/appointment-type LOV is a view over this table, so every write here has to drop the
 * browser's cached copies or the Scaler appointment dropdowns keep offering the pre-write list for
 * the rest of the session. (The server evicts its own Caffeine cache in ValidLicenceAttributeService.)
 */
describe('Valid Licence Attributes — appointment LOV freshness', () => {
  const fillCreateForm = (container: HTMLElement) => {
    fireEvent.change(container.querySelector('#vla-grading-system')!, { target: { value: 'C' } });
    fireEvent.change(container.querySelector('#vla-appointment-type')!, { target: { value: 'Z' } });
    fireEvent.change(container.querySelector('#vla-effective-date')!, { target: { value: '2026-06-15' } });
  };

  it('purges the cached appointment LOV after a successful create', async () => {
    apiMock.validLicenceAttributes.createValidLicenceAttribute.mockResolvedValue({
      scaleGradingSystemCode: 'C',
      scalerAppointmentType: 'Z',
    } as never);
    const { container } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Add Attribute$/i }));

    fillCreateForm(container);
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(apiMock.validLicenceAttributes.createValidLicenceAttribute).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(purgeLovCache).toHaveBeenCalledTimes(1));
    expect(purgeLovCache.mock.calls[0][1]).toBe(GRADING_CODE_APPOINTMENT_TYPE_LOV);
  });

  it('leaves the cache alone when the create is rejected', async () => {
    apiMock.validLicenceAttributes.createValidLicenceAttribute.mockRejectedValue(new Error('already exists'));
    const { container } = renderPage();
    fireEvent.click(await screen.findByRole('button', { name: /^Add Attribute$/i }));

    fillCreateForm(container);
    fireEvent.click(screen.getByRole('button', { name: /Save/i }));

    await waitFor(() => expect(apiMock.validLicenceAttributes.createValidLicenceAttribute).toHaveBeenCalledTimes(1));
    expect(purgeLovCache).not.toHaveBeenCalled();
  });
});
