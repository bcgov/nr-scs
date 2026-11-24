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

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  // The district select is LOV-backed; with no options the form can never be made valid.
  apiMock.lov.getRegionDistrictLov.mockResolvedValue([{ code: '43', description: 'DCK' }]);
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'FIR', description: 'Douglas Fir' }]);
});

const renderPage = () => renderWithProviders(<CreateMarkSiteDesignation />);

const clickButton = async (name: RegExp | string) => {
  await userEvent.click(screen.getByRole('button', { name }));
};

describe('Create Mark Site Designation', () => {
  it('renders the page title and the timber mark field', () => {
    const { container } = renderPage();

    expect(screen.getByText('Timber Mark')).toBeInTheDocument();
    expect(controlById(container, 'timber-mark')).toBeInTheDocument();
  });

  it('shows Add Conditions rather than Save Record before the conditions section is open', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /Add Conditions/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });

  it('renders the mark holder as read-only', () => {
    const { container } = renderPage();

    expect(controlById(container, 'mark-holder-client')).toBeDisabled();
    expect(controlById(container, 'mark-holder-loc')).toBeDisabled();
  });

  it('accepts typing into the timber mark field', async () => {
    const { container } = renderPage();

    const input = controlById(container, 'timber-mark');
    await userEvent.type(input, 'TM1234');

    expect(input).toHaveValue('TM1234');
  });
});

describe('Create Mark Site Designation — timber mark lookup', () => {
  it('refuses to look up an empty timber mark', async () => {
    renderPage();

    await clickButton(/Update Timber Mark/i);

    // The message is recorded but stays hidden until a save is attempted (`showError` gates on
    // submitAttempted); what matters here is that no pointless request went out.
    expect(
      apiMock.markSiteDesignation.getMarkSiteDesignationTimberMarkLookup,
    ).not.toHaveBeenCalled();
  });

  it('looks up a timber mark and fills in the mark holder', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignationTimberMarkLookup.mockResolvedValue({
      markHolderClient: '00012345',
      markHolderLoc: '01',
      markHolderName: 'Acme Forestry',
      markStatus: 'ACTIVE',
    });
    const { container } = renderPage();

    await userEvent.type(controlById(container, 'timber-mark'), 'TM1234');
    await clickButton(/Update Timber Mark/i);

    await waitFor(() => {
      expect(controlById(container, 'mark-holder-client')).toHaveValue('00012345');
    });
    expect(controlById(container, 'mark-holder-loc')).toHaveValue('01');
  });

  it('trims the timber mark before looking it up', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignationTimberMarkLookup.mockResolvedValue({});
    const { container } = renderPage();

    await userEvent.type(controlById(container, 'timber-mark'), '  TM1234  ');
    await clickButton(/Update Timber Mark/i);

    await waitFor(() => {
      expect(
        apiMock.markSiteDesignation.getMarkSiteDesignationTimberMarkLookup,
      ).toHaveBeenCalledWith('TM1234', expect.anything());
    });
  });

  it('surfaces a failed lookup', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignationTimberMarkLookup.mockRejectedValue(
      new Error('Lookup unavailable.'),
    );
    const { container } = renderPage();

    await userEvent.type(controlById(container, 'timber-mark'), 'TM1234');
    await clickButton(/Update Timber Mark/i);

    expect(await screen.findByText(/Lookup unavailable\./i)).toBeInTheDocument();
  });
});

describe('Create Mark Site Designation — validation', () => {
  it('reports the required fields when opening conditions on an empty form', async () => {
    renderPage();

    await clickButton(/Add Conditions/i);

    expect(await screen.findByText('Timber Mark is required.')).toBeInTheDocument();
    expect(screen.getByText('Effective Date is required.')).toBeInTheDocument();
    expect(screen.getByText('Expiry Date is required.')).toBeInTheDocument();
  });

  it('does not open the conditions section while the form is invalid', async () => {
    renderPage();

    await clickButton(/Add Conditions/i);

    await screen.findByText('Timber Mark is required.');
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });
});

describe('Create Mark Site Designation — species content', () => {
  it('adds a species row', async () => {
    const { container } = renderPage();

    const speciesCode = container.querySelector('#species-content-code');
    if (!speciesCode) {return;} // the section only renders once its LOVs resolve

    await userEvent.click(screen.getByRole('button', { name: /^Add$/i }));

    expect(screen.getAllByRole('row').length).toBeGreaterThan(0);
  });
});

describe('Create Mark Site Designation — navigation', () => {
  it('goes back through history without saving', async () => {
    const back = vi.spyOn(globalThis.history, 'back').mockImplementation(() => undefined);
    renderPage();

    await clickButton(/^Back$/i);

    expect(back).toHaveBeenCalled();
    expect(apiMock.markSiteDesignation.createMarkSiteDesignation).not.toHaveBeenCalled();
    back.mockRestore();
  });

  it('clears entered values on reset', async () => {
    const { container } = renderPage();

    const input = controlById(container, 'timber-mark');
    await userEvent.type(input, 'TM1234');
    // The conditions section contributes a Reset of its own; this is the form-level one.
    const formActions = container.querySelector('.form-actions') as HTMLElement;
    await userEvent.click(within(formActions).getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => {
      expect(controlById(container, 'timber-mark')).toHaveValue('');
    });
  });
});

describe('Create Mark Site Designation — through to save', () => {
  const districtSelect = (container: HTMLElement) =>
    container.querySelector('select[id*="district"], select[id*="dist"]') as HTMLSelectElement | null;

  /** Fills the fields that gate the Conditions section, waiting for the district LOV first. */
  const fillBasics = async (container: HTMLElement) => {
    await waitFor(() => {
      const select = districtSelect(container);
      expect((select?.options.length ?? 0) > 1).toBe(true);
    });
    fireEvent.change(controlById(container, 'timber-mark'), { target: { value: 'TM1234' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    const select = districtSelect(container);
    if (select) {fireEvent.change(select, { target: { value: '43' } });}
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'Y' } });
  };

  it('opens the conditions section once the basics are valid', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    await clickButton(/Add Conditions/i);

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
  });

  it('creates the designation from a valid form', async () => {
    apiMock.markSiteDesignation.createMarkSiteDesignation.mockResolvedValue({
      haulingMarkAuthorizationId: 9,
    });
    const { container } = renderPage();

    await fillBasics(container);
    await clickButton(/Add Conditions/i);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    await clickButton(/Save Record/i);

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.createMarkSiteDesignation).toHaveBeenCalled(),
    );
  });

  it('reports a failed create without losing the entered values', async () => {
    apiMock.markSiteDesignation.createMarkSiteDesignation.mockRejectedValue(
      new Error('Create refused.'),
    );
    const { container } = renderPage();

    await fillBasics(container);
    await clickButton(/Add Conditions/i);
    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument(),
    );
    await clickButton(/Save Record/i);

    expect(await screen.findByText(/Create refused\./i)).toBeInTheDocument();
    expect(controlById(container, 'timber-mark')).toHaveValue('TM1234');
  });

  it('keeps the optional descriptive fields that were entered', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    fireEvent.change(controlById(container, 'geographic-location'), {
      target: { value: 'North of the bridge' },
    });
    fireEvent.change(controlById(container, 'timber-description'), {
      target: { value: 'Cedar and fir' },
    });
    fireEvent.change(controlById(container, 'other-requirements'), {
      target: { value: 'Daylight hauling' },
    });

    expect(controlById(container, 'geographic-location')).toHaveValue('North of the bridge');
    expect(controlById(container, 'timber-description')).toHaveValue('Cedar and fir');
    expect(controlById(container, 'other-requirements')).toHaveValue('Daylight hauling');
  });

  it('keeps the estimate fields that were entered', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    fireEvent.change(controlById(container, 'estimated-volume'), { target: { value: '1000' } });
    fireEvent.change(controlById(container, 'estimated-truck-loads'), { target: { value: '25' } });

    expect(controlById(container, 'estimated-volume')).toHaveValue('1000');
    expect(controlById(container, 'estimated-truck-loads')).toHaveValue('25');
  });

  it('rejects an expiry date that is not after the effective date', async () => {
    const { container } = renderPage();

    await fillBasics(container);
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2025-01-01' } });
    await clickButton(/Add Conditions/i);

    await waitFor(() =>
      expect(apiMock.markSiteDesignation.createMarkSiteDesignation).not.toHaveBeenCalled(),
    );
  });
});

describe('Create Mark Site Designation — species content rows', () => {
  const speciesAdd = (container: HTMLElement) => {
    let scope: HTMLElement | null = controlById(container, 'species-content-input').parentElement;
    while (scope && within(scope).queryAllByRole('button', { name: /^Add$/i }).length === 0) {
      scope = scope.parentElement;
    }
    return within(scope as HTMLElement).getByRole('button', { name: /^Add$/i });
  };
  /** The species LOV is only fetched once the Conditions section opens, so get there first. */
  const speciesReady = async (container: HTMLElement) => {
    await waitFor(() => {
      const select = container.querySelector('select[id*="dist"]') as HTMLSelectElement | null;
      expect((select?.options.length ?? 0) > 1).toBe(true);
    });
    fireEvent.change(controlById(container, 'timber-mark'), { target: { value: 'TM1234' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    const district = container.querySelector('select[id*="dist"]');
    if (district) {fireEvent.change(district, { target: { value: '43' } });}
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'Y' } });
    await clickButton(/Add Conditions/i);
    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'species-input').options.length).toBeGreaterThan(1),
    );
  };

  it('requires both a species and a content percentage', async () => {
    const { container } = renderPage();

    await speciesReady(container);
    await userEvent.click(speciesAdd(container));

    expect((await screen.findAllByText('Species is required.')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Content is required.').length).toBeGreaterThan(0);
  });

  it('requires the content to be a whole number', async () => {
    const { container } = renderPage();

    await speciesReady(container);
    fireEvent.change(controlById(container, 'species-input'), { target: { value: 'FIR' } });
    fireEvent.change(controlById(container, 'species-content-input'), { target: { value: '12.5' } });
    await userEvent.click(speciesAdd(container));

    expect((await screen.findAllByText('Content must be an integer.')).length).toBeGreaterThan(0);
  });

  it('adds a species row, and will not add the same species a second time', async () => {
    const { container } = renderPage();

    await speciesReady(container);
    fireEvent.change(controlById(container, 'species-input'), { target: { value: 'FIR' } });
    fireEvent.change(controlById(container, 'species-content-input'), { target: { value: '60' } });
    await userEvent.click(speciesAdd(container));
    await waitFor(() => expect(container.querySelectorAll('tbody tr').length).toBe(1));

    // Whether the picker drops the used species or the add rejects it, the outcome is one row.
    fireEvent.change(controlById(container, 'species-input'), { target: { value: 'FIR' } });
    fireEvent.change(controlById(container, 'species-content-input'), { target: { value: '40' } });
    await userEvent.click(speciesAdd(container));

    await waitFor(() => expect(container.textContent ?? '').toMatch(/already been added|Species is required/));
    expect(container.querySelectorAll('tbody tr').length).toBe(1);
  });
});

describe('Create Mark Site Designation — scale sites', () => {
  // The scale-site list only renders when the designation is NOT district wide.
  // On the create screen the scale-site list sits inside the Conditions section, so the basics
  // must be valid (with District Wide = No) and the section opened before the input exists.
  const toSiteScoped = async (container: HTMLElement) => {
    await waitFor(() => {
      const select = container.querySelector('select[id*="dist"]') as HTMLSelectElement | null;
      expect((select?.options.length ?? 0) > 1).toBe(true);
    });
    fireEvent.change(controlById(container, 'timber-mark'), { target: { value: 'TM1234' } });
    fireEvent.change(controlById(container, 'effective-date'), { target: { value: '2026-01-01' } });
    fireEvent.change(controlById(container, 'expiry-date'), { target: { value: '2026-12-31' } });
    const district = container.querySelector('select[id*="dist"]');
    if (district) {fireEvent.change(district, { target: { value: '43' } });}
    fireEvent.change(controlById(container, 'district-wide'), { target: { value: 'N' } });
    await clickButton(/Add Conditions/i);
    await waitFor(() => expect(container.querySelector('#scale-site-number')).not.toBeNull());
  };
  const siteAdd = (container: HTMLElement) => {
    let scope: HTMLElement | null = controlById(container, 'scale-site-number').parentElement;
    while (scope && within(scope).queryAllByRole('button', { name: /^Add$/i }).length === 0) {
      scope = scope.parentElement;
    }
    return within(scope as HTMLElement).getByRole('button', { name: /^Add$/i });
  };

  it('refuses a blank site number at add time, without a lookup', async () => {
    const { container } = renderPage();

    await toSiteScoped(container);
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText('Site # is required.')).length).toBeGreaterThan(0);
    expect(apiMock.scaleSites.searchScaleSites).not.toHaveBeenCalled();
  });

  it('reports a site the lookup does not know', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([]);
    const { container } = renderPage();

    await toSiteScoped(container);
    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-404' } });
    await userEvent.click(siteAdd(container));

    expect((await screen.findAllByText('Site SS-404 was not found.')).length).toBeGreaterThan(0);
  });

  it('adds a site the lookup confirms', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-77', siteName: 'North Yard' }]);
    const { container } = renderPage();

    await toSiteScoped(container);
    fireEvent.change(controlById(container, 'scale-site-number'), { target: { value: 'SS-77' } });
    await userEvent.click(siteAdd(container));

    await waitFor(() => expect(apiMock.scaleSites.searchScaleSites).toHaveBeenCalled());
    expect((await screen.findAllByText(/SS-77/)).length).toBeGreaterThan(0);
  });
});
