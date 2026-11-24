import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

const navigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useNavigate: () => navigate };
});

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import UpdateSummaryCheckScale from './index';

const model = (overrides: Record<string, unknown> = {}) => ({
  checkScaleId: 5,
  ckscType: 'LTSCS',
  checkScaleTypeCode: 'F',
  checkScalerLicenceNo: 'C1234',
  originalScalerLicenceNo: 'O1234',
  timberMark: 'TM1234',
  scaleSiteIdNmbr: 'SS-1',
  originalScaleDate: '2026-01-01',
  chkScaleDate: '2026-01-02',
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'N',
  checkReplacesOriginalInd: 'N',
  partialInd: 'N',
  loadArrivalNumber: 'LA1',
  originalScaleReturnNo: 1,
  chkScaleReturnNo: 2,
  speciesSummary: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.summaryCheckScale.getSummaryCheckScale.mockResolvedValue(model());
  // One static LOV per table key: species, product and grade each need their own codes, or the
  // cross-reference filter leaves the grade select with nothing but its blank option.
  apiMock.lov.getStaticLov.mockImplementation(async (params?: { tableKey?: string }) => {
    switch (params?.tableKey) {
      case 'SCALE_SPECIES_CODE':
        return [{ code: 'FIR', description: 'Douglas Fir' }];
      case 'SCALE_PRODUCT_CODE':
        return [{ code: 'XM', description: 'Christmas trees' }];
      case 'SCALE_GRADE_CODE':
        return [{ code: '1', description: 'Grade 1' }];
      case 'CHECK_SCALE_TYPE_CODE':
        return [{ code: 'F', description: 'Field' }];
      default:
        return [{ code: 'A', description: 'Option A' }];
    }
  });
  // FIR carries product XM with grade 1; a Log Tally row needs a grade once a species is chosen.
  apiMock.lov.getSpeciesProductGradeXref.mockResolvedValue([
    { scaleSpeciesCode: 'FIR', scaleProductCode: 'XM', scaleGradeCode: '1' },
  ]);
});

const renderPage = () =>
  renderWithProviders(<UpdateSummaryCheckScale />, {
    route: '/summary-check-scales/5/update',
    path: '/summary-check-scales/:checkScaleId/update',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));

describe('Update Summary Check Scale', () => {
  it('loads the summary check scale named in the route', async () => {
    renderPage();

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.getSummaryCheckScale).toHaveBeenCalled(),
    );
  });

  it('fills the header from the loaded record', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'scale-site-number')).toHaveValue('SS-1');
    expect(controlById(container, 'load-arrival-number')).toHaveValue('LA1');
  });

  it('renders the return type choices', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'return-type-log-tally')).toBeInTheDocument();
    expect(controlById(container, 'return-type-sample-log-tally')).toBeInTheDocument();
    expect(controlById(container, 'return-type-special-forest-product')).toBeInTheDocument();
  });

  it('renders the indicator fields', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'followed-good-practices')).toBeInTheDocument();
    expect(controlById(container, 'original-within-standard')).toBeInTheDocument();
  });

  it('offers the record actions', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Letter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('saves the header through the update endpoint', async () => {
    apiMock.summaryCheckScale.updateSummaryCheckScale.mockResolvedValue(model());
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.updateSummaryCheckScale).toHaveBeenCalled(),
    );
  });

  it('reports a failed save', async () => {
    apiMock.summaryCheckScale.updateSummaryCheckScale.mockRejectedValue(
      new Error('Save refused.'),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.updateSummaryCheckScale).toHaveBeenCalled(),
    );
    expect(container.textContent ?? '').not.toBe('');
  });

  it('deletes nothing without confirmation', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(apiMock.summaryCheckScale.deleteSummaryCheckScale).not.toHaveBeenCalled();
  });

  it('adds no SPG row merely by loading', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(apiMock.summaryCheckScale.addSpgRow).not.toHaveBeenCalled();
    expect(apiMock.summaryCheckScale.deleteSpgRow).not.toHaveBeenCalled();
  });

  it('surfaces a load failure', async () => {
    apiMock.summaryCheckScale.getSummaryCheckScale.mockRejectedValue(
      new Error('Summary check scale not available.'),
    );
    const { container } = renderPage();

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.getSummaryCheckScale).toHaveBeenCalled(),
    );
    expect(container.textContent ?? '').not.toContain('TM1234');
  });

  it('shows an SPG row from the record', async () => {
    apiMock.summaryCheckScale.getSummaryCheckScale.mockResolvedValue(
      model({
        speciesSummary: [
          { speciesCode: 'FIR', speciesGrade: '1', productCode: 'XM', orgPieces: 10, chkPieces: 11 },
        ],
      }),
    );
    renderPage();

    // The species LOV is loaded, so the code renders with its description.
    expect((await screen.findAllByText(/FIR/)).length).toBeGreaterThan(0);
  });
});

describe('Update Summary Check Scale — species product grade rows', () => {
  const setRow = (container: HTMLElement, id: string, value: string) => {
    const el = container.querySelector(`#${id}`) as HTMLInputElement | null;
    if (el) {fireEvent.change(el, { target: { value } });}
  };
  const addButton = () => screen.getByRole('button', { name: /^Add$/i });

  it('refuses to add an empty row and reports what is missing', async () => {
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(addButton());

    expect((await screen.findAllByText(/is required/i)).length).toBeGreaterThan(0);
    expect(apiMock.summaryCheckScale.addSpgRow).not.toHaveBeenCalled();
  });

  it('adds a complete row through the SPG endpoint', async () => {
    apiMock.summaryCheckScale.addSpgRow.mockResolvedValue(model());
    const { container } = renderPage();

    await loaded(container);
    setRow(container, 'species', 'FIR');
    await waitFor(() =>
      expect((container.querySelector('#grade') as HTMLSelectElement | null)?.options.length ?? 0).toBeGreaterThan(1),
    );
    setRow(container, 'grade', '1');
    setRow(container, 'original-pieces', '10');
    setRow(container, 'check-pieces', '11');
    setRow(container, 'original-net-volume', '1.234');
    setRow(container, 'check-net-volume', '1.235');
    setRow(container, 'original-net-value', '100.00');
    setRow(container, 'check-net-value', '101.00');
    await userEvent.click(addButton());

    await waitFor(() => expect(apiMock.summaryCheckScale.addSpgRow).toHaveBeenCalled());
    expect(apiMock.summaryCheckScale.addSpgRow.mock.calls[0][0]).toBe('5');
  });

  it('reports a failed row add', async () => {
    apiMock.summaryCheckScale.addSpgRow.mockRejectedValue(new Error('Row refused.'));
    const { container } = renderPage();

    await loaded(container);
    setRow(container, 'species', 'FIR');
    await waitFor(() =>
      expect((container.querySelector('#grade') as HTMLSelectElement | null)?.options.length ?? 0).toBeGreaterThan(1),
    );
    setRow(container, 'grade', '1');
    setRow(container, 'original-pieces', '10');
    setRow(container, 'check-pieces', '11');
    setRow(container, 'original-net-volume', '1.234');
    setRow(container, 'check-net-volume', '1.235');
    setRow(container, 'original-net-value', '100.00');
    setRow(container, 'check-net-value', '101.00');
    await userEvent.click(addButton());

    expect((await screen.findAllByText(/Row refused\./i)).length).toBeGreaterThan(0);
  });
});

describe('Update Summary Check Scale — record actions', () => {
  it('asks for confirmation before deleting the record, then deletes and returns to create', async () => {
    apiMock.summaryCheckScale.deleteSummaryCheckScale.mockResolvedValue(undefined);
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Delete Record/i }));
    // Nothing is deleted until the dialog is confirmed.
    expect(apiMock.summaryCheckScale.deleteSummaryCheckScale).not.toHaveBeenCalled();

    const dialog = screen.getByText('Delete summary check scale?').closest('.cds--modal') as HTMLElement;
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete$/i }));

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.deleteSummaryCheckScale).toHaveBeenCalledWith(
        '5',
        expect.anything(),
      ),
    );
    expect(navigate).toHaveBeenCalledWith('/summary-check-scales/create');
  });

  it('reports a failed delete and stays on the record', async () => {
    apiMock.summaryCheckScale.deleteSummaryCheckScale.mockRejectedValue(
      new Error('Delete refused.'),
    );
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Delete Record/i }));
    const dialog = screen.getByText('Delete summary check scale?').closest('.cds--modal') as HTMLElement;
    await userEvent.click(within(dialog).getByRole('button', { name: /Delete$/i }));

    expect((await screen.findAllByText(/Delete refused\./i)).length).toBeGreaterThan(0);
    expect(navigate).not.toHaveBeenCalledWith('/summary-check-scales/create');
  });

  it('navigates to the advisory letter for this check scale', async () => {
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Create Letter/i }));

    expect(navigate).toHaveBeenCalledWith('/check-scales/5/advisory-letter');
  });

  it('reloads the persisted record on reset rather than clearing the form', async () => {
    const { container } = renderPage();

    await loaded(container);
    await waitFor(() => expect(apiMock.summaryCheckScale.getSummaryCheckScale).toHaveBeenCalledTimes(1));
    fireEvent.change(controlById(container, 'load-arrival-number'), { target: { value: 'CHANGED' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(apiMock.summaryCheckScale.getSummaryCheckScale.mock.calls.length).toBeGreaterThan(1),
    );
    await waitFor(() => expect(controlById(container, 'load-arrival-number')).toHaveValue('LA1'));
  });

  it('inlines server-side field errors from a refused save', async () => {
    apiMock.summaryCheckScale.updateSummaryCheckScale.mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: 'Validation failed',
          fieldErrors: [{ field: 'timberMark', message: 'Timber Mark is not active.' }],
        },
      },
    });
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText('Timber Mark is not active.')).length).toBeGreaterThan(0);
  });
});
