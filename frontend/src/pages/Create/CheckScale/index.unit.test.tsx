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

import CreateCheckScale from './index';

beforeEach(() => {
  resetApiMock();
  navigate.mockClear();
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'F', description: 'Field' }]);
});

const renderPage = () => renderWithProviders(<CreateCheckScale />);
const next = async () => userEvent.click(screen.getByRole('button', { name: /^Next$/i }));

describe('Create Check Scale — step one', () => {
  it('renders the return type choices', () => {
    const { container } = renderPage();

    expect(controlById(container, 'rt-log')).toBeInTheDocument();
    expect(controlById(container, 'rt-sample')).toBeInTheDocument();
  });

  it('renders the check and original tally fields', () => {
    const { container } = renderPage();

    expect(controlById(container, 'ddn-check')).toBeInTheDocument();
    expect(controlById(container, 'ddv-check')).toBeInTheDocument();
    expect(controlById(container, 'ddn-orig')).toBeInTheDocument();
    expect(controlById(container, 'ddv-orig')).toBeInTheDocument();
  });

  it('offers Next and Reset', () => {
    renderPage();

    expect(screen.getByRole('button', { name: /^Next$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Reset$/i })).toBeInTheDocument();
  });

  it('requires a return type before validating', async () => {
    renderPage();

    await next();

    await waitFor(() => {
      expect(apiMock.checkScale.validateCheckScale).not.toHaveBeenCalled();
    });
  });

  it('caps the tally inputs at the legacy lengths (DDN 13, DDV 9)', () => {
    const { container } = renderPage();

    expect(controlById(container, 'ddn-check')).toHaveAttribute('maxlength', '13');
    expect(controlById(container, 'ddn-orig')).toHaveAttribute('maxlength', '13');
    expect(controlById(container, 'ddv-check')).toHaveAttribute('maxlength', '9');
    expect(controlById(container, 'ddv-orig')).toHaveAttribute('maxlength', '9');
  });

  it('keeps typed tally values', () => {
    const { container } = renderPage();

    const ddn = controlById(container, 'ddn-check');
    fireEvent.change(ddn, { target: { value: 'C123' } });

    expect(ddn).toHaveValue('C123');
  });

  it('validates once a return type and tally numbers are supplied', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({ ok: true, checkScale: {} });
    const { container } = renderPage();

    fireEvent.click(controlById(container, 'rt-log'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
    await next();

    await waitFor(() => expect(apiMock.checkScale.validateCheckScale).toHaveBeenCalled());
  });

  it('rejects a non-numeric DDV before calling the backend', async () => {
    const { container } = renderPage();

    fireEvent.click(controlById(container, 'rt-log'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: 'abc' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: 'x9' } });
    await next();

    expect(await screen.findByText(/Check Scale DDV must be a number\./i)).toBeInTheDocument();
    expect(screen.getByText(/Original Scale DDV must be a number\./i)).toBeInTheDocument();
    expect(apiMock.checkScale.validateCheckScale).not.toHaveBeenCalled();
  });

  it('shows the field errors a failed validation returns', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({
      ok: false,
      errors: [{ field: 'checkScaleDdn', message: 'Tally not found.' }],
    });
    const { container } = renderPage();

    fireEvent.click(controlById(container, 'rt-log'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
    await next();

    expect(await screen.findByText(/Tally not found\./i)).toBeInTheDocument();
  });

  it('surfaces a validation request that fails outright', async () => {
    apiMock.checkScale.validateCheckScale.mockRejectedValue(new Error('Validation unavailable.'));
    const { container } = renderPage();

    fireEvent.click(controlById(container, 'rt-log'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
    await next();

    expect(await screen.findByText(/Validation unavailable\./i)).toBeInTheDocument();
  });

  it('clears the form on reset', async () => {
    const { container } = renderPage();

    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById(container, 'ddn-check')).toHaveValue(''));
  });

  it('does not create anything before validation succeeds', async () => {
    renderPage();

    await next();

    await waitFor(() => expect(apiMock.checkScale.createCheckScale).not.toHaveBeenCalled());
  });
});

describe('Create Check Scale — step two', () => {
  const toStepTwo = async (container: HTMLElement) => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({
      ok: true,
      checkScale: {
        checkScaleId: null,
        checkScalerLicenceNo: 'C1234',
        originalScalerLicenceNo: 'O1234',
        timberMark: 'TM1234',
        scaleSiteIdNmbr: 'SS-1',
        originalScaleDate: '2026-01-01',
        chkScaleDate: '2026-01-02',
        speciesSummary: [],
      },
    });
    fireEvent.click(controlById(container, 'rt-log'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
    await next();
    await waitFor(() => expect(container.querySelector('#check-scale-type')).not.toBeNull());
  };

  const fillStepTwo = async (container: HTMLElement) => {
    await waitFor(() =>
      expect(controlById<HTMLSelectElement>(container, 'check-scale-type').options.length).toBeGreaterThan(1),
    );
    fireEvent.change(controlById(container, 'check-scale-type'), { target: { value: 'F' } });
    fireEvent.change(controlById(container, 'followed-good-practices'), { target: { value: 'Yes' } });
    fireEvent.change(controlById(container, 'original-within-standard'), { target: { value: 'No' } });
    fireEvent.change(controlById(container, 'orig-net'), { target: { value: '1000' } });
    fireEvent.change(controlById(container, 'check-net'), { target: { value: '1010' } });
  };

  it('shows the enriched preview from validation', async () => {
    const { container } = renderPage();

    await toStepTwo(container);
    expect(controlById(container, 'timber-mark')).toHaveValue('TM1234');
    expect(controlById(container, 'scale-site')).toHaveValue('SS-1');
  });

  it('refuses to create while the step two fields are incomplete', async () => {
    const { container } = renderPage();

    await toStepTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText(/is required/i)).length).toBeGreaterThan(0);
    expect(apiMock.checkScale.createCheckScale).not.toHaveBeenCalled();
  });

  it('creates the check scale once step two is complete', async () => {
    apiMock.checkScale.createCheckScale.mockResolvedValue({ checkScaleId: 77 });
    const { container } = renderPage();

    await toStepTwo(container);
    await fillStepTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.checkScale.createCheckScale).toHaveBeenCalled());
    const [payload] = apiMock.checkScale.createCheckScale.mock.calls[0];
    expect(payload).toMatchObject({
      checkScaleTypeCode: 'F',
      followedGoodPracticeInd: 'Y',
      originalWithinStandardInd: 'N',
      originalScaleNetValue: 1000,
      checkScaleNetValue: 1010,
      chkLogTallyDocNo: 'C123',
      orgLogTallyDocNo: 'O123',
    });
  });

  it('routes a Sample Log Tally to the sample tally fields', async () => {
    apiMock.checkScale.createCheckScale.mockResolvedValue({ checkScaleId: 78 });
    const { container } = renderPage();

    apiMock.checkScale.validateCheckScale.mockResolvedValue({ ok: true, checkScale: { speciesSummary: [] } });
    fireEvent.click(controlById(container, 'rt-sample'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
    await next();
    await waitFor(() => expect(container.querySelector('#check-scale-type')).not.toBeNull());
    await fillStepTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    await waitFor(() => expect(apiMock.checkScale.createCheckScale).toHaveBeenCalled());
    const [payload] = apiMock.checkScale.createCheckScale.mock.calls[0];
    expect(payload).toMatchObject({ chkSampleLogTallyDocNo: 'C123', orgSampleLogTallyDocNo: 'O123' });
    expect(payload.chkLogTallyDocNo).toBeUndefined();
  });

  it('reports a failed create and keeps step two on screen', async () => {
    apiMock.checkScale.createCheckScale.mockRejectedValue(new Error('Create refused.'));
    const { container } = renderPage();

    await toStepTwo(container);
    await fillStepTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

    expect((await screen.findAllByText(/Create refused\./i)).length).toBeGreaterThan(0);
    expect(container.querySelector('#check-scale-type')).not.toBeNull();
  });

  it('returns to step one from Back', async () => {
    const { container } = renderPage();

    await toStepTwo(container);
    await userEvent.click(screen.getByRole('button', { name: /^Back$/i }));

    await waitFor(() => expect(container.querySelector('#rt-log')).not.toBeNull());
  });
});

describe('Create Check Scale — resetting and leaving', () => {
  const toStepTwo = async (container: HTMLElement) => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({ ok: true, checkScale: { timberMark: 'TM1234', speciesSummary: [] } });
    fireEvent.click(controlById(container, 'rt-log'));
    fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
    fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
    fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
    fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
    await next();
    await waitFor(() => expect(container.querySelector('#check-scale-type')).not.toBeNull());
  };

  it('clears the step two entries on Reset without leaving step two', async () => {
    const { container } = renderPage();

    await toStepTwo(container);
    fireEvent.change(controlById(container, 'check-scaler-comment'), { target: { value: 'Looked fine' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(controlById(container, 'check-scaler-comment')).toHaveValue(''));
    expect(container.querySelector('#check-scale-type')).not.toBeNull();
  });

  it('leaves from step one via Back without validating anything', async () => {
    renderPage();

    const back = screen.queryByRole('button', { name: /^Back$/i });
    if (back) {
      await userEvent.click(back);
    }

    expect(apiMock.checkScale.validateCheckScale).not.toHaveBeenCalled();
    expect(apiMock.checkScale.createCheckScale).not.toHaveBeenCalled();
  });
});
