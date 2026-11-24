import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import QueriesScalers from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
});

const renderPage = () => renderWithProviders(<QueriesScalers />);

/**
 * The page keeps a client-search modal mounted, which puts `cds--body--with-modal-open` on the
 * body; userEvent refuses to click through that, so this file drives the DOM with fireEvent.
 */
describe('Queries — Scalers', () => {
  it('renders the search criteria fields', () => {
    const { container } = renderPage();

    expect(controlById(container, 'scalerLicenceNo')).toBeInTheDocument();
    expect(controlById(container, 'legalFirstName')).toBeInTheDocument();
    expect(controlById(container, 'clientName')).toBeInTheDocument();
    expect(controlById(container, 'orgUnitNo')).toBeInTheDocument();
  });

  it('offers both the parameter search and the check scale # search', () => {
    renderPage();

    // The embedded client query contributes a second panel with the same heading.
    expect(screen.getAllByText('Choose your search parameters.').length).toBeGreaterThan(0);
    expect(screen.getAllByText('OR enter check scale #').length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /^Search$/i }).length).toBeGreaterThan(1);
  });

  it('renders the sort order controls', () => {
    const { container } = renderPage();

    expect(controlById(container, 'primary-sort')).toBeInTheDocument();
    expect(controlById(container, 'secondary-sort')).toBeInTheDocument();
  });

  it('keeps what is typed into the licence field', () => {
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

  it('renders the check scale # field for the alternate search', () => {
    const { container } = renderPage();

    expect(controlById(container, 'checkScaleIdDisplay')).toBeInTheDocument();
  });

  it('shows the page title', () => {
    renderPage();

    expect(screen.getAllByText('Queries - Scalers').length).toBeGreaterThan(0);
  });
});

/**
 * The Search button is type="button" inside a Form, and its click does not reach the handler in this
 * harness; submitting the form does, and that is the path the Enter key takes in the browser anyway.
 */
describe('Queries — Scalers — searching', () => {
  const submit = (container: HTMLElement) => fireEvent.submit(container.querySelector('form')!);

  it('runs the search with the criteria that were entered', async () => {
    apiMock.scalers.searchScalers.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    submit(container);

    await waitFor(() => expect(apiMock.scalers.searchScalers).toHaveBeenCalled());
    const [params] = apiMock.scalers.searchScalers.mock.calls[0];
    expect(JSON.stringify(params)).toContain('S1234');
  });

  it('shows the rows the search returns', async () => {
    apiMock.scalers.searchScalers.mockResolvedValue([{ scalerLicenceNo: 'S1234', clientName: 'Acme Forestry', legalFirstName: 'Jane', legalLastName: 'Smith', orgUnitName: 'DCK' }]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    submit(container);

    expect((await screen.findAllByText('Acme Forestry')).length).toBeGreaterThan(0);
  });

  it('shows an empty result without crashing', async () => {
    apiMock.scalers.searchScalers.mockResolvedValue([]);
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'NOPE' } });
    submit(container);

    await waitFor(() => expect(apiMock.scalers.searchScalers).toHaveBeenCalled());
    expect(screen.queryByText('Acme Forestry')).not.toBeInTheDocument();
  });

  it('reports a failed search', async () => {
    apiMock.scalers.searchScalers.mockRejectedValue(new Error('Search unavailable.'));
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'scalerLicenceNo'), { target: { value: 'S1234' } });
    submit(container);

    expect((await screen.findAllByText(/Search failed|Search unavailable/)).length).toBeGreaterThan(0);
  });

});

describe('Queries — Scalers — search by check scale #', () => {
  const searchByCheckScale = async (value: string) => {
    const view = renderPage();
    const { container } = view;
    fireEvent.click(screen.getByRole('button', { name: /OR enter check scale #/i }));
    await waitFor(() => expect(container.querySelector('#checkScaleIdDisplay')).not.toBeNull());
    fireEvent.change(controlById(container, 'checkScaleIdDisplay'), { target: { name: 'checkScaleIdDisplay', value } });
    fireEvent.submit(container.querySelector('form')!);
    return view;
  };

  it('opens the check scale when the number matches a record', async () => {
    apiMock.checkScale.findCheckScale.mockResolvedValue({ checkScaleId: 42 });

    await searchByCheckScale('42');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/check-scales/view/42'));
    expect(apiMock.checkScale.findCheckScale).toHaveBeenCalledWith('42', expect.anything());
  });

  it('trims the entry and routes by the record id, not the typed text', async () => {
    apiMock.checkScale.findCheckScale.mockResolvedValue({ checkScaleId: 42 });

    await searchByCheckScale(' 0042 ');

    await waitFor(() => expect(navigate).toHaveBeenCalledWith('/check-scales/view/42'));
    expect(apiMock.checkScale.findCheckScale).toHaveBeenCalledWith('0042', expect.anything());
  });

  it('shows "No records were found." on the field and stays put when no check scale has that number', async () => {
    apiMock.checkScale.findCheckScale.mockResolvedValue(null);

    await searchByCheckScale('123');

    expect(await screen.findByText('No records were found.')).toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows "Check Scale # must be a number." without looking anything up for a non-numeric entry', async () => {
    await searchByCheckScale('ABC');

    expect(await screen.findByText('Check Scale # must be a number.')).toBeInTheDocument();
    expect(apiMock.checkScale.findCheckScale).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('clears the field error on Reset', async () => {
    const { container } = await searchByCheckScale('ABC');
    await screen.findByText('Check Scale # must be a number.');

    // The embedded client picker has its own Reset; use the page's action row.
    fireEvent.click(within(container.querySelector<HTMLElement>('.scaler-search__actions')!).getByRole('button', { name: 'Reset' }));

    await waitFor(() => expect(screen.queryByText('Check Scale # must be a number.')).not.toBeInTheDocument());
  });

  it('clears the field error once the number is edited', async () => {
    const { container } = await searchByCheckScale('ABC');
    await screen.findByText('Check Scale # must be a number.');

    fireEvent.change(controlById(container, 'checkScaleIdDisplay'), { target: { name: 'checkScaleIdDisplay', value: '1' } });

    expect(screen.queryByText('Check Scale # must be a number.')).not.toBeInTheDocument();
  });

  it('reports a failed lookup in the error banner rather than as a missing record', async () => {
    apiMock.checkScale.findCheckScale.mockRejectedValue(new Error('Network Error'));

    await searchByCheckScale('42');

    expect(await screen.findByText('Network Error')).toBeInTheDocument();
    expect(screen.queryByText('No records were found.')).not.toBeInTheDocument();
    expect(navigate).not.toHaveBeenCalled();
  });

  it('runs the parameter search when the check scale # is left empty, as legacy did', async () => {
    await searchByCheckScale('  ');

    await waitFor(() => expect(apiMock.scalers.searchScalers).toHaveBeenCalled());
    expect(apiMock.checkScale.findCheckScale).not.toHaveBeenCalled();
    expect(navigate).not.toHaveBeenCalled();
  });
});

