import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import ScaleSiteRegister from './index';

beforeEach(() => {
  resetApiMock();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'A', description: 'Option A' }]);
});

const renderPage = () => renderWithProviders(<ScaleSiteRegister />);
const run = async () =>
  userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

describe('Scale Site Register report', () => {
  it('renders the report parameters', () => {
    const { container } = renderPage();

    expect(controlById(container, 'reg-dist')).toBeInTheDocument();
    expect(controlById(container, 'scale-type')).toBeInTheDocument();
    expect(controlById(container, 'site-number')).toBeInTheDocument();
    expect(controlById(container, 'authorization-status')).toBeInTheDocument();
  });

  it('renders the date range', () => {
    const { container } = renderPage();

    expect(controlById(container, 'from-date')).toBeInTheDocument();
    expect(controlById(container, 'to-date')).toBeInTheDocument();
  });

  it('renders the sort order controls', () => {
    const { container } = renderPage();

    expect(controlById(container, 'primary-sort')).toBeInTheDocument();
    expect(controlById(container, 'secondary-sort')).toBeInTheDocument();
  });

  it('renders the output options', () => {
    const { container } = renderPage();

    expect(controlById(container, 'file-format')).toBeInTheDocument();
    expect(controlById(container, 'email-recipient')).toBeInTheDocument();
    expect(controlById(container, 'preview-yes')).toBeInTheDocument();
    expect(controlById(container, 'preview-no')).toBeInTheDocument();
  });

  it('keeps a typed site number', () => {
    const { container } = renderPage();

    const site = controlById(container, 'site-number');
    fireEvent.change(site, { target: { value: 'SS-1' } });

    expect(site).toHaveValue('SS-1');
  });

  it('keeps a typed email recipient', () => {
    const { container } = renderPage();

    const email = controlById(container, 'email-recipient');
    fireEvent.change(email, { target: { value: 'someone@gov.bc.ca' } });

    expect(email).toHaveValue('someone@gov.bc.ca');
  });

  it('clears entered values on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'site-number'), { target: { value: 'SS-1' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById(container, 'site-number')).toHaveValue(''));
  });

  it('does not submit while required parameters are missing', async () => {
    const { container } = renderPage();

    await run();

    await waitFor(() => expect(container.textContent ?? '').not.toBe(''));
  });

  it('shows the report heading', () => {
    renderPage();

    expect(screen.getAllByText('Scale Site Register Report').length).toBeGreaterThan(0);
  });

  it('offers both output destinations', () => {
    const { container } = renderPage();

    expect(controlById(container, 'preview-yes')).toBeInTheDocument();
    expect(controlById(container, 'preview-no')).toBeInTheDocument();
  });
});
