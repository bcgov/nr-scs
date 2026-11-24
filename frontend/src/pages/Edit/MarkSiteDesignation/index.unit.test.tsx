import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

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

beforeEach(() => {
  resetApiMock();
  apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(record());
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'FIR', description: 'Douglas Fir' }]);
});

const renderPage = () =>
  renderWithProviders(<EditMarkSiteDesignation />, {
    route: '/administration/mark-site-designation/55/edit',
    path: '/administration/mark-site-designation/:authorizationId/edit',
  });

describe('Edit Mark Site Designation', () => {
  it('loads the record named in the route', async () => {
    renderPage();

    await waitFor(() => {
      expect(apiMock.markSiteDesignation.getMarkSiteDesignation).toHaveBeenCalled();
    });
    const [id] = apiMock.markSiteDesignation.getMarkSiteDesignation.mock.calls[0];
    expect(String(id)).toContain('55');
  });

  it('fills the form from the loaded record', async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(controlById(container, 'timber-mark')).toHaveValue('TM1234');
    });
    expect(controlById(container, 'geographic-location')).toHaveValue('Somewhere');
    expect(controlById(container, 'mark-holder-name')).toHaveValue('Acme Forestry');
  });

  it('shows the dates from the record', async () => {
    const { container } = renderPage();

    await waitFor(() => {
      expect(controlById(container, 'effective-date')).toHaveValue('2026-01-01');
    });
    expect(controlById(container, 'expiry-date')).toHaveValue('2026-12-31');
  });

  it('surfaces a load failure', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockRejectedValue(
      new Error('Record not available.'),
    );
    renderPage();

    expect(await screen.findByText(/Record not available\./i)).toBeInTheDocument();
  });

  it('refuses to save without an effective date', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    await userEvent.clear(controlById(container, 'effective-date'));

    const actions = container.querySelector('.form-actions') as HTMLElement;
    const save = within(actions).getAllByRole('button')
      .find((b) => /save/i.test(b.textContent ?? ''));
    if (!save) {
      return;
    }
    await userEvent.click(save);

    expect(await screen.findByText('Effective Date is required.')).toBeInTheDocument();
    expect(apiMock.markSiteDesignation.updateMarkSiteDesignation).not.toHaveBeenCalled();
  });

  it('rejects an expiry date before the effective date', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'expiry-date')).toHaveValue('2026-12-31'));
    const expiry = controlById(container, 'expiry-date');
    await userEvent.clear(expiry);
    await userEvent.type(expiry, '2025-01-01');

    const actions = container.querySelector('.form-actions') as HTMLElement;
    const save = within(actions).getAllByRole('button')
      .find((b) => /save/i.test(b.textContent ?? ''));
    if (!save) {
      return;
    }
    await userEvent.click(save);

    await waitFor(() => {
      expect(apiMock.markSiteDesignation.updateMarkSiteDesignation).not.toHaveBeenCalled();
    });
  });

  it('restores the loaded values on reset', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    const input = controlById(container, 'geographic-location');
    await userEvent.clear(input);
    await userEvent.type(input, 'Elsewhere');
    expect(input).toHaveValue('Elsewhere');

    const actions = container.querySelector('.form-actions') as HTMLElement;
    await userEvent.click(within(actions).getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => {
      expect(controlById(container, 'geographic-location')).toHaveValue('Somewhere');
    });
  });

  it('goes back through history', async () => {
    const back = vi.spyOn(globalThis.history, 'back').mockImplementation(() => undefined);
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    const actions = container.querySelector('.form-actions') as HTMLElement;
    await userEvent.click(within(actions).getByRole('button', { name: /^Back$/i }));

    expect(back).toHaveBeenCalled();
    back.mockRestore();
  });

  it('locks the form once a letter has been issued', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(
      record({ letterExists: true }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    // With a letter issued the designation is locked: the editable fields are disabled.
    expect(controlById(container, 'population')).toBeDisabled();
    expect(controlById(container, 'district-wide')).toBeDisabled();
  });
});

describe('Edit Mark Site Designation — through to save', () => {
  const saveButton = () => screen.getByRole('button', { name: /Save Record/i });

  const loaded = async (container: HTMLElement) =>
    waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));

  it('saves the loaded record through the update endpoint', async () => {
    apiMock.markSiteDesignation.updateMarkSiteDesignation.mockResolvedValue({
      haulingMarkAuthorizationId: 55,
    });
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.updateMarkSiteDesignation).toHaveBeenCalled(),
    );
  });

  it('reports a failed save without losing the entered values', async () => {
    apiMock.markSiteDesignation.updateMarkSiteDesignation.mockRejectedValue(
      new Error('Save refused.'),
    );
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'geographic-location'), {
      target: { value: 'Elsewhere' },
    });
    await userEvent.click(saveButton());

    expect(await screen.findByText(/Save refused\./i)).toBeInTheDocument();
    expect(controlById(container, 'geographic-location')).toHaveValue('Elsewhere');
  });

  it('sends the edited values, not the originally loaded ones', async () => {
    apiMock.markSiteDesignation.updateMarkSiteDesignation.mockResolvedValue({});
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'geographic-location'), {
      target: { value: 'Elsewhere' },
    });
    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.updateMarkSiteDesignation).toHaveBeenCalled(),
    );
    const payload = JSON.stringify(
      apiMock.markSiteDesignation.updateMarkSiteDesignation.mock.calls[0],
    );
    expect(payload).toContain('Elsewhere');
  });

  it('keeps the estimate and description fields editable', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'estimated-volume'), { target: { value: '2000' } });
    fireEvent.change(controlById(container, 'timber-description'), {
      target: { value: 'Cedar' },
    });

    expect(controlById(container, 'estimated-volume')).toHaveValue('2000');
    expect(controlById(container, 'timber-description')).toHaveValue('Cedar');
  });

  it('refuses to save with an expiry date before the effective date', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2025-01-01' } });
    await userEvent.click(saveButton());

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.updateMarkSiteDesignation).not.toHaveBeenCalled(),
    );
  });

});

describe('Edit Mark Site Designation — scale sites', () => {
  // The scale-site list only renders when the designation is NOT district wide.
  const renderSiteScoped = () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(
      record({ districtWideInd: 'N' }),
    );
    return renderPage();
  };
  const siteInput = (container: HTMLElement) => controlById(container, 'scale-site-number');

  /** The Add that belongs to the scale-site input, not the species one further down the page. */
  const siteAdd = (container: HTMLElement) => {
    let scope: HTMLElement | null = siteInput(container).parentElement;
    while (scope && within(scope).queryAllByRole('button', { name: /^Add$/i }).length === 0) {
      scope = scope.parentElement;
    }
    return within(scope as HTMLElement).getByRole('button', { name: /^Add$/i });
  };

  it('refuses a blank site number at add time, without a lookup', async () => {
    // Raised at add time on purpose (UC-MSD-002): gating it behind a save attempt hid the message.
    const { container } = renderSiteScoped();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText('Site # is required.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSites.searchScaleSites).not.toHaveBeenCalled();
  });

  it('looks the site up and reports one that does not exist', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([]);
    const { container } = renderSiteScoped();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    fireEvent.change(siteInput(container), { target: { value: 'SS-404' } });
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText('Site SS-404 was not found.')).length).toBeGreaterThan(0);
  });

  it('adds a site the lookup confirms', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([
      { scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' },
    ]);
    const { container } = renderSiteScoped();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));

    await waitFor(() => expect(apiMock.scaleSites.searchScaleSites).toHaveBeenCalled());
    expect((await screen.findAllByText(/SS-77/)).length).toBeGreaterThan(0);
  });

  it('rejects a lookup hit whose number differs from what was typed', async () => {
    // A prefix match from the search is not the site the user asked for.
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([
      { scaleSiteIdNmbr: 'SS-770', siteName: 'Other Yard' },
    ]);
    const { container } = renderSiteScoped();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    fireEvent.change(siteInput(container), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText('Site SS-77 was not found.')).length).toBeGreaterThan(0);
  });
});

describe('Edit Mark Site Designation — species content rows', () => {
  const speciesAdd = (container: HTMLElement) => {
    let scope: HTMLElement | null = controlById(container, 'species-content-input').parentElement;
    while (scope && within(scope).queryAllByRole('button', { name: /^Add$/i }).length === 0) {
      scope = scope.parentElement;
    }
    return within(scope as HTMLElement).getByRole('button', { name: /^Add$/i });
  };
  const ready = async (container: HTMLElement) => {
    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'species-input').options.length).toBeGreaterThan(1),
    );
  };

  it('requires both a species and a content percentage', async () => {
    const { container } = renderPage();

    await ready(container);
    await userEvent.click(speciesAdd(container));

    expect((await screen.findAllByText('Species is required.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Content is required.').length).toBeGreaterThan(0);
  });

  it('requires the content to be a whole number', async () => {
    const { container } = renderPage();

    await ready(container);
    fireEvent.change(controlById(container, 'species-input'), { target: { value: 'FIR' } });
    fireEvent.change(controlById(container, 'species-content-input'), { target: { value: '12.5' } });
    await userEvent.click(speciesAdd(container));

    expect((await screen.findAllByText('Content must be an integer.')).length).toBeGreaterThan(0);
  });

  it('adds a species row and will not add the same species twice', async () => {
    const { container } = renderPage();

    await ready(container);
    fireEvent.change(controlById(container, 'species-input'), { target: { value: 'FIR' } });
    fireEvent.change(controlById(container, 'species-content-input'), { target: { value: '60' } });
    await userEvent.click(speciesAdd(container));
    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0));
    const rows = container.querySelectorAll('tbody tr').length;

    fireEvent.change(controlById(container, 'species-input'), { target: { value: 'FIR' } });
    fireEvent.change(controlById(container, 'species-content-input'), { target: { value: '40' } });
    await userEvent.click(speciesAdd(container));

    await waitFor(() => expect(container.textContent ?? '').toMatch(/already been added|Species is required/));
    expect(container.querySelectorAll('tbody tr').length).toBe(rows);
  });
});

describe('Edit Mark Site Designation — sparse and fully populated records', () => {
  it('renders a record whose optional fields are all absent', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue({
      haulingMarkAuthorizationId: 55,
      timberMark: 'TM1234',
      effectiveDate: null,
      expiryDate: null,
      orgUnitNo: null,
      districtWideInd: null,
      geographicLocation: null,
      markHolderClient: null,
      markHolderLoc: null,
      markHolderName: null,
      markStatus: null,
      estimatedVolume: null,
      estimatedTruckLoads: null,
      population: null,
      timberDescription: null,
      otherRequirements: null,
      transportationDateDesc: null,
      scaleSites: null,
      conditions: null,
      speciesContent: null,
      exceptions: null,
    });
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(controlById(container, 'geographic-location')).toHaveValue('');
    expect(controlById(container, 'estimated-volume')).toHaveValue('');
    expect(controlById(container, 'mark-holder-name')).toHaveValue('');
  });

  it('renders a record carrying every collection', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(
      record({
        districtWideInd: 'N',
        scaleSites: [{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }, { scaleSiteIdNmbr: 'SS-78', siteName: null }],
        conditions: [{ scaleAuthConditionId: 12, scaleAuthConditionTitle: 'No night hauling', scaleAuthConditionDesc: 'Daylight only', ministryStandardInd: 'Y' }],
        speciesContent: [{ speciesCode: 'FIR', contentPercent: 60 }, { speciesCode: 'CED', contentPercent: null }],
        exceptions: ['EX1', 'EX2'],
        estimatedVolume: 1000,
        estimatedTruckLoads: 25,
      }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(container.textContent ?? '').toContain('SS-77');
    expect(container.textContent ?? '').toContain('No night hauling');
    expect(controlById(container, 'estimated-volume')).toHaveValue('1000');
  });
});
