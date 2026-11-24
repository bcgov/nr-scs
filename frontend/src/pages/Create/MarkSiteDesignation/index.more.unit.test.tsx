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

import CreateMarkSiteDesignation from './index';

const create = () => apiMock.markSiteDesignation.createMarkSiteDesignation;
const payload = () => create().mock.calls[0][0];

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'FIR', description: 'Douglas Fir' }]);
  create().mockResolvedValue({ haulingMarkAuthorizationId: 9 });
});

const renderPage = () => renderWithProviders(<CreateMarkSiteDesignation />);
const set = (container: HTMLElement, id: string, value: string) =>
  fireEvent.change(controlById(container, id), { target: { value } });
const districtSelect = (container: HTMLElement) =>
  Array.from(container.querySelectorAll('select')).find((s) => Array.from(s.options).some((o) => o.value === '43'));

const fillBasics = async (container: HTMLElement) => {
  await waitFor(() => expect(districtSelect(container)).toBeDefined());
  set(container, 'timber-mark', 'TM1234');
  set(container, 'effective-date', '2026-01-01');
  set(container, 'expiry-date', '2026-12-31');
  fireEvent.change(districtSelect(container)!, { target: { value: '43' } });
  set(container, 'district-wide', 'Y');
};

const openConditions = async (container: HTMLElement) => {
  await fillBasics(container);
  await userEvent.click(screen.getByRole('button', { name: /Add Conditions/i }));
  await waitFor(() => expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument());
};

const save = async () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));
const siteInput = (container: HTMLElement) => container.querySelector('#scale-site-number') as HTMLInputElement;
const siteAdd = (container: HTMLElement) =>
  within(container.querySelector('.scale-sites-section__button-group') as HTMLElement).getByRole('button', { name: /^Add$/ });
const speciesAdd = (container: HTMLElement) =>
  within(controlById(container, 'species-input').closest('.scs__form__grid, form') as HTMLElement).getAllByRole('button', { name: /^Add$/ }).at(-1)!;

describe('Create Mark Site Designation — before the conditions open', () => {
  it.each([
    ['estimated-volume', '12.5', 'Est. Volume must be an integer.'],
    ['estimated-truck-loads', 'ten', 'Est. Truck Loads must be an integer.'],
  ])('refuses %s = "%s"', async (id, value, message) => {
    const { container } = renderPage();

    await fillBasics(container);
    set(container, id, value);
    await userEvent.click(screen.getByRole('button', { name: /Add Conditions/i }));

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });
});

describe('Create Mark Site Designation — at save time', () => {
  it.each([
    ['estimated-volume', '12.5', 'Est. Volume must be an integer.'],
    ['estimated-truck-loads', 'ten', 'Est. Truck Loads must be an integer.'],
    // The site rule is only checked at save time; Add Conditions checks the basics alone.
    ['district-wide', 'N', 'At least one Scale Site is required when District Wide is No.'],
  ])('refuses %s = "%s" once the section is open', async (id, value, message) => {
    const { container } = renderPage();

    await openConditions(container);
    set(container, id, value);
    await save();

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(create()).not.toHaveBeenCalled();
  });

  it('still works when the species and exemption lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    const { container } = renderPage();

    await openConditions(container);

    expect(controlById<HTMLSelectElement>(container, 'species-input').options.length).toBeLessThanOrEqual(1);
    await save();
    await waitFor(() => expect(create()).toHaveBeenCalled());
  });

  it('sends null for every blank optional field and opens the new record', async () => {
    const { container } = renderPage();

    await openConditions(container);
    await save();

    await waitFor(() => expect(create()).toHaveBeenCalled());
    expect(payload()).toMatchObject({
      timberMark: 'TM1234',
      transportationDateDesc: null,
      otherRequirements: null,
      scaleSites: [],
      speciesContent: [],
      conditions: [],
      exceptions: [],
    });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/mark-site-designations/view?haulingMarkAuthorizationId=9'));
  });

  it('sends the chosen exemption and the added species', async () => {
    const { container } = renderPage();

    await openConditions(container);
    set(container, 'species-input', 'FIR');
    set(container, 'species-content-input', '60');
    await userEvent.click(speciesAdd(container));
    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
    fireEvent.click(container.querySelector('#exceptions-toggle-button')!);
    const menu = container.querySelector('#exceptions__menu') as HTMLElement;
    await waitFor(() => expect(menu.textContent).toContain('Douglas Fir'));
    fireEvent.click(menu.querySelector('[role="option"]')!);
    await save();

    await waitFor(() => expect(create()).toHaveBeenCalled());
    expect(payload()).toMatchObject({
      speciesContent: [{ scaleSpeciesCode: 'FIR', contentPercent: 60 }],
      exceptions: ['FIR'],
    });
  });

  it('removes a species row again', async () => {
    const { container } = renderPage();

    await openConditions(container);
    set(container, 'species-input', 'FIR');
    set(container, 'species-content-input', '60');
    await userEvent.click(speciesAdd(container));
    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
    await userEvent.click(screen.getAllByRole('button', { name: /Remove$/ })[0]);
    await save();

    await waitFor(() => expect(create()).toHaveBeenCalled());
    expect(payload().speciesContent).toEqual([]);
  });

  it('warns when the create returns no identifier', async () => {
    create().mockResolvedValue({});
    const { container } = renderPage();

    await openConditions(container);
    await save();

    expect(
      (await screen.findAllByText('Mark Site Designation was created, but no identifier was returned.')).length,
    ).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('Create Mark Site Designation — scale sites', () => {
  const toNo = async (container: HTMLElement) => {
    await openConditions(container);
    set(container, 'district-wide', 'N');
    await waitFor(() => expect(siteInput(container)).not.toBeNull());
  };

  it('sends an added site and can remove it again', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    const { container } = renderPage();

    await toNo(container);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));
    await screen.findAllByText(/North Yard/);
    await save();
    await waitFor(() => expect(create()).toHaveBeenCalled());
    expect(payload()).toMatchObject({ districtWideInd: 'N', scaleSites: ['SS-77'] });

    await userEvent.click(screen.getAllByRole('button', { name: /Remove$/ })[0]);
    await waitFor(() => expect(screen.queryByText(/North Yard/)).not.toBeInTheDocument());
  });

  it('rejects a site that has already been added', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    const { container } = renderPage();

    await toNo(container);
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));
    await screen.findAllByText(/North Yard/);
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
});
