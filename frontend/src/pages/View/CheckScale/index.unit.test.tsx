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
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import ViewCheckScale from './index';

const checkScale = (overrides: Record<string, unknown> = {}) => ({
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
  speciesSummary: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.checkScale.getCheckScale.mockResolvedValue(checkScale());
});

const renderPage = () =>
  renderWithProviders(<ViewCheckScale />, {
    route: '/check-scales/5',
    path: '/check-scales/:checkScaleId',
  });

/** Cell text of a Check Scale Summary row, by its label cell ("Check:", "Variance %:", ...). */
const summaryRow = async (label: string): Promise<string[]> => {
  const labelCell = await screen.findByText(label);
  const cells = Array.from(labelCell.closest('tr')?.querySelectorAll('td') ?? []);
  return cells.slice(1).map((cell) => cell.textContent ?? '');
};

const totals = {
  originalScaleTotalTops: 120,
  originalScaleTotalButts: 90,
  originalScaleTotalLength: 150,
  originalScaleTotalVolume: 75,
  originalScaleTotalPieces: 8,
  originalScaleNetValue: 1200,
  chkScaleTotalTops: 100,
  chkScaleTotalButts: 100,
  chkScaleTotalLength: 200,
  chkScaleTotalVolume: 50,
  chkScaleTotalPieces: 10,
  checkScaleNetValue: 1000,
};

describe('View Check Scale', () => {
  it('loads the check scale named in the route', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.checkScale.getCheckScale).toHaveBeenCalled());
  });

  it('renders the scaler licence fields', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(controlById(container, 'check-scaler-licence')).toBeInTheDocument();
    expect(controlById(container, 'original-scaler-licence')).toBeInTheDocument();
  });

  it('shows the timber mark and scale site', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    expect(controlById(container, 'scale-site')).toHaveValue('SS-1');
  });

  it('renders the summary sections', async () => {
    renderPage();

    await waitFor(() => expect(screen.getByText('Check Scale Summary')).toBeInTheDocument());
    expect(screen.getByText('Species Product Grade Summary')).toBeInTheDocument();
  });

  it('offers the record actions', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    expect(screen.getByRole('button', { name: /Create Letter/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
  });

  it('navigates to the edit screen', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    await userEvent.click(screen.getByRole('button', { name: /Edit Record/i }));

    expect(navigate).toHaveBeenCalled();
  });

  it('asks for confirmation before deleting, and deletes nothing until then', async () => {
    renderPage();

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Edit Record/i })).toBeInTheDocument(),
    );
    expect(screen.getByText('Are you sure you want to delete this record?')).toBeInTheDocument();
    expect(apiMock.checkScale.deleteCheckScale).not.toHaveBeenCalled();
  });

  it('shows the good-practice and standard indicators', async () => {
    const { container } = renderPage();

    await waitFor(() =>
      expect(controlById(container, 'followed-good-practices')).toBeInTheDocument(),
    );
    expect(controlById(container, 'original-within-standard')).toBeInTheDocument();
  });

  it('does not render record values when the load fails', async () => {
    apiMock.checkScale.getCheckScale.mockRejectedValue(new Error('Check scale not available.'));
    const { container } = renderPage();

    await waitFor(() => expect(apiMock.checkScale.getCheckScale).toHaveBeenCalled());
    expect(container.textContent).not.toContain('TM1234');
  });

  it('leaves Net Value unmarked — the read-only view has nothing to require', async () => {
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
    // Two matches — the comparison row header and the Check Scale Summary column header.
    const netValueLabels = screen.getAllByText('Net Value');
    expect(netValueLabels.length).toBeGreaterThan(0);
    netValueLabels.forEach((label) => expect(label.querySelector('.scs__required')).toBeNull());
  });

  it('shows net volume at its stored precision, not rounded to one decimal', async () => {
    apiMock.checkScale.getCheckScale.mockResolvedValue(
      checkScale({ originalScaleTotalVolume: 20.845, chkScaleTotalVolume: 20.4 }),
    );
    const { container } = renderPage();

    await waitFor(() => expect(controlById(container, 'orig-net-volume')).toHaveValue('20.845'));
    expect(controlById(container, 'check-net-volume')).toHaveValue('20.4');
  });

  it('renders the species summary rows it is given', async () => {
    apiMock.checkScale.getCheckScale.mockResolvedValue(
      checkScale({
        speciesSummary: [
          {
            speciesCode: 'FIR',
            speciesGrade: '1',
            productCode: 'XM',
            orgPieces: 10,
            orgNetVolume: 1.5,
            chkPieces: 11,
            chkNetVolume: 1.6,
          },
        ],
      }),
    );
    renderPage();

    expect(await screen.findByText('FIR')).toBeInTheDocument();
  });

  it('divides the difference by the CHECK total for Variance %', async () => {
    // Legacy TallyBo.getVariance(checkScale, difference): difference / check x 100.
    // Dividing by the original instead would give 16.7 / -11.1 / -33.3 / 33.3 / -25.0 / 16.7.
    apiMock.checkScale.getCheckScale.mockResolvedValue(checkScale(totals));
    renderPage();

    expect(await summaryRow('Difference:')).toEqual(['20', '-10', '-50.0', '25.0', '-2', '200']);
    expect(await summaryRow('Variance %:')).toEqual([
      '20.0',
      '-10.0',
      '-25.0',
      '50.0',
      '-20.0',
      '20.0',
    ]);
  });

  it('shows a zero variance where the check total is zero', async () => {
    apiMock.checkScale.getCheckScale.mockResolvedValue(
      checkScale({ ...totals, chkScaleTotalVolume: 0 }),
    );
    renderPage();

    const variance = await summaryRow('Variance %:');
    expect(variance[3]).toBe('0.0');
  });
});
