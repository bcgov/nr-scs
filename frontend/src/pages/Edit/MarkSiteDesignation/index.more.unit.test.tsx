import { fireEvent, screen, waitFor, within } from '@testing-library/react';
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

import EditMarkSiteDesignation from './index';

const record = (overrides: Record<string, unknown> = {}) => ({
  haulingMarkAuthorizationId: 55,
  timberMark: 'TM1234',
  effectiveDate: '2026-01-01',
  expiryDate: '2026-12-31',
  orgUnitNo: 43,
  districtWideInd: 'Y',
  geographicLocation: 'Somewhere',
  markHolderClient: '00012345',
  markHolderLoc: '01',
  markHolderName: 'Acme Forestry',
  markStatus: 'ACTIVE',
  estimatedVolume: '100',
  estimatedTruckLoads: '10',
  population: 'P1',
  timberDescription: 'Cedar',
  otherRequirements: 'None',
  exceptions: [],
  transportationDateDesc: 'Year round',
  scaleSites: [],
  conditions: [],
  speciesContent: [],
  ...overrides,
});

const load = (r: unknown) => apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(r as never);
const update = () => apiMock.markSiteDesignation.updateMarkSiteDesignation;
const payload = () => update().mock.calls[0][1];

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  load(record());
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'FIR', description: 'Douglas Fir' }]);
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  update().mockResolvedValue({ haulingMarkAuthorizationId: 55 });
});

const renderPage = (route = '/administration/mark-site-designation/55/edit') =>
  renderWithProviders(<EditMarkSiteDesignation />, {
    route,
    path: '/administration/mark-site-designation/:authorizationId/edit',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
const set = (container: HTMLElement, id: string, value: string) =>
  fireEvent.change(controlById(container, id), { target: { value } });
const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
const siteInput = (container: HTMLElement) => container.querySelector('#scale-site-number') as HTMLInputElement;
const siteAdd = (container: HTMLElement) =>
  within(container.querySelector('.scale-sites-section__button-group') as HTMLElement).getByRole('button', { name: /^Add$/ });

describe('Edit Mark Site Designation — route guard', () => {
  it('refuses an authorization id that is not a number', async () => {
    renderPage('/administration/mark-site-designation/abc/edit');

    expect(await screen.findByText('A valid authorization id was not provided.')).toBeInTheDocument();
    expect(apiMock.markSiteDesignation.getMarkSiteDesignation).not.toHaveBeenCalled();
  });
});

describe('Edit Mark Site Designation — validation', () => {
  it.each([
    ['expiry-date', '', 'Expiry Date is required.'],
    ['estimated-volume', '12.5', 'Est. Volume must be an integer.'],
    ['estimated-truck-loads', 'ten', 'Est. Truck Loads must be an integer.'],
    ['district-wide', '', 'District Wide is required.'],
    ['district-wide', 'N', 'At least one Scale Site is required when District Wide is No.'],
  ])('refuses %s = "%s"', async (id, value, message) => {
    const { container } = renderPage();

    await loaded(container);
    set(container, id, value);
    await save();

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(update()).not.toHaveBeenCalled();
  });

  it('requires a district', async () => {
    load(record({ orgUnitNo: null }));
    const { container } = renderPage();

    await loaded(container);
    await save();

    expect((await screen.findAllByText('Reg / Dist is required.')).length).toBeGreaterThan(0);
    expect(update()).not.toHaveBeenCalled();
  });

  it('only checks the expiry date once a letter has been issued', async () => {
    load(record({ letterExists: true, districtWideInd: '', orgUnitNo: null, effectiveDate: '' }));
    const { container } = renderPage();

    await loaded(container);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ expiryDate: '2026-12-31', districtWideInd: null, orgUnitNo: null, effectiveDate: null });
  });

  it('still bounds the expiry by the effective date when the letter exists', async () => {
    load(record({ letterExists: true }));
    const { container } = renderPage();

    await loaded(container);
    set(container, 'expiry-date', '2025-01-01');
    await save();

    expect((await screen.findAllByText('Expiry Date must be on or after Effective Date.')).length).toBeGreaterThan(0);
    expect(update()).not.toHaveBeenCalled();
  });
});

describe('Edit Mark Site Designation — scale sites', () => {
  const toNo = async (container: HTMLElement) => {
    await loaded(container);
    set(container, 'district-wide', 'N');
    await waitFor(() => expect(siteInput(container)).not.toBeNull());
  };

  it('rejects a site that has already been added', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    const { container } = renderPage();

    await toNo(container);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));
    await screen.findAllByText(/SS-77/);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText('The Scale Site SS-77 has already been added.')).length).toBeGreaterThan(0);
  });

  it('reports a site lookup that fails', async () => {
    apiMock.scaleSites.searchScaleSites.mockRejectedValue(new Error('Lookup unavailable.'));
    const { container } = renderPage();

    await toNo(container);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText(/Lookup unavailable\.|Could not add scale site\./)).length).toBeGreaterThan(0);
  });

  it('drops the sites again when District Wide goes back to Yes', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    const { container } = renderPage();

    await toNo(container);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));
    await screen.findAllByText(/SS-77/);
    set(container, 'district-wide', 'Y');
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ districtWideInd: 'Y', scaleSites: [] });
  });

  it('sends the added site and lets it be removed', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    const { container } = renderPage();

    await toNo(container);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));
    await screen.findAllByText(/SS-77/);
    await save();
    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ districtWideInd: 'N', scaleSites: ['SS-77'] });

    await userEvent.click(screen.getAllByRole('button', { name: /Remove$/ })[0]);
    await waitFor(() => expect(screen.queryByText(/North Yard/)).not.toBeInTheDocument());
  });
});

describe('Edit Mark Site Designation — what gets sent', () => {
  it('sends null for every blank optional field', async () => {
    load(
      record({
        geographicLocation: '',
        population: '',
        estimatedVolume: '',
        estimatedTruckLoads: '',
        timberDescription: '',
        transportationDateDesc: '',
        otherRequirements: '',
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({
      geographicLocation: null,
      population: null,
      estimatedVolume: null,
      estimatedTruckLoads: null,
      timberDescription: null,
      transportationDateDesc: null,
      otherRequirements: null,
      orgUnitNo: 43,
    });
    expect(navigate).toHaveBeenCalledWith('/mark-site-designations/view?haulingMarkAuthorizationId=55');
  });

  it('sends the edited descriptions and the chosen exemption', async () => {
    const { container } = renderPage();

    await loaded(container);
    set(container, 'timber-description', 'Hemlock');
    set(container, 'transportation-date-desc', 'Summer');
    set(container, 'other-requirements', 'Tarps');
    set(container, 'population', 'P2');
    fireEvent.click(container.querySelector('#exceptions-toggle-button')!);
    const menu = container.querySelector('#exceptions__menu') as HTMLElement;
    await waitFor(() => expect(menu.textContent).toContain('Douglas Fir'));
    fireEvent.click(menu.querySelector('[role="option"]')!);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload()).toMatchObject({
      timberDescription: 'Hemlock',
      transportationDateDesc: 'Summer',
      otherRequirements: 'Tarps',
      population: 'P2',
      estimatedVolume: 100,
      estimatedTruckLoads: 10,
      exceptions: ['FIR'],
    });
  });

  it('leaves ministry-standard and incomplete conditions out, and keeps only named species', async () => {
    load(
      record({
        conditions: [
          { scaleConditionClassCode: 'MSD', scaleAuthConditionId: 1, ministryStandardInd: 'Y', scaleAuthConditionTitle: 'Standard' },
          { scaleConditionClassCode: 'MSD', scaleAuthConditionId: 2, ministryStandardInd: 'N', scaleAuthConditionTitle: 'Extra' },
          { scaleAuthConditionId: 3, scaleAuthConditionTitle: 'No class' },
          { scaleConditionClassCode: 'MSD', scaleAuthConditionTitle: 'No id' },
        ],
        speciesContent: [
          { scaleSpeciesCode: 'FIR', contentPercent: 60 },
          { scaleSpeciesCode: '', contentPercent: null },
        ],
      }),
    );
    const { container } = renderPage();

    await loaded(container);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload().conditions).toEqual([{ scaleConditionClassCode: 'MSD', scaleAuthConditionId: 2 }]);
    expect(payload().speciesContent).toEqual([{ scaleSpeciesCode: 'FIR', contentPercent: 60 }]);
  });

  it('removes a species row', async () => {
    load(record({ speciesContent: [{ scaleSpeciesCode: 'FIR', contentPercent: 60 }] }));
    const { container } = renderPage();

    await loaded(container);
    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByRole('button', { name: /Remove$/ })[0]);
    await save();

    await waitFor(() => expect(update()).toHaveBeenCalled());
    expect(payload().speciesContent).toEqual([]);
  });
});
