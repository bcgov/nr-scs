import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScalerRiskAssessments from './index';

const search = () => apiMock.scalerRiskAssessments.searchScalerRiskAssessments;

beforeEach(() => {
  resetApiMock();
  sessionStorage.clear();
  apiMock.lov.getStaticLov.mockImplementation(async ({ tableKey }: { tableKey: string }) =>
    tableKey === 'SCALER_LICENCE_TYPE_CODE'
      ? [{ code: 'SCS', description: 'Scaling' }, { code: '', description: 'Blank' }, { code: 'WA' }]
      : [{ code: 'H', description: 'High' }],
  );
});

const renderPage = () => renderWithProviders(<QueriesScalerRiskAssessments />);
const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);
const searchFor = (container: HTMLElement, licence: string) => {
  fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: licence } });
  submit(container);
};

describe('Queries — Scaler Risk Assessments — more', () => {
  // useLovOptions caches a LOV module-wide after its first success, so the option check runs first.
  it('offers only the licence types that have a code', async () => {
    const { container } = renderPage();
    const select = controlById<HTMLSelectElement>(container, 'scalerLicenceTypeCode');

    await waitFor(() => expect(select.options.length).toBeGreaterThan(1));
    const texts = Array.from(select.options).map((o) => o.textContent);
    expect(texts).toContain('Scaling');
    expect(texts).not.toContain('Blank');
  });

  it('treats a reply that is not a list as no rows', async () => {
    search().mockResolvedValue({ unexpected: true } as never);
    const { container } = renderPage();

    searchFor(container, 'S1');

    await waitFor(() => expect(search()).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelectorAll('tbody tr td').length).toBeLessThanOrEqual(1));
  });

  it('lets a failed search be dismissed', async () => {
    search().mockRejectedValue(new Error('Search exploded.'));
    const { container } = renderPage();

    searchFor(container, 'S1');
    await screen.findAllByText(/Search failed|Search exploded/);

    fireEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);

    await waitFor(() => expect(screen.queryByText(/Search exploded/)).not.toBeInTheDocument());
  });

  it('runs the search with the licence number after a licence type is chosen', async () => {
    search().mockResolvedValue([]);
    const { container } = renderPage();
    const select = controlById<HTMLSelectElement>(container, 'scalerLicenceTypeCode');
    await waitFor(() => expect(select.options.length).toBeGreaterThan(1));

    fireEvent.change(select, { target: { value: 'SCS' } });
    searchFor(container, 'S1');

    await waitFor(() => expect(search()).toHaveBeenCalled());
    expect(search().mock.calls[0][0]).toMatchObject({ scalerLicenceNo: 'S1' });
  });
});
