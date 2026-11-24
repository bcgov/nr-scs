import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewCheckScale from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.checkScale.getCheckScale.mockResolvedValue({
    checkScaleId: 5,
    checkScaleTypeCode: 'F',
    checkScalerLicenceNo: 'C1234',
    originalScalerLicenceNo: 'O1234',
    timberMark: 'TM1234',
    scaleSiteIdNmbr: 'SS-1',
    speciesSummary: [],
  });
});

const renderPage = () => renderWithProviders(<ViewCheckScale />, { route: '/check-scales/5', path: '/check-scales/:checkScaleId' });
const loaded = async () => waitFor(() => expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument());
// Both are Carbon danger buttons, whose accessible names carry a hidden "danger" prefix.
const pageDelete = () => screen.getByRole('button', { name: /^danger Delete$/ });
const confirmDelete = () => screen.getByRole('button', { name: /Confirm Delete$/ });

describe('View Check Scale — deleting', () => {
  it('deletes on confirmation and goes back', async () => {
    apiMock.checkScale.deleteCheckScale.mockResolvedValue(undefined);
    renderPage();
    await loaded();

    await userEvent.click(pageDelete());
    await userEvent.click(confirmDelete());

    await waitFor(() => expect(apiMock.checkScale.deleteCheckScale).toHaveBeenCalled());
    expect(String(apiMock.checkScale.deleteCheckScale.mock.calls[0][0])).toBe('5');
    await waitFor(() => expect(navigate).toHaveBeenCalledWith(-1));
  });

  it('reports a refused delete and lets the message be dismissed', async () => {
    apiMock.checkScale.deleteCheckScale.mockRejectedValue(new Error('Still referenced.'));
    renderPage();
    await loaded();

    await userEvent.click(pageDelete());
    await userEvent.click(confirmDelete());

    expect((await screen.findAllByText('Delete failed')).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
    await userEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);
    await waitFor(() => expect(screen.queryByText('Delete failed')).not.toBeInTheDocument());
  });

  it('still renders when the code lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('LOV down'));
    renderPage();

    await loaded();
    expect(apiMock.lov.getStaticLov).toHaveBeenCalled();
  });
});
