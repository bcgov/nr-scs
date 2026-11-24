import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScaleSites from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  // The page persists its criteria; the LOV hook caches in sessionStorage.
  localStorage.clear();
  sessionStorage.clear();
  apiMock.lov.getScaleMethodTypeLov.mockResolvedValue([
    { code: 'WT', description: 'Weight' },
    { code: '', description: 'No code' },
    { code: 'NC' },
    { code: ' PC ', description: ' Piece ' },
  ]);
});

const renderPage = () => renderWithProviders(<QueriesScaleSites />);
const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);
const toInspectionMode = async (container: HTMLElement) => {
  await userEvent.click(screen.getByRole('button', { name: /OR enter inspection #/i }));
  await waitFor(() => expect(container.querySelector('#inspectionId')).not.toBeNull());
};
const lookup = () => apiMock.scaleSiteInspections.searchScaleSiteInspection;

describe('Queries — Scale Sites — site types', () => {
  // useLovOptions caches a LOV module-wide (and in sessionStorage) after its first success, so
  // these two run before any other render in this file: the failure first (a failure is not
  // cached), then the one that inspects the options.
  it('reports a failed site type lookup', async () => {
    apiMock.lov.getScaleMethodTypeLov.mockRejectedValue(new Error('LOV down'));
    renderPage();

    expect((await screen.findAllByText('Could not load site types')).length).toBeGreaterThan(0);
  });

  it('sends no site types when none are chosen', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSites.searchScaleSites).toHaveBeenCalled());
    expect(apiMock.scaleSites.searchScaleSites.mock.calls[0][0].methodTypes).toBeUndefined();
  });

  it('offers only the site types that have both a code and a description', async () => {
    const { container } = renderPage();

    // The LOV is already cached by the earlier render in this file.
    fireEvent.click(container.querySelector('#method-types-toggle-button')!);
    const menu = container.querySelector('#method-types__menu') as HTMLElement;
    await waitFor(() => expect(menu.textContent).toContain('Weight'));

    expect(menu.textContent).toContain('Piece');
    expect(menu.textContent).not.toContain('No code');
    expect(menu.querySelectorAll('[role="option"]').length).toBe(2);
  });
});

describe('Queries — Scale Sites — inspection lookup replies', () => {
  const lookUp = async (container: HTMLElement) => {
    await toInspectionMode(container);
    fireEvent.change(controlById(container, 'inspectionId'), { target: { value: '42' } });
    submit(container);
    await waitFor(() => expect(lookup()).toHaveBeenCalled());
  };

  it('opens the inspection it finds', async () => {
    lookup().mockResolvedValue({ inspectionId: 5, scaleSiteIdNmbr: 'SS/9' });
    const { container } = renderPage();

    await lookUp(container);

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/scale-sites/SS%2F9/inspections/view/5'));
  });

  it('complains when the reply carries no inspection id', async () => {
    lookup().mockResolvedValue({ scaleSiteIdNmbr: 'SS-9' });
    const { container } = renderPage();

    await lookUp(container);

    expect((await screen.findAllByText('Inspection search did not return an inspection id.')).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('complains when the reply carries no scale site number', async () => {
    lookup().mockResolvedValue({ inspectionId: 5 });
    const { container } = renderPage();

    await lookUp(container);

    expect((await screen.findAllByText('Inspection search did not return a scale site number.')).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalled();
  });
});

describe('Queries — Scale Sites — results and criteria', () => {
  it('shows the owner as client/location, however much of it is known', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([
      { scaleSiteIdNmbr: 'SS-1', siteName: 'Both', ownerClientNumber: '00012345', ownerClientLocnCode: '01' },
      { scaleSiteIdNmbr: 'SS-2', siteName: 'Number only', ownerClientNumber: '00099999' },
      { scaleSiteIdNmbr: 'SS-3', siteName: 'Location only', ownerClientLocnCode: '02' },
      { scaleSiteIdNmbr: 'SS-4', siteName: 'Neither' },
    ]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS' } });
    submit(container);

    expect((await screen.findAllByText('00012345/01')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('00099999/').length).toBeGreaterThan(0);
    expect(screen.getAllByText('/02').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Neither').length).toBeGreaterThan(0);
  });

  it('lets a failed search be dismissed', async () => {
    apiMock.scaleSites.searchScaleSites.mockRejectedValue(new Error('Search exploded.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);
    await screen.findAllByText('Search failed');

    await userEvent.click(screen.getAllByRole('button', { name: /close notification/i })[0]);

    await waitFor(() => expect(screen.queryByText('Search failed')).not.toBeInTheDocument());
  });
});
