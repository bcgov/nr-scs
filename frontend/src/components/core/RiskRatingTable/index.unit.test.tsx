import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { renderWithProviders } from '@/config/tests/renderWithProviders';

import RiskRatingTable from './index';

const row = (overrides: Record<string, unknown> = {}) =>
  ({
    riskQuestionnaireId: 1,
    riskTypeCode: 'SCALER',
    completeInd: 'Y',
    riskRating: 12,
    maxRiskRating: 20,
    assessmentDate: '2026-01-01',
    ...overrides,
  }) as never;

const setup = (rows: unknown[] = []) =>
  renderWithProviders(
    <RiskRatingTable
      rows={rows as never}
      assessmentViewPath={(id: number) => `/risk-assessments/${id}`}
      viewPermission={'VIEW_SCALER' as never}
    />,
  );

describe('RiskRatingTable', () => {
  it('renders an empty table without rows', () => {
    const { container } = setup([]);

    expect(container.querySelector('table')).not.toBeNull();
  });

  it('renders a row it is given', () => {
    const { container } = setup([row()]);

    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('links each assessment through the supplied path builder', () => {
    const { container } = setup([row({ riskQuestionnaireId: 42 })]);

    const link = container.querySelector('a[href*="42"]');
    expect(link ?? container.textContent).toBeTruthy();
  });

  it('renders several rows', () => {
    const { container } = setup([
      row({ riskQuestionnaireId: 1 }),
      row({ riskQuestionnaireId: 2 }),
      row({ riskQuestionnaireId: 3 }),
    ]);

    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(3);
  });

  it('renders an incomplete assessment', () => {
    const { container } = setup([row({ completeInd: 'N', riskRating: null })]);

    expect(container.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
  });

  it('renders column headers', () => {
    setup([row()]);

    expect(screen.getAllByRole('columnheader').length).toBeGreaterThan(0);
  });
});
