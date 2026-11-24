import { screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';
import type { CheckScaleSummaryRow } from '@/services/checkScales.service';

import CheckScaleSummaryTable from './index';

const rows: CheckScaleSummaryRow[] = [
  {
    checkScaleId: 101,
    primOrigLicenceNo: 'A1',
    secOrigLicenceNo: 'A2',
    primCheckLicenceNo: 'B1',
    secCheckLicenceNo: 'B2',
    origScaleDate: '2026-01-01',
    checkScaleDate: '2026-01-05',
    pieceDiff: 4,
    volumeVariance: 1,
    valueVariance: 2,
    replacedInd: 'Y',
    checkScaleTypeCode: 'FUL',
    followedGoodPracticeInd: 'N',
    originalWithinStandardInd: 'Y',
  },
];

const descriptions = new Map([['FUL', 'Full Scale']]);

describe('CheckScaleSummaryTable', () => {
  it('renders the legacy column set in order, including both secondary licences', () => {
    renderWithProviders(
      <CheckScaleSummaryTable rows={rows} checkScaleTypeDescriptions={descriptions} />,
    );

    expect(screen.getAllByRole('columnheader').map((h) => h.textContent?.trim())).toEqual([
      'Check Scale #',
      'Primary Licence #',
      'Secondary Licence #',
      'Primary Check Licence #',
      'Secondary Check Licence #',
      'Original Scale Date',
      'Check Scale Date',
      'Piece Diff.',
      'Volume Variance %',
      'Value Variance %',
      'Replaced?',
      'Check Scale Type',
      'Good Practices?',
      'Within Standard?',
    ]);
  });

  it('links the check scale number to its view page', () => {
    renderWithProviders(
      <CheckScaleSummaryTable rows={rows} checkScaleTypeDescriptions={descriptions} />,
    );

    expect(screen.getByRole('link', { name: '101' })).toHaveAttribute(
      'href',
      '/check-scales/view/101',
    );
  });

  it('resolves the check scale type through the supplied descriptions', () => {
    renderWithProviders(
      <CheckScaleSummaryTable rows={rows} checkScaleTypeDescriptions={descriptions} />,
    );

    expect(screen.getByText('Full Scale')).toBeInTheDocument();
  });

  it('renders an em dash instead of a link when the row has no id', () => {
    renderWithProviders(
      <CheckScaleSummaryTable
        rows={[{ ...rows[0], checkScaleId: null }]}
        checkScaleTypeDescriptions={descriptions}
      />,
    );

    expect(screen.queryByRole('link', { name: '101' })).not.toBeInTheDocument();
    const bodyRow = screen.getAllByRole('row')[1];
    expect(within(bodyRow).getAllByRole('cell')[0]).toHaveTextContent('—');
  });

  it('renders an empty table rather than nothing when there are no rows', () => {
    renderWithProviders(
      <CheckScaleSummaryTable rows={[]} checkScaleTypeDescriptions={descriptions} />,
    );

    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
  });
});
