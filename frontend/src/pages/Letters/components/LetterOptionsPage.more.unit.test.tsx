import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/services/APIs', () => import('@/config/tests/apiMock'));

import { apiMock, resetApiMock } from '@/config/tests/apiMock';
import { controlById, renderWithProviders } from '@/config/tests/renderWithProviders';

import LetterOptionsPage from './LetterOptionsPage';

const createLetter = vi.fn();
const onBack = vi.fn();

const blocks = [
  { scaleSignatoryBlockId: 1, fullName: 'Ann Able', signatureTitle: 'Manager' },
  { scaleSignatoryBlockId: 2, fullName: 'Bob Baker' },
  { scaleSignatoryBlockId: 3, lastName: 'Cole', firstName: 'Cy', signatureTitle: 'Lead' },
  { scaleSignatoryBlockId: 4, lastName: 'Dunn' },
];

beforeEach(() => {
  resetApiMock();
  createLetter.mockReset().mockResolvedValue({ blob: new Blob(['pdf']), filename: 'letter.pdf' });
  onBack.mockClear();
  apiMock.lov.getRegionDistrictRollupLov.mockResolvedValue([
    { code: '43', description: 'DCK', orgUnitCode: 'DCK', rollupRegionNo: 1 },
  ] as never);
  apiMock.signatureBlocks.searchLetterSignatureBlocks.mockResolvedValue(blocks as never);
});

const setup = (overrides: Record<string, unknown> = {}) =>
  renderWithProviders(
    <LetterOptionsPage title="Letter" reportBaseName="R001" letterId={5} onBack={onBack} createLetter={createLetter} {...overrides} />,
  );

const select = (container: HTMLElement) => controlById<HTMLSelectElement>(container, 'signature-blocks-select');
const send = () => userEvent.click(screen.getByRole('button', { name: /Send \/ View Report/i }));

describe('Letter options — signature blocks', () => {
  // First in the file: the district LOV is cached module-wide once it has loaded successfully.
  it('renders without districts when that lookup fails', async () => {
    apiMock.lov.getRegionDistrictRollupLov.mockRejectedValue(new Error('down'));
    const { container } = setup();

    await waitFor(() => expect(apiMock.lov.getRegionDistrictRollupLov).toHaveBeenCalled());
    expect(controlById<HTMLSelectElement>(container, 'reg-dist').options.length).toBeLessThanOrEqual(1);
  });

  it('labels each block from its full name or its parts, with the title when there is one', async () => {
    const { container } = setup();

    await waitFor(() => expect(select(container).options.length).toBe(5));
    const texts = Array.from(select(container).options).map((o) => o.textContent);
    expect(texts).toEqual(['', 'Ann Able - Manager', 'Bob Baker', 'Cole, Cy - Lead', 'Dunn']);
    expect(select(container)).toHaveValue('1');
  });

  it('sends the chosen block and the signature toggle', async () => {
    const { container } = setup();
    await waitFor(() => expect(select(container).options.length).toBe(5));

    fireEvent.change(select(container), { target: { value: '3' } });
    fireEvent.change(controlById(container, 'show-signature-block-select'), { target: { value: 'N' } });
    await send();

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    expect(createLetter.mock.calls[0][1]).toMatchObject({ scaleSignatoryBlockId: 3, showSignatureBlockInd: 'N' });
    expect(onBack).toHaveBeenCalled();
  });

  it('reloads the blocks for the chosen district', async () => {
    const { container } = setup();
    await waitFor(() => expect(controlById<HTMLSelectElement>(container, 'reg-dist').options.length).toBeGreaterThan(1));
    const before = apiMock.signatureBlocks.searchLetterSignatureBlocks.mock.calls.length;

    fireEvent.change(controlById(container, 'reg-dist'), { target: { value: 'DCK' } });

    await waitFor(() => expect(apiMock.signatureBlocks.searchLetterSignatureBlocks.mock.calls.length).toBeGreaterThan(before));
    expect(Object.keys(apiMock.signatureBlocks.searchLetterSignatureBlocks.mock.calls.at(-1)![0]).length).toBeGreaterThan(0);
  });

  it('leaves the block select empty and disabled when the lookup fails', async () => {
    apiMock.signatureBlocks.searchLetterSignatureBlocks.mockRejectedValue(new Error('down'));
    const { container } = setup();

    await waitFor(() => expect(apiMock.signatureBlocks.searchLetterSignatureBlocks).toHaveBeenCalled());
    await waitFor(() => expect(select(container)).toBeDisabled());
    expect(select(container).options.length).toBe(1);
  });

  // Nr-scs #286 follow-up: a swallowed 403 on the lookup used to look like "no blocks" and let a
  // letter go out with scaleSignatoryBlockId 0. A failed lookup must be loud and block the send.
  it('shows the lookup failure and blocks sending, even on the advisory letter', async () => {
    apiMock.signatureBlocks.searchLetterSignatureBlocks.mockRejectedValue(
      Object.assign(new Error('Request failed with status code 403'), {
        isAxiosError: true,
        response: { status: 403, data: { code: 'FORBIDDEN', message: 'Access is denied.' } },
      }),
    );
    setup({ allowEmptySignatory: true });

    expect(await screen.findByText('Unable to load signature blocks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send \/ View Report/i })).toBeDisabled();
    expect(createLetter).not.toHaveBeenCalled();
  });

  // A failed lookup must be recoverable without leaving the page: Reset retries it for the same
  // district, and choosing a Reg / Dist retries it for the new one.
  it.each([
    ['Reset', async () => {
      await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));
    }],
    ['changing Reg / Dist', async (container: HTMLElement) => {
      await waitFor(() => expect(controlById<HTMLSelectElement>(container, 'reg-dist').options.length).toBeGreaterThan(1));
      fireEvent.change(controlById(container, 'reg-dist'), { target: { value: 'DCK' } });
    }],
  ])('recovers from a failed lookup via %s', async (_how, recover) => {
    apiMock.signatureBlocks.searchLetterSignatureBlocks.mockRejectedValueOnce(new Error('down'));
    const { container } = setup();
    expect(await screen.findByText('Unable to load signature blocks')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send \/ View Report/i })).toBeDisabled();

    await recover(container);

    await waitFor(() => expect(screen.queryByText('Unable to load signature blocks')).not.toBeInTheDocument());
    await waitFor(() => expect(select(container)).toHaveValue('1'));
    expect(screen.getByRole('button', { name: /Send \/ View Report/i })).toBeEnabled();
    await send();

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    const id = createLetter.mock.calls[0][1].scaleSignatoryBlockId;
    expect(typeof id).toBe('number');
    expect(id).toBeGreaterThan(0);
  });

  it('never sends 0 as the signatory', async () => {
    const { container } = setup({ allowEmptySignatory: true });
    await waitFor(() => expect(select(container).options.length).toBe(5));

    fireEvent.change(select(container), { target: { value: '' } });
    await send();

    await waitFor(() => expect(createLetter).toHaveBeenCalled());
    expect(createLetter.mock.calls[0][1].scaleSignatoryBlockId).toBeUndefined();
    expect(createLetter.mock.calls[0][1]).not.toHaveProperty('scaleSignatoryBlockId', 0);
  });

  it('keeps the loaded blocks on Reset and reselects the first', async () => {
    const { container } = setup();
    await waitFor(() => expect(select(container).options.length).toBe(5));

    fireEvent.change(select(container), { target: { value: '3' } });
    await userEvent.click(screen.getByRole('button', { name: /^Reset$/i }));

    await waitFor(() => expect(select(container)).toHaveValue('1'));
    expect(select(container).options.length).toBe(5);
  });

  it('refuses to send without a letter id', async () => {
    setup({ letterId: 0 });

    await send();

    expect((await screen.findAllByText('Invalid letter id.')).length).toBeGreaterThan(0);
    expect(createLetter).not.toHaveBeenCalled();
  });

  it('insists on a block when the signature is shown and one has been cleared', async () => {
    const { container } = setup();
    await waitFor(() => expect(select(container).options.length).toBe(5));

    fireEvent.change(select(container), { target: { value: '' } });
    await send();

    expect((await screen.findAllByText('Signature block is required.')).length).toBeGreaterThan(0);
    expect(createLetter).not.toHaveBeenCalled();
  });
});
