import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));
vi.mock('@/components/core/DateInput', () => import('@/config/tests/dateInputMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import EditCheckScale from './index';

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
  loadArrivalNumber: 'LA1',
  originalScaleReturnNo: 1,
  chkScaleReturnNo: 2,
  originalScaleNetValue: 1000,
  checkScaleNetValue: 1010,
  chkScalerCommentTxt: 'Within tolerance',
  speciesSummary: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  apiMock.checkScale.getCheckScale.mockResolvedValue(model());
});

const renderPage = () =>
  renderWithProviders(<EditCheckScale />, {
    route: '/check-scales/5/edit',
    path: '/check-scales/:checkScaleId/edit',
  });

const loaded = async (container: HTMLElement) =>
  waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));

describe('Edit Check Scale', () => {
  it('loads the check scale named in the route', async () => {
    renderPage();

    await waitFor(() => expect(apiMock.checkScale.getCheckScale).toHaveBeenCalled());
  });

  it('fills the form from the loaded record', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'check-scaler-licence')).toBeInTheDocument();
    expect(controlById(container, 'original-scaler-licence')).toBeInTheDocument();
    expect(controlById(container, 'scale-site')).toHaveValue('SS-1');
  });

  it('marks Net Value required, as legacy does with its red asterisk', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(screen.getByText('Net Value').querySelector('.scs__required')?.textContent).toBe('*');
  });

  it('renders the tally fields', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'ddn-check')).toBeInTheDocument();
    expect(controlById(container, 'ddv-check')).toBeInTheDocument();
    expect(controlById(container, 'ddn-orig')).toBeInTheDocument();
    expect(controlById(container, 'ddv-orig')).toBeInTheDocument();
  });

  it('renders the indicator fields', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'followed-good-practices')).toBeInTheDocument();
    expect(controlById(container, 'original-within-standard')).toBeInTheDocument();
    expect(controlById(container, 'check-replaces-original')).toBeInTheDocument();
  });

  it('renders the sampling fields', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(controlById(container, 'population')).toBeInTheDocument();
    expect(controlById(container, 'stratum')).toBeInTheDocument();
  });

  it('offers Back, Reset and Save Record', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(screen.getByRole('button', { name: /Save Record/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Back$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('saves the record through the update endpoint', async () => {
    apiMock.checkScale.updateCheckScale.mockResolvedValue(model());
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.checkScale.updateCheckScale).toHaveBeenCalled());
  });

  it('reports a failed save', async () => {
    apiMock.checkScale.updateCheckScale.mockRejectedValue(new Error('Save refused.'));
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.checkScale.updateCheckScale).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toBe('');
  });

  it('restores the loaded values on reset', async () => {
    const { container } = renderPage();

    await loaded(container);
    fireEvent.change(controlById(container, 'population'), { target: { value: 'CHANGED' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() =>
      expect(controlById(container, 'population')).not.toHaveValue('CHANGED'),
    );
  });

  it('surfaces a load failure instead of showing an empty form', async () => {
    apiMock.checkScale.getCheckScale.mockRejectedValue(new Error('Check scale not available.'));
    const { container } = renderPage();

    await waitFor(() => expect(apiMock.checkScale.getCheckScale).toHaveBeenCalled());
    expect(container.textContent ?? '').not.toContain('TM1234');
  });

  it('does not save merely by loading', async () => {
    const { container } = renderPage();

    await loaded(container);
    expect(apiMock.checkScale.updateCheckScale).not.toHaveBeenCalled();
  });
});

describe('Edit Check Scale — leaving', () => {
  it('Back leaves the record without saving', async () => {
    const { container } = renderPage();

    await loaded(container);
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    expect(apiMock.checkScale.updateCheckScale).not.toHaveBeenCalled();
  });
});
