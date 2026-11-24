import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScaleSiteRiskAssessments from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = () => renderWithProviders(<QueriesScaleSiteRiskAssessments />);

describe('Queries — Scale Site Risk Assessments', () => {
  it('renders the risk assessment criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'riskQuestionnaireId')).toBeInTheDocument();
    expect(controlById(container, 'riskTypeCode')).toBeInTheDocument();
    expect(controlById(container, 'completeInd')).toBeInTheDocument();
  });

  it('renders the scale site criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'scaleSiteIdNmbr')).toBeInTheDocument();
    expect(controlById(container, 'siteName')).toBeInTheDocument();
    expect(controlById(container, 'orgUnitNo')).toBeInTheDocument();
  });

  it('renders the owner client criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'ownerClientNumber')).toBeInTheDocument();
    expect(controlById(container, 'ownerClientLocnCode')).toBeInTheDocument();
  });

  it('renders the scaling method multi-select', () => {
    const { container } = renderPage();

    expect(controlById(container, 'method-types')).toBeInTheDocument();
  });

  it('renders the sort order controls', () => {
    const { container } = renderPage();

    expect(controlById(container, 'primary-sort')).toBeInTheDocument();
    expect(controlById(container, 'secondary-sort')).toBeInTheDocument();
  });

  it('offers Search and Reset', () => {
    renderPage();

    expect(screen.getAllByRole('button', { name: /^Search$/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Reset$/i }).length).toBeGreaterThan(0);
  });

  it('keeps a typed site number', () => {
    const { container } = renderPage();

    const site = controlById(container, 'scaleSiteIdNmbr');
    fireEvent.change(site, { target: { value: 'SS-1' } });

    expect(site).toHaveValue('SS-1');
  });

  it('clears the criteria on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'siteName'), { target: { value: 'North Yard' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Reset$/i })[0]);

    await waitFor(() => expect(controlById(container, 'siteName')).toHaveValue(''));
  });

  it('shows the page heading', () => {
    renderPage();

    expect(screen.getAllByText('Queries - Scale Site Risk Assessment').length).toBeGreaterThan(0);
  });
});

/**
 * The Search button is type="button" inside a Form, and its click does not reach the handler in this
 * harness; submitting the form does, and that is the path the Enter key takes in the browser anyway.
 */
describe('Queries — Scale Site Risk Assessments — searching', () => {
  const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

  it('runs the search with the criteria that were entered', async () => {
    apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments).toHaveBeenCalled());
    const [params] = apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments.mock.calls[0];
    expect(JSON.stringify(params)).toContain('SS-1');
  });

  it('shows the rows the search returns', async () => {
    apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments.mockResolvedValue([{ riskQuestionnaireId: 5151, scaleSiteIdNmbr: 'SS-1', level: 'Low', version: 2 }]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    expect((await screen.findAllByText(/5151/)).length).toBeGreaterThan(0);
  });

  it('shows an empty result without crashing', async () => {
    apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'NOPE' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments).toHaveBeenCalled());
    expect(screen.queryByText(/5151/)).not.toBeInTheDocument();
  });

  it('reports a failed search', async () => {
    apiMock.scaleSiteRiskAssessments.searchScaleSiteRiskAssessments.mockRejectedValue(new Error('Search unavailable.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    expect((await screen.findAllByText(/Search failed|Search unavailable/)).length).toBeGreaterThan(0);
  });

});
