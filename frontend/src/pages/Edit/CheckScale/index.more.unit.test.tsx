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
  followedGoodPracticeInd: 'Y',
  originalWithinStandardInd: 'N',
  originalScaleNetValue: 1000,
  checkScaleNetValue: 1010,
  speciesSummary: [],
  ...overrides,
});

beforeEach(() => {
  resetApiMock();
  apiMock.checkScale.getCheckScale.mockResolvedValue(model());
  apiMock.lov.getStaticLov.mockResolvedValue([{ code: 'F', description: 'Field' }]);
});

const renderPage = () => renderWithProviders(<EditCheckScale />, { route: '/check-scales/5/edit', path: '/check-scales/:checkScaleId/edit' });
const loaded = (container: HTMLElement) => waitFor(() => expect(controlById(container, 'timber-mark')).toHaveValue('TM1234'));
const save = () => userEvent.click(screen.getByRole('button', { name: /Save Record/i }));

describe('Edit Check Scale — validation', () => {
  it.each([
    ['check-scale-type', 'Check Scale Type is required.'],
    ['followed-good-practices', 'Followed Good Practices is required.'],
    ['original-within-standard', 'Original within Standard is required.'],
  ])('refuses a blank %s', async (id, message) => {
    const { container } = renderPage();
    await loaded(container);

    fireEvent.change(controlById(container, id), { target: { value: '' } });
    await save();

    expect((await screen.findAllByText(message)).length).toBeGreaterThan(0);
    expect(apiMock.checkScale.updateCheckScale).not.toHaveBeenCalled();
  });

  it('refuses a net value that is not a number', async () => {
    const { container } = renderPage();
    await loaded(container);

    fireEvent.change(controlById(container, 'orig-net'), { target: { value: 'abc' } });
    await save();

    await waitFor(() => expect(screen.getAllByText(/Original Scale Net Value/).length).toBeGreaterThan(0));
    expect(apiMock.checkScale.updateCheckScale).not.toHaveBeenCalled();
  });

  it('still renders when the code lookups fail', async () => {
    apiMock.lov.getStaticLov.mockRejectedValue(new Error('down'));
    const { container } = renderPage();

    await loaded(container);
    expect(apiMock.lov.getStaticLov).toHaveBeenCalled();
  });
});
