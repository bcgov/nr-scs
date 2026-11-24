import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderWithProviders } from '@/config/tests/renderWithProviders';
import type { SummaryCheckScaleRow } from '@/services/summaryCheckScales.service';

import SummaryCheckScaleListTable from './index';

const rows: SummaryCheckScaleRow[] = [
  {
    checkScaleId: 77,
    ckscType: 'SLT',
    primOrigLicenceNo: 'A1',
    primCheckLicenceNo: 'B1',
    origScaleDate: '2026-02-01',
    checkScaleDate: '2026-02-03',
    pieceDiff: 1,
    volumeVariance: 0,
    valueVariance: 0,
    replacedInd: 'N',
    checkScaleTypeCode: 'FUL',
    followedGoodPracticeInd: 'Y',
    originalWithinStandardInd: 'N',
  },
];

const drilldownState = { backTo: '/scalers/view/123?tab=summary', scalerName: 'Test Scaler' };
const descriptions = new Map([['FUL', 'Full Scale']]);

describe('SummaryCheckScaleListTable', () => {
  it('shows Summary Type and omits the secondary licence columns', () => {
    renderWithProviders(
      <SummaryCheckScaleListTable
        rows={rows}
        checkScaleTypeDescriptions={descriptions}
        drilldownState={drilldownState}
      />,
    );

    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent?.trim());

    expect(headers).toEqual([
      'Check Scale #',
      'Primary Licence #',
      'Primary Check Licence #',
      'Summary Type',
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
    expect(headers).not.toContain('Secondary Licence #');
  });

  it('drills down to the summary update screen, not the check scale view', () => {
    renderWithProviders(
      <SummaryCheckScaleListTable
        rows={rows}
        checkScaleTypeDescriptions={descriptions}
        drilldownState={drilldownState}
      />,
    );

    expect(screen.getByRole('link', { name: '77' })).toHaveAttribute(
      'href',
      '/summary-check-scales/77/edit',
    );
  });

  it('renders the summary type value', () => {
    renderWithProviders(
      <SummaryCheckScaleListTable
        rows={rows}
        checkScaleTypeDescriptions={descriptions}
        drilldownState={drilldownState}
      />,
    );

    expect(screen.getByText('SLT')).toBeInTheDocument();
  });

  it('falls back to an em dash for a row with no check scale id', () => {
    renderWithProviders(
      <SummaryCheckScaleListTable
        rows={[{ ...rows[0], checkScaleId: null }]}
        checkScaleTypeDescriptions={descriptions}
        drilldownState={drilldownState}
      />,
    );

    expect(screen.queryByRole('link', { name: '77' })).not.toBeInTheDocument();
  });
});
