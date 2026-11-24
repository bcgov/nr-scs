import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

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
  districtWideInd: 'N',
  exceptions: ['X1', 'ZZ'],
  conditions: [],
  scaleSites: [],
  speciesContent: [
    { scaleSpeciesCode: 'FIR', contentPercent: 60 },
    { scaleSpeciesCode: 'HEM', contentPercent: null },
    { scaleSpeciesCode: '', contentPercent: '' },
  ],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(record());
  apiMock.lov.getStaticLov.mockImplementation(async ({ tableKey }: { tableKey: string }) =>
    tableKey === 'SCALE_SPECIES_CODE' ? [{ code: 'FIR', description: 'Douglas Fir' }] : [{ code: 'X1', description: 'Exception one' }],
  );
});

const renderPage = (id = '5') => renderWithProviders(<ViewMarkSiteDesignation />, { route: `/?haulingMarkAuthorizationId=${id}` });
const loaded = (container: HTMLElement) =>
  waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));

describe('View Mark Site Designation — more', () => {
  it('refuses an id that is not a number', async () => {
    renderPage('abc');

    expect(await screen.findByText('A valid mark site designation id was not provided.')).toBeInTheDocument();
    expect(apiMock.markSiteDesignation.getMarkSiteDesignation).not.toHaveBeenCalled();
  });

  it('describes species and exemptions through the lookups, keeping unknown codes raw', async () => {
    const { container } = renderPage();
    await loaded(container);

    expect((await screen.findAllByText('Douglas Fir')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('HEM').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Exception one/).length).toBeGreaterThan(0);
  });

  it('spells the mandatory flag of each condition as Yes, No or nothing', async () => {
    apiMock.markSiteDesignation.getMarkSiteDesignation.mockResolvedValue(
      record({
        conditions: [
          { scaleAuthConditionId: 1, scaleAuthConditionTitle: 'Bark', ministryStandardInd: 'Y' },
          { scaleAuthConditionId: 2, scaleAuthConditionTitle: 'Alpha', ministryStandardInd: 'n' },
          { scaleAuthConditionId: 3, scaleAuthConditionTitle: 'Zulu', ministryStandardInd: 'X' },
        ],
      }),
    );
    const { container } = renderPage();
    await loaded(container);

    await waitFor(() => expect(screen.getAllByText('Yes').length).toBeGreaterThan(0));
    expect(screen.getAllByText('No').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Zulu').length).toBeGreaterThan(0);
  });

  it('still shows the record when the lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    renderPage();

    await waitFor(() => expect(apiMock.lov.getStaticLov).toHaveBeenCalled());
    await waitFor(() => expect(apiMock.markSiteDesignation.getMarkSiteDesignation).toHaveBeenCalled());
  });
});
