import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

// The restricted client comes from the active-client hook rather than the auth user.
vi.mock('@/context/activeClient/useActiveClient', async () => {
  const actual = await vi.importActual<Record<string, unknown>>('@/context/activeClient/useActiveClient');
  return { ...actual, useActiveClient: () => ({ activeClient: '00012345' }) };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScalers from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  sessionStorage.clear();
  apiMock.lov.getAppointmentTypeLov.mockResolvedValue([
    { code: 'O', description: 'Official' },
    { code: '', description: 'Blank code' },
    { description: 'No code' },
  ] as never);
  apiMock.lov.getScalerTrainingTypeLov.mockResolvedValue([{ code: '1', description: 'Basic' }, { code: '', description: 'Blank' }] as never);
});

const renderPage = (options: Record<string, unknown> = {}) => renderWithProviders(<QueriesScalers />, options);
const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);
const optionTexts = (container: HTMLElement, id: string) =>
  Array.from(controlById<HTMLSelectElement>(container, id).options).map((o) => o.textContent);

// useLovOptions caches each LOV module-wide after its first success, so the option checks run first.
describe('Queries — Scalers — lookups', () => {
  it('offers only appointment and training types that have a code', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(optionTexts(container, 'scalerAppointmentType')).toContain('Official'));
    expect(optionTexts(container, 'scalerAppointmentType')).not.toContain('Blank code');
    expect(optionTexts(container, 'scalerAppointmentType')).not.toContain('No code');
    await waitFor(() => expect(optionTexts(container, 'scalarTrainingType')).toContain('Basic'));
    expect(optionTexts(container, 'scalarTrainingType')).not.toContain('Blank');
  });
});

describe('Queries — Scalers — a client-restricted user', () => {
  it('is pinned to their own client and offered no client search', async () => {
    const { container } = renderPage({ roles: ['SCS_INDUSTRY_SCALER'], clientNumbers: ['00012345'] });

    await waitFor(() => expect(controlById(container, 'clientNumber')).toHaveValue('00012345'));
  });
});

describe('Queries — Scalers — after a search', () => {
  it('lets a failed search be dismissed', async () => {
    apiMock.scalers.searchScalers.mockRejectedValue(new Error('Search exploded.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1' } });
    submit(container);
    await screen.findAllByText('Search failed');

    fireEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);

    await waitFor(() => expect(screen.queryByText('Search failed')).not.toBeInTheDocument());
  });

  it('offers to create a scaler once a search has run', async () => {
    apiMock.scalers.searchScalers.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1' } });
    submit(container);

    fireEvent.click(await screen.findByRole('button', { name: /Create Scaler/i }));
    expect(navigate).toHaveBeenCalledWith('/scalers/create');
  });
});
