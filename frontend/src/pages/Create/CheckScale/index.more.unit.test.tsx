import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import CreateCheckScale from './index';

beforeEach(() => {
  resetApiMock();
  sessionStorage.removeItem('checkScaleDraft');
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'F', description: 'Field' }]);
});
afterEach(() => sessionStorage.removeItem('checkScaleDraft'));

const renderPage = () => renderWithProviders(<CreateCheckScale />);

const fillStepOne = (container: HTMLElement) => {
  fireEvent.click(controlById(container, 'rt-log'));
  fireEvent.change(controlById(container, 'ddn-check'), { target: { value: 'C123' } });
  fireEvent.change(controlById(container, 'ddv-check'), { target: { value: '1' } });
  fireEvent.change(controlById(container, 'ddn-orig'), { target: { value: 'O123' } });
  fireEvent.change(controlById(container, 'ddv-orig'), { target: { value: '2' } });
};
const next = async () => userEvent.click(screen.getByRole('button', { name: /^Next$/i }));

describe('Create Check Scale — lookups and backend errors', () => {
  it('still renders when the code lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    const { container } = renderPage();

    await waitFor(() => expect(apiMock.lov.getStaticLov).toHaveBeenCalled());
    expect(controlById(container, 'rt-log')).toBeInTheDocument();
  });

  it('maps every backend field error onto its input and joins repeats', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({
      ok: false,
      errors: [
        { field: 'checkScaleDdv', message: 'Check version missing.' },
        { field: 'originalScaleDdn', message: 'Original tally unknown.' },
        { field: 'originalScaleDdv', message: 'Original version missing.' },
        { field: 'returnType', message: 'Pick a type.' },
        { field: 'somethingElse', message: 'Unmapped complaint.' },
      ],
    });
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    expect(await screen.findByText(/Check version missing\./)).toBeInTheDocument();
    expect(screen.getByText(/Original tally unknown\./)).toBeInTheDocument();
    expect(screen.getByText(/Original version missing\./)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });

  it('treats a validation reply without errors as a refusal', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({ ok: false });
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    await waitFor(() => expect(apiMock.checkScale.validateCheckScale).toHaveBeenCalled());
    expect(screen.queryByRole('button', { name: /Save Record/i })).not.toBeInTheDocument();
  });
});

describe('Create Check Scale — remembered draft', () => {
  it('restores a Sample Log Tally draft from the session', () => {
    sessionStorage.setItem(
      'checkScaleDraft',
      JSON.stringify({
        chkSampleLogTallyDocNo: 'S1',
        chkSampleLogTallyVer: 2,
        orgSampleLogTallyDocNo: 'O1',
        orgSampleLogTallyVer: 3,
      }),
    );
    const { container } = renderPage();

    expect(controlById(container, 'rt-sample')).toBeChecked();
    expect(controlById(container, 'ddn-check')).toHaveValue('S1');
    expect(controlById(container, 'ddv-check')).toHaveValue('2');
    expect(controlById(container, 'ddn-orig')).toHaveValue('O1');
    expect(controlById(container, 'ddv-orig')).toHaveValue('3');
  });

  it('restores a Log Tally draft and leaves missing parts blank', () => {
    sessionStorage.setItem('checkScaleDraft', JSON.stringify({ chkLogTallyDocNo: 'L1', orgLogTallyVer: 4 }));
    const { container } = renderPage();

    expect(controlById(container, 'rt-log')).toBeChecked();
    expect(controlById(container, 'ddn-check')).toHaveValue('L1');
    expect(controlById(container, 'ddv-check')).toHaveValue('');
    expect(controlById(container, 'ddn-orig')).toHaveValue('');
    expect(controlById(container, 'ddv-orig')).toHaveValue('4');
  });

  it('ignores a draft that is not JSON, or is null', () => {
    sessionStorage.setItem('checkScaleDraft', '{not json');
    const first = renderPage();
    expect(controlById(first.container, 'ddn-check')).toHaveValue('');
    first.unmount();

    sessionStorage.setItem('checkScaleDraft', 'null');
    const second = renderPage();
    expect(controlById(second.container, 'ddn-check')).toHaveValue('');
  });
});

describe('Create Check Scale — reading the validated return', () => {
  const rich = {
    ok: true,
    // Every field is supplied under its *alternate* key so the fallbacks in
    // mergeApiValues are exercised, along with the Yes/No/boolean spellings.
    checkScale: {
      chkSampleLogTallyDocNo: 'S777',
      chkSampleLogTallyVer: 3,
      orgSampleLogTallyDocNo: 'O777',
      orgSampleLogTallyVer: 4,
      chkScalerLicence: 'C-ALT',
      orgScalerLicence: 'O-ALT',
      secondScalerLicence: 'SECOND',
      loadArrivalNo: 'LA-1',
      weighSlipNo: 'WS-1',
      timberMark: 'TM9',
      scaleSiteNo: 'SS-9',
      followedGoodPractices: 'Yes',
      originalWithinStd: true,
      checkReplacesOriginalInd: 'N',
      population: 'P1',
      stratum: 'ST',
      year: '2026',
      checkScalerComment: 'looks fine',
      originalDateOfScale: '2026-01-03',
      checkDateOfScale: '2026-01-04',
      originalScaleReturn: 'R1',
      checkScaleReturn: 'R2',
      originalTops: 5,
      checkTops: 6,
      originalButts: 7,
      checkButts: 8,
      originalLength: '12.345',
      checkLength: 'not-a-number',
      originalNetValue: 1000,
      checkNetValue: 1010,
      checkScaleType: 'F',
      speciesSummary: [
        { speciesCode: 'F', speciesGrade: 'G1', productCode: 'P1', orgPieces: 3, orgNetVolume: '12.345', chkPieces: 4, chkNetVolume: '' },
        { speciesCode: 'ZZ', speciesGrade: null, productCode: undefined, orgNetVolume: 'abc', chkNetVolume: 7 },
        {},
      ],
    },
  };

  it('fills the step two fields from whichever key the return uses', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue(rich);
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    await waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM9'));
    expect(controlById(container, 'scale-site')).toHaveValue('SS-9');
    expect(controlById(container, 'followed-good-practices')).toHaveValue('Yes');
    expect(controlById(container, 'original-within-standard')).toHaveValue('Yes');
    expect(controlById(container, 'check-scale-type')).toHaveValue('F');
    expect(controlById(container, 'orig-net')).toHaveValue('1000');
    expect(controlById(container, 'check-net')).toHaveValue('1010');
    expect(controlById(container, 'ddn-check')).toHaveValue('S777');
    expect(controlById(container, 'ddv-orig')).toHaveValue('4');
  });

  it('marks Net Value required, as legacy does with its red asterisk', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue(rich);
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    const netValueLabel = await screen.findByText('Net Value');
    expect(netValueLabel.querySelector('.scs__required')?.textContent).toBe('*');
  });

  it('describes the species rows through the code lookups and keeps unknown codes raw', async () => {
    apiMock.lov.getStaticLov.mockResolvedValue([
      { code: 'F', description: 'Fir' },
      { code: 'G1', description: 'Grade one' },
      { code: 'P1', description: 'Sawlog' },
    ]);
    apiMock.checkScale.validateCheckScale.mockResolvedValue(rich);
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    // The same LOV mock also feeds the type select, so the descriptions appear there too.
    expect((await screen.findAllByText('Fir')).length).toBeGreaterThan(1);
    expect(screen.getAllByText('Grade one').length).toBeGreaterThan(1);
    expect(screen.getAllByText('Sawlog').length).toBeGreaterThan(1);
    expect(screen.getByText('ZZ')).toBeInTheDocument();
    // Net volume keeps all three stored decimals (legacy DecimalFormat "0.0##").
    expect(screen.getByText('12.345')).toBeInTheDocument();
    expect(screen.getByText('7.0')).toBeInTheDocument();
    expect(container.querySelector('#timber-mark')).not.toBeNull();
  });

  it('maps the N and false spellings to No', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({
      ok: true,
      checkScale: { followedGoodPracticeInd: 'N', originalWithinStandardInd: false, replacesOriginal: 'No', speciesSummary: null },
    });
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    await waitFor(() => expect(controlById(container, 'followed-good-practices')).toHaveValue('No'));
    expect(controlById(container, 'original-within-standard')).toHaveValue('No');
  });

  it('leaves a Yes/No it cannot read blank', async () => {
    apiMock.checkScale.validateCheckScale.mockResolvedValue({
      ok: true,
      data: { followedGoodPracticeInd: 'maybe', originalWithinStandardInd: '', speciesSummary: [] },
    });
    const { container } = renderPage();

    fillStepOne(container);
    await next();

    await waitFor(() => expect(container.querySelector('#followed-good-practices')).not.toBeNull());
    expect(controlById(container, 'followed-good-practices')).toHaveValue('');
    expect(controlById(container, 'original-within-standard')).toHaveValue('');
  });
});
