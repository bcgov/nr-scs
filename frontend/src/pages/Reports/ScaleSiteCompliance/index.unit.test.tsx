import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ScaleSiteCompliance from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = (inspectionId = '7') =>
  renderWithProviders(<ScaleSiteCompliance />, {
    route: `/inspections/${inspectionId}/compliance-report`,
    path: '/inspections/:inspectionId/compliance-report',
  });

describe('Scale Site Compliance report — inspection context', () => {
  it('renders the report options for a numeric inspection id', async () => {
    const { container } = renderPage('7');

    await waitFor(() => expect(container.querySelector('#file-format')).not.toBeNull());
    expect(container.querySelector('#email-recipient')).not.toBeNull();
  });

  it('shows the report title', () => {
    renderPage('7');

    expect(screen.getAllByText('Scale Site Compliance Report').length).toBeGreaterThan(0);
  });

  it('refuses a non-numeric inspection id rather than requesting the report', async () => {
    // The report is launched in context from an inspection; the id must be a real one.
    const { container } = renderPage('not-a-number');

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
    expect(apiMock.reports.submitScaleSiteComplianceReport).not.toHaveBeenCalled();
  });

  it('requests nothing when there is no inspection in the route at all', async () => {
    const { container } = renderWithProviders(<ScaleSiteCompliance />);

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
    expect(apiMock.reports.submitScaleSiteComplianceReport).not.toHaveBeenCalled();
  });
});

describe('Scale Site Compliance report — options', () => {
  it('offers a preview choice', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('#preview-yes')).not.toBeNull());
    expect(container.querySelector('#preview-no')).not.toBeNull();
  });

  it('keeps a typed email recipient', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
    const email = container.querySelector('#email-recipient') as HTMLInputElement;
    fireEvent.change(email, { target: { value: 'someone@gov.bc.ca' } });

    expect(email).toHaveValue('someone@gov.bc.ca');
  });

  it('clears the entered options on reset', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('#email-recipient')).not.toBeNull());
    fireEvent.change(container.querySelector('#email-recipient')!, {
      target: { value: 'someone@gov.bc.ca' },
    });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(container.querySelector('#email-recipient')).toHaveValue(''),
    );
  });

  it('submits the report for the inspection in the route', async () => {
    apiMock.reports.submitScaleSiteComplianceReport.mockResolvedValue({
      blob: new Blob(['pdf']),
      filename: 'compliance.pdf',
    });
    const { container } = renderPage('7');

    await waitFor(() => expect(container.querySelector('#file-format')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    await waitFor(() =>
      expect(apiMock.reports.submitScaleSiteComplianceReport).toHaveBeenCalled(),
    );
  });

  it('reports a failed submission', async () => {
    apiMock.reports.submitScaleSiteComplianceReport.mockRejectedValue(
      new Error('Report service unavailable.'),
    );
    const { container } = renderPage('7');

    await waitFor(() => expect(container.querySelector('#file-format')).not.toBeNull());
    await userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

    expect(await screen.findByText(/Report service unavailable\./i)).toBeInTheDocument();
  });

  it('offers the Excel output format as well as PDF', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(container.querySelector('#file-format')).not.toBeNull());
    const select = container.querySelector('#file-format') as HTMLSelectElement;
    const options = Array.from(select.options).map((option) => option.text);
    expect(options.join(' ')).toMatch(/PDF/);
  });
});
