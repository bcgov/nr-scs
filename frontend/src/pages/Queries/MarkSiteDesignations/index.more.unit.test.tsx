import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

// useSearchParams navigates through useNavigate, so the spy must forward to the real one or the
// URL param that drives the query never changes.
const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => {
      const real = actual.useNavigate();
      return (...args: Parameters<typeof real>) => {
        navigate(...args);
        return (real as (...a: unknown[]) => void)(...args);
      };
    },
  };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesMarkSiteDesignations from './index';

const search = () => apiMock.markSiteDesignation.searchMarkSiteDesignationsByTimberMark;

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  search().mockResolvedValue([{ haulingMarkAuthorizationId: 9, timberMark: 'TM1234', markHolderName: 'Acme' }] as never);
});

const renderPage = (route = '/') => renderWithProviders(<QueriesMarkSiteDesignations />, { route });
const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

describe('Queries — Mark Site Designations — more', () => {
  it('upper-cases what is typed and forgets a complaint once corrected', async () => {
    const { container } = renderPage();

    submit(container);
    expect((await screen.findAllByText('Timber Mark is required.')).length).toBeGreaterThan(0);

    fireEvent.change(controlById(container, 'timberMark'), { target: { value: 'tm12' } });
    expect(controlById(container, 'timberMark')).toHaveValue('TM12');
    expect(screen.queryByText('Timber Mark is required.')).not.toBeInTheDocument();

    submit(container);
    await waitFor(() => expect(search()).toHaveBeenCalledWith('TM12', expect.anything()));
  });

  it('remembers the searched mark for the next visit', async () => {
    const first = renderPage('/?timberMark=TM1234');
    await waitFor(() => expect(search()).toHaveBeenCalledWith('TM1234', expect.anything()));
    first.unmount();
    search().mockClear();

    renderPage();

    // The remembered mark is pushed back into the URL, which re-runs the search.
    await waitFor(() => expect(search()).toHaveBeenCalledWith('TM1234', expect.anything()));
  });

  it('offers to create a designation once a search has run', async () => {
    renderPage('/?timberMark=TM1234');

    fireEvent.click(await screen.findByRole('button', { name: /Create MSD/i }));

    expect(navigate).toHaveBeenCalledWith('/mark-site-designations/create');
  });
});
