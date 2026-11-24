import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScaleSiteRiskAssessments from './index';

const search = () => apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments;

beforeEach(() => {
  resetApiMock();
  sessionStorage.clear();
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([
    { code: 'WT', description: 'Weight' },
    { code: '', description: 'No code' },
    { code: 'NC' },
  ]);
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'H', description: 'High' }]);
});

const renderPage = () => renderWithProviders(<QueriesScaleSiteRiskAssessments />);
const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);
const searchFor = (container: HTMLElement, site: string) => {
  fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: site } });
  submit(container);
};

// useLovOptions caches a LOV module-wide after its first success, so this runs first.
describe('Queries — Risk Assessments — lookups', () => {
  it('offers only the site types that have both a code and a description', async () => {
    const { container } = renderPage();

    // The picker stays disabled until both lookups have landed.
    await waitFor(() => expect(container.querySelector('#method-types-input')).not.toBeDisabled());
    fireEvent.click(container.querySelector('#method-types-toggle-button')!);
    const menu = container.querySelector('#method-types__menu') as HTMLElement;
    await waitFor(() => expect(menu.textContent).toContain('Weight'));

    expect(menu.querySelectorAll('[role="option"]').length).toBe(1);
  });
});

describe('Queries — Risk Assessments — results', () => {
  it('shows the owner as client / location for every combination', async () => {
    search().mockResolvedValue([
      { riskQuestionnaireId: 1, scaleSiteIdNmbr: 'SS-1', ownerClientNumber: '00012345', ownerClientLocnCode: '01' },
      { riskQuestionnaireId: 2, scaleSiteIdNmbr: 'SS-2', ownerClientNumber: '00099999' },
      { riskQuestionnaireId: 3, scaleSiteIdNmbr: 'SS-3', ownerClientLocnCode: '02' },
      { riskQuestionnaireId: 4, scaleSiteIdNmbr: 'SS-4' },
    ] as never);
    const { container } = renderPage();

    searchFor(container, 'SS');

    expect((await screen.findAllByText('00012345 / 01')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('00099999 /').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/ 02').length).toBeGreaterThan(0);
    expect(screen.getAllByText('SS-4').length).toBeGreaterThan(0);
  });

  it('treats a reply that is not a list as no rows', async () => {
    search().mockResolvedValue({ unexpected: true } as never);
    const { container } = renderPage();

    searchFor(container, 'SS-1');

    await waitFor(() => expect(search()).toHaveBeenCalled());
    await waitFor(() => expect(container.querySelectorAll('tbody tr td').length).toBeLessThanOrEqual(1));
  });

  it('lets a failed search be dismissed', async () => {
    search().mockRejectedValue(new Error('Search exploded.'));
    const { container } = renderPage();

    searchFor(container, 'SS-1');
    await screen.findAllByText(/Search failed|Search exploded/);

    fireEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);

    await waitFor(() => expect(screen.queryByText(/Search exploded/)).not.toBeInTheDocument());
  });
});
