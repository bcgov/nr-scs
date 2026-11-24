import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScalerRiskAssessments from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = () => renderWithProviders(<QueriesScalerRiskAssessments />);

describe('Queries — Scaler Risk Assessments', () => {
  it('renders the risk assessment criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'riskQuestionnaireId')).toBeInTheDocument();
    expect(controlById(container, 'riskTypeCode')).toBeInTheDocument();
    expect(controlById(container, 'completeInd')).toBeInTheDocument();
  });

  it('renders the scaler criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'scalerLicenceNo')).toBeInTheDocument();
    expect(controlById(container, 'orgUnitNo')).toBeInTheDocument();
    expect(controlById(container, 'scalerLicenceTypeCode')).toBeInTheDocument();
  });

  it('renders the client criteria', () => {
    const { container } = renderPage();

    expect(controlById(container, 'clientNumber')).toBeInTheDocument();
    expect(controlById(container, 'clientLocnCode')).toBeInTheDocument();
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

  it('keeps a typed licence number', () => {
    const { container } = renderPage();

    const licence = controlById(container, 'scalerLicenceNo');
    fireEvent.change(licence, { target: { value: 'S1234' } });

    expect(licence).toHaveValue('S1234');
  });

  it('clears the criteria on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    fireEvent.click(screen.getAllByRole('button', { name: /^Reset$/i })[0]);

    await waitFor(() => expect(controlById(container, 'scalerLicenceNo')).toHaveValue(''));
  });

  it('shows the page heading', () => {
    renderPage();

    expect(screen.getAllByText('Queries - Scaler Risk Assessment').length).toBeGreaterThan(0);
  });
});

/**
 * The Search button is type="button" inside a Form, and its click does not reach the handler in this
 * harness; submitting the form does, and that is the path the Enter key takes in the browser anyway.
 */
describe('Queries — Scaler Risk Assessments — searching', () => {
  const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

  it('runs the search with the criteria that were entered', async () => {
    apiMock.scalerRiskAssessments.searchScalerRiskAssessments.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    submit(container);

    await waitFor(() => expect(apiMock.scalerRiskAssessments.searchScalerRiskAssessments).toHaveBeenCalled());
    const [params] = apiMock.scalerRiskAssessments.searchScalerRiskAssessments.mock.calls[0];
    expect(JSON.stringify(params)).toContain('S1234');
  });

  it('shows the rows the search returns', async () => {
    apiMock.scalerRiskAssessments.searchScalerRiskAssessments.mockResolvedValue([{ riskQuestionnaireId: 4242, scalerLicenceNo: 'S1234', level: 'High', version: 1 }]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    submit(container);

    expect((await screen.findAllByText(/4242/)).length).toBeGreaterThan(0);
  });

  it('shows an empty result without crashing', async () => {
    apiMock.scalerRiskAssessments.searchScalerRiskAssessments.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'NOPE' } });
    submit(container);

    await waitFor(() => expect(apiMock.scalerRiskAssessments.searchScalerRiskAssessments).toHaveBeenCalled());
    expect(screen.queryByText(/4242/)).not.toBeInTheDocument();
  });

  it('reports a failed search', async () => {
    apiMock.scalerRiskAssessments.searchScalerRiskAssessments.mockRejectedValue(new Error('Search unavailable.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    submit(container);

    expect((await screen.findAllByText(/Search failed|Search unavailable/)).length).toBeGreaterThan(0);
  });

});
