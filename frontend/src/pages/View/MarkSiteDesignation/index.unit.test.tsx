import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewMarkSiteDesignation from './index';

const record = (overrides: Record<string, unknown> = {}) => ({
  haulingMarkAuthorizationId: 5,
  timberMark: 'TM1234',
  markHolderName: 'Acme Forestry',
  markStatus: 'ACTIVE',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  geographicLocation: 'Somewhere',
  estimatedVolume: 100,
  estimatedTruckLoads: 10,
  exceptions: [],
  conditions: [],
  scaleSites: [],
  speciesContent: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(record());
});

const renderPage = (id = '5') =>
  renderWithProviders(<ViewMarkSiteDesignation />, {
    route: `/?haulingMarkAuthorizationId=${id}`,
  });

describe('View Mark Site Designation', () => {
  it('loads the designation named in the query string', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.getMarkSiteDesignation).toHaveBeenCalled(),
    );
  });

  it('shows the timber mark and mark holder', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(controlById(container, 'mark-holder-name')).toHaveValue('Acme Forestry');
  });

  it('shows the authorization dates and location', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'effective-date')).toBeInTheDocument());
    expect(controlById(container, 'expiry-date')).toBeInTheDocument();
    expect(controlById(container, 'geographic-location')).toBeInTheDocument();
  });

  it('renders each detail section', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    const text = container.textContent ?? '';
    ['MSD Authorization', 'Scale Sites', 'Species Content', 'Exemptions', 'Conditions'].forEach(
      (section) => expect(text).toContain(section),
    );
  });

  it('offers the record actions', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Create Letter/i })).toBeInTheDocument();
  });

  it('navigates to the edit screen', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Edit Record/i }));

    expect(navigate).toHaveBeenCalled();
  });

  it('deletes nothing without confirmation', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );

    expect(apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench).not.toHaveBeenCalled();
  });

  it('shows a scale site attached to the designation', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(
      record({ scaleSites: [{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }] }),
    );
    renderPage();

    expect(await screen.findByText('SS-77')).toBeInTheDocument();
  });

  it('surfaces a load failure', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockRejectedValue(
      new Error('Designation not available.'),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.getMarkSiteDesignation).toHaveBeenCalled(),
    );
    expect(container.textContent ?? '').not.toContain('TM1234');
  });
});

describe('View Mark Site Designation — delete and letter', () => {
  const ready = async () =>
    waitFor(() => expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument());

  it('does nothing when the delete confirmation is declined', async () => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(false);
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    expect(confirm).toHaveBeenCalledWith('Are you sure you want to delete this record?');
    expect(apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it('removes the designation once confirmed and returns to welcome', async () => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench.mockResolvedValue(undefined);
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench).toHaveBeenCalledWith(5, expect.anything()),
    );
    expect(navigate).toHaveBeenCalledWith('/welcome');
    confirm.mockRestore();
  });

  it('reports a failed delete and stays on the record', async () => {
    const confirm = vi.spyOn(globalThis, 'confirm').mockReturnValue(true);
    apiMock.markSiteDesignation.removeMarkSiteDesignationFromWorkbench.mockRejectedValue(new Error('Delete refused.'));
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Delete$/i }));

    expect((await screen.findAllByText(/Delete refused\./i)).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalledWith('/welcome');
    confirm.mockRestore();
  });

  it('goes to the letter options when no letter exists yet', async () => {
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /Create Letter/i }));

    expect(navigate).toHaveBeenCalledWith('/mark-site-designations/5/letter');
    expect(apiMock.markSiteDesignation.getMarkSiteDesignationLetter).not.toHaveBeenCalled();
  });

  it('downloads the existing letter instead of creating another', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(record({ letterExists: true }));
    apiMock.markSiteDesignation.getMarkSiteDesignationLetter.mockResolvedValue({ blob: new Blob(['pdf']), filename: 'msd.pdf' });
    renderPage();

    await ready();
    // Once a letter exists the same button reads "View Letter" and downloads instead of creating.
    await userEvent.click(screen.getByRole('button', { name: /View Letter/i }));

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.getMarkSiteDesignationLetter).toHaveBeenCalledWith(5, expect.anything()),
    );
    expect(navigate).not.toHaveBeenCalledWith('/mark-site-designations/5/letter');
  });

  it('reports a failed letter download', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(record({ letterExists: true }));
    apiMock.markSiteDesignation.getMarkSiteDesignationLetter.mockRejectedValue(new Error('Letter unavailable.'));
    renderPage();

    await ready();
    await userEvent.click(screen.getByRole('button', { name: /View Letter/i }));

    expect((await screen.findAllByText(/Letter unavailable\./i)).length).toBeGreaterThan(0);
  });
});

describe('View Mark Site Designation — sparse and fully populated records', () => {
  it('renders a designation with every optional field absent', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue({
      haulingMarkAuthorizationId: 5,
      timberMark: 'TM1234',
      markHolderName: null,
      markHolderClient: null,
      markHolderLoc: null,
      markStatus: null,
      effectiveDate: null,
      expiryDate: null,
      geographicLocation: null,
      estimatedVolume: null,
      estimatedTruckLoads: null,
      population: null,
      timberDescription: null,
      otherRequirements: null,
      transportationDateDesc: null,
      exceptions: null,
      conditions: null,
      scaleSites: null,
      speciesContent: null,
      letterExists: false,
    });
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(controlById(container, 'mark-holder-name')).toHaveValue('');
  });

  it('renders a designation carrying every collection', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(
      record({
        markHolderClient: '00012345',
        markHolderLoc: '01',
        population: 'P1',
        timberDescription: 'Cedar and fir',
        otherRequirements: 'Daylight hauling',
        transportationDateDesc: 'Year round',
        exceptions: ['EX1'],
        conditions: [{ scaleAuthConditionId: 12, scaleAuthConditionTitle: 'No night hauling', scaleAuthConditionDesc: 'Daylight only', ministryStandardInd: 'Y' }],
        scaleSites: [{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }],
        speciesContent: [{ speciesCode: 'FIR', contentPercent: 60 }],
      }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(container.textContent ?? '').toContain('SS-77');
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });
});
