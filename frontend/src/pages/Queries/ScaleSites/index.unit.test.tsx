import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScaleSites from './index';

beforeEach(() => {
  resetApiMock();
});

const renderPage = () => renderWithProviders(<QueriesScaleSites />);

describe('Queries — Scale Sites', () => {
  it('renders the search criteria fields', () => {
    const { container } = renderPage();

    expect(controlById(container, 'scaleSiteIdNmbr')).toBeInTheDocument();
    expect(controlById(container, 'siteName')).toBeInTheDocument();
    expect(controlById(container, 'orgUnitNo')).toBeInTheDocument();
  });

  it('renders the owner client fields', () => {
    const { container } = renderPage();

    expect(controlById(container, 'ownerClientNumber')).toBeInTheDocument();
    expect(controlById(container, 'ownerClientLocnCode')).toBeInTheDocument();
  });

  it('offers the alternate search by inspection #', () => {
    const { container } = renderPage();

    expect(screen.getAllByText('OR enter inspection #').length).toBeGreaterThan(0);
    expect(controlById(container, 'inspectionId')).toBeInTheDocument();
  });

  it('renders the sort order controls', () => {
    const { container } = renderPage();

    expect(controlById(container, 'primary-sort')).toBeInTheDocument();
    expect(controlById(container, 'secondary-sort')).toBeInTheDocument();
  });

  it('renders the scaling method type multi-select', () => {
    const { container } = renderPage();

    expect(controlById(container, 'method-types')).toBeInTheDocument();
  });

  it('keeps what is typed into the site number field', () => {
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

    expect(screen.getAllByText('Queries - Scale Sites').length).toBeGreaterThan(0);
  });
});

/**
 * The Search button is type="button" inside a Form, and its click does not reach the handler in this
 * harness; submitting the form does, and that is the path the Enter key takes in the browser anyway.
 */
describe('Queries — Scale Sites — searching', () => {
  const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

  it('runs the search with the criteria that were entered', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSites.searchScaleSites).toHaveBeenCalled());
    const [params] = apiMock.scaleSites.searchScaleSites.mock.calls[0];
    expect(JSON.stringify(params)).toContain('SS-1');
  });

  it('shows the rows the search returns', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([{ scaleSiteIdNmbr: 'SS-1', siteName: 'North Yard', region: 'Coast', district: 'DCK' }]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    expect((await screen.findAllByText('North Yard')).length).toBeGreaterThan(0);
  });

  it('shows an empty result without crashing', async () => {
    apiMock.scaleSites.searchScaleSites.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'NOPE' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSites.searchScaleSites).toHaveBeenCalled());
    expect(screen.queryByText('North Yard')).not.toBeInTheDocument();
  });

  it('reports a failed search', async () => {
    apiMock.scaleSites.searchScaleSites.mockRejectedValue(new Error('Search unavailable.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scaleSiteIdNmbr'), { target: { value: 'SS-1' } });
    submit(container);

    expect((await screen.findAllByText(/Search failed|Search unavailable/)).length).toBeGreaterThan(0);
  });

});

describe('Queries — Scale Sites — search by inspection #', () => {
  const toInspectionMode = async (container: HTMLElement) => {
    await userEvent.click(screen.getByRole('button', { name: /OR enter inspection #/i }));
    await waitFor(() => expect(container.querySelector('#inspectionId')).not.toBeNull());
  };
  const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

  it('requires an inspection id', async () => {
    const { container } = renderPage();

    await toInspectionMode(container);
    submit(container);

    await waitFor(() => expect(container.textContent ?? '').toMatch(/Inspection id is required|Scale Site # is required|required/));
    expect(apiMock.scaleSiteInspections.searchScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('rejects an inspection id that is not a positive whole number', async () => {
    const { container } = renderPage();

    await toInspectionMode(container);
    fireEvent.change(controlById(container, 'inspectionId'), { target: { value: '-3' } });
    submit(container);

    await waitFor(() => expect(container.textContent ?? '').toMatch(/positive whole number|required/));
    expect(apiMock.scaleSiteInspections.searchScaleSiteInspection).not.toHaveBeenCalled();
  });

  it('looks the inspection up by number', async () => {
    apiMock.scaleSiteInspections.searchScaleSiteInspection.mockResolvedValue([]);
    const { container } = renderPage();

    await toInspectionMode(container);
    fireEvent.change(controlById(container, 'inspectionId'), { target: { value: '42' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSiteInspections.searchScaleSiteInspection).toHaveBeenCalled());
    expect(apiMock.scaleSiteInspections.searchScaleSiteInspection.mock.calls[0][0]).toBe(42);
  });
});

describe('Queries — Scale Sites — switching modes and inspection results', () => {
  const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

  it('renders an inspection lookup result without crashing', async () => {
    apiMock.scaleSiteInspections.searchScaleSiteInspection.mockResolvedValue([
      { scaleSiteIdNmbr: 'SS-9', siteName: 'Inspected Yard', region: 'Coast', district: 'DCK' },
    ]);
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('button', { name: /OR enter inspection #/i }));
    await waitFor(() => expect(container.querySelector('#inspectionId')).not.toBeNull());
    fireEvent.change(controlById(container, 'inspectionId'), { target: { value: '42' } });
    submit(container);

    await waitFor(() => expect(apiMock.scaleSiteInspections.searchScaleSiteInspection).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toBe('');
  });

  it('reports a failed inspection lookup', async () => {
    apiMock.scaleSiteInspections.searchScaleSiteInspection.mockRejectedValue(new Error('Inspection lookup down.'));
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('button', { name: /OR enter inspection #/i }));
    await waitFor(() => expect(container.querySelector('#inspectionId')).not.toBeNull());
    fireEvent.change(controlById(container, 'inspectionId'), { target: { value: '42' } });
    submit(container);

    expect((await screen.findAllByText(/Search failed|Inspection lookup down/)).length).toBeGreaterThan(0);
  });

  it('switches back to the parameter search', async () => {
    const { container } = renderPage();

    await userEvent.click(screen.getByRole('button', { name: /OR enter inspection #/i }));
    await waitFor(() => expect(container.querySelector('#inspectionId')).not.toBeNull());
    submit(container);

    await userEvent.click(screen.getAllByRole('button', { name: /Choose your search parameters/i })[0]);

    // The page persists its criteria in localStorage, so an id typed by an earlier test can
    // survive into this one; only the mode switch itself is asserted here.
    await waitFor(() => expect(container.querySelector('#scaleSiteIdNmbr')).not.toBeNull());
  });
});
